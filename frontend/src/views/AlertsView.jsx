import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Receipt,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { fetchHistoricalReport } from '../services/api';

export const AlertsView = ({ alerts = [], discountAudits = [], restaurantId }) => {
  const todayStr = new Date().toISOString().substring(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dateFilterMode, setDateFilterMode] = useState('today'); // 'today' | 'custom' | 'all'
  const [historicalAlerts, setHistoricalAlerts] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const safeAlerts = alerts || [];
  const safeDiscounts = discountAudits || [];

  // When selectedDate is changed to a past date, fetch from backend
  useEffect(() => {
    if (dateFilterMode === 'all') {
      setHistoricalAlerts(null);
      return;
    }

    if (selectedDate === todayStr) {
      setHistoricalAlerts(null);
      return;
    }

    if (!restaurantId || !selectedDate) return;

    let isMounted = true;
    setLoadingHistory(true);
    fetchHistoricalReport(restaurantId, selectedDate)
      .then((res) => {
        if (!isMounted) return;
        if (res?.voids) {
          setHistoricalAlerts(res.voids);
        } else {
          setHistoricalAlerts([]);
        }
      })
      .catch(() => {
        if (isMounted) setHistoricalAlerts([]);
      })
      .finally(() => {
        if (isMounted) setLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, dateFilterMode, restaurantId, todayStr]);

  // Determine active alerts source
  const effectiveAlerts = useMemo(() => {
    if (dateFilterMode === 'all') {
      return safeAlerts;
    }
    if (historicalAlerts !== null) {
      return historicalAlerts;
    }
    // Filter alerts strictly for today
    return safeAlerts.filter((a) => {
      const ts = String(a.modified_on || a.created_on || '');
      return ts.startsWith(todayStr);
    });
  }, [dateFilterMode, historicalAlerts, safeAlerts, todayStr]);

  const totalVoidAmount = useMemo(() => {
    return effectiveAlerts.reduce((sum, a) => {
      if (a.void_amount !== undefined) {
        return sum + parseFloat(a.void_amount || '0');
      }
      const oldB = parseFloat(a.old_bill_amount || '0');
      const newB = parseFloat(a.new_bill_amount || '0');
      return sum + Math.max(0, oldB - newB);
    }, 0);
  }, [effectiveAlerts]);

  const effectiveDiscounts = useMemo(() => {
    if (dateFilterMode === 'all') return safeDiscounts;
    if (selectedDate !== todayStr) return [];
    return safeDiscounts.filter((d) => {
      const ts = String(d.created_on || '');
      return ts.startsWith(todayStr);
    });
  }, [dateFilterMode, selectedDate, safeDiscounts, todayStr]);

  const totalDiscountGiven = useMemo(() => {
    return effectiveDiscounts.reduce((sum, d) => sum + parseFloat(d.discount_amount || '0'), 0);
  }, [effectiveDiscounts]);

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
            Today's Voids
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
                ? 'bg-rose-600 text-white shadow-sm'
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
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500 transition-all">
            <Calendar className="w-3.5 h-3.5 text-rose-600 mr-1.5 pointer-events-none" />
            <input
              type="date"
              max={todayStr}
              value={dateFilterMode === 'all' ? '' : selectedDate}
              onChange={(e) => handleDateSelect(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-none p-0 focus:outline-none cursor-pointer"
            />
          </div>

          {loadingHistory && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Fetching...</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Header Banner */}
      <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Loss Prevention & Void Audit ({effectiveAlerts.length})
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {dateFilterMode === 'today'
                ? "Today's items cancelled or voided after order punch."
                : dateFilterMode === 'all'
                ? 'All recent cancellation logs across all dates.'
                : `Audit logs for ${selectedDate}.`}
            </p>
          </div>
        </div>

        {totalVoidAmount > 0 && (
          <div className="text-right flex-shrink-0">
            <span className="text-[10px] font-bold text-rose-600 uppercase block">Total Voided</span>
            <span className="text-base font-black text-rose-900 font-mono">
              -₹{totalVoidAmount.toFixed(0)}
            </span>
          </div>
        )}
      </div>

      {/* 3. Alert Cards */}
      {effectiveAlerts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-xs font-bold text-slate-800">Zero Suspicious Modifications</p>
          <p className="text-[11px] text-slate-400">
            {dateFilterMode === 'today'
              ? 'No items cancelled or voided today. Operations running 100% clean.'
              : `No cancellation or void records found for ${selectedDate}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {effectiveAlerts.map((alert, i) => {
            let removedItems = [];
            try {
              if (typeof alert.items_removed === 'string') {
                removedItems = JSON.parse(alert.items_removed || '[]');
              } else if (Array.isArray(alert.items_removed)) {
                removedItems = alert.items_removed;
              }
            } catch (_) {
              removedItems = [];
            }

            // Fallback for single item from historical table
            if (removedItems.length === 0 && alert.item_name) {
              removedItems = [
                {
                  item_name: alert.item_name,
                  qty: alert.qty || 1,
                  price: alert.price || alert.void_amount || 0,
                },
              ];
            }

            const timeStr = String(alert.modified_on || alert.created_on || '').substring(11, 16);
            const dateStr = String(alert.modified_on || alert.created_on || '').substring(0, 10);
            const orderIdStr = String(alert.order_id || '');

            return (
              <div
                key={alert.id || i}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-2.5 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {alert.table_name || 'Counter'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        #{orderIdStr}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="font-semibold text-slate-700">
                        Staff: {alert.staff_name || 'Staff'}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">
                        {dateStr !== todayStr ? `${dateStr} ` : ''}{timeStr || '--'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    Void Log
                  </span>
                </div>

                {/* Removed Items Details */}
                {removedItems && Array.isArray(removedItems) && removedItems.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 space-y-1">
                    <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                      Items Cancelled / Voided:
                    </span>
                    {removedItems.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs text-rose-950 font-medium"
                      >
                        <span className="flex items-center gap-1.5 truncate pr-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                          <span className="truncate">{it.qty || 1}x {it.item_name || it.name}</span>
                        </span>
                        <span className="font-mono font-bold text-rose-700 flex-shrink-0">
                          -₹{(parseFloat(it.price || 0) * (it.qty || 1)).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Manual Discount Audit Section */}
      {effectiveDiscounts.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Discount & Manual Waiver Audit ({effectiveDiscounts.length} Bills)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bills where staff applied manual price cuts or bill discounts today.
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="text-[10px] font-bold text-amber-700 uppercase block">Total Discount</span>
              <span className="text-base font-black text-amber-900 font-mono">
                -₹{totalDiscountGiven.toFixed(0)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {effectiveDiscounts.map((disc, idx) => (
              <div
                key={disc.id || idx}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-900">
                      Invoice #{disc.invoice_no}
                    </span>
                    <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                      {disc.table_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-semibold text-slate-700">Cashier: {disc.cashier}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">
                      {String(disc.created_on || '').substring(11, 16)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Discount Given
                  </span>
                  <span className="text-sm font-black text-rose-600 font-mono">
                    -₹{Number(disc.discount_amount || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    on bill ₹{Number(disc.total_amount || 0).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
