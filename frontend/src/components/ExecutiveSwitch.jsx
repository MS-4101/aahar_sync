import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, IndianRupee } from 'lucide-react';

export const ExecutiveSwitch = ({
  activeTab,
  onChangeTab,
  runningCount = 0,
  alertCount = 0,
}) => {
  return (
    <div className="w-full flex justify-center mb-5 sm:mb-6">
      <div className="p-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-sm flex items-center gap-1.5 w-full max-w-md">
        {/* Tab 1: Floor & Live */}
        <button
          onClick={() => onChangeTab('floor')}
          className={`relative flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors ${
            activeTab === 'floor'
              ? 'text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          {activeTab === 'floor' && (
            <motion.div
              layoutId="executiveTabPill"
              className="absolute inset-0 bg-gradient-to-r from-rose-500 via-red-600 to-rose-700 rounded-xl shadow-md shadow-rose-600/30"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <LayoutGrid className="w-4 h-4 relative z-10" />
          <span className="relative z-10 tracking-tight">Floor & Live</span>
          {runningCount > 0 && (
            <span
              className={`relative z-10 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                activeTab === 'floor'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {runningCount}
            </span>
          )}
        </button>

        {/* Tab 2: Activity & Money */}
        <button
          onClick={() => onChangeTab('activity')}
          className={`relative flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors ${
            activeTab === 'activity'
              ? 'text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          {activeTab === 'activity' && (
            <motion.div
              layoutId="executiveTabPill"
              className="absolute inset-0 bg-gradient-to-r from-rose-500 via-red-600 to-rose-700 rounded-xl shadow-md shadow-rose-600/30"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <IndianRupee className="w-4 h-4 relative z-10" />
          <span className="relative z-10 tracking-tight">Activity & Money</span>
          {alertCount > 0 && (
            <span
              className={`relative z-10 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                activeTab === 'activity'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {alertCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
