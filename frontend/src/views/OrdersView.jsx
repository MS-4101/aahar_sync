import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Clock,
  User,
  ArrowRightLeft,
  Receipt,
  Search,
  X,
  ChevronRight,
  Coffee,
} from 'lucide-react';

export const OrdersView = ({
  orders = [],
  tables = [],
  onSelectOrder,
}) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'dining' | 'billed'
  const [searchTerm, setSearchTerm] = useState('');

  const billedOrders = useMemo(() => orders.filter((o) => o.is_billed), [orders]);
  const diningOrders = useMemo(() => orders.filter((o) => !o.is_billed), [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchFilter =
        filter === 'all' ||
        (filter === 'dining' && !o.is_billed) ||
        (filter === 'billed' && o.is_billed);

      const matchSearch =
        o.table_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.staff_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(o.order_id).includes(searchTerm);

      return matchFilter && matchSearch;
    });
  }, [orders, filter, searchTerm]);

  return (
    <div className="space-y-3.5 pb-24">
      {/* 1. Header Filter Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>All KOTs</span>
            <span className="text-[10px] opacity-75">{orders.length}</span>
          </button>

          <button
            onClick={() => setFilter('dining')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'dining'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Dining Prep</span>
            <span className="text-[10px] font-bold">{diningOrders.length}</span>
          </button>

          <button
            onClick={() => setFilter('billed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'billed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Bill Printed</span>
            <span className="text-[10px] font-bold">{billedOrders.length}</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order / table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Orders Stream */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-2">
          <Coffee className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No active dining orders right now</p>
          <p className="text-[11px] text-slate-400">
            When kitchen punches new orders in AaharIN, they will live-stream here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const tableObj = tables.find((t) => t.table_id === order.table_id) || {
              table_id: order.table_id,
              table_name: order.table_name,
              status: order.is_billed ? 'Billed' : 'Running',
            };

            return (
              <motion.div
                key={order.order_table_id || order.order_id}
                layout
                whileHover={{ y: -1 }}
                onClick={() => onSelectOrder(tableObj, order)}
                className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-sm hover:border-slate-300 ${
                  order.is_billed
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                {/* Order Top Bar */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-slate-900">
                      {order.table_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      #{order.order_id}
                    </span>
                    {order.is_billed ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Bill Printed
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Kitchen Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{order.created_on?.substring(11, 16) || '--'}</span>
                  </div>
                </div>

                {/* Table Shift Warning if shifted */}
                {order.is_shifted && (
                  <div className="mt-2 text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-1.5 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3 h-3 flex-shrink-0" />
                    <span>Shifted: Transferred from {order.source_table_name || 'Previous Table'}</span>
                  </div>
                )}

                {/* Items List */}
                <div className="py-2.5 space-y-1.5">
                  {(order.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs text-slate-800"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                          {it.qty}x
                        </span>
                        <span className="truncate font-medium">{it.item_name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-700 flex-shrink-0">
                        ₹{(Number(it.qty || 1) * Number(it.price || 0)).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Order Footer */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-500">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Captain: <strong className="text-slate-800">{order.staff_name || 'Staff'}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      ₹{Number(order.grand_total || 0).toFixed(0)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
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
