import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Search,
  X,
  Receipt,
  Clock,
  User,
  ChevronRight,
  Filter,
  CheckCircle2,
  Wallet,
  CreditCard,
  QrCode,
  ArrowRightLeft,
  Coffee,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react';
import { fetchHistoricalReport } from '../services/api';

const safeTimeMs = (ts) => {
  if (!ts) return 0;
  try {
    const s = String(ts).replace(' ', 'T');
    const d = new Date(s);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch (_) {
    return 0;
  }
};

export const HistoryView = ({
  settlements = [],
  runningOrders = [],
  tables = [],
  onSelectOrder,
  initialFilter = 'all',
  restaurantId,
}) => {
  const todayStr = new Date().toISOString().substring(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dateFilterMode, setDateFilterMode] = useState('today'); // 'today' | 'custom' | 'all'
  const [historicalSettlements, setHistoricalSettlements] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [filter, setFilter] = useState(initialFilter || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  // Update filter when initialFilter changes from external navigation (e.g. Bento tiles)
  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  // When selectedDate is changed to a past date, fetch from backend
  useEffect(() => {
    if (dateFilterMode === 'all') {
      setHistoricalSettlements(null);
      return;
    }

    if (selectedDate === todayStr) {
      setHistoricalSettlements(null);
      return;
    }

    if (!restaurantId || !selectedDate) return;

    let isMounted = true;
    setLoadingHistory(true);
    fetchHistoricalReport(restaurantId, selectedDate)
      .then((res) => {
        if (!isMounted) return;
        if (res?.settlements) {
          setHistoricalSettlements(res.settlements);
        } else {
          setHistoricalSettlements([]);
        }
      })
      .catch(() => {
        if (isMounted) setHistoricalSettlements([]);
      })
      .finally(() => {
        if (isMounted) setLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, dateFilterMode, restaurantId, todayStr]);

  // Determine active settlements source
  const effectiveSettlements = useMemo(() => {
    if (dateFilterMode === 'all') {
      return settlements || [];
    }
    if (historicalSettlements !== null) {
      return historicalSettlements;
    }
    // Filter settlements strictly for today
    return (settlements || []).filter((st) => {
      const ts = String(st.settled_at || st.order_created_on || '');
      return ts.startsWith(todayStr);
    });
  }, [dateFilterMode, historicalSettlements, settlements, todayStr]);

  // Combine running orders and completed settlements into unified stream
  const allOrdersList = useMemo(() => {
    const list = [];

    // 1. Only include running orders if viewing Today or All Dates
    if (dateFilterMode === 'today' || dateFilterMode === 'all' || selectedDate === todayStr) {
      (runningOrders || []).forEach((ro) => {
        list.push({
          ...ro,
          is_completed: false,
          display_status: ro.is_billed ? 'Billed' : 'Running',
          timestamp: ro.billed_on || ro.created_on || '',
          grand_total: ro.grand_total || ro.billed_amount || 0,
          staff_name: ro.captain || ro.staff_name || 'Staff',
        });
      });
    }

    // 2. Add completed settlements / invoices
    effectiveSettlements.forEach((st) => {
      list.push({
        ...st,
        is_completed: true,
        display_status: st.is_due ? 'Due' : 'Completed',
        timestamp: st.settled_at || st.order_created_on || '',
        grand_total: st.amount || 0,
        staff_name: st.captain || st.settled_by || 'Staff',
      });
    });

    // Sort newest first safely
    return list.sort((a, b) => safeTimeMs(b.timestamp) - safeTimeMs(a.timestamp));
  }, [effectiveSettlements, runningOrders, dateFilterMode, selectedDate, todayStr]);

  // Counts for pills
  const paidCount = effectiveSettlements.filter((s) => !s.is_due).length;
  const dueCount = effectiveSettlements.filter((s) => s.is_due).length;
  const diningCount = runningOrders.filter((o) => !o.is_billed).length;
  const billedCount = runningOrders.filter((o) => o.is_billed).length;

  // Filtered List
  const filteredList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allOrdersList.filter((o) => {
      // 1. Category Filter
      let matchFilter = true;
      if (filter === 'paid') matchFilter = o.is_completed && !o.is_due;
      else if (filter === 'due') matchFilter = o.is_due;
      else if (filter === 'dining') matchFilter = !o.is_completed && !o.is_billed;
      else if (filter === 'billed') matchFilter = !o.is_completed && o.is_billed;

      if (!matchFilter) return false;

      // 2. Search Term
      if (!term) return true;

      const tName = String(o.table_name || '').toLowerCase();
      const sName = String(o.staff_name || '').toLowerCase();
      const oId = String(o.order_id || '').toLowerCase();
      const inv = String(o.invoice_no || '').toLowerCase();

      return tName.includes(term) || sName.includes(term) || oId.includes(term) || inv.includes(term);
    });
  }, [allOrdersList, filter, searchTerm]);

  const handleDateSelect = (newDate) => {
    setSelectedDate(newDate);
    if (newDate === todayStr) {
      setDateFilterMode('today');
    } else {
      setDateFilterMode('custom');
    }
  };

  return (
    <div className="space-y-3.5 pb-24">
      {/* 1. Date Scope Selector Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 pr-1.5 hidden sm:inline">
            Scope:
          </span>

          <button
            onClick={() => {
              setDateFilterMode('today');
              setSelectedDate(todayStr);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              dateFilterMode === 'today'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today's Orders
          </button>

          <button
            onClick={() => {
              const y = new Date();
              y.setDate(y.getDate() - 1);
              const yStr = y.toISOString().substring(0, 10);
              handleDateSelect(yStr);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              dateFilterMode === 'custom' && selectedDate !== todayStr
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Yesterday
          </button>

          <button
            onClick={() => {
              setDateFilterMode('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              dateFilterMode === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Recent
          </button>
        </div>

        {/* Date Input for Any Date */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            <Calendar className="w-3.5 h-3.5 text-blue-600 mr-1.5 pointer-events-none" />
            <input
              type="date"
              max={todayStr}
              value={dateFilterMode === 'all' ? '' : selectedDate}
              onChange={(e) => handleDateSelect(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-none p-0 focus:outline-none cursor-pointer"
            />
          </div>

          {loadingHistory && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Fetching...</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Status Filter Strip & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>All</span>
            <span className="text-[10px] opacity-75">{allOrdersList.length}</span>
          </button>

          <button
            onClick={() => setFilter('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filter === 'paid'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Paid</span>
            <span className="text-[10px] font-bold">{paidCount}</span>
          </button>

          {dueCount > 0 && (
            <button
              onClick={() => setFilter('due')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                filter === 'due'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Due (Khata)</span>
              <span className="text-[10px] font-bold">{dueCount}</span>
            </button>
          )}

          <button
            onClick={() => setFilter('dining')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filter === 'dining'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Dining</span>
            <span className="text-[10px] font-bold">{diningCount}</span>
          </button>

          <button
            onClick={() => setFilter('billed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filter === 'billed'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <span>Billed</span>
            <span className="text-[10px] font-bold">{billedCount}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search invoice, table, staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none p-0 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-slate-400 hover:text-slate-600 cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Orders History Feed */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-2">
          <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">
            {dateFilterMode === 'custom'
              ? `No orders found for ${selectedDate}`
              : 'No orders found matching criteria'}
          </p>
          <p className="text-[11px] text-slate-400">
            {dateFilterMode === 'today'
              ? "Today's newly placed and settled orders will appear here automatically."
              : 'Try selecting a different date or choose All Recent.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredList.map((order, idx) => {
            const tableObj = (tables || []).find((t) => t.table_name === order.table_name) || {
              table_name: order.table_name,
              status: order.display_status,
            };

            const isDue = !!order.is_due;
            const isCash = String(order.settlement_type || '').toLowerCase().includes('cash');
            const isCard = String(order.settlement_type || '').toLowerCase().includes('card');
            const isUpi = String(order.settlement_type || '').toLowerCase().includes('upi');

            const orderIdStr = String(order.order_id || '');
            const timeStr = String(order.timestamp || '').substring(11, 16);
            const dateStrPart = String(order.timestamp || '').substring(0, 10);

            return (
              <motion.div
                key={order.id || order.order_id || idx}
                whileHover={{ y: -1 }}
                onClick={() => onSelectOrder(tableObj, order)}
                className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer space-y-2.5 shadow-sm hover:border-slate-300 ${
                  isDue
                    ? 'border-rose-200 bg-rose-50/10'
                    : order.is_completed
                    ? 'border-slate-200/90'
                    : order.is_billed
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-amber-300 bg-amber-50/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {order.table_name || 'Counter'}
                      </span>
                      {order.invoice_no && (
                        <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          #{order.invoice_no}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span>Order #{orderIdStr.substring(0, 8)}</span>
                      <span>•</span>
                      <span>By: <strong className="text-slate-700 font-semibold">{order.staff_name}</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base sm:text-lg font-black text-slate-900 font-mono block">
                      ₹{Number(order.grand_total).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {dateStrPart !== todayStr ? `${dateStrPart} ` : ''}{timeStr || 'Recent'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {order.is_completed ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isDue
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isDue ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        <span>{order.settlement_type || 'Paid'}</span>
                      </span>
                    ) : order.is_billed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>Bill Printed (Ready to Pay)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                        <span>Dining (Kitchen Active)</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-700 transition-colors">
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
