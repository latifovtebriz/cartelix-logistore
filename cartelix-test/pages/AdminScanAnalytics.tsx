
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { GlassCard } from '../components/GlassComponents';
import {
    BarChart3, ScanLine, ShoppingCart, Package, Users, TrendingDown,
    Eye, Tag, Clock, Lightbulb, UserPlus, Layers,
    RefreshCw, ArrowUpRight, ArrowDownRight, Search, ChevronDown, ChevronUp,
    AlertTriangle, CheckCircle, XCircle, Zap
} from 'lucide-react';
import { ToastMessage } from '../components/Toast';

interface Props {
    showToast: (message: string, type: ToastMessage['type']) => void;
}

const AdminScanAnalytics: React.FC<Props> = ({ showToast }) => {
    const [tab, setTab] = useState<'overview' | 'products' | 'categories' | 'users' | 'marketing'>('overview');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data states
    const [overview, setOverview] = useState<any>(null);
    const [productStats, setProductStats] = useState<any[]>([]);
    const [categoryStats, setCategoryStats] = useState<any[]>([]);
    const [userStats, setUserStats] = useState<any[]>([]);
    const [recentScans, setRecentScans] = useState<any[]>([]);
    const [abandonedProducts, setAbandonedProducts] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [hourlyData, setHourlyData] = useState<any[]>([]);

    // Filter states
    const [productSearch, setProductSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [sortField, setSortField] = useState<string>('totalScans');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const loadData = async () => {
        setLoading(true);
        try {
            const [ov, ps, cs, us, rs, ab, sg, hr] = await Promise.all([
                api.getScanAnalyticsOverview(),
                api.getScanProductStats(),
                api.getScanCategoryStats(),
                api.getScanUserStats(),
                api.getScanRecentEvents(),
                api.getScanAbandonedProducts(),
                api.getScanMarketingSuggestions(),
                api.getScanHourlyDistribution()
            ]);
            setOverview(ov);
            setProductStats(ps || []);
            setCategoryStats(cs || []);
            setUserStats(us || []);
            setRecentScans(rs || []);
            setAbandonedProducts(ab || []);
            setSuggestions(sg || []);
            setHourlyData(hr || []);
        } catch (e) {
            console.error('Scan analytics load error:', e);
            showToast('Analitika yüklənmədi. Backend işləyirmi?', 'error');
            // Set default empty data
            setOverview({ totalScans: 0, addedToCart: 0, purchased: 0, abandoned: 0, cartRate: 0, purchaseRate: 0, abandonRate: 0, todayScans: 0, todayCartAdds: 0, todayPurchases: 0, weekScans: 0, weekCartAdds: 0, weekPurchases: 0 });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
        showToast('Məlumatlar yeniləndi', 'success');
    };

    useEffect(() => { loadData(); }, []);

    // Sorted & filtered product stats
    const filteredProducts = useMemo(() => {
        let data = [...productStats];
        if (productSearch) {
            const q = productSearch.toLowerCase();
            data = data.filter(p => p.productName?.toLowerCase().includes(q) || p.barcode?.includes(q) || p.category?.toLowerCase().includes(q));
        }
        data.sort((a, b) => {
            const aVal = a[sortField] || 0;
            const bVal = b[sortField] || 0;
            return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });
        return data;
    }, [productStats, productSearch, sortField, sortDir]);

    // Filtered user stats
    const filteredUsers = useMemo(() => {
        let data = [...userStats];
        if (userSearch) {
            const q = userSearch.toLowerCase();
            data = data.filter(u => u.userName?.toLowerCase().includes(q) || u.userId?.includes(q));
        }
        data.sort((a, b) => (b.totalScans || 0) - (a.totalScans || 0));
        return data;
    }, [userStats, userSearch]);

    const toggleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortField !== field) return null;
        return sortDir === 'desc' ? <ChevronDown className="w-3 h-3 inline" /> : <ChevronUp className="w-3 h-3 inline" />;
    };

    // Percentage bar component
    const PercentBar = ({ value, color, label }: { value: number; color: string; label?: string }) => (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full h-2.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-10 text-right">{value}%</span>
            {label && <span className="text-[10px] text-slate-400">{label}</span>}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 animate-fadeIn">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">Scan analitika yüklənir...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BarChart3 className="w-7 h-7 text-indigo-500" /> Scan Analitika
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Məhsul scan davranışlarını izləyin və marketinq qərarları verin</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Yenilə
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-2 overflow-x-auto no-scrollbar">
                {[
                    { id: 'overview', icon: BarChart3, label: 'Ümumi Baxış' },
                    { id: 'products', icon: Package, label: 'Məhsullar' },
                    { id: 'categories', icon: Layers, label: 'Kateqoriyalar' },
                    { id: 'users', icon: Users, label: 'İstifadəçilər' },
                    { id: 'marketing', icon: Lightbulb, label: 'Marketing Təklifləri' },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap flex items-center gap-1.5 transition ${tab === t.id
                            ? t.id === 'marketing'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                    >
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {/* ====== OVERVIEW TAB ====== */}
            {tab === 'overview' && overview && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <GlassCard className="p-5 flex items-center gap-4 border-l-4 border-l-indigo-500 bg-white dark:bg-slate-800">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-400">
                                <ScanLine className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-white/50 uppercase font-bold">Ümumi Scan</p>
                                <p className="text-2xl font-bold">{overview.totalScans}</p>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-5 flex items-center gap-4 border-l-4 border-l-emerald-500 bg-white dark:bg-slate-800">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-white/50 uppercase font-bold">Səbətə Əlavə</p>
                                <p className="text-2xl font-bold">{overview.addedToCart}</p>
                                <p className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3" /> {overview.cartRate}%
                                </p>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-5 flex items-center gap-4 border-l-4 border-l-blue-500 bg-white dark:bg-slate-800">
                            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-full text-blue-600 dark:text-blue-400">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-white/50 uppercase font-bold">Satın Alınma</p>
                                <p className="text-2xl font-bold">{overview.purchased}</p>
                                <p className="text-xs text-blue-500 font-bold flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3" /> {overview.purchaseRate}%
                                </p>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-5 flex items-center gap-4 border-l-4 border-l-red-500 bg-white dark:bg-slate-800">
                            <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-full text-red-600 dark:text-red-400">
                                <XCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-white/50 uppercase font-bold">Tərk Edilən</p>
                                <p className="text-2xl font-bold">{overview.abandoned}</p>
                                <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                                    <ArrowDownRight className="w-3 h-3" /> {overview.abandonRate}%
                                </p>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Today vs Week */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 p-5">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-orange-500" /> Bugünkü Statistika
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Scan sayı</span>
                                    <span className="text-lg font-bold text-indigo-600">{overview.todayScans}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Səbətə əlavə</span>
                                    <span className="text-lg font-bold text-emerald-600">{overview.todayCartAdds}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Satın alınma</span>
                                    <span className="text-lg font-bold text-blue-600">{overview.todayPurchases}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 p-5">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <TrendingDown className="w-5 h-5 text-purple-500" /> Son 7 Gün
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Scan sayı</span>
                                    <span className="text-lg font-bold text-indigo-600">{overview.weekScans}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Səbətə əlavə</span>
                                    <span className="text-lg font-bold text-emerald-600">{overview.weekCartAdds}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Satın alınma</span>
                                    <span className="text-lg font-bold text-blue-600">{overview.weekPurchases}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Conversion Funnel */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 p-5">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" /> Dönüşüm Funeli
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><ScanLine className="w-4 h-4 text-indigo-500" /> Scan edilən</span>
                                    <span className="font-bold">{overview.totalScans}</span>
                                </div>
                                <PercentBar value={100} color="bg-indigo-500" />
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-emerald-500" /> Səbətə əlavə olunan</span>
                                    <span className="font-bold">{overview.addedToCart}</span>
                                </div>
                                <PercentBar value={overview.cartRate} color="bg-emerald-500" />
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-500" /> Satın alınan</span>
                                    <span className="font-bold">{overview.purchased}</span>
                                </div>
                                <PercentBar value={overview.purchaseRate} color="bg-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Recent Scans */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 p-5">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Eye className="w-5 h-5 text-cyan-500" /> Son Scan Hadisələri
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-white/5">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Məhsul</th>
                                        <th className="px-3 py-2 text-left">İstifadəçi</th>
                                        <th className="px-3 py-2 text-center">Səbət</th>
                                        <th className="px-3 py-2 text-center">Alış</th>
                                        <th className="px-3 py-2 text-right">Vaxt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {recentScans.length === 0 ? (
                                        <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Hələ scan hadisəsi yoxdur</td></tr>
                                    ) : recentScans.slice(0, 15).map((s, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                            <td className="px-3 py-2">
                                                <div className="font-medium truncate max-w-[200px]">{s.productName || 'N/A'}</div>
                                                <div className="text-[10px] text-slate-400">{s.productCategory}</div>
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.userName || 'Anonim'}</td>
                                            <td className="px-3 py-2 text-center">
                                                {s.addedToCart
                                                    ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle className="w-4 h-4" /></span>
                                                    : <span className="inline-flex items-center gap-1 text-red-400"><XCircle className="w-4 h-4" /></span>
                                                }
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {s.purchased
                                                    ? <span className="inline-flex items-center gap-1 text-blue-600"><CheckCircle className="w-4 h-4" /></span>
                                                    : <span className="inline-flex items-center gap-1 text-slate-300"><XCircle className="w-4 h-4" /></span>
                                                }
                                            </td>
                                            <td className="px-3 py-2 text-right text-xs text-slate-400">
                                                {s.scannedAt ? new Date(s.scannedAt).toLocaleString('az-AZ', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== PRODUCTS TAB ====== */}
            {tab === 'products' && (
                <div className="space-y-4">
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                            <input
                                value={productSearch}
                                onChange={e => setProductSearch(e.target.value)}
                                placeholder="Məhsul adı, barkod və ya kateqoriya ilə axtar..."
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-white/5 uppercase text-xs text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Məhsul</th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-indigo-500" onClick={() => toggleSort('totalScans')}>
                                            Scan <SortIcon field="totalScans" />
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-emerald-500" onClick={() => toggleSort('cartAdds')}>
                                            Səbət <SortIcon field="cartAdds" />
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-blue-500" onClick={() => toggleSort('purchases')}>
                                            Satış <SortIcon field="purchases" />
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-red-500" onClick={() => toggleSort('abandoned')}>
                                            Tərk <SortIcon field="abandoned" />
                                        </th>
                                        <th className="px-4 py-3">Səbət Nisbəti</th>
                                        <th className="px-4 py-3">Satış Nisbəti</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                                    {filteredProducts.length === 0 ? (
                                        <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Məhsul scan statistikası yoxdur</td></tr>
                                    ) : filteredProducts.map((p, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                            <td className="px-4 py-3">
                                                <div className="font-medium truncate max-w-[200px]">{p.productName}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">{p.category}</span>
                                                    <span className="text-[10px] font-mono text-slate-400">{p.barcode}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded text-xs font-bold">{p.totalScans}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-xs font-bold">{p.cartAdds}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold">{p.purchases}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${p.abandoned > 0 ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-slate-100 text-slate-500'}`}>{p.abandoned}</span>
                                            </td>
                                            <td className="px-4 py-3 w-32"><PercentBar value={p.cartRate} color={p.cartRate >= 50 ? 'bg-emerald-500' : p.cartRate >= 25 ? 'bg-yellow-500' : 'bg-red-500'} /></td>
                                            <td className="px-4 py-3 w-32"><PercentBar value={p.purchaseRate} color={p.purchaseRate >= 50 ? 'bg-blue-500' : p.purchaseRate >= 25 ? 'bg-yellow-500' : 'bg-red-500'} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3 border-t border-slate-200 dark:border-white/10 text-xs text-slate-500 text-center">
                            Toplam {filteredProducts.length} məhsulun scan statistikası
                        </div>
                    </div>

                    {/* Top Abandoned Products */}
                    {abandonedProducts.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 p-5">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" /> Ən Çox Tərk Edilən Məhsullar
                            </h3>
                            <p className="text-sm text-slate-500 mb-4">Bu məhsullar scan edilib amma səbətə əlavə olunmayıb. Qiymət endiriminə ehtiyac ola bilər.</p>
                            <div className="space-y-3">
                                {abandonedProducts.slice(0, 10).map((p, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
                                        <div>
                                            <span className="font-bold text-sm">{p.productName}</span>
                                            <span className="text-xs text-slate-500 ml-2">{p.category}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs">
                                            <span className="text-indigo-600 font-bold">{p.totalScans} scan</span>
                                            <span className="text-red-600 font-bold">{p.abandoned} tərk</span>
                                            <span className="bg-red-100 dark:bg-red-500/20 text-red-700 px-2 py-1 rounded font-bold">{p.abandonRate}% tərk</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ====== CATEGORIES TAB ====== */}
            {tab === 'categories' && (
                <div className="space-y-4">
                    {categoryStats.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">Kateqoriya scan statistikası yoxdur</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categoryStats.map((c, i) => (
                                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 p-5 hover:shadow-lg transition">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-lg">{c.category || 'Digər'}</h4>
                                        <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg text-sm font-bold">
                                            {c.totalScans} scan
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                                            <p className="text-lg font-bold text-emerald-600">{c.cartAdds}</p>
                                            <p className="text-[10px] text-slate-500">Səbət</p>
                                        </div>
                                        <div className="text-center p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                                            <p className="text-lg font-bold text-blue-600">{c.purchases}</p>
                                            <p className="text-[10px] text-slate-500">Satış</p>
                                        </div>
                                        <div className="text-center p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
                                            <p className="text-lg font-bold text-red-600">{c.abandoned}</p>
                                            <p className="text-[10px] text-slate-500">Tərk</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-xs text-slate-500">Səbət nisbəti</span>
                                            <PercentBar value={c.cartRate} color={c.cartRate >= 50 ? 'bg-emerald-500' : 'bg-yellow-500'} />
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500">Satış nisbəti</span>
                                            <PercentBar value={c.purchaseRate} color={c.purchaseRate >= 50 ? 'bg-blue-500' : 'bg-orange-500'} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ====== USERS TAB ====== */}
            {tab === 'users' && (
                <div className="space-y-4">
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                            <input
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                placeholder="İstifadəçi adı ilə axtar..."
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-white/5 uppercase text-xs text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">İstifadəçi</th>
                                        <th className="px-4 py-3">Scan</th>
                                        <th className="px-4 py-3">Səbət</th>
                                        <th className="px-4 py-3">Satış</th>
                                        <th className="px-4 py-3">Tərk</th>
                                        <th className="px-4 py-3">Səbət Nisbəti</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                                    {filteredUsers.length === 0 ? (
                                        <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">İstifadəçi scan statistikası yoxdur</td></tr>
                                    ) : filteredUsers.map((u, i) => {
                                        const isHighRisk = u.totalScans >= 5 && u.purchases === 0;
                                        const isLowConversion = u.cartRate < 30 && u.totalScans >= 3;
                                        return (
                                            <tr key={i} className={`hover:bg-slate-50 dark:hover:bg-white/5 ${isHighRisk ? 'bg-red-50/50 dark:bg-red-500/5' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{u.userName || 'Anonim'}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{u.userId?.substring(0, 8)}...</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded text-xs font-bold">{u.totalScans}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-xs font-bold">{u.cartAdds}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold">{u.purchases}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${u.abandoned > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{u.abandoned}</span>
                                                </td>
                                                <td className="px-4 py-3 w-32"><PercentBar value={u.cartRate} color={u.cartRate >= 50 ? 'bg-emerald-500' : 'bg-red-500'} /></td>
                                                <td className="px-4 py-3">
                                                    {isHighRisk ? (
                                                        <span className="bg-red-100 dark:bg-red-500/20 text-red-600 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                                            <AlertTriangle className="w-3 h-3" /> Yüksək Risk
                                                        </span>
                                                    ) : isLowConversion ? (
                                                        <span className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 px-2 py-1 rounded text-[10px] font-bold w-fit">
                                                            Aşağı Dönüşüm
                                                        </span>
                                                    ) : (
                                                        <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold w-fit">
                                                            Normal
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3 border-t border-slate-200 dark:border-white/10 text-xs text-slate-500 text-center">
                            Toplam {filteredUsers.length} istifadəçinin scan statistikası
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MARKETING SUGGESTIONS TAB ====== */}
            {tab === 'marketing' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-700/30 p-5">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-500" /> AI Marketinq Təklifləri
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Scan analitikasına əsasən sistem avtomatik marketinq təklifləri yaradır. Bu təkliflər müştəri davranışı, məhsul performansı və kateqoriya trendlərinə əsaslanır.
                        </p>
                    </div>

                    {suggestions.length === 0 ? (
                        <div className="text-center py-16">
                            <Lightbulb className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h4 className="text-lg font-bold text-slate-400 mb-2">Hələ Təklif Yoxdur</h4>
                            <p className="text-sm text-slate-400">Daha çox scan hadisəsi baş verdikdə sistem avtomatik təkliflər yaradacaq.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {suggestions.map((s, i) => {
                                const typeConfig: Record<string, { icon: React.ReactNode; bg: string; border: string; badge: string }> = {
                                    'PRICE_REDUCTION': {
                                        icon: <Tag className="w-5 h-5" />,
                                        bg: 'bg-red-50 dark:bg-red-500/10',
                                        border: 'border-red-200 dark:border-red-500/20',
                                        badge: 'bg-red-100 text-red-700'
                                    },
                                    'CATEGORY_CAMPAIGN': {
                                        icon: <Layers className="w-5 h-5" />,
                                        bg: 'bg-purple-50 dark:bg-purple-500/10',
                                        border: 'border-purple-200 dark:border-purple-500/20',
                                        badge: 'bg-purple-100 text-purple-700'
                                    },
                                    'USER_REENGAGEMENT': {
                                        icon: <UserPlus className="w-5 h-5" />,
                                        bg: 'bg-blue-50 dark:bg-blue-500/10',
                                        border: 'border-blue-200 dark:border-blue-500/20',
                                        badge: 'bg-blue-100 text-blue-700'
                                    },
                                    'TIME_BASED': {
                                        icon: <Clock className="w-5 h-5" />,
                                        bg: 'bg-green-50 dark:bg-green-500/10',
                                        border: 'border-green-200 dark:border-green-500/20',
                                        badge: 'bg-green-100 text-green-700'
                                    }
                                };
                                const config = typeConfig[s.type] || typeConfig['PRICE_REDUCTION'];

                                return (
                                    <div key={i} className={`${config.bg} rounded-2xl border ${config.border} p-5 transition hover:shadow-md`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className={`p-2 rounded-xl ${config.badge}`}>
                                                    {config.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h4 className="font-bold text-sm">{s.title}</h4>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.priority === 'HIGH'
                                                                ? 'bg-red-100 text-red-600 dark:bg-red-500/20'
                                                                : s.priority === 'MEDIUM'
                                                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20'
                                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-500/20'
                                                            }`}>
                                                            {s.priority === 'HIGH' ? 'Yüksək Prioritet' : s.priority === 'MEDIUM' ? 'Orta Prioritet' : 'Aşağı Prioritet'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{s.description}</p>

                                                    {/* Stats */}
                                                    {s.stats && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.entries(s.stats).map(([key, val]) => (
                                                                <span key={key} className="text-xs bg-white/80 dark:bg-white/10 px-2 py-1 rounded border border-slate-200 dark:border-white/10">
                                                                    <span className="text-slate-400">{key}:</span> <span className="font-bold">{String(val)}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action hint */}
                                            <div className="shrink-0">
                                                {s.type === 'PRICE_REDUCTION' && (
                                                    <div className="text-xs text-center">
                                                        <Tag className="w-6 h-6 text-red-500 mx-auto mb-1" />
                                                        <span className="text-red-600 font-bold">Endirim yarat</span>
                                                    </div>
                                                )}
                                                {s.type === 'CATEGORY_CAMPAIGN' && (
                                                    <div className="text-xs text-center">
                                                        <Layers className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                                                        <span className="text-purple-600 font-bold">Kampaniya</span>
                                                    </div>
                                                )}
                                                {s.type === 'USER_REENGAGEMENT' && (
                                                    <div className="text-xs text-center">
                                                        <UserPlus className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                                                        <span className="text-blue-600 font-bold">Fərdi endirim</span>
                                                    </div>
                                                )}
                                                {s.type === 'TIME_BASED' && (
                                                    <div className="text-xs text-center">
                                                        <Clock className="w-6 h-6 text-green-500 mx-auto mb-1" />
                                                        <span className="text-green-600 font-bold">Flash Sale</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Manual Marketing Ideas Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 p-5">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" /> Əlavə Marketinq Strategiyaları
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700/30">
                                <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 mb-2">Tərk Olunan Məhsul Push Bildirişi</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300">İstifadəçi məhsulu scan edib almadıqda, 1-2 saat sonra push bildiriş göndərərək xüsusi endirim təklif edin.</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700/30">
                                <h4 className="font-bold text-sm text-blue-700 dark:text-blue-400 mb-2">Müqayisəli Qiymət Göstərimi</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300">Scan zamanı rəqib mağazalarda eyni məhsulun qiymətini göstərərək müştərini almağa təşviq edin.</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700/30">
                                <h4 className="font-bold text-sm text-purple-700 dark:text-purple-400 mb-2">Paket Satış Təklifi</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300">Tez-tez birlikdə scan olunan məhsulları tapın və bundle/paket endirim yaradın.</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border border-orange-200 dark:border-orange-700/30">
                                <h4 className="font-bold text-sm text-orange-700 dark:text-orange-400 mb-2">Loyallıq Xalı Artırımı</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300">Aşağı dönüşüm olan kateqoriyalarda məhsul alanda 2x bonus xal verin.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminScanAnalytics;
