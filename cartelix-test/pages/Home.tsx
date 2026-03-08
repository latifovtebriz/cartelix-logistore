import React, { useEffect, useState } from 'react';
import { GlassCard } from '../components/GlassComponents';
import { api } from '../services/api';
import { Product, AppRoute, User, Market, Category } from '../types';
// All AI logic is in backend - no frontend AI imports
import { Sparkles, TrendingUp, Grid, Menu, Apple, Milk, Croissant, Drumstick, ShoppingBag, CupSoda, Candy, SprayCan, Coffee, Wheat, Beef, GlassWater } from 'lucide-react';
import { SmartPrice } from '../components/SmartPrice';
import { useWebSocket } from '../hooks/useWebSocket';

interface HomeProps {
  user: User | null;
  onNavigate: (route: AppRoute, productId?: number, query?: any) => void;
  onOpenSidebar: () => void;
}

const Home: React.FC<HomeProps> = ({ user, onNavigate, onOpenSidebar }) => {
  // Helper to shuffle array for realistic feel
  const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Market State
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showMarketMenu, setShowMarketMenu] = useState(false);

  // WebSocket Integration
  useWebSocket('/topic/products', (message) => {
    const updateList = (list: Product[]) => {
      if (message.deletedId) {
        return list.filter(p => p.id !== message.deletedId);
      } else if (message.id) {
        const exists = list.find(p => p.id === message.id);
        if (exists) {
          return list.map(p => p.id === message.id ? message : p);
        }
        return list;
      }
      return list;
    };

    setProducts(prev => updateList(prev));
    setBestSellers(prev => updateList(prev));
    setRecommendations(prev => updateList(prev));
  });

  // Load Initial Data
  useEffect(() => {
    const init = async () => {
      try {
        const [prods, cats, mkts] = await Promise.all([
          api.getProducts(0, 20, { userId: user?.id }),
          api.getActiveCategories(), // Only categories with products
          api.getMarkets()
        ]);
        setProducts(prods.content); // Assuming getProducts returns pageable now, check api.ts
        setCategories(cats);
        setMarkets(mkts);
        setSelectedMarket(mkts[0]); // Default to first market
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProducts(false);
      }
    };
    init();
  }, []);

  const isNewUser = !user || user.purchaseHistory.length === 0;

  // Recommendation Logic - call real backend endpoints
  useEffect(() => {
    const loadRecommendations = async () => {
      setLoadingAI(true);
      try {
        if (isNewUser) {
          // New users: show only best sellers (no AI section)
          setRecommendations([]);
        } else if (user) {
          // Returning users: get personalized recommendations
          const recs = await api.getRecommendations(user.id);
          setRecommendations(recs);
        }
      } catch (e) {
        console.error('Error loading recommendations:', e);
        setRecommendations([]);
      } finally {
        setLoadingAI(false);
      }
    };
    loadRecommendations();
  }, [user, isNewUser]);

  // Best sellers for mağaza vitrini
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  useEffect(() => {
    api.getBestSellers(user?.id).then(setBestSellers).catch(() => setBestSellers([]));
  }, [user]);

  return (
    <div className="pb-32 space-y-6 pt-20">

      {/* HEADER WITH MARKET SELECTOR */}
      {/* REDESIGNED HEADER */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 py-4 px-4 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center relative">

          <div className="flex items-center gap-4">
            <button onClick={onOpenSidebar} className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 active:scale-95 transition-all text-slate-700 dark:text-white">
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo instead of Market Selector */}
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-lg">
              <span className="text-emerald-500">Logi</span>Store
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 dark:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex flex-col items-end">
                <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Bonus</span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 leading-none">{user.points}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-8">

        {/* Categories (Moved to Top) */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Grid className="w-5 h-5 text-blue-500" /> Kateqoriyalar
            </h2>
            <button onClick={() => onNavigate(AppRoute.CATEGORIES, undefined, { category: 'all' })} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full transition-colors">
              Hamısı
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {categories.slice(0, 8).map(cat => {
              // Icon mapping
              const getIcon = (name: string) => {
                if (name.includes("Meyvə")) return <Apple className="w-8 h-8 text-red-500" />;
                if (name.includes("Süd")) return <Milk className="w-8 h-8 text-blue-400" />;
                if (name.includes("Çörək")) return <Croissant className="w-8 h-8 text-orange-400" />;

                // Mappings updated based on feedback
                if (name.includes("Ət")) return <Beef className="w-8 h-8 text-red-700" />; // Was Drumstick
                if (name.includes("Düyü") || name.includes("Baqqaliyyə")) return <Wheat className="w-8 h-8 text-amber-500" />; // Was ShoppingBag
                if (name.includes("Qazlı") || name.includes("İçkilər")) return <GlassWater className="w-8 h-8 text-cyan-500" />; // Was CupSoda

                if (name.includes("Şokolad") || name.includes("Şirniyyat")) return <Candy className="w-8 h-8 text-pink-500" />;
                if (name.includes("Təmizlik") || name.includes("Gigiyena")) return <SprayCan className="w-8 h-8 text-teal-500" />;

                // Fallbacks
                if (name.includes("Qəhvə") || name.includes("Çay")) return <Coffee className="w-8 h-8 text-amber-700" />;

                return <Grid className="w-8 h-8 text-slate-400" />;
              };

              return (
                <GlassCard
                  key={cat.id || cat.name}
                  className="flex flex-col items-center justify-center p-3 gap-2 bg-white/60 dark:bg-white/5 active:scale-95 cursor-pointer rounded-2xl border border-slate-200/60 dark:border-white/5 hover:border-emerald-500/30 transition-all shadow-sm"
                  onClick={() => onNavigate(AppRoute.CATEGORIES, undefined, { category: cat.name })}
                >
                  <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-full">
                    {getIcon(cat.name)}
                  </div>
                  <span className="text-xs font-bold text-center text-slate-700 dark:text-white/90 line-clamp-1">{cat.name}</span>
                </GlassCard>
              )
            })}

            {/* Digər Button */}
            <GlassCard
              className="flex flex-col items-center justify-center p-3 gap-2 bg-slate-50 dark:bg-white/5 active:scale-95 cursor-pointer rounded-2xl border border-dashed border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all"
              onClick={() => onNavigate(AppRoute.CATEGORIES, undefined, { category: 'all' })}
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                <Grid className="w-4 h-4 text-slate-500 dark:text-slate-300" />
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Digər...</span>
            </GlassCard>
          </div>
        </section>

        {/* Sizin üçün (AI) - Only for returning users */}
        {!isNewUser && recommendations.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Sizin üçün (AI)
              </h2>
            </div>

            {loadingAI ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm h-56 animate-pulse">
                    <div className="h-32 bg-slate-200 dark:bg-slate-700" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4">
                {recommendations.slice(0, 8).map(product => {
                  return (
                    <GlassCard
                      key={product.id}
                      className="p-0 group cursor-pointer border-white/50 dark:border-white/10"
                      onClick={() => onNavigate(AppRoute.PRODUCT, product.id)}
                    >
                      <div className="h-32 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute top-2 right-2 bg-purple-600/80 backdrop-blur-md text-[10px] font-bold px-2 py-1 rounded-lg text-white">Sizin üçün</div>
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate text-sm">{product.name}</h3>
                        <SmartPrice
                          originalPrice={product.oldPrice || product.price}
                          globalPrice={product.price}
                          personalPrice={product.personalPrice}
                          size="sm"
                          className="mt-1"
                        />
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Mağaza Vitrini - Best Sellers */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Mağaza Vitrini
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4">
            {loadingProducts ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm h-56 animate-pulse">
                  <div className="h-32 bg-slate-200 dark:bg-slate-700" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              bestSellers.slice(0, 12).map(product => {
                return (
                  <GlassCard
                    key={product.id}
                    className="p-0 group cursor-pointer border-white/50 dark:border-white/10 overflow-hidden"
                    onClick={() => onNavigate(AppRoute.PRODUCT, product.id)}
                  >
                    <div className="h-32 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate text-sm">{product.name}</h3>
                      <SmartPrice
                        originalPrice={product.oldPrice || product.price}
                        globalPrice={product.price}
                        personalPrice={product.personalPrice}
                        size="sm"
                        className="mt-1"
                      />
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        </section>


      </div>
    </div>
  );
};

export default Home;
