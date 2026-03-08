
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Home from './Home';
import CategoryPage from './CategoryPage';
import UpcomingSales from './UpcomingSales';
import ProductDetail from './ProductDetail';
import Scan from './Scan';
import Rewards from './Rewards';
import Cart from './Cart';
import ReceiptView from './ReceiptView';
import Profile from './Profile';
import SmartChef from './SmartChef';
import Settings from './Settings';
import Notifications from './Notifications';
import Support from './Support';
import { AppRoute, Product, User, CartItem, Receipt, CategoryPageState, ThemeMode } from '../types';
import { X, ShoppingCart, Eye, XCircle } from 'lucide-react';
import { api } from '../services/api';

import { ToastContainer, ToastMessage, ToastType } from '../components/Toast';
import { useWebSocket } from '../hooks/useWebSocket';

interface CustomerAppProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const CustomerApp: React.FC<CustomerAppProps> = ({ user, onLogout, onUpdateUser, themeMode, setThemeMode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: ToastType, message: string) => {
    setToasts(prev => {
      // Prevent duplicate messages
      if (prev.some(t => t.message === message && t.type === type)) {
        return prev;
      }
      // Limit number of toasts to 3
      const activeToasts = prev.length >= 3 ? prev.slice(1) : prev;
      return [...activeToasts, { id: Date.now().toString(), type, message }];
    });
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const saved = localStorage.getItem('logi_current_route');
    return saved ? (saved as AppRoute) : AppRoute.HOME;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Navigation History Stack
  const [navHistory, setNavHistory] = useState<{ route: AppRoute; productId?: number }[]>([]);

  // Profile State Control
  const [profileActiveTab, setProfileActiveTab] = useState<'info' | 'history'>('info');

  // Large Bonus Modal State
  const [showBonusModal, setShowBonusModal] = useState(false);

  // Navigation State
  const [selectedProductId, setSelectedProductId] = useState<number | null>(() => {
    const saved = localStorage.getItem('logi_selected_product');
    return saved ? Number(saved) : null;
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'product' | 'receipt' | 'pos'>('product');
  const [viewingFromScan, setViewingFromScan] = useState(false);

  // Smart Chef Ingredient State
  const [smartChefIngredients, setSmartChefIngredients] = useState<string[]>([]);

  // Product Preview Modal State (Scan & Go)
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Scan Analytics: track the current scan event ID
  const [currentScanEventId, setCurrentScanEventId] = useState<number | null>(null);

  // Global Category State (Preserved on navigation and in localStorage)
  const [categoryState, setCategoryState] = useState<CategoryPageState>(() => {
    const saved = localStorage.getItem('logi_category_state');
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return {
      activeCategory: 'all',
      sortBy: 'rating',
      showFilters: false,
      filters: { q: '', type: 'all', maxPrice: 500, onlyDiscounted: false, sugarFree: false, marketId: undefined },
      scrollPosition: 0
    };
  });

  // Persist category state
  useEffect(() => {
    localStorage.setItem('logi_category_state', JSON.stringify(categoryState));
  }, [categoryState]);

  // Persist current route
  useEffect(() => {
    localStorage.setItem('logi_current_route', currentRoute);
    if (selectedProductId) {
      localStorage.setItem('logi_selected_product', String(selectedProductId));
    }
    // Always scroll to top on route change
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentRoute, selectedProductId]);

  // Session Management: Clear temp state on full tab close, preserve on background
  useEffect(() => {
    // Cleanup function for when user fully closes the app
    const handleBeforeUnload = () => {
      // Clear navigation state - user starts fresh on next visit
      localStorage.removeItem('logi_current_route');
      localStorage.removeItem('logi_selected_product');
      localStorage.removeItem('logi_category_state');
      // Don't clear: logi_token, logi_user, logi_theme (these persist across sessions)
      // Clear AI caches (they should be per-session only)
      sessionStorage.clear();
    };

    // Save state when tab goes to background (for tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Store current state for when user returns
        sessionStorage.setItem('logi_nav_preserved', 'true');
      } else if (document.visibilityState === 'visible') {
        // User returned - state is already in localStorage
        const wasPreserved = sessionStorage.getItem('logi_nav_preserved');
        if (wasPreserved) {
          // This was a tab switch, not a fresh open - keep state
          sessionStorage.removeItem('logi_nav_preserved');
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Hardware back button support (Android/PWA)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();

      // If scanning, close scanner first
      if (isScanning) {
        setIsScanning(false);
        window.history.pushState(null, '', window.location.pathname);
        return;
      }

      // If product preview open, close it
      if (previewProduct) {
        setPreviewProduct(null);
        window.history.pushState(null, '', window.location.pathname);
        return;
      }

      // If sidebar open, close it
      if (isSidebarOpen) {
        setIsSidebarOpen(false);
        window.history.pushState(null, '', window.location.pathname);
        return;
      }

      // If has navigation history, go back
      if (navHistory.length > 0) {
        goBack();
        window.history.pushState(null, '', window.location.pathname);
        return;
      }

      // If not on home, go to home
      if (currentRoute !== AppRoute.HOME) {
        setCurrentRoute(AppRoute.HOME);
        window.history.pushState(null, '', window.location.pathname);
        return;
      }

      // On home with no history - push state to prevent exit
      window.history.pushState(null, '', window.location.pathname);
    };

    // Push initial state
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isScanning, previewProduct, isSidebarOpen, navHistory, currentRoute]);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);

  // WebSocket Integration
  useWebSocket(user ? `/topic/notifications/${user.id}` : '/topic/dummy', (message) => {
    if (message && message.title) {
      showToast(message.title, message.type || 'info');
    }
  });

  // Initial Data Load
  useEffect(() => {
    // In a real app, we might fetch user specific data here
  }, [user]);

  const handleNavigate = (route: AppRoute, productId?: number, query?: any) => {
    // Prevent reload if already on the same route without product change
    if (currentRoute === route && !productId && !query && route !== AppRoute.SCAN) {
      return; // Same route, no action needed
    }

    if (route !== AppRoute.SCAN) setIsScanning(false);

    if (route === AppRoute.SCAN) {
      setIsScanning(true);
      setCurrentRoute(AppRoute.SCAN); // Set route for navbar highlight
      return;
    }

    // Push current route to history before navigating (for goBack)
    if (currentRoute !== route || (productId && productId !== selectedProductId)) {
      setNavHistory(prev => [...prev, { route: currentRoute, productId: selectedProductId || undefined }]);
    }

    if (productId) {
      setSelectedProductId(productId);
      setViewingFromScan(false);
    }

    // Handle Query Params (e.g. from Home category click)
    if (query) {
      if (query.category) {
        setCategoryState(prev => ({
          ...prev,
          activeCategory: query.category,
          filters: {
            q: '',
            type: 'all',
            maxPrice: 500,
            onlyDiscounted: false,
            sugarFree: false
          }
        }));
      }
    }

    setCurrentRoute(route);
    window.scrollTo(0, 0);
  };

  // Go back to previous route in history
  const goBack = () => {
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      setNavHistory(h => h.slice(0, -1));
      if (prev.productId) setSelectedProductId(prev.productId);
      setCurrentRoute(prev.route);
    } else {
      setCurrentRoute(AppRoute.HOME);
    }
    window.scrollTo(0, 0);
  };

  const handleProfileNav = (tab: 'info' | 'history') => {
    setProfileActiveTab(tab);
    setCurrentRoute(AppRoute.PROFILE);
  };

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // LIMIT CHECK
        if (product.unitType === 'count' && existing.quantity >= 5) {
          showToast('error', 'Bu məhsuldan maksimum 5 ədəd ala bilərsiniz.');
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast('success', `${product.name} səbətə əlavə edildi!`);
    setCurrentRoute(AppRoute.CART);
    setViewingFromScan(false);
    setIsScanning(false);
  };

  const handleCheckoutSuccess = (receipt: Receipt) => {
    // Track purchased items for scan analytics
    if (user?.id && cart.length > 0) {
      const productIds = cart.map(item => item.id);
      api.markScanPurchased(user.id, productIds).catch(e => console.log('Purchase track error:', e));
    }

    setLastReceipt(receipt);
    setCart([]);
    refreshUser();
    setCurrentRoute(AppRoute.RECEIPT);
  };

  const refreshUser = async () => {
    const updatedUser = await api.getCurrentUser();
    if (updatedUser) onUpdateUser(updatedUser);
  };

  const handleScanSuccess = async (type: 'product' | 'receipt' | 'pos', id: string, data?: any) => {
    // setIsScanning(false); // Deleted to keep scanner open on error
    if (type === 'product') {
      showToast('info', 'Axtarılır...');
      let foundProduct = null;
      const numericId = Number(id);

      // Try by ID only if it's a valid number
      if (!isNaN(numericId)) {
        try {
          foundProduct = await api.getProduct(numericId, user?.id);
        } catch (e) {
          // Ignore, might be barcode
        }
      }

      // If not found by ID (or not a number), try by Barcode
      if (!foundProduct) {
        try {
          const byBarcode = await api.getProductByBarcode(id, user?.id);
          if (byBarcode) {
            foundProduct = byBarcode;
          }
        } catch (e) {
          // Ignore
        }
      }

      if (foundProduct) {
        showToast('success', 'Məhsul tapıldı!');
        setIsScanning(false); // Close scanner
        setPreviewProduct(foundProduct); // Show preview modal instead of navigating directly

        // Track scan event for analytics
        try {
          const scanResult = await api.trackProductScan(foundProduct.id, user?.id, 'BARCODE');
          if (scanResult?.id) {
            setCurrentScanEventId(scanResult.id);
          }
        } catch (e) {
          console.log('Scan tracking error (non-critical):', e);
        }
      } else {
        showToast('error', `Məhsul sistemdə tapılmadı: ${id}`);
        console.warn(`Product not found: ${id}`);
        // Do NOT close scanner, let them try again immediately
      }
    } else if (type === 'receipt' && data) {
      setIsScanning(false); // Close on success
      setLastReceipt(data);
      refreshUser();
      setCurrentRoute(AppRoute.RECEIPT);
    } else if (type === 'pos') {
      if (!user) return;
      try {
        const receipt = await api.processPOSPayment(user.id, cart, id, undefined, 0, undefined);
        if (receipt) {
          setIsScanning(false); // Close on success
          setLastReceipt(receipt);
          setCart([]);
          refreshUser();
          setCurrentRoute(AppRoute.RECEIPT);
          showToast('success', "Ödəniş uğurla tamamlandı!");
        }
      } catch (e: any) {
        showToast('error', "Ödəniş xətası: " + e.message);
      }
    }
  };

  // Product Preview Modal Handlers
  const handlePreviewClose = () => {
    setPreviewProduct(null);
    // Scan event stays as "not added to cart" (abandoned) - no update needed
    setCurrentScanEventId(null);
  };

  const handlePreviewDetails = () => {
    if (previewProduct) {
      setSelectedProductId(previewProduct.id);
      setViewingFromScan(true);
      setCurrentRoute(AppRoute.PRODUCT);
      setPreviewProduct(null);
    }
  };

  const handlePreviewAddToCart = () => {
    if (previewProduct) {
      handleAddToCart(previewProduct);
      setPreviewProduct(null);

      // Track cart add for scan analytics
      if (currentScanEventId) {
        api.markScanCartAdded(currentScanEventId).catch(e => console.log('Cart track error:', e));
        setCurrentScanEventId(null);
      }
    }
  };

  const renderContent = () => {
    // Handle Scan page separately to show navbar
    if (isScanning) {
      return <Scan onClose={() => { setIsScanning(false); setCurrentRoute(AppRoute.HOME); }} onScanSuccess={handleScanSuccess} initialMode={scanMode} onShowToast={showToast} />;
    }

    switch (currentRoute) {
      case AppRoute.HOME: return <Home user={user} onNavigate={handleNavigate} onOpenSidebar={() => setIsSidebarOpen(true)} />;
      case AppRoute.CATEGORIES: return <CategoryPage
        onNavigate={handleNavigate}
        initialCategory={categoryState.activeCategory}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        currentFilters={categoryState.filters}
        onFilterChange={(newFilters) => setCategoryState(prev => ({
          ...prev,
          filters: { ...prev.filters, ...newFilters },
          activeCategory: newFilters.category // also sync category back if changed from within
        }))}
        user={user}
      />;
      case AppRoute.UPCOMING: return <UpcomingSales onOpenSidebar={() => setIsSidebarOpen(true)} />;
      case AppRoute.PRODUCT:
        return <ProductDetail productId={selectedProductId || undefined} onBack={goBack} currentUser={user} onNavigate={handleNavigate} isScanContext={viewingFromScan} onAddToCart={handleAddToCart} />;
      case AppRoute.CART: return <Cart cartItems={cart} user={user} onCheckoutSuccess={handleCheckoutSuccess} onNavigate={handleNavigate} onUpdateCart={setCart} onOpenSidebar={() => setIsSidebarOpen(true)} />;
      case AppRoute.RECEIPT: return <ReceiptView receipt={lastReceipt} onBack={goBack} onNavigate={handleNavigate} onAnalyze={(ingredients) => { setSmartChefIngredients(ingredients); setCurrentRoute(AppRoute.SMART_CHEF); }} />;
      case AppRoute.REWARDS: return <Rewards user={user} onSimulateCashierScan={(mode) => { setScanMode(mode || 'product'); setIsScanning(true); setCurrentRoute(AppRoute.SCAN); }} onOpenSidebar={() => setIsSidebarOpen(true)} onNavigate={handleNavigate} onShowToast={showToast} />;
      case AppRoute.SMART_CHEF: return <SmartChef ingredients={smartChefIngredients} onBack={goBack} onNavigate={handleNavigate} />;
      case AppRoute.PROFILE: return <Profile user={user} initialTab={profileActiveTab} onNavigate={handleNavigate} onLogout={onLogout} onViewReceipt={(r) => { setLastReceipt(r); setCurrentRoute(AppRoute.RECEIPT); }} onUpdateUser={async (u) => { if (user) onUpdateUser(await api.updateUser(user.id, u) || u); }} onOpenSidebar={() => setIsSidebarOpen(true)} />;
      case AppRoute.SETTINGS: return <Settings onBack={goBack} onLogout={onLogout} currentTheme={themeMode} onSetTheme={setThemeMode} />;
      case AppRoute.NOTIFICATIONS: return <Notifications onBack={goBack} />;
      case AppRoute.SUPPORT: return <Support onBack={goBack} />;
      default: return <Home user={user} onNavigate={handleNavigate} onOpenSidebar={() => setIsSidebarOpen(true)} />;
    }
  };

  return (
    <>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        onProfileNav={handleProfileNav}
        onShowBonusCard={() => setShowBonusModal(true)}
      />

      {/* Scan is now rendered inside renderContent() to show navbar */}

      {/* Product Preview Modal (Scan & Go) - Enhanced Design */}
      {previewProduct && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-[28px] overflow-hidden shadow-2xl transform transition-all">
            {/* Product Image with gradient background */}
            <div className="relative h-56 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700">
              <img
                src={previewProduct.image}
                alt={previewProduct.name}
                className="w-full h-full object-contain p-6 drop-shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200';
                }}
              />

              {/* Discount Badge */}
              {(previewProduct.isDiscount || previewProduct.hasPersonalDiscount) && (
                <div className={`absolute top-4 left-4 ${previewProduct.hasPersonalDiscount ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-red-500 to-orange-500'} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1`}>
                  {previewProduct.hasPersonalDiscount ? (
                    <>✨ Sizə Özəl</>
                  ) : (
                    <>🏷️ -{Math.round((1 - previewProduct.price / (previewProduct.oldPrice || previewProduct.price)) * 100)}%</>
                  )}
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={handlePreviewClose}
                className="absolute top-4 right-4 w-10 h-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-full flex items-center justify-center text-slate-600 dark:text-white hover:bg-white dark:hover:bg-slate-700 transition shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Stock badge */}
              <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 shadow">
                {previewProduct.stockQuantity > 0 ? `📦 Stokda: ${previewProduct.stockQuantity}` : '❌ Stokda yoxdur'}
              </div>
            </div>

            {/* Product Info */}
            <div className="p-6">
              {/* Category & Brand */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                  {previewProduct.category}
                </span>
                {previewProduct.brand && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {previewProduct.brand}
                  </span>
                )}
              </div>

              {/* Product Name */}
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3 leading-tight">{previewProduct.name}</h3>

              {/* Price Section */}
              <div className="flex items-end gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  ₼{(previewProduct.personalPrice || previewProduct.price).toFixed(2)}
                </span>
                {previewProduct.hasPersonalDiscount && previewProduct.personalPrice ? (
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-400 line-through">₼{previewProduct.price.toFixed(2)}</span>
                    {previewProduct.oldPrice && previewProduct.oldPrice > previewProduct.price && (
                      <span className="text-xs text-slate-300 line-through">₼{previewProduct.oldPrice.toFixed(2)}</span>
                    )}
                  </div>
                ) : previewProduct.isDiscount && previewProduct.oldPrice ? (
                  <span className="text-sm text-slate-400 line-through">₼{previewProduct.oldPrice.toFixed(2)}</span>
                ) : null}
              </div>

              {/* Barcode */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 px-4 py-2 rounded-xl">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h2m14 0h2M6 20h2M6 8h2M6 4h2m4-2v2m0 4v4m6-6v2m0 4v4" />
                  </svg>
                  <span className="font-mono text-sm text-slate-600 dark:text-slate-300">{previewProduct.barcode}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handlePreviewAddToCart}
                  disabled={previewProduct.stockQuantity <= 0}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Səbətə Əlavə Et
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={handlePreviewDetails}
                    className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    <Eye className="w-4 h-4" />
                    Detallı Bax
                  </button>
                  <button
                    onClick={handlePreviewClose}
                    className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    <XCircle className="w-4 h-4" />
                    Bağla
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBonusModal && user && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="relative w-full max-w-sm">
            <button onClick={() => setShowBonusModal(false)} className="absolute -top-12 right-0 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur"><X className="w-6 h-6" /></button>
            <div className="w-full bg-white rounded-3xl p-1 shadow-[0_0_50px_rgba(16,185,129,0.3)] overflow-hidden">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-6 rounded-t-[20px] text-white relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                  <div><h3 className="text-2xl font-bold tracking-wide">Logi<span className="font-light">PLUS</span></h3><p className="text-[10px] opacity-80">Rəqəmsal Müştəri Kartı</p></div>
                  <div className="text-right"><p className="text-xs opacity-70">Balans</p><p className="font-bold text-xl">{user.points}</p></div>
                </div>
              </div>
              <div className="bg-white p-8 pb-12 flex flex-col items-center rounded-b-[20px]">
                <div className="w-full h-24 flex gap-1 justify-center items-end overflow-hidden mb-4 px-4">{[...Array(45)].map((_, i) => <div key={i} className={`bg-black rounded-t-sm h-full ${Math.random() > 0.5 ? 'w-1.5' : 'w-3'}`}></div>)}</div>
                <p className="font-mono text-2xl font-bold tracking-[0.2em] text-slate-800">{user.phone.replace(/\+/g, '')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`w-full max-w-[100vw] overflow-x-hidden ${currentRoute === AppRoute.PRODUCT || isScanning ? '' : 'pb-24'}`}>
        {renderContent()}
      </main>

      {!showBonusModal && <Navbar activeRoute={isScanning ? AppRoute.SCAN : currentRoute} onNavigate={handleNavigate} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} />}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
};

export default CustomerApp;
