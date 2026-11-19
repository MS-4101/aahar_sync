const sseService = require('./sseService');
const pool = require('../config/db');

class SyncService {
  constructor() {
    // In-memory cache of latest state per restaurantId
    // Key: restaurantId, Value: { timestamp, payload, lastReceivedAt }
    this.liveStore = new Map();
  }

  /**
   * Ingests payload from local/server POS sync worker.
   */
  ingest(restaurantId, payload) {
    const rid = String(restaurantId);

    // Validate minimum payload structure
    if (!payload || typeof payload !== 'object') {
      throw new Error('Malformed sync payload.');
    }

    const stateRecord = {
      restaurantId: parseInt(rid, 10),
      lastReceivedAt: new Date().toISOString(),
      payload: {
        ...payload,
        server_timestamp: new Date().toISOString(),
      },
    };

    // Store in live cache
    this.liveStore.set(rid, stateRecord);

    // Broadcast immediately to all connected owner dashboards
    const clientsNotified = sseService.broadcastToRestaurant(rid, stateRecord.payload);

    return {
      success: true,
      restaurantId: rid,
      receivedAt: stateRecord.lastReceivedAt,
      clientsNotified,
    };
  }

  /**
   * Retrieves latest cached state for owner.
   * If cache is empty (e.g. server restart or server-hosted Aahar),
   * automatically falls back to direct database snapshot extraction.
   */
  async getLatestState(restaurantId) {
    const rid = String(restaurantId);
    const cached = this.liveStore.get(rid);
    if (cached) {
      return cached;
    }

    // Auto-extract from MySQL database (server-hosted fallback)
    return await this.extractFromDb(parseInt(rid, 10));
  }

  /**
   * Direct database snapshot extraction for server-hosted Aahar.
   */
  async extractFromDb(restaurantId) {
    const rid = parseInt(restaurantId, 10);
    if (!rid || rid <= 0) return null;

    try {
      // 1. Restaurant Master
      const [restRows] = await pool.query(
        `SELECT id, restaurant_name, city, mobile_no, cgst, sgst, status, addon_features 
         FROM vaidi_restaurant_master WHERE id = ? LIMIT 1`,
        [rid]
      );
      const rest = restRows[0] || { id: rid, restaurant_name: `Restaurant #${rid}` };
      const taxRate = ((parseFloat(rest.cgst) || 2.5) + (parseFloat(rest.sgst) || 2.5)) / 100;

      // 2. Tables from vaidi_mode_master
      const [tables] = await pool.query(
        `SELECT id as table_id, mode_name as table_name, status, sequence 
         FROM vaidi_mode_master 
         WHERE restaurant_id = ? AND status = 'Active' 
         ORDER BY sequence ASC, id ASC`,
        [rid]
      );

      if (!tables || tables.length === 0) {
        return null;
      }

      // 3. Active Running & Billed Orders
      const [runningOrders] = await pool.query(
        `SELECT 
           o.id as order_table_id,
           o.order_id,
           o.mode_id as table_id,
           o.source_mode_id,
           src_mm.mode_name as source_table_name,
           mm.mode_name as table_name,
           COALESCE(u.username, u.first_name, 'Staff') as captain,
           o.created_on,
           o.order_note,
           o.remarks,
           o.mobile as customer_mobile,
           b.id as billing_id,
           b.invoice_no,
           CAST(b.total AS DECIMAL(10,2)) as billed_amount,
           b.created_on as billed_on
         FROM vaidi_orders o
         LEFT JOIN vaidi_mode_master mm ON mm.id = o.mode_id
         LEFT JOIN vaidi_mode_master src_mm ON src_mm.id = o.source_mode_id
         LEFT JOIN vaidi_users u ON u.id = o.created_by
         LEFT JOIN vaidi_order_billing b ON b.order_table_id = o.id
         WHERE o.restaurant_id = ? 
           AND o.status NOT IN ('Completed', 'Cancel')
         ORDER BY o.created_on DESC`,
        [rid]
      );

      // 4. Fetch items for each running order
      const activeOrdersByTable = {};
      let runningCount = 0;
      let billedCount = 0;

      for (const ro of runningOrders) {
        const [items] = await pool.query(
          `SELECT 
             item_id, item_name, 
             SUM(CAST(item_quantity AS DECIMAL(10,2))) as net_qty, 
             CAST(item_price AS DECIMAL(10,2)) as price, 
             MAX(kot_number) as kot_number, 
             MAX(remarks) as remarks
           FROM vaidi_order_items
           WHERE order_table_id = ? AND status != 'Cancel'
           GROUP BY item_id, item_name, item_price
           HAVING net_qty > 0
           ORDER BY MIN(id) ASC`,
          [ro.order_table_id]
        );

        let subtotal = 0;
        ro.items = (items || []).map((it) => {
          const qty = parseFloat(it.net_qty) || 0;
          const price = parseFloat(it.price) || 0;
          subtotal += (qty * price);
          return {
            item_id: it.item_id,
            item_name: it.item_name,
            qty,
            price,
            kot_id: String(it.kot_number || ''),
            note: it.remarks || '',
          };
        });

        ro.items_count = ro.items.length;
        const calculatedTotal = Math.round(subtotal * (1 + taxRate) * 100) / 100;
        ro.grand_total = ro.billed_amount ? parseFloat(ro.billed_amount) : calculatedTotal;
        ro.is_billed = !!ro.billing_id;
        ro.is_shifted = !!ro.source_mode_id;

        if (ro.is_billed) {
          billedCount++;
        } else {
          runningCount++;
        }

        if (ro.table_id) {
          activeOrdersByTable[ro.table_id] = ro;
        }
      }

      // 5. Tables map
      const tablesMap = tables.map((t) => {
        const tableId = t.table_id;
        const activeOrder = activeOrdersByTable[tableId] || null;
        let status = 'Vacant';
        if (activeOrder) {
          status = activeOrder.is_billed ? 'Billed' : 'Running';
        }
        return {
          table_id: tableId,
          table_name: t.table_name,
          status,
          sequence: t.sequence || 0,
          order: activeOrder,
        };
      });

      // 6. Today summary
      const todayDate = new Date().toISOString().substring(0, 10);
      const [summaryRows] = await pool.query(
        `SELECT 
           COUNT(id) as total_bills,
           COALESCE(SUM(CAST(total AS DECIMAL(12,2))), 0) as total_revenue,
           COALESCE(SUM(CAST(discount AS DECIMAL(12,2))), 0) as total_discount,
           COALESCE(SUM(CAST(tax AS DECIMAL(12,2))), 0) as total_tax
         FROM vaidi_order_billing
         WHERE restaurant_id = ? 
           AND (DATE(created_on) = ? OR business_date = ?)`,
        [rid, todayDate, todayDate]
      );
      const sRow = summaryRows[0] || {};

      // 7. Payment modes today
      const [paymentModes] = await pool.query(
        `SELECT 
           COALESCE(pmh.payment_mode, 'Cash') as payment_mode,
           COALESCE(SUM(CAST(pmh.payment AS DECIMAL(12,2))), 0) as amount
         FROM vaidi_payment_mode_history pmh
         JOIN vaidi_payment_history ph ON ph.id = pmh.payment_history_id
         WHERE ph.restaurant_id = ? 
           AND DATE(ph.created_on) = ?
         GROUP BY pmh.payment_mode`,
        [rid, todayDate]
      );

      // 8. Recent settlements
      const [recentSettlementsRaw] = await pool.query(
        `SELECT 
           ph.id, ph.order_id, b.invoice_no,
           COALESCE(mm.mode_name, 'Table') as table_name,
           CAST(ph.total_payment AS DECIMAL(10,2)) as amount,
           CAST(ph.balance_amount AS DECIMAL(10,2)) as balance_amount,
           ph.created_on as settled_at,
           COALESCE(u.username, u.first_name, 'Staff') as settled_by,
           COALESCE((SELECT pmh.payment_mode FROM vaidi_payment_mode_history pmh WHERE pmh.payment_history_id = ph.id LIMIT 1), 'Cash') as payment_mode
         FROM vaidi_payment_history ph
         JOIN vaidi_order_billing b ON b.id = ph.billing_id
         JOIN vaidi_orders o ON o.id = ph.order_table_id
         LEFT JOIN vaidi_mode_master mm ON mm.id = o.mode_id
         LEFT JOIN vaidi_users u ON u.id = ph.user_id
         WHERE ph.restaurant_id = ?
         ORDER BY ph.id DESC
         LIMIT 15`,
        [rid]
      );

      const payload = {
        sync_version: '1.1',
        timestamp: new Date().toISOString(),
        restaurant_id: rid,
        restaurant: {
          name: rest.restaurant_name || `Restaurant #${rid}`,
          city: rest.city || '',
          phone: rest.mobile_no || '',
        },
        floor_summary: {
          total_tables: tablesMap.length,
          running_tables: runningCount,
          billed_tables: billedCount,
          vacant_tables: Math.max(0, tablesMap.length - (runningCount + billedCount)),
        },
        tables_map: tablesMap,
        running_orders: runningOrders,
        recent_settlements: (recentSettlementsRaw || []).map((s) => ({
          ...s,
          amount: parseFloat(s.amount) || 0,
          balance_amount: parseFloat(s.balance_amount) || 0,
          is_due: parseFloat(s.balance_amount) > 0,
          is_split: false,
          settlement_type: parseFloat(s.balance_amount) > 0 ? 'Due / Credit' : s.payment_mode,
        })),
        top_selling_items: [],
        audit_alerts: [],
        today_summary: {
          date: todayDate,
          total_bills: parseInt(sRow.total_bills, 10) || 0,
          total_revenue: parseFloat(sRow.total_revenue) || 0,
          total_discount: parseFloat(sRow.total_discount) || 0,
          total_tax: parseFloat(sRow.total_tax) || 0,
          payment_modes: (paymentModes || []).map((p) => ({
            payment_mode: p.payment_mode,
            amount: parseFloat(p.amount) || 0,
          })),
        },
        server_timestamp: new Date().toISOString(),
      };

      const stateRecord = {
        restaurantId: rid,
        lastReceivedAt: new Date().toISOString(),
        payload,
      };

      this.liveStore.set(String(rid), stateRecord);
      return stateRecord;
    } catch (err) {
      console.error(`[SyncService extractFromDb error for restaurant #${rid}]:`, err.message);
      return null;
    }
  }
}

module.exports = new SyncService();
