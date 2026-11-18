import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, ChevronDown, WifiOff, LogOut, Building2, User, Volume2, VolumeX, Smartphone } from 'lucide-react';

export const Header = ({
  restaurantName,
  isLive,
  isAddonDisabled = false,
  lastSynced,
  restaurants = [],
  currentRestaurantId,
  onSelectRestaurant,
  user,
  onLogout,
  soundEnabled = true,
  onToggleSound,
  canInstallApp = false,
  onInstallApp,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 sm:px-6 py-2.5 shadow-sm">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Outlet Switcher */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="relative min-w-0">
            {restaurants.length > 1 ? (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 text-left group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[140px] sm:max-w-xs group-hover:text-blue-600 transition-colors tracking-tight">
                      {restaurantName || 'Restaurant'}
                    </h1>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform ${
                        dropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Owner Companion • Live
                  </span>
                </div>
              </button>
            ) : (
              <div>
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[150px] sm:max-w-xs tracking-tight">
                  {restaurantName || 'Restaurant'}
                </h1>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Owner Companion • Live
                </span>
              </div>
            )}

            {/* Outlet Switcher Dropdown */}
            <AnimatePresence>
              {dropdownOpen && restaurants.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50"
                >
                  <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Switch Outlet
                  </div>
                  <div className="max-h-56 overflow-y-auto p-1 space-y-1">
                    {restaurants.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          onSelectRestaurant(r.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          r.id === currentRestaurantId
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{r.name}</span>
                        {r.id === currentRestaurantId && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Status Pill & Logout Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Live Sync Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
              isAddonDisabled
                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                : isLive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {isAddonDisabled ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="tracking-wider text-[10px] font-black uppercase">ADDON DISABLED</span>
              </>
            ) : isLive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="tracking-wider text-[10px] font-black uppercase">LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-600" />
                <span className="text-[10px] font-black uppercase">OFFLINE</span>
              </>
            )}
          </div>

          {/* Sound Notification Alert Toggle */}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute Void Chime' : 'Enable Void Chime'}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                soundEnabled
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  : 'bg-rose-50 text-rose-600 border-rose-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-rose-500" />}
              <span className="hidden sm:inline text-[11px] font-bold">
                {soundEnabled ? 'Alerts ON' : 'Muted'}
              </span>
            </button>
          )}

          {/* PWA Install Button (When browser supports installation) */}
          {canInstallApp && onInstallApp && (
            <button
              onClick={onInstallApp}
              title="Install AaharIN Live App on your Device"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline text-[11px]">Install App</span>
            </button>
          )}

          {/* User Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate max-w-[100px]">{user?.name || user?.username || 'Owner'}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title="Log Out"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 active:bg-rose-100 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
