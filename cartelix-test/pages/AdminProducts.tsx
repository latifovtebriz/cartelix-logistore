
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Product } from '../types';
import { GlassButton } from '../components/GlassComponents';
import { Search, Edit, X, Plus, Package, TrendingUp, TrendingDown, AlertCircle, Tag, RotateCcw, AlertTriangle } from 'lucide-react';

import { ToastMessage } from '../components/Toast';
import { useWebSocket } from '../hooks/useWebSocket';

interface Props {
    showToast: (message: string, type: ToastMessage['type']) => void;
}

const AdminProducts: React.FC<Props> = ({ showToast }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Pagination state
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const pageSize = 20;

    // WebSocket Integration
    useWebSocket('/topic/products', (message) => {
        if (message.deletedId) {
            setProducts(prev => prev.filter(p => p.id !== message.deletedId));
            showToast("Məhsul silindi (Canlı)", "info");
        } else if (message.id) {
            setProducts(prev => {
                const exists = prev.find(p => p.id === message.id);
                if (exists) {
                    return prev.map(p => p.id === message.id ? message : p);
                } else {
                    return [message, ...prev];
                }
            });
            showToast("Məhsul yeniləndi (Canlı)", "info");
        }
    });

    // Filter States
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterStock, setFilterStock] = useState<'all' | 'low' | 'out'>('all');
    const [filterUnit, setFilterUnit] = useState<'all' | 'count' | 'kg'>('all');

    const [showModal, setShowModal] = useState(false);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [discountPercent, setDiscountPercent] = useState(10);
    const [error, setError] = useState('');

    const [form, setForm] = useState<Partial<Product> & { healthTagsStr?: string; imageUrl?: string }>({
        name: '',
        price: 0,
        stockQuantity: 0,
        barcode: '',
        category: 'dairy',
        unitType: 'count',
        description: '',
        healthTagsStr: '',
        imageUrl: ''
    });

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(handler);
    }, [search]);

    // Reset page when filters change
    useEffect(() => { setPage(0); }, [debouncedSearch, filterCategory]);

    const load = async (pageNum: number = 0) => {
        setLoading(true);
        try {
            const categoryFilter = filterCategory !== 'all' ? filterCategory : undefined;
            const res = await api.getProducts(pageNum, pageSize, {
                q: debouncedSearch || undefined,
                category: categoryFilter,
            });
            setProducts(res.content);
            setTotalPages(res.totalPages || 1);
            setTotalElements(res.totalElements || res.content.length);
        } catch (e) {
            console.error('Error loading products:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(page); }, [page, debouncedSearch, filterCategory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!form.name.trim()) { setError("Məhsul adı vacibdir"); return; }
        if (!form.barcode.trim()) { setError("Barkod vacibdir"); return; }
        if (form.price <= 0) { setError("Qiymət 0-dan böyük olmalıdır"); return; }
        if (form.stockQuantity < 0) { setError("Stok mənfi ola bilməz"); return; }

        const productData: any = {
            name: form.name,
            price: form.price,
            description: form.description,
            stockQuantity: form.stockQuantity,
            barcode: form.barcode,
            unitType: form.unitType,
            healthTags: form.healthTagsStr || '',
            image: form.imageUrl || '',
        };

        try {
            if (form.id) {
                await api.updateProduct(form.id, productData);
            } else {
                // Convert to FormData for addProduct
                const formData = new FormData();
                formData.append('name', form.name);
                formData.append('price', String(form.price));
                if (form.imageUrl) formData.append('image', form.imageUrl);
                formData.append('category', form.category);
                formData.append('stockQuantity', String(form.stockQuantity));
                formData.append('unitType', form.unitType);
                formData.append('barcode', form.barcode);
                formData.append('description', form.description || '');
                formData.append('healthTags', form.healthTagsStr || '');

                await api.addProduct(formData);
            }
            setShowModal(false);
            load(page);
            showToast("Əməliyyat uğurla tamamlandı", "success");
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleGlobalDiscount = async () => {
        if (discountPercent <= 0 || discountPercent > 100) {
            showToast("Endirim faizi 1 ilə 100 arasında olmalıdır", "error");
            return;
        }
        await api.applyGlobalDiscount(discountPercent);
        setShowDiscountModal(false);
        load(page);
        showToast("Endirim tətbiq edildi!", "success");
    };

    const openEdit = (p: Product) => {
        setForm({
            ...p,
            healthTagsStr: p.healthTags || '',
            imageUrl: (p as any).image || ''
        });
        setShowModal(true);
    };

    const resetFilters = () => {
        setSearch('');
        setFilterCategory('all');
        setFilterStock('all');
        setFilterUnit('all');
        setPage(0);
    };

    // Client-side filtering for stock/unit (these aren't server-side filters)
    const filtered = useMemo(() => {
        return products.filter(p => {
            // Stock
            let matchesStock = true;
            if (filterStock === 'low') matchesStock = p.stockQuantity < 10 && p.stockQuantity > 0;
            if (filterStock === 'out') matchesStock = p.stockQuantity === 0;

            // Unit
            const matchesUnit = filterUnit === 'all' || p.unitType === filterUnit;

            return matchesStock && matchesUnit;
        });
    }, [products, filterStock, filterUnit]);

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Məhsul İdarəetməsi <span className="text-sm font-normal text-slate-400">({totalElements} məhsul)</span></h2>
                <div className="flex gap-2">
                    <GlassButton onClick={() => setShowDiscountModal(true)} variant="secondary" className="text-xs bg-orange-500 hover:bg-orange-600 text-white border-none">
                        <Tag className="w-4 h-4 mr-1" /> Qlobal Endirim
                    </GlassButton>
                    <GlassButton onClick={() => { setForm({ category: 'dairy', unitType: 'count' }); setShowModal(true); setError(''); }} className="text-xs">
                        <Plus className="w-4 h-4 mr-1" /> Yeni Məhsul
                    </GlassButton>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">

                <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Barkod və ya Ad ilə axtar..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                    <button
                        onClick={resetFilters}
                        className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        title="Filtrləri Sıfırla"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-4 flex-wrap">
                    <div className="flex-1 min-w-[150px]">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Kateqoriya</label>
                        <select
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                        >
                            <option value="all">Bütün Kateqoriyalar</option>
                            <option value="dairy">Süd Məhsulları</option>
                            <option value="meat">Ət və Kolbasa</option>
                            <option value="drinks">İçkilər</option>
                            <option value="sweets">Şirniyyat</option>
                            <option value="bakery">Çörək</option>
                            <option value="fruit">Meyvə-Tərəvəz</option>
                        </select>
                    </div>

                    <div className="flex-1 min-w-[150px]">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Stok Vəziyyəti</label>
                        <select
                            value={filterStock}
                            onChange={e => setFilterStock(e.target.value as any)}
                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                        >
                            <option value="all">Hamısı</option>
                            <option value="low">Az Stok ({'<'} 10)</option>
                            <option value="out">Bitmiş ({'0'})</option>
                        </select>
                    </div>

                    <div className="flex-1 min-w-[150px]">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Vahid</label>
                        <select
                            value={filterUnit}
                            onChange={e => setFilterUnit(e.target.value as any)}
                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                        >
                            <option value="all">Hamısı</option>
                            <option value="count">Ədəd (Count)</option>
                            <option value="kg">Kiloqram (Kg)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-white/5 uppercase text-xs text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Barkod</th>
                                <th className="px-4 py-3">Ad</th>
                                <th className="px-4 py-3">Stok</th>
                                <th className="px-4 py-3">Vahid</th>
                                <th className="px-4 py-3">Qiymət</th>
                                <th className="px-4 py-3">Əməliyyat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                        Yüklənir...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                        Məhsul tapılmadı.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.barcode || '---'}</td>
                                        <td className="px-4 py-3 font-medium">
                                            <div className="truncate max-w-[200px]">{p.name}</div>
                                            <div className="text-[10px] text-slate-400">{p.category}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${p.stockQuantity === 0 ? 'bg-red-100 text-red-600' : p.stockQuantity < 10 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {p.stockQuantity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs uppercase">{p.unitType}</td>
                                        <td className="px-4 py-3 font-bold">{p.price.toFixed(2)} ₼</td>
                                        <td className="px-4 py-3 flex gap-2">
                                            <button onClick={() => openEdit(p)} className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition" title="Düzəliş et">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 border-t border-slate-200 dark:border-white/10 text-xs text-slate-500 text-center">
                    Səhifə {page + 1} / {totalPages} — Toplam {totalElements} məhsul
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 py-2">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="flex items-center gap-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg disabled:opacity-50 text-sm">
                        Əvvəlki
                    </button>
                    <div className="flex items-center gap-1">
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
                                    onClick={() => setPage(pageNum)}
                                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${page === pageNum ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20'}`}
                                >
                                    {pageNum + 1}
                                </button>
                            );
                        })}
                    </div>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="flex items-center gap-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg disabled:opacity-50 text-sm">
                        Növbəti
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold mb-4">{form.id ? 'Düzəliş et' : 'Yeni Məhsul Yarat'}</h3>
                        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm flex gap-2 items-center"><AlertTriangle className="w-4 h-4" /> {error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Məhsul Adı *</label>
                                    <input className="input-field" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="label">Barkod (Unique) *</label>
                                    <input className="input-field font-mono" value={form.barcode || ''} onChange={e => setForm({ ...form, barcode: e.target.value })} required />
                                </div>
                                <div className="col-span-2">
                                    <label className="label">Şəkil Linki (URL)</label>
                                    <input className="input-field" value={form.imageUrl || ''} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="label">Qiymət (AZN) *</label>
                                    <input type="number" step="0.01" className="input-field" value={form.price || ''} onChange={e => setForm({ ...form, price: Number(e.target.value) })} required />
                                </div>
                                <div>
                                    <label className="label">Stok Miqdarı *</label>
                                    <input type="number" className="input-field" value={form.stockQuantity || ''} onChange={e => setForm({ ...form, stockQuantity: Number(e.target.value) })} required />
                                </div>
                                <div>
                                    <label className="label">Vahid Növü</label>
                                    <select className="input-field" value={form.unitType} onChange={e => setForm({ ...form, unitType: e.target.value as any })}>
                                        <option value="count">Ədəd</option>
                                        <option value="kg">Kiloqram</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="label">Kateqoriya</label>
                                <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="dairy">Süd Məhsulları</option>
                                    <option value="meat">Ət və Kolbasa</option>
                                    <option value="drinks">İçkilər</option>
                                    <option value="sweets">Şirniyyat</option>
                                    <option value="bakery">Çörək</option>
                                    <option value="fruit">Meyvə-Tərəvəz</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Təsvir</label>
                                <textarea className="input-field h-20" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>

                            <div>
                                <label className="label">Sağlamlıq Teqləri (AI üçün) - vergüllə ayırın</label>
                                <input className="input-field" placeholder="şəkərsiz, qlütensiz, zülal..." value={form.healthTagsStr || ''} onChange={e => setForm({ ...form, healthTagsStr: e.target.value })} />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <GlassButton className="flex-1">Yadda Saxla</GlassButton>
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-white/10">Ləğv</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Discount Modal */}
            {showDiscountModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-2">Qlobal Endirim</h3>
                        <p className="text-sm text-slate-500 mb-4">Bütün məhsullara faiz endirimi tətbiq et.</p>
                        <input type="number" className="input-field mb-4" value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} />
                        <div className="flex gap-2">
                            <GlassButton onClick={handleGlobalDiscount} className="flex-1 bg-red-600">Tətbiq Et</GlassButton>
                            <button onClick={() => setShowDiscountModal(false)} className="px-4 py-2 border rounded-xl">Ləğv</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
            .label { display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem; font-weight: 600; }
            .input-field { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: transparent; color: inherit; } 
            .dark .input-field { border-color: rgba(255,255,255,0.1); }
            .dark select.input-field { background-color: #1e293b; color: white; }
        `}</style>
        </div>
    );
};

export default AdminProducts;
