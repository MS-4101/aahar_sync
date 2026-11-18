import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  User,
  Receipt,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Wallet,
  CreditCard,
  QrCode,
  FileText,
  UtensilsCrossed,
  Coffee,
} from 'lucide-react';

export const OrderDrawer = ({ table, order, onClose }) => {
  if (!order && !table) return null;

  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'timeline'

  // Extract order properties safely
  const orderObj = order || table?.order;
  const isVacant = !orderObj && (table?.status === 'Vacant' || !table?.order);
  const tableName = table?.table_name || orderObj?.table_name || 'Table';
  const orderId = orderObj?.order_id || '--';
  const invoiceNo = orderObj?.invoice_no;

  // In AaharIN, an order is only settled when payment is recorded (settled_at is present)
  // When a bill is printed, status in DB is 'Completed', but it is a Green Table (Awaiting Settlement)
  const isSettled = !isVacant && (!!orderObj?.settled_at || (orderObj?.is_completed && !orderObj?.is_billed));
  const isBilled = !isVacant && !isSettled && (orderObj?.is_billed || !!orderObj?.billed_on || !!invoiceNo || table?.status === 'Billed');
  const isRunning = !isVacant && !isSettled && !isBilled;

  const grandTotal =
    orderObj?.amount ||
    orderObj?.grand_total ||
    orderObj?.billed_amount ||
    orderObj?.items?.reduce((sum, item) => sum + (item.qty || 1) * (item.price || 0), 0) ||
    0;

  const captainName = orderObj?.captain || orderObj?.staff_name || 'Staff';
  const createdTime = orderObj?.order_created_on || orderObj?.created_on || orderObj?.settled_at || '';

  // Build Chronological Timeline Events
  const timelineEvents = [];

  // 1. Order Punch Event
  if (createdTime) {
    timelineEvents.push({
      time: String(createdTime).substring(11, 16) || String(createdTime),
      fullTime: createdTime,
      type: 'punch',
      title: 'Order Punched & Kitchen KOT Placed',
      description: `Captain ${captainName} punched initial order ticket with ${orderObj?.items?.length || 0} items.`,
      badge: 'KOT Punch',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: UtensilsCrossed,
    });
  }

  // 2. Table Shift Event (if shifted)
  if (orderObj?.is_shifted || orderObj?.source_table_name) {
    timelineEvents.push({
      time: String(createdTime).substring(11, 16) || '--',
      fullTime: createdTime,
      type: 'shift',
      title: 'Table Transferred / Shifted',
      description: `Order transferred from ${orderObj?.source_table_name || 'Previous Area'} to ${tableName}.`,
      badge: 'Table Shift',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: ArrowRightLeft,
    });
  }

  // 3. Voids / Cancellation Events (Now available for BOTH live running orders and completed bills)
  if (orderObj?.voided_items && Array.isArray(orderObj.voided_items) && orderObj.voided_items.length > 0) {
    orderObj.voided_items.forEach((v) => {
      const vTime = String(v.voided_at || v.created_on || '').substring(11, 16);
      timelineEvents.push({
        time: vTime || '--',
        fullTime: v.voided_at,
        type: 'void',
        title: `Item Cancelled: ${v.qty || 1}x ${v.item_name}`,
        description: `Staff voided item before billing. Removed ₹${(parseFloat(v.price || 0) * parseFloat(v.qty || 1)).toFixed(2)} from running order.`,
        badge: 'Void Alert',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: AlertTriangle,
      });
    });
  }

  // 4. Bill Printed Event
  if (orderObj?.billed_on || isBilled || isSettled) {
    const billedTime = orderObj?.billed_on || orderObj?.settled_at || createdTime;
    timelineEvents.push({
      time: String(billedTime).substring(11, 16) || '--',
      fullTime: billedTime,
      type: 'bill',
      title: `Bill Printed: Invoice #${invoiceNo || 'Pending'}`,
      description: `Bill printed for ₹${Number(grandTotal).toFixed(2)}. Table turned Green, awaiting settlement.`,
      badge: 'Bill Printed',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: Receipt,
    });
  }

  // 5. Payment Settled Event
  if (isSettled && orderObj?.settled_at) {
    timelineEvents.push({
      time: String(orderObj.settled_at).substring(11, 16) || '--',
      fullTime: orderObj.settled_at,
      type: 'settle',
      title: `Payment Received: ${orderObj.settlement_type || 'Cash'}`,
      description: `Cashier ${orderObj.settled_by || 'Staff'} settled invoice for ₹${Number(grandTotal).toFixed(2)}. Table vacated automatically.`,
      badge: 'Settled & Paid',
      badgeColor: 'bg-emerald-600 text-white border-emerald-700',
      icon: CheckCircle2,
    });
  }

  // Sort timeline chronologically (oldest to newest)
  timelineEvents.sort((a, b) => {
    const parseMs = (ts) => {
      if (!ts) return 0;
      try {
        const d = new Date(String(ts).replace(' ', 'T'));
        return isNaN(d.getTime()) ? 0 : d.getTime();
      } catch (_) {
        return 0;
      }
    };
    return parseMs(a.fullTime) - parseMs(b.fullTime);
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
        {/* Backdrop Tap to Close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal Window (Spatial + Frosted Glass Elevation) */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 max-h-[92vh] flex flex-col"
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/90 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {tableName}
                </span>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    isVacant
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : isSettled
                      ? 'bg-slate-900 text-white'
                      : isBilled
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-amber-500 text-slate-950 shadow-sm'
                  }`}
                >
                  {isVacant
                    ? '⚪ Vacant Table'
                    : isSettled
                    ? `🟢 Settled (${orderObj?.settlement_type || 'Paid'})`
                    : isBilled
                    ? '🟢 Bill Printed (Awaiting Settlement)'
                    : '🟡 Dining (Kitchen Active)'}
                </span>
              </div>

              {!isVacant ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                  <span>Order #{orderId}</span>
                  {invoiceNo && <span>• Invoice #{invoiceNo}</span>}
                  <span>• By: <strong className="text-slate-800 font-sans">{captainName}</strong></span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-0.5">Table is ready for incoming guests</p>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-Tab Navigation: [📦 Items & Bill] vs [⏱️ Activity Timeline] */}
          <div className="px-4 pt-3 pb-2 bg-white border-b border-slate-100 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('items')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'items'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Items & Bill ({orderObj?.items?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Activity Timeline ({timelineEvents.length})</span>
            </button>
          </div>

          {/* Modal Body Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {isVacant ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                  <Coffee className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-slate-800">
                    {tableName} is Vacant
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    No active running orders or pending bills on this table. It is cleared and ready for incoming dine-in guests.
                  </p>
                </div>
              </div>
            ) : activeTab === 'items' ? (
              <>
                {/* Table Shift Notification */}
                {orderObj?.source_table_name && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2 text-xs text-blue-900 font-bold">
                    <ArrowRightLeft className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>Table Shifted from <strong>{orderObj.source_table_name}</strong></span>
                  </div>
                )}

                {/* Cancelled Items Banner if any */}
                {orderObj?.voided_items && orderObj.voided_items.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-rose-900 text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                      <span>Cancelled / Voided Items on this Order:</span>
                    </div>
                    {orderObj.voided_items.map((vi, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-rose-800 pl-5">
                        <span>{vi.qty}x {vi.item_name}</span>
                        <span className="font-mono font-bold">-₹{(parseFloat(vi.price) * parseFloat(vi.qty)).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Itemized List */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {(orderObj?.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-black text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded">
                            {it.qty}x
                          </span>
                          <span className="truncate">{it.item_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          ₹{Number(it.price || 0).toFixed(2)} each
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          ₹{(Number(it.qty || 1) * Number(it.price || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill Summary & Grand Total */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Items Subtotal</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{Number(grandTotal).toFixed(2)}
                    </span>
                  </div>

                  {isSettled && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-700">
                      <span>Payment Method</span>
                      <span className="font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                        {orderObj.settlement_type || 'Cash'}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-base font-extrabold text-slate-900">
                    <span>Grand Total</span>
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      ₹{Number(grandTotal).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            ) : timelineEvents.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400">No activity timeline recorded for this order yet.</p>
              </div>
            ) : (
              /* TAB 2: VERTICAL TIMELINE VIEW (Vertical line on left, actions on right) */
              <div className="py-2">
                <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
                  {timelineEvents.map((evt, idx) => {
                    const EvtIcon = evt.icon;
                    return (
                      <div key={idx} className="relative group">
                        {/* Timeline Node Bullet */}
                        <div className="absolute -left-[33px] top-0.5 w-6 h-6 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center text-slate-900 shadow-sm">
                          <EvtIcon className="w-3 h-3" />
                        </div>

                        {/* Event Content Box */}
                        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/90 shadow-sm space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {evt.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">
                              {evt.time}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {evt.description}
                          </p>

                          <div className="pt-1">
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${evt.badgeColor}`}>
                              {evt.badge}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
