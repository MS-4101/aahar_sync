import React from 'react';
import {
  TrendingUp,
  Wallet,
  CreditCard,
  QrCode,
  Receipt,
  Clock,
  User,
  Coffee,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const OverviewView = ({
  summary = {},
  tables = [],
  runningOrders = [],
  settlements = [],
  onNavigateToTables,
}) => {
  const totalRevenue = Number(summary?.total_revenue || 0);
  const totalBills = Number(summary?.total_bills || 0);
  const avgBill = totalBills > 0 ? totalRevenue / totalBills : 0;

  // Mode Breakdown
  let cashAmount = 0;
  let cardAmount = 0;
  let upiAmount = 0;
  let dueAmount = 0;

  (summary?.payment_modes || []).forEach((m) => {
    const name = (m.payment_mode || '').toLowerCase();
    const amt = parseFloat(m.amount || '0');
    if (name.includes('cash')) cashAmount += amt;
    else if (name.includes('card')) cardAmount += amt;
    else if (name.includes('upi') || name.includes('online')) upiAmount += amt;
    else if (name.includes('due') || name.includes('credit')) dueAmount += amt;
  });

  // Floor stats
  const diningCount = tables.filter((t) => t.status === 'Running').length;
  const billedCount = tables.filter((t) => t.status === 'Billed').length;
  const vacantCount = tables.filter((t) => t.status === 'Vacant').length;
  const unbilledFloorTotal = runningOrders.reduce((sum, o) => sum + (o.grand_total || 0), 0);

  return (
    <div className="space-y-4 pb-24">
      {/* 1. Today's Net Revenue Hero Card (Clean Toast/Square Style) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Today's Net Sales
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {summary?.date || 'Today'}
          </span>
        </div>

        <div>
          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight badge-metric">
            ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Sub Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Bills</span>
            <span className="text-sm font-bold text-slate-800 font-mono mt-0.5 block">
              {totalBills} Settled
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Avg Ticket</span>
            <span className="text-sm font-bold text-slate-800 font-mono mt-0.5 block">
              ₹{avgBill.toFixed(0)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Tax / GST</span>
            <span className="text-sm font-bold text-slate-800 font-mono mt-0.5 block">
              ₹{Number(summary?.total_tax || 0).toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tender / Cash vs Digital Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Cash in Hand */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Cash in Hand</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-bold text-emerald-700 badge-metric">
              ₹{cashAmount.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Card / POS */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Card / POS</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-bold text-slate-900 badge-metric">
              ₹{cardAmount.toFixed(0)}
            </span>
          </div>
        </div>

        {/* UPI / QR */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">UPI / QR</span>
            <QrCode className="w-4 h-4 text-violet-600" />
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-bold text-slate-900 badge-metric">
              ₹{upiAmount.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Due / Khata */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Due / Khata</span>
            <Receipt className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-bold text-rose-700 badge-metric">
              ₹{dueAmount.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Live Floor Snapshot Card */}
      <div
        onClick={onNavigateToTables}
        className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Live Restaurant Floor</span>
              {diningCount + billedCount > 0 && (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {diningCount + billedCount} Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Unbilled Floor: <strong className="text-slate-800 font-mono">₹{unbilledFloorTotal.toFixed(0)}</strong> • {vacantCount} Vacant Tables
            </p>
          </div>
        </div>

        <div className="flex items-center text-xs font-bold text-blue-600 gap-0.5">
          <span>View Floor</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* 4. Live Settlement Ledger (Passbook) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-800">
            Settlement Feed ({settlements.length})
          </span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase">
            Live Payment Log
          </span>
        </div>

        {settlements.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 text-xs text-slate-400">
            No bills settled today yet.
          </div>
        ) : (
          <div className="space-y-2">
            {settlements.map((s) => {
              const isCash = s.settlement_type?.toLowerCase().includes('cash');
              const isCard = s.settlement_type?.toLowerCase().includes('card');
              const isUpi = s.settlement_type?.toLowerCase().includes('upi');

              return (
                <div
                  key={s.id}
                  className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {s.table_name}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          #{s.invoice_no}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            isCash
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isCard
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : isUpi
                              ? 'bg-violet-50 text-violet-700 border border-violet-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.settlement_type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="text-slate-600 font-medium">{s.settled_by || 'Staff'}</span>
                        <span>•</span>
                        <span className="font-mono">{s.settled_at?.substring(11, 16) || '--'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-bold text-slate-900 font-mono block">
                      ₹{Number(s.amount || 0).toFixed(0)}
                    </span>
                    <span className="text-[9px] font-semibold text-emerald-600">Settled</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

