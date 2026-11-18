import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ChevronRight, ShieldAlert, Lock, RefreshCw, Smartphone } from 'lucide-react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { OrderDrawer } from './components/OrderDrawer';
import { LoginView } from './views/LoginView';
import { DayReportModal } from './components/DayReportModal';
import { TablesView } from './views/TablesView';
import { HistoryView } from './views/HistoryView';
import { AlertsView } from './views/AlertsView';
import { fetchLiveState, subscribeToLiveStream, authStorage } from './services/api';
import { playVoidAlertChime } from './services/audioChime';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('UI Crash caught by ErrorBoundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white rounded-3xl border border-rose-200 shadow-sm my-6 max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <span className="text-xl">⚠️</span>
          </div>
          <h3 className="text-base font-bold text-slate-900">Display Issue Recovered</h3>
          <p className="text-xs text-slate-500">{String(this.state.error?.message || 'Unexpected display issue')}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Retry View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [user, setUser] = useState(() => authStorage.getUser());
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(() => {
    const savedUser = authStorage.getUser();
    return savedUser?.primaryRestaurantId || savedUser?.restaurants?.[0]?.id || null;
  });

  const [activeTab, setActiveTab] = useState('floor'); // 'floor' | 'history' | 'alerts'
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'paid' | 'due' | 'dining' | 'billed'
  const [isLive, setIsLive] = useState(false);
  const [payload, setPayload] = useState(null);

  // Sound notification toggle (persisted)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('aaharin_sound') !== 'false';
  });

  // Daily Report Modal
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Real-Time Loss Prevention Banner / Toast
  const [activeAlertBanner, setActiveAlertBanner] = useState(null);
  const lastAlertIdRef = useRef(null);
  const lastLiveVoidCountRef = useRef(null);

  // Drawer / Modal state for inspecting order items & timeline
  const [drawerTable, setDrawerTable] = useState(null);
  const [drawerOrder, setDrawerOrder] = useState(null);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('aaharin_sound', String(next));
      if (next) playVoidAlertChime();
      return next;
    });
  };

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Initial Fetch + SSE Subscription
  useEffect(() => {
    if (!user || !selectedRestaurantId) {
      setIsLive(false);
      setPayload(null);
      return;
    }

    let unsubscribe = null;

    // 1. Initial REST snapshot
    fetchLiveState(selectedRestaurantId)
      .then((data) => {
        if (data) {
          setPayload(data);
          setIsLive(true);
          const firstAlert = data.audit_alerts?.[0];
          lastAlertIdRef.current = firstAlert ? String(firstAlert.id || firstAlert.modified_on) : '__none__';
          lastLiveVoidCountRef.current = (data.running_orders || []).reduce(
            (sum, ro) => sum + (ro.voided_items?.length || 0),
            0
          );
        }
      })
      .catch(() => {
        setIsLive(false);
      });

    // 2. Real-time Live SSE Stream
    unsubscribe = subscribeToLiveStream(
      selectedRestaurantId,
      (newPayload) => {
        if (!newPayload) return;

        // Detect new cancellation either from audit_alerts OR from live active running order voids
        const newestAlert = newPayload.audit_alerts?.[0] || null;
        const currentAlertId = newestAlert ? String(newestAlert.id || newestAlert.modified_on) : '';

        const currentLiveVoidCount = (newPayload.running_orders || []).reduce(
          (sum, ro) => sum + (ro.voided_items?.length || 0),
          0
        );

        let isNewCancellation = false;
        let alertToDisplay = null;

        if (
          currentAlertId &&
          lastAlertIdRef.current !== null &&
          lastAlertIdRef.current !== '__none__' &&
          currentAlertId !== lastAlertIdRef.current
        ) {
          isNewCancellation = true;
          let rName = 'Cancelled Item';
          let rAmt = parseFloat(newestAlert.old_bill_amount || 0);
          try {
            const parsed = typeof newestAlert.items_removed === 'string'
              ? JSON.parse(newestAlert.items_removed || '[]')
              : (newestAlert.items_removed || []);
            if (Array.isArray(parsed) && parsed.length > 0) {
              rName = `${parsed[0].qty || 1}x ${parsed[0].item_name || 'Item'}`;
              rAmt = (parsed[0].price || 0) * (parsed[0].qty || 1);
            }
          } catch (_) {}

          alertToDisplay = {
            ...newestAlert,
            item_name: rName,
            void_amount: rAmt,
          };
        } else if (
          lastLiveVoidCountRef.current !== null &&
          currentLiveVoidCount > lastLiveVoidCountRef.current
        ) {
          isNewCancellation = true;
          const roWithVoid = (newPayload.running_orders || []).find(
            (ro) => ro.voided_items && ro.voided_items.length > 0
          );
          const vItem = roWithVoid?.voided_items?.[roWithVoid.voided_items.length - 1];
          alertToDisplay = {
            id: 'live_' + Date.now(),
            table_name: roWithVoid?.table_name || 'Table',
            staff_name: roWithVoid?.captain || 'Staff',
            modified_on: new Date().toISOString(),
            item_name: vItem ? `${vItem.qty || 1}x ${vItem.item_name}` : 'Item Voided',
            void_amount: vItem ? (vItem.price || 0) * (vItem.qty || 1) : 0,
            order: roWithVoid,
          };
        }

        // Update tracking refs
        lastAlertIdRef.current = currentAlertId;
        lastLiveVoidCountRef.current = currentLiveVoidCount;

        if (isNewCancellation && alertToDisplay) {
          setActiveAlertBanner(alertToDisplay);
          if (soundEnabled) {
            playVoidAlertChime();
          }
        }

        setPayload(newPayload);
        setIsLive(true);
      },
      (liveStatus) => {
        setIsLive(liveStatus);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, selectedRestaurantId, soundEnabled]);

  const handleLogout = () => {
    authStorage.clearToken();
    authStorage.clearUser();
    setUser(null);
    setPayload(null);
    setSelectedRestaurantId(null);
    setDrawerTable(null);
    setDrawerOrder(null);
    setActiveAlertBanner(null);
    setIsLive(false);
  };

  const handleSelectTableOrOrder = (table, order) => {
    setDrawerTable(table);
    setDrawerOrder(order);
  };

  const handleNavigateToHistory = (desiredFilter = 'all') => {
    setHistoryFilter(desiredFilter);
    setActiveTab('history');
  };

  if (!user) {
    return (
      <LoginView
        onLogin={(loggedInUser) => {
          authStorage.setUser(loggedInUser);
          setUser(loggedInUser);
          const firstRid = loggedInUser.primaryRestaurantId || loggedInUser.restaurants?.[0]?.id || null;
          setSelectedRestaurantId(firstRid);
        }}
      />
    );
  }

  // Dynamic Restaurant Name resolved strictly from logged-in user's data / live payload
  const activeRestaurantName =
    payload?.restaurant?.name ||
    user?.restaurants?.find((r) => String(r.id) === String(selectedRestaurantId))?.name ||
    user?.restaurants?.[0]?.name ||
    'Restaurant';

  // Safe Fallback Payload
  const activePayload = payload || {
    sync_version: '1.1',
    timestamp: new Date().toISOString(),
    restaurant_id: selectedRestaurantId,
    restaurant: {
      name: activeRestaurantName,
      city: user?.restaurants?.[0]?.city || '',
      phone: user?.mobile || '',
    },
    floor_summary: { total_tables: 0, running_tables: 0, billed_tables: 0, vacant_tables: 0 },
    tables_map: [],
    running_orders: [],
    recent_settlements: [],
    audit_alerts: [],
    today_summary: {
      date: new Date().toISOString().substring(0, 10),
      total_bills: 0,
      total_revenue: 0,
      total_discount: 0,
      total_tax: 0,
      payment_modes: [],
    },
  };

  const runningCount = activePayload.running_orders?.length || 0;
  const alertCount = activePayload.audit_alerts?.length || 0;

  // Auto-sync open Order Drawer with fresh SSE stream in real-time
  const activeLiveTable = drawerTable
    ? (activePayload.tables_map || []).find((t) => String(t.table_id) === String(drawerTable.table_id)) || drawerTable
    : null;

  const activeLiveOrder = drawerOrder
    ? (
        (activePayload.running_orders || []).find(
          (ro) =>
            String(ro.order_id) === String(drawerOrder.order_id) ||
            String(ro.order_table_id) === String(drawerOrder.order_table_id || drawerOrder.id)
        ) ||
        (activePayload.recent_settlements || []).find(
          (st) =>
            String(st.order_id) === String(drawerOrder.order_id) ||
            String(st.order_table_id) === String(drawerOrder.order_table_id || drawerOrder.id)
        ) ||
        drawerOrder
      )
    : (activeLiveTable?.order || null);

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-800 flex flex-col font-sans selection:bg-blue-500/20 selection:text-blue-700 antialiased">
      {/* 1. Top Header (Outlet info, Live SSE pulse, Logout) */}
      <Header
        restaurantName={activeRestaurantName}
        isLive={isLive}
        isAddonDisabled={Boolean(activePayload?.disabled)}
        lastSynced={activePayload.timestamp}
        restaurants={
          user?.restaurants?.length > 0
            ? user.restaurants
            : [{ id: selectedRestaurantId, name: activeRestaurantName }]
        }
        currentRestaurantId={selectedRestaurantId}
        onSelectRestaurant={(id) => {
          setSelectedRestaurantId(id);
          setPayload(null);
        }}
        user={user}
        onLogout={handleLogout}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        canInstallApp={Boolean(deferredPrompt)}
        onInstallApp={handleInstallApp}
      />

      {/* Real-time Loss Prevention Floating Popup Badge */}
      <AnimatePresence>
        {activeAlertBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-16 right-4 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] bg-white rounded-3xl p-4 border-2 border-rose-500 shadow-2xl shadow-rose-500/20 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0 animate-bounce">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                    <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider">
                      Live Item Cancelled (Void)
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                    Table {activeAlertBanner.table_name || 'Table'}
                  </h4>
                </div>
              </div>

              <button
                onClick={() => setActiveAlertBanner(null)}
                className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-2.5 rounded-2xl bg-rose-50/60 border border-rose-100 text-xs text-rose-950 font-medium space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold truncate pr-2">
                  {activeAlertBanner.item_name || 'Cancelled Item'}
                </span>
                {activeAlertBanner.void_amount ? (
                  <span className="font-mono font-bold text-rose-700 flex-shrink-0">
                    -₹{Number(activeAlertBanner.void_amount).toFixed(0)}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>By: {activeAlertBanner.staff_name || 'Staff'}</span>
                <span>{String(activeAlertBanner.modified_on || '').substring(11, 16) || 'Just now'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  const tObj = (activePayload.tables_map || []).find((t) => t.table_name === activeAlertBanner.table_name) || {
                    table_name: activeAlertBanner.table_name,
                  };
                  handleSelectTableOrOrder(tObj, activeAlertBanner.order || null);
                  setActiveAlertBanner(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Inspect Order Timeline</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('alerts');
                  setActiveAlertBanner(null);
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Audit Log
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 sm:p-6">
        <ErrorBoundary>
          {activePayload?.disabled ? (
            <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xl text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-block mb-2">
                  Add-on Feature Disabled
                </span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Cloud Sync Is Currently Turned Off
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Cloud Sync Companion is currently turned off for <strong>{activeRestaurantName}</strong> in AaharIN Firm Master. The sync engine is paused to eliminate unnecessary database and network consumption.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5 text-xs">
                <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider block">
                  How To Enable This Feature:
                </span>
                <ol className="list-decimal list-inside text-slate-600 space-y-1">
                  <li>Open AaharIN Desktop / Admin POS</li>
                  <li>Go to <strong>Firm Master ➔ Edit Firm</strong></li>
                  <li>Under <strong>Add-on Features</strong>, check <strong>"Cloud Sync Dashboard"</strong></li>
                  <li>Click <strong>Save</strong> and tap <strong>"Check Again & Re-connect"</strong> below</li>
                </ol>
              </div>

              <button
                onClick={() => {
                  fetchLiveState(selectedRestaurantId).then((data) => {
                    if (data) setPayload(data);
                  });
                }}
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Check Again & Re-connect</span>
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: LIVE FLOOR & ANALYTICS (Active tables sorted on TOP + Chart) */}
              {activeTab === 'floor' && (
                <div className="transition-opacity duration-200">
                  <TablesView
                    tables={activePayload.tables_map || []}
                    runningOrders={activePayload.running_orders || []}
                    recentSettlements={activePayload.recent_settlements || []}
                    todaySummary={activePayload.today_summary || {}}
                    onSelectTable={handleSelectTableOrOrder}
                    onNavigateToHistory={handleNavigateToHistory}
                    onOpenReport={() => setIsReportOpen(true)}
                  />
                </div>
              )}

              {/* TAB 2: ORDERS HISTORY & LOGS (Full history with search & timeline) */}
              {activeTab === 'history' && (
                <div className="transition-opacity duration-200">
                  <HistoryView
                    settlements={activePayload.recent_settlements || []}
                    runningOrders={activePayload.running_orders || []}
                    tables={activePayload.tables_map || []}
                    onSelectOrder={handleSelectTableOrOrder}
                    initialFilter={historyFilter}
                    restaurantId={selectedRestaurantId}
                  />
                </div>
              )}

              {/* TAB 3: AUDIT & VOIDS (Anti-Theft loss prevention log) */}
              {activeTab === 'alerts' && (
                <div className="transition-opacity duration-200">
                  <AlertsView
                    alerts={activePayload.audit_alerts || []}
                    discountAudits={activePayload.discount_audits || []}
                    restaurantId={selectedRestaurantId}
                  />
                </div>
              )}
            </>
          )}
        </ErrorBoundary>
      </main>

      {/* 4. Daily Business & Menu Performance Report Modal */}
      <DayReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        restaurantId={selectedRestaurantId}
        restaurantName={activeRestaurantName}
        summary={activePayload.today_summary || {}}
        topSellingItems={activePayload.top_selling_items || []}
        dayEndStatus={activePayload.day_end_status || {}}
      />

      {/* 5. Comprehensive Order Detail Modal with Vertical Timeline */}
      <OrderDrawer
        table={activeLiveTable}
        order={activeLiveOrder}
        onClose={() => {
          setDrawerTable(null);
          setDrawerOrder(null);
        }}
      />

      {/* 6. Mobile-First Bottom Dock (3 Core Tabs) */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          if (tab === 'history') setHistoryFilter('all');
          setActiveTab(tab);
        }}
        runningOrderCount={runningCount}
        alertCount={alertCount}
      />

      {/* 7. Mobile PWA 1-Tap Home Screen Install Floating Bar */}
      <AnimatePresence>
        {deferredPrompt && showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold truncate">Install AaharIN Live App</h5>
                <p className="text-[10px] text-slate-400 truncate">1-tap full screen access on your phone</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handleInstallApp}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Install
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                title="Dismiss"
                className="p-1.5 text-slate-400 hover:text-white rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
