import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  CreditCard,
  QrCode,
  Receipt,
  ShieldAlert,
  Clock,
  User,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';

export const ActivityView = ({
  summary = {},
  settlements = [],
  alerts = [],
}) => {
  const [subTab, setSubTab] = useState('settlements'); // 'settlements' | 'audit'
  const [modeFilter, setModeFilter] = useState('all');

  const totalRevenue = Number(summary?.total_revenue || 0);
  const totalBills = Number(summary?.total_bills || 0);

  // Breakdown by payment modes
  const modeAmounts = useMemo(() => {
    const map = {
      cash: 0,
      card: 0,
      upi: 0,
      due: 0,
    };
    (summary?.payment_modes || []).forEach((m) => {
      const name = (m.payment_mode || '').toLowerCase();
      const amt = parseFloat(m.amount || '0');
      if (name.includes('cash')) map.cash += amt;
      else if (name.includes('card')) map.card += amt;
      else if (name.includes('upi') || name.includes('online')) map.upi += amt;
      else if (name.includes('due') || name.includes('credit')) map.due += amt;
    });
    return map;
  }, [summary]);

  // Filtered Settlements
  const filteredSettlements = useMemo(() => {
    if (modeFilter === 'all') return settlements;
    return settlements.filter((s) => {
      const type = (s.settlement_type || '').toLowerCase();
      if (modeFilter === 'cash') return type.includes('cash');
      if (modeFilter === 'card') return type.includes('card');
      if (modeFilter === 'upi') return type.includes('upi');
      if (modeFilter === 'split') return s.is_split;
      if (modeFilter === 'due') return s.is_due;
      return true;
    });
  }, [settlements, modeFilter]);

  // Calculate total voided amount
  const totalVoidAmount = useMemo(() => {
    return alerts.reduce((sum, a) => {
      const oldB = parseFloat(a.old_bill_amount || '0');
      const newB = parseFloat(a.new_bill_amount || '0');
      return sum + Math.max(0, oldB - newB);
    }, 0);
  }, [alerts]);

  return (
    <div className="space-y-4 pb-20">
      {/* Financial Summary Bento */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Today's Settlement Summary
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight badge-metric">
                ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                ({totalBills} bills reconciled)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
              Avg Ticket: ₹{totalBills > 0 ? (totalRevenue / totalBills).toFixed(0) : 0}
            </span>
          </div>
        </div>

        {/* Mode Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Cash */}
          <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/80">
            <div className="flex items-center gap-1.5 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
              <Wallet className="w-3.5 h-3.5" />
              <span>Cash</span>
            </div>
            <span className="text-lg font-black text-emerald-900 block mt-1 badge-metric">
              ₹{modeAmounts.cash.toFixed(0)}
            </span>
          </div>

          {/* Card */}
          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100/80">
            <div className="flex items-center gap-1.5 text-blue-800 text-[10px] font-black uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Card / POS</span>
            </div>
            <span className="text-lg font-black text-blue-900 block mt-1 badge-metric">
              ₹{modeAmounts.card.toFixed(0)}
            </span>
          </div>

          {/* UPI */}
          <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-100/80">
            <div className="flex items-center gap-1.5 text-violet-800 text-[10px] font-black uppercase tracking-wider">
              <QrCode className="w-3.5 h-3.5" />
              <span>UPI / QR</span>
            </div>
            <span className="text-lg font-black text-violet-900 block mt-1 badge-metric">
              ₹{modeAmounts.upi.toFixed(0)}
            </span>
          </div>

          {/* Due */}
          <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100/80">
            <div className="flex items-center gap-1.5 text-rose-800 text-[10px] font-black uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Due / Khata</span>
            </div>
            <span className="text-lg font-black text-rose-900 block mt-1 badge-metric">
              ₹{modeAmounts.due.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Switch: Settlements Feed vs Security Audit */}
      <div className="flex items-center justify-between gap-2">
        <div className="p-1 bg-slate-100/80 rounded-xl flex items-center gap-1 border border-slate-200/60">
          <button
            onClick={() => setSubTab('settlements')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'settlements'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Settlement Feed</span>
            <span className="text-[10px] font-mono text-slate-400">({settlements.length})</span>
          </button>

          <button
            onClick={() => setSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'audit'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Audit & Voids</span>
            {alerts.length > 0 && (
              <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full">
                {alerts.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Pills for Settlements */}
        {subTab === 'settlements' && (
          <div className="hidden sm:flex items-center gap-1">
            {['all', 'cash', 'card', 'upi', 'split'].map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  modeFilter === m
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Canvas */}
      {subTab === 'settlements' ? (
        <div className="space-y-2">
          {filteredSettlements.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No settlements recorded yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Bills settled in AaharIN will stream live here.
              </p>
            </div>
          ) : (
            filteredSettlements.map((s) => {
              const isCash = s.settlement_type?.toLowerCase().includes('cash');
              const isCard = s.settlement_type?.toLowerCase().includes('card');
              const isUpi = s.settlement_type?.toLowerCase().includes('upi');

              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Tbl</span>
                      <span className="text-xs font-black text-slate-900 leading-none">
                        {s.table_name}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          Invoice #{s.invoice_no}
                        </span>
                        {/* Mode Badge */}
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isCash
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                              : isCard
                              ? 'bg-blue-50 text-blue-800 border border-blue-200/80'
                              : isUpi
                              ? 'bg-violet-50 text-violet-800 border border-violet-200/80'
                              : s.is_split
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200/80'
                              : s.is_due
                              ? 'bg-rose-50 text-rose-800 border border-rose-200/80'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.settlement_type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mt-1 font-medium">
                        <span className="flex items-center gap-1 text-slate-600">
                          <User className="w-3 h-3 text-slate-400" />
                          {s.settled_by || 'Staff'}
                        </span>
                        <span>•</span>
                        <span className="font-mono flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {s.settled_at?.substring(11, 16) || '--'}
                        </span>
                      </div>

                      {/* Split Breakdown */}
                      {s.is_split && s.splits?.length > 0 && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {s.splits.map((sp, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] font-semibold bg-slate-50 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200"
                            >
                              {sp.payment_mode}: ₹{parseFloat(sp.amount).toFixed(0)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight badge-metric block">
                      ₹{Number(s.amount || 0).toFixed(0)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">Paid</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Section 2: Security & Void Audit */
        <div className="space-y-3">
          {totalVoidAmount > 0 && (
            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Total Items Voided / Removed Before Bill</span>
              </div>
              <span className="text-sm font-black text-rose-900 font-mono">
                -₹{totalVoidAmount.toFixed(0)}
              </span>
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">Zero Suspicious Modifications</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No items cancelled or voided today. Operations running 100% clean.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              let removedItems = [];
              try {
                removedItems = JSON.parse(alert.items_removed || '[]');
              } catch (_) {}

              return (
                <div
                  key={alert.id}
                  className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-[0_2px_8px_rgba(244,63,94,0.03)] space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900">
                          {alert.table_name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          Order #{alert.order_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">
                          By: {alert.staff_name || 'Staff'}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">
                          {alert.modified_on?.substring(11, 16)}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                      Void Log
                    </span>
                  </div>

                  {/* Removed Items */}
                  {removedItems.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 space-y-1">
                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                        Items Cancelled / Voided:
                      </span>
                      {removedItems.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs text-rose-950 font-medium"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {it.qty || 1}x {it.item_name || it.name}
                          </span>
                          <span className="font-mono font-bold text-rose-700">
                            -₹{(parseFloat(it.price || 0) * (it.qty || 1)).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

