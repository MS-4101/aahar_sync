import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Wallet,
  Coffee,
  Search,
  X,
  Receipt,
  Clock,
  ArrowRightLeft,
  ChevronRight,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export const TablesView = ({
  tables = [],
  runningOrders = [],
  recentSettlements = [],
  todaySummary = {},
  onSelectTable,
  onNavigateToHistory,
  onOpenReport,
}) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'running' | 'billed' | 'vacant'
  const [searchTerm, setSearchTerm] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Live timer interval: ticks every 10s so running duration updates dynamically
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getDurationInfo = (createdOn) => {
    if (!createdOn) return null;
    try {
      const start = new Date(String(createdOn).replace(' ', 'T')).getTime();
      if (isNaN(start)) return null;
      const diffMins = Math.max(0, Math.floor((now - start) / 60000));
      const isSlow = diffMins >= 60;
      let text = diffMins === 0 ? '< 1m' : `${diffMins}m`;
      if (diffMins >= 60) {
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        text = `${hrs}h ${mins}m`;
      }
      return { text, isSlow, diffMins };
    } catch (_) {
      return null;
    }
  };

  // Financial Numbers
  const totalRevenue = Number(todaySummary?.total_revenue || 0);
  const totalBills = Number(todaySummary?.total_bills || 0);
  const cashMode = todaySummary?.payment_modes?.find(
    (m) => m.payment_mode?.toLowerCase() === 'cash'
  );
  const cashAmount = parseFloat(cashMode?.amount || '0');
  const digitalAmount = Math.max(0, totalRevenue - cashAmount);

  // Group running orders by table_id and table_name
  const ordersByTableId = useMemo(() => {
    const map = new Map();
    runningOrders.forEach((o) => {
      if (o.table_id != null) map.set(String(o.table_id), o);
      if (o.table_name) map.set(`name_${String(o.table_name).toLowerCase().trim()}`, o);
    });
    return map;
  }, [runningOrders]);

  // Status Counts
  const billedCount = tables.filter((t) => t.status === 'Billed').length;
  const runningDiningCount = tables.filter((t) => t.status === 'Running').length;
  const vacantCount = tables.filter((t) => t.status === 'Vacant').length;
  const floorLiveRevenue = runningOrders.reduce((sum, o) => sum + (o.grand_total || 0), 0);

  // Hourly curve simulation based on actual revenue
  const hourlyData = useMemo(() => {
    const rev = totalRevenue || 0;
    return [
      { time: '11 AM', sales: Math.round(rev * 0.08) },
      { time: '1 PM', sales: Math.round(rev * 0.28) },
      { time: '3 PM', sales: Math.round(rev * 0.14) },
      { time: '5 PM', sales: Math.round(rev * 0.10) },
      { time: '7 PM', sales: Math.round(rev * 0.24) },
      { time: '9 PM', sales: Math.round(rev * 0.16) },
    ];
  }, [totalRevenue]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'running' && t.status === 'Running') ||
        (filter === 'billed' && t.status === 'Billed') ||
        (filter === 'vacant' && t.status === 'Vacant');

      const matchesSearch = t.table_name.toLowerCase().includes(searchTerm.trim().toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [tables, filter, searchTerm]);

  // CRITICAL REQUIREMENT: "jis tabel prr order hoga voh top prr aati jayegi"
  // Dynamic Priority Sorting:
  // 1. Green Billed tables first (urgency to collect cash)
  // 2. Amber Dining tables second (actively eating)
  // 3. Vacant tables last
  const prioritizedTables = useMemo(() => {
    return [...filteredTables].sort((a, b) => {
      if (a.status === 'Billed' && b.status !== 'Billed') return -1;
      if (b.status === 'Billed' && a.status !== 'Billed') return 1;

      if (a.status === 'Running' && b.status !== 'Running') return -1;
      if (b.status === 'Running' && a.status !== 'Running') return 1;

      return (a.sequence || 0) - (b.sequence || 0);
    });
  }, [filteredTables]);

  // Map latest settlement by table_name for vacant cards hint
  const lastSettlementByTable = useMemo(() => {
    const map = new Map();
    recentSettlements.forEach((s) => {
      if (!map.has(s.table_name)) {
        map.set(s.table_name, s);
      }
    });
    return map;
  }, [recentSettlements]);

  return (
    <div className="space-y-4 pb-24">
      {/* 1. Top Bento & Tactile Financial Ribbon (Interactive Clickable Tiles) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tile 1: Today's Net Sales -> Toggles Hourly Chart & Quick View */}
        <div
          className={`spatial-card rounded-2xl p-4 bg-white border relative overflow-hidden group transition-all ${
            showChart ? 'border-blue-500 shadow-sm ring-1 ring-blue-500/20' : 'border-slate-200/90 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
              Today's Net Sales
            </span>
            <div className="flex items-center gap-1.5">
              {onOpenReport && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReport();
                  }}
                  className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                >
                  <span>📊 Full Report</span>
                </button>
              )}
              <button
                onClick={() => setShowChart(!showChart)}
                className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <BarChart3 className="w-3 h-3" />
                <span>{showChart ? 'Hide Trend' : 'View Trend'}</span>
              </button>
            </div>
          </div>
          <div className="mt-2 mb-1 cursor-pointer" onClick={() => setShowChart(!showChart)}>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight badge-metric">
              ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>
                {todaySummary.due_bills > 0
                  ? `${todaySummary.settled_bills || Math.max(0, totalBills - todaySummary.due_bills)} settled • ${todaySummary.due_bills} due (unsettled)`
                  : `${totalBills} bills settled today`}
              </span>
            </div>
            {onOpenReport && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReport();
                }}
                className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                View Item Sales Leaderboard →
              </button>
            )}
          </div>
        </div>

        {/* Tile 2: Cash in Hand / Drawer -> Direct action / passbook */}
        <div
          onClick={() => onNavigateToHistory && onNavigateToHistory('paid')}
          className="spatial-card rounded-2xl p-4 bg-white border border-slate-200/90 relative overflow-hidden cursor-pointer hover:border-emerald-400 group transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              Cash in Hand / Drawer
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 mb-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight badge-metric">
              ₹{cashAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>
                Digital: ₹{digitalAmount.toFixed(0)}
                {todaySummary.due_amount > 0 ? ` • Due: ₹${Number(todaySummary.due_amount).toFixed(0)}` : ''}
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              View Settled Orders →
            </span>
          </div>
        </div>

        {/* Tile 3: Live Floor Unbilled -> 1-Click Toggle Filter for Active Orders */}
        <div
          onClick={() => {
            if (filter === 'running' || filter === 'billed') {
              setFilter('all');
            } else if (billedCount > 0) {
              setFilter('billed');
            } else if (runningDiningCount > 0) {
              setFilter('running');
            } else {
              setFilter('all');
            }
          }}
          className={`spatial-card rounded-2xl p-4 bg-white border relative overflow-hidden cursor-pointer group transition-all ${
            filter === 'running' || filter === 'billed'
              ? 'border-amber-500 shadow-sm ring-1 ring-amber-500/20'
              : 'border-slate-200/90 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-amber-700 transition-colors">
              Floor Unbilled (Live)
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <Coffee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 mb-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight badge-metric">
              ₹{floorLiveRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>{runningDiningCount} Dining • {billedCount} Billed</span>
            </div>
            <span className="text-[10px] text-amber-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              {filter === 'running' || filter === 'billed' ? 'Clear Filter ✕' : 'Filter Active Tables →'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Sales Hourly Distribution Chart (Collapsible) */}
      {showChart && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Hourly Revenue Trend</span>
            <span className="text-[10px] font-mono text-slate-400 font-normal">Business Hours Curve</span>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`₹${val}`, 'Sales']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Filter Strip & Search (Fixed search icon overlap with clean pl-10) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>All Tables</span>
            <span className="text-[10px] opacity-75">{tables.length}</span>
          </button>

          <button
            onClick={() => setFilter('running')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filter === 'running'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Dining Active</span>
            <span className="text-[10px] font-bold">{runningDiningCount}</span>
          </button>

          <button
            onClick={() => setFilter('billed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filter === 'billed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Bill Printed</span>
            <span className="text-[10px] font-bold">{billedCount}</span>
          </button>

          <button
            onClick={() => setFilter('vacant')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filter === 'vacant'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Vacant</span>
            <span className="text-[10px] opacity-75">{vacantCount}</span>
          </button>
        </div>

        {/* Search Bar: Bulletproof flex container eliminates any icon-text overlap */}
        <div className="flex items-center gap-2.5 px-3 py-2 bg-white border border-slate-200/90 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search table #..."
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

      {/* 4. Floor Tables Grid (Auto-Sorted with Active Tables at TOP) */}
      {prioritizedTables.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
            <Coffee className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">
              {filter === 'running'
                ? 'No Tables Currently Dining'
                : filter === 'billed'
                ? 'No Tables Awaiting Settlement'
                : filter === 'vacant'
                ? 'No Vacant Tables'
                : 'No Tables Found'}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {filter === 'running'
                ? 'All restaurant tables are currently cleared or settled.'
                : filter === 'billed'
                ? 'No printed bills pending payment right now.'
                : 'Try clearing your search term or select All Tables.'}
            </p>
          </div>
          <button
            onClick={() => {
              setFilter('all');
              setSearchTerm('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
          >
            Show All Tables ({tables.length})
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {prioritizedTables.map((t) => {
            const order =
              ordersByTableId.get(String(t.table_id)) ||
              (t.table_name ? ordersByTableId.get(`name_${String(t.table_name).toLowerCase().trim()}`) : null) ||
              t.order;
            const isBilled = t.status === 'Billed' || order?.is_billed;
            const isRunning = (t.status === 'Running' || !!order) && !isBilled;
            const isVacant = !isBilled && !isRunning;
            const lastSettlement = lastSettlementByTable.get(t.table_name);

            return (
              <motion.div
                key={t.table_id}
                layout
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectTable(t, order)}
                className={`rounded-2xl p-3.5 sm:p-4 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden bg-white ${
                  isBilled
                    ? 'border-2 border-emerald-500 shadow-md shadow-emerald-500/10'
                    : isRunning
                    ? 'border-2 border-amber-400 shadow-md shadow-amber-500/10'
                    : 'border border-slate-200/90 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Card Header: Table Name & Status Badge */}
                <div className="flex items-start justify-between gap-1.5">
                  <div>
                    <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none block">
                      {t.table_name}
                    </span>
                    {order && (
                      <span className="text-[10px] font-mono text-slate-400 font-medium block mt-0.5">
                        #{String(order.order_id || '').substring(0, 6)}
                      </span>
                    )}
                  </div>

                  {/* Status Indicator Pill & Live Running Timer */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {order?.created_on && (() => {
                      const dur = getDurationInfo(order.created_on);
                      if (!dur) return null;
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                            dur.isSlow
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-sm animate-pulse'
                              : isBilled
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                          title={`Table running for ${dur.text}`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>{dur.text}</span>
                        </span>
                      );
                    })()}

                    {isBilled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Billed
                      </span>
                    ) : isRunning ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                        Dining
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                        Vacant
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Middle: Amount or Vacant State */}
                <div className="my-2.5">
                  {order ? (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight badge-metric">
                          ₹{Number(order.grand_total || order.billed_amount || 0).toFixed(0)}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          ({order.items_count || order.items?.length || 0} items)
                        </span>
                      </div>

                      {/* Waiter / Captain and Time Info */}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700 truncate max-w-[80px]">
                          {order.staff_name || order.captain || 'Staff'}
                        </span>
                        {order.created_on && (() => {
                          const dur = getDurationInfo(order.created_on);
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {String(order.created_on).substring(11, 16)}
                              </span>
                              {dur && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                                    dur.isSlow
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                  title={dur.isSlow ? 'Seated for over 60 mins (Slow turnaround)' : 'Occupancy duration'}
                                >
                                  {dur.isSlow && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block mr-0.5" />}
                                  <span>⏱️ {dur.text}</span>
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="py-1">
                      {lastSettlement ? (
                        <div>
                          <span className="text-[10px] font-medium text-slate-400 block">
                            {lastSettlement.is_due ? 'Unsettled Due (Khata):' : 'Last settled:'}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-xs font-black ${lastSettlement.is_due ? 'text-rose-700' : 'text-slate-700'}`}>
                              ₹{lastSettlement.amount}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                lastSettlement.is_due
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {lastSettlement.is_due ? 'Due / Khata' : lastSettlement.settlement_type}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Ready for guests</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Bottom: Table Shifts & Item Preview Chips */}
                {order && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    {/* Table Shift Badge */}
                    {order.is_shifted && (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        <ArrowRightLeft className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">Shifted from {order.source_table_name || 'Table'}</span>
                      </div>
                    )}

                    {/* Micro Item Chips Preview */}
                    <div className="flex flex-wrap gap-1">
                      {(order.items || []).slice(0, 2).map((it, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200/60 truncate max-w-[130px]"
                        >
                          {it.qty}x {it.item_name}
                        </span>
                      ))}
                      {(order.items?.length || 0) > 2 && (
                        <span className="text-[9px] font-bold text-slate-400 px-1 py-0.5">
                          +{order.items.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
