import React from 'react';
import { renderToString } from 'react-dom/server';
import { HistoryView } from '../src/views/HistoryView.jsx';
import { TablesView } from '../src/views/TablesView.jsx';
import { AlertsView } from '../src/views/AlertsView.jsx';

async function testRender() {
  console.log('Testing renderToString on all views...');
  
  // Test with empty props
  try {
    const htmlHistoryEmpty = renderToString(React.createElement(HistoryView, {}));
    console.log('✓ HistoryView (empty props) rendered, length:', htmlHistoryEmpty.length);
  } catch (err) {
    console.error('✗ HistoryView empty crash:', err);
  }

  // Test with dummy / live settlements
  const dummySettlement = {
    id: 924,
    order_id: 'FYplJ1lp',
    order_table_id: 1037,
    table_name: 'TABLE 3',
    invoice_no: 'T3-0342',
    amount: 35,
    balance_amount: 0,
    settled_at: '2026-10-29 20:33:43',
    settled_by: 'sharmaji',
    is_due: false,
    settlement_type: 'Cash',
    items: [{ item_name: 'WATER BOTTLE', qty: 1, price: 23.81 }, { item_name: 'packing charge', qty: 1, price: 9.52 }],
    voided_items: []
  };

  const dummyDueSettlement = {
    id: 928,
    order_id: 'Due123',
    order_table_id: 1029,
    table_name: 'TABLE 1S',
    invoice_no: 'T3-0340',
    amount: 471,
    balance_amount: 471,
    settled_at: '2026-10-29 19:30:00',
    settled_by: 'sharmaji',
    is_due: true,
    settlement_type: 'Credit',
    items: [{ item_name: 'DAL MAKHANI', qty: 1, price: 250 }],
    voided_items: [{ item_name: 'ROTI', qty: 2, price: 20 }]
  };

  const dummyRunningOrder = {
    order_table_id: 1041,
    order_id: 'Live999',
    table_name: 'TABLE 5',
    captain: 'sharmaji',
    is_billed: false,
    created_on: '2026-10-29 22:00:00',
    grand_total: 150,
    items: [{ item_name: 'TEA', qty: 2, price: 30 }],
    voided_items: []
  };

  try {
    const htmlHistoryData = renderToString(React.createElement(HistoryView, {
      settlements: [dummySettlement, dummyDueSettlement],
      runningOrders: [dummyRunningOrder],
      tables: [{ table_name: 'TABLE 3', status: 'Vacant' }]
    }));
    console.log('✓ HistoryView (with settlements & running) rendered, length:', htmlHistoryData.length);
  } catch (err) {
    console.error('✗ HistoryView with data crash:', err);
  }

  // Test TablesView
  try {
    const htmlTables = renderToString(React.createElement(TablesView, {
      tables: [{ table_id: 23, table_name: 'TABLE 3', status: 'Vacant', sequence: 1 }],
      runningOrders: [],
      recentSettlements: [dummySettlement],
      todaySummary: { total_bills: 5, total_revenue: 964, total_discount: 0, total_tax: 46 }
    }));
    console.log('✓ TablesView rendered, length:', htmlTables.length);
  } catch (err) {
    console.error('✗ TablesView crash:', err);
  }

  // Test AlertsView
  try {
    const htmlAlerts = renderToString(React.createElement(AlertsView, {
      alerts: [{
        id: 'kot_1',
        table_name: 'TABLE 3',
        staff_name: 'sharmaji',
        modified_on: '2026-10-29 20:32:00',
        old_bill_amount: '35.00',
        items_removed: JSON.stringify([{ item_name: 'WATER BOTTLE', qty: 1, price: 23.81 }])
      }],
      discountAudits: []
    }));
    console.log('✓ AlertsView rendered, length:', htmlAlerts.length);
  } catch (err) {
    console.error('✗ AlertsView crash:', err);
  }
}

testRender();

