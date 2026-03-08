
import React, { useState, useMemo, useEffect } from 'react';
import { GlassCard } from '../components/GlassComponents';
import { api } from '../services/api';
import { AppRoute, Product, Market, User } from '../types';
import { SlidersHorizontal, Star, X, Tag, Menu, Search, MapPin, ChevronLeft, ChevronRight, ChevronDown, ShoppingBag } from 'lucide-react';
import { SmartPrice } from '../components/SmartPrice';

interface CategoryPageProps {
  onNavigate: (route: AppRoute, productId?: number) => void;
  initialCategory?: string;
  onOpenSidebar: () => void;
  currentFilters?: Partial<FilterState>;
  onFilterChange?: (filters: FilterState) => void;
  user: User | null;
}

type SortOption = 'rating' | 'price-asc' | 'price-desc';

interface FilterState {
  category: string;
  subcategory: string;
  marketId?: number;
  q: string;
  maxPrice: number;
  onlyDiscounted: boolean;
  sortBy?: SortOption;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ onNavigate, initialCategory, onOpenSidebar, currentFilters, onFilterChange, user }) => {
  const defaultFilters: FilterState = {
    category: initialCategory || 'all',
    subcategory: 'all',
    maxPrice: currentFilters?.maxPrice ?? 500,
    onlyDiscounted: currentFilters?.onlyDiscounted ?? false,
    q: currentFilters?.q ?? '',
    marketId: currentFilters?.marketId,
    sortBy: currentFilters?.sortBy
  };

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [debouncedQ, setDebouncedQ] = useState('');
  const [debouncedPrice, setDebouncedPrice] = useState(500);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQ(filters.q), 400);
    return () => clearTimeout(handler);
  }, [filters.q]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedPrice(filters.maxPrice), 400);
    return () => clearTimeout(handler);
  }, [filters.maxPrice]);

  useEffect(() => {
    Promise.all([api.getCategories(), api.getMarkets()])
      .then(([cats, mkts]) => {
        console.log('Categories loaded:', cats);
        setCategories(cats);
        setMarkets(mkts);
      })
      .catch(e => console.error('Failed to load categories:', e));
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const categoryFilter = filters.subcategory !== 'all'
          ? filters.subcategory
          : filters.category !== 'all'
            ? filters.category
            : undefined;

        const sortParam = filters.sortBy === 'rating' ? 'rating,desc'
          : filters.sortBy === 'price-asc' ? 'price,asc'
            : filters.sortBy === 'price-desc' ? 'price,desc'
              : undefined;

        const res = await api.getProducts(page, 12, {
          q: debouncedQ || undefined,
          category: categoryFilter,
          marketId: filters.marketId,
          maxPrice: debouncedPrice < 500 ? debouncedPrice : undefined,
          onlyDiscounted: filters.onlyDiscounted || undefined,
          sort: sortParam,
          userId: user?.id
        });

        setProducts(res.content);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || res.content.length);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [page, filters.category, filters.subcategory, debouncedQ, debouncedPrice, filters.marketId, filters.sortBy]);

  useEffect(() => { setPage(0); }, [filters.category, filters.subcategory, debouncedQ, debouncedPrice, filters.marketId]);

  const displayedProducts = useMemo(() => {
    let result = [...products];


    if (filters.onlyDiscounted) result = result.filter(p => p.isDiscount);

    result.sort((a, b) => {
      if (filters.sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (filters.sortBy === 'price-asc') return a.price - b.price;
      if (filters.sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });

    return result;
  }, [products, filters.onlyDiscounted, filters.sortBy]);

  const resetFilters = () => {
    const nextFilters: FilterState = {
      category: 'all',
      subcategory: 'all',
      maxPrice: 500,
      onlyDiscounted: false,
      q: '',
      marketId: undefined,
      sortBy: undefined
    };
    setFilters(nextFilters);
    setPage(0);
    if (onFilterChange) onFilterChange(nextFilters);
    setShowFilters(false);
  };

  const updateFilter = (updates: Partial<FilterState>) => {
    setFilters(prev => {
      const next = { ...prev, ...updates };
      if (onFilterChange) {
        onFilterChange(next);
      }
      return next;
    });
    setPage(0);
  };

  const toggleCategoryExpand = (catName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  // Get only parent categories (those without parentId)
  const parentCategories = categories.filter(c => !c.parentId);


  const pageSize = 12;

  const hasActiveFilters = filters.category !== 'all' || filters.subcategory !== 'all' || filters.onlyDiscounted || filters.maxPrice < 500 || filters.marketId !== undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 pt-20 animate-fadeIn">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 py-3 shadow-sm transition-all duration-300">
        <div className="px-4">
          <div className="flex items-center gap-3">
            <button onClick={onOpenSidebar} className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition active:scale-95">
              <Menu className="w-5 h-5 text-slate-700 dark:text-white" />
            </button>

            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Məhsul axtar..."
                value={filters.q}
                onChange={(e) => updateFilter({ q: e.target.value })}
                className="w-full bg-slate-100 dark:bg-white/5 border-0 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-400 transition-all font-medium"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="p-3 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative p-3 rounded-2xl transition-all active:scale-95 ${showFilters ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20'}`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white dark:border-[#0f172a]"></span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Side Panel */}
      {showFilters && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={() => setShowFilters(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-[320px] max-w-[90vw] bg-white dark:bg-slate-900 z-50 shadow-2xl overflow-y-auto">
            {/* Filter Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/10 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-500" /> Filterlər
              </h2>
              <button onClick={() => setShowFilters(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Category Selection */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Kateqoriya</div>
                  {filters.category !== 'all' && (
                    <button onClick={() => updateFilter({ category: 'all', subcategory: 'all' })} className="text-[10px] text-red-500 hover:underline">Sıfırla</button>
                  )}
                </h3>
                <div className="space-y-1 max-h-[280px] overflow-y-auto rounded-xl bg-slate-50 dark:bg-white/5 p-2">
                  <button
                    onClick={() => updateFilter({ category: 'all', subcategory: 'all' })}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition ${filters.category === 'all' ? 'bg-emerald-500 text-white shadow-md' : 'hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-white'}`}
                  >
                    📦 Bütün Kateqoriyalar
                  </button>

                  {parentCategories.map(cat => (
                    <div key={cat.id || cat.name} className="mt-1">
                      <button
                        onClick={() => {
                          toggleCategoryExpand(cat.name);
                          if (filters.category !== cat.name) {
                            updateFilter({ category: cat.name, subcategory: 'all' });
                          }
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition ${filters.category === cat.name ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-white'}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-lg">{cat.icon}</span>
                          <span>{cat.name}</span>
                        </span>
                        {cat.subCategories && cat.subCategories.length > 0 && (
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedCategories.has(cat.name) ? 'rotate-180' : ''}`} />
                        )}
                      </button>

                      {/* Subcategories */}
                      {expandedCategories.has(cat.name) && cat.subCategories && cat.subCategories.length > 0 && (
                        <div className="ml-3 mt-1 space-y-1 border-l-2 border-emerald-200 dark:border-emerald-800 pl-3 py-1">
                          {cat.subCategories.map((sub: any) => (
                            <button
                              key={sub.id || sub.name}
                              onClick={() => updateFilter({ category: cat.name, subcategory: sub.name })}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${filters.subcategory === sub.name ? 'bg-emerald-500 text-white font-medium' : 'hover:bg-white dark:hover:bg-white/10 text-slate-600 dark:text-white/80'}`}
                            >
                              <span className="mr-2">{sub.icon}</span> {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Filter */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-3">Mağaza</h3>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={filters.marketId || ''}
                    onChange={(e) => updateFilter({ marketId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-10 text-sm appearance-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="">Bütün Mağazalar</option>
                    {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  {filters.marketId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateFilter({ marketId: undefined }); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sorting */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Sıralama</span>
                  {filters.sortBy && (
                    <button onClick={() => updateFilter({ sortBy: undefined })} className="text-[10px] text-red-500 hover:underline">Sıfırla</button>
                  )}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'rating', label: 'Reytinq' },
                    { id: 'price-asc', label: 'Ucuz' },
                    { id: 'price-desc', label: 'Baha' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateFilter({ sortBy: opt.id as SortOption })}
                      className={`py-2.5 rounded-xl text-xs font-semibold transition ${filters.sortBy === opt.id ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-md' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/20'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Type */}


              {/* Price Range */}
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider flex items-center gap-2">
                    Maks. Qiymət
                    {filters.maxPrice < 500 && (
                      <button onClick={() => updateFilter({ maxPrice: 500 })} className="text-[10px] text-red-500 hover:underline ml-auto font-normal">Sıfırla</button>
                    )}
                  </h3>
                  <div className="bg-white dark:bg-slate-800 px-3 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold text-sm shadow-sm ring-1 ring-emerald-500/20">
                    {filters.maxPrice} ₼
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter({ maxPrice: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-400 dark:text-white/30 mt-2">
                  <span>0 ₼</span>
                  <span>500 ₼</span>
                </div>
              </div>

              {/* Discount Toggle */}
              <button
                onClick={() => updateFilter({ onlyDiscounted: !filters.onlyDiscounted })}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition ${filters.onlyDiscounted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
              >
                <Tag className="w-4 h-4" /> Yalnız Endirimlilər
              </button>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
                <button onClick={resetFilters} className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition">
                  Sıfırla
                </button>
                <button onClick={() => setShowFilters(false)} className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/30">
                  Tətbiq Et
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="px-4 py-4 pb-32">
        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {loading ? (
            Array(12).fill(0).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-square bg-slate-100 dark:bg-slate-700 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))
          ) : displayedProducts.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <Search className="w-20 h-20 mx-auto text-slate-200 dark:text-white/10 mb-6" />
              <p className="text-xl font-medium text-slate-400 dark:text-white/40 mb-2">Məhsul tapılmadı</p>
              <p className="text-sm text-slate-400 dark:text-white/30 mb-6">Filterləri dəyişdirməyə çalışın</p>
              <button onClick={resetFilters} className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition">
                Filterləri sıfırla
              </button>
            </div>
          ) : (
            displayedProducts.map(product => {
              const discountPercent = product.isDiscount && product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0;
              return (
                <div
                  key={product.id}
                  onClick={() => onNavigate(AppRoute.PRODUCT, product.id)}
                  className="bg-white dark:bg-slate-800/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl cursor-pointer group transition-all duration-300 hover:-translate-y-1 border border-slate-100 dark:border-white/5"
                >
                  <div className="aspect-square relative overflow-hidden bg-slate-50 dark:bg-slate-800">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-medium line-clamp-2 mb-3 text-slate-800 dark:text-white/90 min-h-[2.5em] leading-tight">
                      {product.name}
                    </h4>
                    <div className="flex items-end justify-between">
                      <SmartPrice
                        originalPrice={product.oldPrice || product.price}
                        globalPrice={product.price}
                        personalPrice={product.personalPrice}
                        size="sm"
                        className="items-start"
                      />
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-lg">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                        <span className="text-xs font-bold text-slate-600 dark:text-white/70">
                          {product.rating?.toFixed(1) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>


        {!loading && totalPages > 1 && (
          <div className="flex flex-col items-center gap-6 pt-12 pb-8">
            <div className="p-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-600 dark:text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="hidden sm:flex items-center gap-2 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i;
                  if (totalPages > 5) {
                    if (page < 3) pageNum = i;
                    else if (page > totalPages - 3) pageNum = totalPages - 5 + i;
                    else pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => { setPage(pageNum); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`w-12 h-12 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center ${page === pageNum
                        ? 'bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/30 scale-110'
                        : 'bg-transparent text-slate-600 dark:text-white hover:bg-white/50 dark:hover:bg-white/10'
                        }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Page Indicator */}
              <span className="sm:hidden text-sm font-bold text-slate-600 dark:text-white px-2">
                {page + 1} / {totalPages}
              </span>

              <button
                disabled={page >= totalPages - 1}
                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-600 dark:text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm font-medium text-slate-400 dark:text-white/40 bg-white/30 dark:bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
              {totalElements} məhsuldan <span className="text-emerald-600 dark:text-emerald-400 font-bold">{page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalElements)}</span> göstərilir
            </p>
          </div>
        )}
      </div>

      {/* Animation removed to prevent header/footer sliding */}
    </div >
  );
};

export default CategoryPage;
