import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

async function testWithVite() {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const { HistoryView } = await server.ssrLoadModule('/src/views/HistoryView.jsx');
    const { TablesView } = await server.ssrLoadModule('/src/views/TablesView.jsx');
    const { AlertsView } = await server.ssrLoadModule('/src/views/AlertsView.jsx');

    console.log('✓ Modules loaded cleanly with Vite!');

    // 1. HistoryView with empty props
    const htmlEmpty = renderToString(React.createElement(HistoryView, {}));
    console.log('✓ HistoryView empty rendered, length:', htmlEmpty.length);

    // 2. HistoryView with settlements & running
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
      items: [{ item_name: 'WATER BOTTLE', qty: 1, price: 23.81 }],
      voided_items: []
    };

    const htmlData = renderToString(React.createElement(HistoryView, {
      settlements: [dummySettlement],
      runningOrders: [],
      tables: [{ table_name: 'TABLE 3', status: 'Vacant' }]
    }));
    console.log('✓ HistoryView data rendered, length:', htmlData.length);

    // 3. TablesView
    const htmlTables = renderToString(React.createElement(TablesView, {
      tables: [{ table_id: 23, table_name: 'TABLE 3', status: 'Vacant', sequence: 1 }],
      runningOrders: [],
      recentSettlements: [dummySettlement],
      todaySummary: { total_bills: 5, total_revenue: 964, total_discount: 0, total_tax: 46 }
    }));
    console.log('✓ TablesView rendered, length:', htmlTables.length);

  } catch (err) {
    console.error('✗ ERROR during SSR:', err);
  } finally {
    await server.close();
  }
}

testWithVite();

