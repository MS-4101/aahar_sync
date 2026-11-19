const syncService = require('../services/syncService');
const sseService = require('../services/sseService');
const pool = require('../config/db');

/**
 * Endpoint called by Local AaharIN Sync Worker (Push)
 * POST /api/v1/sync/push
 */
exports.pushSnapshot = async (req, res) => {
  try {
    const { restaurantId } = req.syncContext;
    const payload = req.body;

    if (!payload || (!payload.floor_summary && !payload.disabled)) {
      return res.status(400).json({ error: 'Malformed or empty sync payload.' });
    }

    const result = syncService.ingest(restaurantId, payload);
    return res.status(200).json({
      status: 'SUCCESS',
      message: 'Sync snapshot ingested successfully.',
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Ingestion failure.' });
  }
};

/**
 * Endpoint for Real-time SSE Stream (Mobile App)
 * GET /api/v1/sync/stream/:restaurantId
 */
exports.streamLive = (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  if (!restaurantId || restaurantId <= 0) {
    return res.status(400).json({ error: 'Invalid restaurant ID.' });
  }

  // Connect client to SSE channel
  sseService.addClient(restaurantId, res);

  // If we already have a cached state, send it immediately upon connection!
  const currentState = syncService.getLatestState(restaurantId);
  if (currentState) {
    res.write(`event: live_update\ndata: ${JSON.stringify(currentState.payload)}\n\n`);
  }
};

/**
 * Standard REST fallback for initial screen load
 * GET /api/v1/sync/live/:restaurantId
 */
exports.getLiveState = (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  if (!restaurantId || restaurantId <= 0) {
    return res.status(400).json({ error: 'Invalid restaurant ID.' });
  }

  const currentState = syncService.getLatestState(restaurantId);
  if (!currentState) {
    return res.status(200).json({
      status: 'WAITING_FOR_FIRST_SYNC',
      restaurantId,
      message: 'No sync data received yet for this restaurant.',
      data: null,
    });
  }

  return res.status(200).json({
    status: 'ONLINE',
    restaurantId,
    lastReceivedAt: currentState.lastReceivedAt,
    data: currentState.payload,
  });
};

/**
 * Historical Business & Sales Audit Report by Date
 * GET /api/v1/sync/historical/:restaurantId?date=YYYY-MM-DD
 */
exports.getHistoricalReport = async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.restaurantId, 10);
    if (!restaurantId || restaurantId <= 0) {
      return res.status(400).json({ error: 'Invalid restaurant ID.' });
    }

    const date = req.query.date || new Date().toISOString().substring(0, 10);

    // 1. Financial summary for the given date
    const [summaryRows] = await pool.query(
      `SELECT 
         COUNT(id) as total_bills,
         COALESCE(SUM(CAST(total AS DECIMAL(12,2))), 0) as total_revenue,
         COALESCE(SUM(CAST(discount AS DECIMAL(12,2))), 0) as total_discount,
         COALESCE(SUM(CAST(tax AS DECIMAL(12,2))), 0) as total_tax
       FROM vaidi_order_billing
       WHERE restaurant_id = ? AND (DATE(created_on) = ? OR business_date = ?)`,
      [restaurantId, date, date]
    );
    const s = summaryRows[0] || {};
    const totalBills = parseInt(s.total_bills || 0, 10);
    const totalRevenue = parseFloat(s.total_revenue || 0);
    const totalDiscount = parseFloat(s.total_discount || 0);
    const totalTax = parseFloat(s.total_tax || 0);

    // 2. Payment modes on that date
    const [pmRows] = await pool.query(
      `SELECT 
         COALESCE(pmh.payment_mode, 'Cash') as payment_mode,
         COALESCE(SUM(CAST(pmh.payment AS DECIMAL(12,2))), 0) as amount
       FROM vaidi_payment_mode_history pmh
       JOIN vaidi_payment_history ph ON ph.id = pmh.payment_history_id
       WHERE ph.restaurant_id = ? AND DATE(ph.created_on) = ?
       GROUP BY pmh.payment_mode`,
      [restaurantId, date]
    );

    // 3. Top selling items on that date
    const [itemRows] = await pool.query(
      `SELECT 
         oi.item_name,
         SUM(CAST(oi.item_quantity AS DECIMAL(10,2))) as total_qty,
         COALESCE(SUM(CAST(oi.item_quantity AS DECIMAL(10,2)) * CAST(oi.item_price AS DECIMAL(10,2))), 0) as total_revenue
       FROM vaidi_order_items oi
       JOIN vaidi_order_billing b ON b.order_table_id = oi.order_table_id
       WHERE oi.restaurant_id = ? AND (DATE(b.created_on) = ? OR b.business_date = ?) AND oi.status != 'Cancel'
       GROUP BY oi.item_id, oi.item_name
       HAVING total_qty > 0
       ORDER BY total_qty DESC
       LIMIT 10`,
      [restaurantId, date, date]
    );

    // 4. Completed settlements on that date (Full Order Logs for that date)
    const [settlementRows] = await pool.query(
      `SELECT 
         ph.id,
         ph.order_id,
         b.invoice_no,
         COALESCE(mm.mode_name, 'Counter') as table_name,
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
       WHERE ph.restaurant_id = ? AND DATE(ph.created_on) = ?
       ORDER BY ph.id DESC`,
      [restaurantId, date]
    );

    // 5. Voids & cancellations on that date
    const [voidRows] = await pool.query(
      `SELECT 
         oi.id,
         oi.order_table_id as order_id,
         COALESCE(mm.mode_name, 'Counter') as table_name,
         COALESCE(u.username, u.first_name, 'Staff') as staff_name,
         oi.created_on as modified_on,
         CAST(oi.item_price AS DECIMAL(10,2)) * ABS(CAST(oi.item_quantity AS DECIMAL(10,2))) as void_amount,
         oi.item_name,
         ABS(CAST(oi.item_quantity AS DECIMAL(10,2))) as qty,
         CAST(oi.item_price AS DECIMAL(10,2)) as price
       FROM vaidi_order_items oi
       LEFT JOIN vaidi_mode_master mm ON mm.id = oi.mode_id
       LEFT JOIN vaidi_users u ON u.id = oi.created_by
       WHERE oi.restaurant_id = ? AND DATE(oi.created_on) = ? AND CAST(oi.item_quantity AS DECIMAL(10,2)) < 0
       ORDER BY oi.id DESC`,
      [restaurantId, date]
    );

    // 6. Day End Status for that date
    const [dayEndRows] = await pool.query(
      `SELECT status, closed_at, closed_by FROM vaidi_day_end WHERE restaurant_id = ? AND (DATE(business_date) = ? OR DATE(closed_at) = ?) LIMIT 1`,
      [restaurantId, date, date, date]
    );

    // 7. List of recent distinct dates with billing for quick jumping
    const [availableDates] = await pool.query(
      `SELECT DISTINCT DATE(created_on) as dt, COUNT(id) as bills 
       FROM vaidi_order_billing 
       WHERE restaurant_id = ? 
       GROUP BY DATE(created_on) 
       ORDER BY dt DESC 
       LIMIT 30`,
      [restaurantId]
    );

    return res.status(200).json({
      status: 'OK',
      restaurantId,
      date,
      summary: {
        date,
        total_bills: totalBills,
        total_revenue: totalRevenue,
        total_discount: totalDiscount,
        total_tax: totalTax,
        payment_modes: pmRows.map(r => ({ payment_mode: r.payment_mode, amount: parseFloat(r.amount) })),
      },
      top_selling_items: itemRows.map(r => ({
        item_name: r.item_name,
        qty: parseFloat(r.total_qty),
        revenue: parseFloat(r.total_revenue)
      })),
      settlements: settlementRows.map(s => {
        const isDue = parseFloat(s.balance_amount) > 0;
        return {
          id: s.id,
          order_id: s.order_id,
          invoice_no: s.invoice_no,
          table_name: s.table_name,
          amount: parseFloat(s.amount),
          balance_amount: parseFloat(s.balance_amount),
          settled_at: s.settled_at,
          settled_by: s.settled_by,
          settlement_type: isDue ? 'Due / Credit' : s.payment_mode,
          is_due: isDue,
        };
      }),
      voids: voidRows.map(v => ({
        id: 'kot_' + v.id,
        order_id: v.order_id,
        table_name: v.table_name,
        staff_name: v.staff_name,
        modified_on: v.modified_on,
        void_amount: parseFloat(v.void_amount),
        item_name: v.item_name,
        qty: parseFloat(v.qty),
        price: parseFloat(v.price),
        items_removed: JSON.stringify([{ item_name: v.item_name, qty: parseFloat(v.qty), price: parseFloat(v.price) }]),
        reason: 'KOT Void / Removed Before Bill',
      })),
      day_end_status: dayEndRows[0] || { is_closed: 0 },
      available_dates: availableDates.map(d => ({
        date: d.dt ? new Date(d.dt).toISOString().substring(0, 10) : '',
        bills: d.bills
      })).filter(d => d.date),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch historical report.' });
  }
};

