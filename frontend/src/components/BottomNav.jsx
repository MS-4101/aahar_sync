import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  History,
  ShieldAlert,
} from 'lucide-react';

export const BottomNav = ({
  activeTab,
  onChangeTab,
  runningOrderCount = 0,
  alertCount = 0,
}) => {
  const tabs = [
    {
      id: 'floor',
      label: 'Live Floor',
      icon: LayoutGrid,
      badge: runningOrderCount,
      isAlert: false,
    },
    {
      id: 'history',
      label: 'Order Logs',
      icon: History,
      badge: 0,
      isAlert: false,
    },
    {
      id: 'alerts',
      label: 'Audit & Voids',
      icon: ShieldAlert,
      badge: alertCount,
      isAlert: true,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 pb-safe shadow-[0_-4px_24px_rgba(15,23,42,0.06)]">
      <nav className="max-w-md mx-auto flex items-center justify-around px-3 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className="relative flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all active:scale-95 cursor-pointer"
            >
              {/* Active Tab Glow Pill */}
              {isActive && (
                <motion.div
                  layoutId="activeBottomNavPill"
                  className="absolute inset-0 bg-slate-900 rounded-2xl shadow-md shadow-slate-900/20"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}

              {/* Icon Container with Badge */}
              <div className="relative z-10 flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {/* Badge Notification */}
                {tab.badge > 0 && (
                  <span
                    className={`absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-black ring-2 ring-white ${
                      tab.isAlert
                        ? 'bg-rose-600 text-white shadow-sm'
                        : isActive
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-amber-500 text-slate-950 font-bold'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`relative z-10 text-[11px] font-bold mt-1 tracking-tight transition-colors ${
                  isActive ? 'text-white' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
