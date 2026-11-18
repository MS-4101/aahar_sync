import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Printer,
  TrendingUp,
  Receipt,
  Wallet,
  CreditCard,
  QrCode,
  Tag,
  Clock,
  Sparkles,
  Award,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { fetchHistoricalReport } from '../services/api';

export const DayReportModal = ({
  isOpen,
  onClose,
  restaurantId,
  restaurantName = 'Restaurant',
  summary = {},
  topSellingItems = [],
  dayEndStatus = {},
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().substring(0, 10);
  const [selectedDate, setSelectedDate] = useState(() => summary?.date || todayStr);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // When modal opens or summary changes, initialize
  useEffect(() => {
    if (summary?.date) {
      setSelectedDate(summary.date);
    }
  }, [summary?.date]);

  // Fetch report whenever selectedDate changes
  useEffect(() => {
    if (!selectedDate || !restaurantId) return;

    let isMounted = true;
    setLoading(true);
    fetchHistoricalReport(restaurantId, selectedDate)
      .then((res) => {
        if (!isMounted) return;
        if (res?.status === 'OK') {
          setReportData(res);
        }
      })
      .catch((err) => {
        console.error('Failed to load date report:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, restaurantId]);

  const activeSummary = reportData ? reportData.summary : (summary || {});
  const activeTopItems = (reportData && Array.isArray(reportData.top_selling_items) && reportData.top_selling_items.length > 0)
    ? reportData.top_selling_items
    : (topSellingItems || []);
  const activeDayEnd = reportData ? reportData.day_end_status : (dayEndStatus || {});

  const totalBills = activeSummary.total_bills || 0;
  const totalRevenue = Number(activeSummary.total_revenue || 0);
  const totalDiscount = Number(activeSummary.total_discount || 0);
  const totalTax = Number(activeSummary.total_tax || 0);
  const dateStr = selectedDate || activeSummary.date || todayStr;
  const isViewingToday = dateStr === todayStr;

  const avgTicket = totalBills > 0 ? (totalRevenue / totalBills).toFixed(0) : 0;
  const maxQty = (activeTopItems || []).reduce((max, it) => Math.max(max, it.total_qty || it.qty || 0), 1);

  // Group Payment modes
  const paymentModes = activeSummary.payment_modes || [];
  const cashAmount = paymentModes
    .filter((m) => String(m.payment_mode).toLowerCase().includes('cash'))
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);
  const digitalAmount = paymentModes
    .filter((m) => !String(m.payment_mode).toLowerCase().includes('cash'))
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const shiftDate = (days) => {
    try {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + days);
      const newStr = d.toISOString().substring(0, 10);
      if (newStr <= todayStr) {
        setSelectedDate(newStr);
      }
    } catch (_) {}
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white">
        <div className="absolute inset-0 print:hidden" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[92vh] flex flex-col print:border-none print:shadow-none print:max-h-full print:rounded-none"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 space-y-3 print:border-b-2 print:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isViewingToday ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Daily Business & Sales Audit Report
                </h3>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Date Switcher & Meta Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-slate-800">{restaurantName}</span>
                <span>•</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-white text-slate-700">
                  Day End: {activeDayEnd.status || (isViewingToday ? 'In Progress' : 'Closed')}
                </span>
              </div>

              {/* Interactive Date Picker Controls */}
              <div className="flex items-center gap-1.5 print:hidden">
                <button
                  type="button"
                  onClick={() => shiftDate(-1)}
                  title="Previous Day"
                  className="w-7 h-7 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-sm hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 mr-1.5 pointer-events-none" />
                  <input
                    type="date"
                    max={todayStr}
                    value={dateStr}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent border-none p-0 focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => shiftDate(1)}
                  disabled={dateStr >= todayStr}
                  title="Next Day"
                  className="w-7 h-7 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 shadow-sm"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {!isViewingToday && (
                  <button
                    onClick={() => setSelectedDate(todayStr)}
                    className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-extrabold border border-blue-200 transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Report Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 flex-1 relative">
            {loading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-20">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-xl">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading {dateStr} Report...</span>
                </div>
              </div>
            )}

            {/* 1. Core KPIs Bento Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Net Revenue
                </span>
                <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                  ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">
                  {totalBills} Bills Paid
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Cash in Drawer
                </span>
                <span className="text-xl font-black text-emerald-800 font-mono mt-1 block">
                  ₹{cashAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
                  Physical Cash
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                  Digital / Card
                </span>
                <span className="text-xl font-black text-blue-800 font-mono mt-1 block">
                  ₹{digitalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-blue-700 font-medium mt-0.5 block">
                  Bank / POS Machine
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200">
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                  Avg Bill Size
                </span>
                <span className="text-xl font-black text-purple-900 font-mono mt-1 block">
                  ₹{avgTicket}
                </span>
                <span className="text-[10px] text-purple-700 font-medium mt-0.5 block">
                  Per Customer Table
                </span>
              </div>
            </div>

            {/* 2. Financial Breakdown (Taxes, Discounts, Margins) */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                <span>Financial & Taxation Breakdown</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium">GST Collected (Tax):</span>
                  <span className="font-bold text-slate-800 font-mono">₹{totalTax.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium">Total Discount Given:</span>
                  <span className="font-bold text-rose-600 font-mono">₹{totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium">Total Invoices:</span>
                  <span className="font-bold text-slate-800 font-mono">{totalBills} settled</span>
                </div>
              </div>
            </div>

            {/* 3. Top Selling Items Menu Leaderboard */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Top Selling Items ({isViewingToday ? 'Today' : dateStr})</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">By units sold</span>
              </div>

              {activeTopItems.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 text-center">
                  No settled item orders logged for {dateStr}.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {activeTopItems.slice(0, 7).map((item, idx) => {
                    const rawQty = item.total_qty || item.qty || 0;
                    const pct = Math.min(100, Math.round((rawQty / maxQty) * 100));
                    const itemRev = item.total_sales || item.revenue || (rawQty * (item.price || 0));
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-100 text-[10px] font-mono text-slate-500 flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span>{item.item_name}</span>
                          </span>
                          <span className="font-mono text-slate-600 font-semibold">
                            {rawQty} units • ₹{Number(itemRev).toFixed(0)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Payment Modes Distribution */}
            {paymentModes.length > 0 && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Payment Channels
                </span>
                <div className="flex flex-wrap gap-2">
                  {paymentModes.map((pm, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
                    >
                      <span className="text-slate-600">{pm.payment_mode}:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        ₹{Number(pm.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 print:hidden">
            <span>AaharIN Restaurant Companion • {isViewingToday ? 'Live Today' : `Historical Archive (${dateStr})`}</span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close Report
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
