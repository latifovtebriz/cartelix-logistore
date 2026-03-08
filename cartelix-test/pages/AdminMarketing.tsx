
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { GlassButton } from '../components/GlassComponents';
import { Gift, Calendar, User, Percent, Tag, X, Plus, Trash2, Edit2, Users, Send, Bell } from 'lucide-react';
import { Challenge, User as UserType } from '../types';
import { ToastMessage } from '../components/Toast';

interface Props {
    showToast: (message: string, type: ToastMessage['type']) => void;
}

const AdminMarketing: React.FC<Props> = ({ showToast }) => {
    const [tab, setTab] = useState<'discounts' | 'campaigns' | 'broadcast'>('discounts');
    const [challenges, setChallenges] = useState<any[]>([]);
    const [discounts, setDiscounts] = useState<any[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Challenge form
    const [form, setForm] = useState<Partial<Challenge>>({
        title: '',
        reward: '',
        targetAmount: 10,
        type: 'points',
        targetUserId: '',
        startDate: '',
        endDate: '',
        // Purchase-based campaign fields
        requiredPurchaseCount: undefined,
        minAmountPerPurchase: undefined,
        discountType: 'PERCENTAGE',
        discountValue: undefined
    });

    // Discount form
    const [discountForm, setDiscountForm] = useState({
        name: '', description: '', type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y',
        value: 10, target: 'ALL_PRODUCTS' as 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'SPECIFIC_CATEGORIES',
        startDate: '', endDate: '', active: true, productIds: [] as number[], categoryIds: [] as number[],
        buyQuantity: 2, payQuantity: 1, priority: 0
    });

    // Personal discount modal
    const [showPersonalModal, setShowPersonalModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [personalDiscount, setPersonalDiscount] = useState({
        name: '', description: '', type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT', value: 10,
        target: 'ALL_PRODUCTS' as any, startDate: '', endDate: ''
    });

    // Broadcast notification
    const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', type: 'info' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [c, d, u, p, cat] = await Promise.all([
                api.getChallenges(),
                api.getDiscounts(),
                api.getAllUsers(0, 100),
                api.getProducts(0, 1000), // Load all products for selection
                api.getCategories()
            ]);
            setChallenges(c);
            setDiscounts(d);
            setUsers(u.content || u as any);
            setProducts(p.content || []);
            setCategories(cat || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const createChallenge = async (e: React.FormEvent) => {
        e.preventDefault();
        await api.createChallenge(form);
        loadData();
        showToast("Kampaniya yaradıldı", "success");
        setForm({
            title: '',
            reward: '',
            targetAmount: 10,
            type: 'points',
            targetUserId: '',
            startDate: '',
            endDate: '',
            requiredPurchaseCount: undefined,
            minAmountPerPurchase: undefined,
            discountType: 'PERCENTAGE',
            discountValue: undefined
        });
    };

    const createDiscount = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!discountForm.name.trim()) { showToast("Endirim adı vacibdir", "error"); return; }
        if (discountForm.value <= 0) { showToast("Endirim dəyəri 0-dan böyük olmalıdır", "error"); return; }
        if (discountForm.type === 'PERCENTAGE' && discountForm.value > 100) { showToast("Faiz 100-dən çox ola bilməz", "error"); return; }
        if (discountForm.startDate && discountForm.endDate && new Date(discountForm.startDate) > new Date(discountForm.endDate)) {
            showToast("Bitmə tarixi başlama tarixindən tez ola bilməz", "error");
            return;
        }

        try {
            // Format dates for backend (expects LocalDateTime format)
            const formattedData = {
                ...discountForm,
                startDate: discountForm.startDate ? `${discountForm.startDate}T00:00:00` : undefined,
                endDate: discountForm.endDate ? `${discountForm.endDate}T23:59:59` : undefined,
            };
            await api.createDiscount(formattedData);
            loadData();
            showToast("Endirim yaradıldı", "success");
            setDiscountForm({
                name: '', description: '', type: 'PERCENTAGE', value: 10, target: 'ALL_PRODUCTS',
                startDate: '', endDate: '', active: true, productIds: [], categoryIds: [], buyQuantity: 2, payQuantity: 1, priority: 0
            });
        } catch (e: any) { showToast(e.message, "error"); }
    };

    const deleteDiscount = async (id: number) => {
        if (window.confirm("Bu endirimi silmək istəyirsiniz?")) {
            await api.deleteDiscount(id);
            loadData();
            showToast("Endirim silindi", "success");
        }
    };

    const deleteChallenge = async (id: any) => {
        if (window.confirm("Bu kampaniyanı silmək istəyirsiniz?")) {
            try {
                // Handle potential string ID like "ch_123"
                const numericId = typeof id === 'string' ? Number(id.replace(/\D/g, '')) : id;
                console.log("Deleting challenge. Raw ID:", id, "Numeric ID:", numericId);

                await api.deleteChallenge(numericId);
                loadData();
                showToast("Kampaniya silindi", "success");
            } catch (e: any) {
                console.error("Delete error:", e);
                showToast(e.message || "Silmə zamanı xəta baş verdi", "error");
            }
        }
    };

    const createPersonalDiscountForUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) { showToast("İstifadəçi seçin", "error"); return; }
        try {
            // Format dates for backend
            const formattedDiscount = {
                userId: selectedUserId,
                ...personalDiscount,
                startDate: personalDiscount.startDate ? `${personalDiscount.startDate}T00:00:00` : undefined,
                endDate: personalDiscount.endDate ? `${personalDiscount.endDate}T23:59:59` : undefined,
            };
            await api.createPersonalDiscount(formattedDiscount);
            setShowPersonalModal(false);
            setPersonalDiscount({ name: '', description: '', type: 'PERCENTAGE', value: 10, target: 'ALL_PRODUCTS', startDate: '', endDate: '' });
            showToast("Fərdi endirim göndərildi!", "success");
        } catch (e: any) { showToast(e.message, "error"); }
    };

    const sendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.broadcastNotification(broadcastForm.title, broadcastForm.message, broadcastForm.type);
            showToast("Bildiriş bütün istifadəçilərə göndərildi!", "success");
            setBroadcastForm({ title: '', message: '', type: 'info' });
        } catch (e) { showToast("Xəta baş verdi", "error"); }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold">Marketinq & Endirimlər</h2>
                <button onClick={() => setShowPersonalModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    <Gift className="w-4 h-4" /> Fərdi Endirim Göndər
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                <button onClick={() => setTab('discounts')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'discounts' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <Percent className="w-4 h-4 inline mr-1" /> Endirimlər
                </button>
                <button onClick={() => setTab('campaigns')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'campaigns' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <Gift className="w-4 h-4 inline mr-1" /> Kampaniyalar
                </button>
                <button onClick={() => setTab('broadcast')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'broadcast' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <Bell className="w-4 h-4 inline mr-1" /> Toplu Bildiriş
                </button>
            </div>

            {tab === 'discounts' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Create Discount Form */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-white/10">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Percent className="w-5 h-5 text-emerald-500" /> Yeni Endirim Yarat</h3>
                        <form onSubmit={createDiscount} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Endirim Adı *</label>
                                <input className="w-full p-2 border rounded-lg bg-transparent" value={discountForm.name} onChange={e => setDiscountForm({ ...discountForm, name: e.target.value })} placeholder="Məs: Yaz Endirimi" required />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Açıqlama</label>
                                <input className="w-full p-2 border rounded-lg bg-transparent" value={discountForm.description} onChange={e => setDiscountForm({ ...discountForm, description: e.target.value })} placeholder="Endirim haqqında qısa məlumat" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Tip</label>
                                    <select className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={discountForm.type} onChange={e => setDiscountForm({ ...discountForm, type: e.target.value as any })}>
                                        <option value="PERCENTAGE">Faiz (%)</option>
                                        <option value="FIXED_AMOUNT">Sabit Məbləğ (₼)</option>
                                        <option value="BUY_X_GET_Y">Al X Ödə Y</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">{discountForm.type === 'PERCENTAGE' ? 'Faiz (%)' : 'Məbləğ (₼)'}</label>
                                    <input type="number" className="w-full p-2 border rounded-lg bg-transparent" value={discountForm.value} onChange={e => setDiscountForm({ ...discountForm, value: Number(e.target.value) })} min={0} max={discountForm.type === 'PERCENTAGE' ? 100 : 9999} />
                                </div>
                            </div>
                            {discountForm.type === 'BUY_X_GET_Y' && (
                                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Al (X)</label>
                                        <input type="number" className="w-full p-2 border rounded-lg bg-transparent" value={discountForm.buyQuantity} onChange={e => setDiscountForm({ ...discountForm, buyQuantity: Number(e.target.value) })} min={1} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Ödə (Y)</label>
                                        <input type="number" className="w-full p-2 border rounded-lg bg-transparent" value={discountForm.payQuantity} onChange={e => setDiscountForm({ ...discountForm, payQuantity: Number(e.target.value) })} min={1} />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Hədəf</label>
                                <select className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={discountForm.target} onChange={e => setDiscountForm({ ...discountForm, target: e.target.value as any })}>
                                    <option value="ALL_PRODUCTS">Bütün Məhsullar</option>
                                    <option value="SPECIFIC_PRODUCTS">Seçilmiş Məhsullar</option>
                                    <option value="SPECIFIC_CATEGORIES">Seçilmiş Kateqoriyalar</option>
                                </select>
                            </div>

                            {/* Product Multi-Select */}
                            {discountForm.target === 'SPECIFIC_PRODUCTS' && (
                                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                                    <label className="text-xs text-slate-500 block mb-2 font-bold">Məhsulları Seçin</label>
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                        {products.length === 0 ? (
                                            <p className="text-xs text-slate-400">Məhsul yüklənir...</p>
                                        ) : (
                                            products.map(p => (
                                                <label key={p.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={discountForm.productIds.includes(p.id)}
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                setDiscountForm({ ...discountForm, productIds: [...discountForm.productIds, p.id] });
                                                            } else {
                                                                setDiscountForm({ ...discountForm, productIds: discountForm.productIds.filter(id => id !== p.id) });
                                                            }
                                                        }}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-sm">{p.name} ({p.price}₼)</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">{discountForm.productIds.length} məhsul seçildi</p>
                                </div>
                            )}

                            {/* Category Multi-Select */}
                            {discountForm.target === 'SPECIFIC_CATEGORIES' && (
                                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                                    <label className="text-xs text-slate-500 block mb-2 font-bold">Kateqoriyaları Seçin</label>
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                        {categories.length === 0 ? (
                                            <p className="text-xs text-slate-400">Kateqoriya yüklənir...</p>
                                        ) : (
                                            categories.map(c => (
                                                <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={discountForm.categoryIds.includes(c.id)}
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                setDiscountForm({ ...discountForm, categoryIds: [...discountForm.categoryIds, c.id] });
                                                            } else {
                                                                setDiscountForm({ ...discountForm, categoryIds: discountForm.categoryIds.filter(id => id !== c.id) });
                                                            }
                                                        }}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-sm">{c.icon} {c.name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">{discountForm.categoryIds.length} kateqoriya seçildi</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Başlama</label>
                                    <input type="date" className="w-full p-2 border rounded-lg bg-transparent" value={discountForm.startDate} onChange={e => setDiscountForm({ ...discountForm, startDate: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Bitmə</label>
                                    <input type="date" className="w-full p-2 border rounded-lg bg-transparent" value={discountForm.endDate} onChange={e => setDiscountForm({ ...discountForm, endDate: e.target.value })} />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={discountForm.active} onChange={e => setDiscountForm({ ...discountForm, active: e.target.checked })} className="w-4 h-4" />
                                Aktiv
                            </label>
                            <GlassButton className="w-full"><Plus className="w-4 h-4 inline mr-1" /> Endirim Yarat</GlassButton>
                        </form>
                    </div>

                    {/* Discounts List */}
                    <div className="space-y-4">
                        <h3 className="font-bold">Mövcud Endirimlər ({discounts.length})</h3>
                        {loading ? <p className="text-slate-400">Yüklənir...</p> : discounts.length === 0 ? <p className="text-slate-400">Endirim yoxdur</p> : discounts.map((d, i) => {
                            // Status determination
                            let statusColor = 'bg-slate-100 text-slate-500';
                            let statusText = 'Deaktiv';

                            if (d.active) {
                                if (d.currentlyActive) {
                                    statusColor = 'bg-emerald-100 text-emerald-600';
                                    statusText = 'Aktiv';
                                } else {
                                    statusColor = 'bg-orange-100 text-orange-600';
                                    statusText = 'Vaxtı Bitib';
                                }
                            }

                            return (
                                <div key={i} className="bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 w-1 h-full ${d.active ? (d.currentlyActive ? 'bg-emerald-500' : 'bg-orange-500') : 'bg-slate-400'}`}></div>
                                    <div className="pl-3 flex justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold">{d.name}</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${statusColor}`}>{statusText}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${d.isPersonal ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {d.isPersonal ? 'Fərdi 👤' : 'Qlobal 🌍'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1">{d.description || 'Açıqlama yoxdur'}</p>

                                            {/* Info Badges */}
                                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                                <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded border border-blue-100 dark:border-blue-800">
                                                    {d.type === 'PERCENTAGE' ? `%${d.value} Endirim` : d.type === 'FIXED_AMOUNT' ? `${d.value}₼ Endirim` : `Al ${d.buyQuantity} Ödə ${d.payQuantity}`}
                                                </span>
                                                <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700">
                                                    {d.target === 'ALL_PRODUCTS' ? 'Bütün Məhsullar' : d.target === 'SPECIFIC_PRODUCTS' ? 'Seçilmiş Məhsullar' : 'Seçilmiş Kateqoriyalar'}
                                                </span>
                                                {d.isPersonal && d.targetUserId && (
                                                    <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded border border-purple-100 dark:border-purple-800">
                                                        User: {users.find(u => u.id === d.targetUserId)?.name || d.targetUserId}
                                                    </span>
                                                )}
                                                {d.startDate && (
                                                    <span className={`px-2 py-1 rounded border ${!d.currentlyActive && d.active ? 'bg-red-50 text-red-500 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                        📅 {new Date(d.startDate).toLocaleDateString()} - {new Date(d.endDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={() => deleteDiscount(d.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg h-fit"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {tab === 'campaigns' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Create Campaign Form */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-white/10">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Gift className="w-5 h-5 text-purple-500" /> Yeni Kampaniya Yarat</h3>
                        <form onSubmit={createChallenge} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Kampaniya Başlığı</label>
                                <input className="w-full p-2 border rounded-lg bg-transparent" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Məs: Həftəsonu Endirimi" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Başlama Tarixi</label>
                                    <input type="date" className="w-full p-2 border rounded-lg bg-transparent" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Bitmə Tarixi</label>
                                    <input type="date" className="w-full p-2 border rounded-lg bg-transparent" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required />
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                <label className="text-xs text-slate-500 block mb-1 font-bold flex items-center gap-1"><User className="w-3 h-3" /> Hədəfləmə (Boş = Hamı)</label>
                                <input className="w-full p-2 border rounded-lg bg-transparent" value={form.targetUserId} onChange={e => setForm({ ...form, targetUserId: e.target.value })} placeholder="User ID" />
                            </div>

                            {/* Purchase-Based Campaign Fields */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                                <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-3">Alış Veriş Əsaslı Kampaniya</h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Tələb olunan alış veriş sayı</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700"
                                                value={form.requiredPurchaseCount || ''}
                                                onChange={e => setForm({ ...form, requiredPurchaseCount: e.target.value ? Number(e.target.value) : undefined })}
                                                placeholder="Məs: 3"
                                                min="1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Minimum məbləğ (hər alış)</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700"
                                                value={form.minAmountPerPurchase || ''}
                                                onChange={e => setForm({ ...form, minAmountPerPurchase: e.target.value ? Number(e.target.value) : undefined })}
                                                placeholder="Məs: 10 AZN"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Endirim tipi</label>
                                            <select
                                                className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700"
                                                value={form.discountType || 'PERCENTAGE'}
                                                onChange={e => setForm({ ...form, discountType: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT' })}
                                            >
                                                <option value="PERCENTAGE">Faiz (%)</option>
                                                <option value="FIXED_AMOUNT">Sabit Məbləğ (₼)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                                                {form.discountType === 'PERCENTAGE' ? 'Endirim faizi (%)' : 'Endirim məbləği (₼)'}
                                            </label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border rounded-lg bg-white dark:bg-slate-700"
                                                value={form.discountValue || ''}
                                                onChange={e => setForm({ ...form, discountValue: e.target.value ? Number(e.target.value) : undefined })}
                                                placeholder={form.discountType === 'PERCENTAGE' ? "Məs: 20" : "Məs: 5"}
                                                step={form.discountType === 'PERCENTAGE' ? "1" : "0.01"}
                                                min="0"
                                                max={form.discountType === 'PERCENTAGE' ? "100" : undefined}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 italic">
                                        * Alış veriş əsaslı kampaniya yaratmaq üçün bütün sahələri doldurun
                                    </p>
                                </div>
                            </div>

                            <GlassButton className="w-full">Kampaniyanı Yarat</GlassButton>
                        </form>
                    </div>

                    {/* Campaigns List */}
                    <div className="space-y-4">
                        <h3 className="font-bold">Aktiv Kampaniyalar ({challenges.length})</h3>
                        {loading ? <p className="text-slate-400">Yüklənir...</p> : challenges.length === 0 ? <p className="text-slate-400">Kampaniya yoxdur</p> : challenges.map((c, i) => (
                            <div key={i} className="bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1 h-full ${c.isPersonalized ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                <div className="pl-3 flex justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold">{c.title}</h4>
                                            <span className={`text-[10px] px-2 py-1 rounded font-bold ${c.isPersonalized ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {c.isPersonalized ? 'Fərdi' : 'Qlobal'}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-xs text-slate-500 space-y-1">
                                            {c.requiredPurchaseCount && c.requiredPurchaseCount > 0 ? (
                                                <>
                                                    <p className="flex items-center gap-1">
                                                        <span className="font-bold text-blue-600">{c.requiredPurchaseCount}</span> alış veriş tələb olunur
                                                    </p>
                                                    <p>
                                                        Hər alış: <span className="font-bold text-emerald-600">{c.minAmountPerPurchase} AZN</span> minimum
                                                    </p>
                                                    {c.discountType && c.discountValue && (
                                                        <p className="font-bold text-purple-600">
                                                            Endirim: {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `${c.discountValue} ₼`}
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {c.targetAmount && <p>Hədəf: <span className="font-bold">{c.targetAmount} AZN</span> alış</p>}
                                                    {c.reward && <p>Mükafat: <span className="font-bold text-emerald-600">{c.reward}</span></p>}
                                                </>
                                            )}
                                            <p className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.startDate} - {c.endDate}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteChallenge(c.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg self-start"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'broadcast' && (
                <div className="max-w-xl">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-white/10">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-orange-500" /> Toplu Bildiriş Göndər</h3>
                        <p className="text-sm text-slate-500 mb-4">Bu bildiriş bütün istifadəçilərə göndəriləcək.</p>
                        <form onSubmit={sendBroadcast} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Başlıq *</label>
                                <input className="w-full p-3 border rounded-lg bg-transparent" value={broadcastForm.title} onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })} placeholder="Bildiriş başlığı" required />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Mesaj *</label>
                                <textarea className="w-full p-3 border rounded-lg bg-transparent" rows={4} value={broadcastForm.message} onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })} placeholder="Bildiriş mətni" required />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Tip</label>
                                <select className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={broadcastForm.type} onChange={e => setBroadcastForm({ ...broadcastForm, type: e.target.value })}>
                                    <option value="info">Məlumat</option>
                                    <option value="discount">Endirim</option>
                                    <option value="warning">Xəbərdarlıq</option>
                                    <option value="success">Uğur</option>
                                </select>
                            </div>
                            <GlassButton className="w-full"><Send className="w-4 h-4 inline mr-2" /> Hamıya Göndər</GlassButton>
                        </form>
                    </div>
                </div>
            )}

            {/* Personal Discount Modal */}
            {showPersonalModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPersonalModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold">Fərdi Endirim Göndər</h3>
                            <button onClick={() => setShowPersonalModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={createPersonalDiscountForUser} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">İstifadəçi seçin *</label>
                                <select className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} required>
                                    <option value="">Seçin...</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name} {u.surname} ({u.phone})</option>)}
                                </select>
                            </div>
                            <div><label className="text-xs text-slate-500 block mb-1">Endirim adı *</label><input className="w-full p-3 border rounded-lg bg-transparent" value={personalDiscount.name} onChange={e => setPersonalDiscount({ ...personalDiscount, name: e.target.value })} placeholder="Sizə xüsusi endirim!" required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs text-slate-500 block mb-1">Tip</label><select className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={personalDiscount.type} onChange={e => setPersonalDiscount({ ...personalDiscount, type: e.target.value as any })}><option value="PERCENTAGE">Faiz (%)</option><option value="FIXED_AMOUNT">Sabit (₼)</option></select></div>
                                <div><label className="text-xs text-slate-500 block mb-1">Dəyər</label><input type="number" className="w-full p-3 border rounded-lg bg-transparent" value={personalDiscount.value} onChange={e => setPersonalDiscount({ ...personalDiscount, value: Number(e.target.value) })} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs text-slate-500 block mb-1">Başlama</label><input type="date" className="w-full p-3 border rounded-lg bg-transparent" value={personalDiscount.startDate} onChange={e => setPersonalDiscount({ ...personalDiscount, startDate: e.target.value })} /></div>
                                <div><label className="text-xs text-slate-500 block mb-1">Bitmə</label><input type="date" className="w-full p-3 border rounded-lg bg-transparent" value={personalDiscount.endDate} onChange={e => setPersonalDiscount({ ...personalDiscount, endDate: e.target.value })} /></div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold flex items-center justify-center gap-2"><Gift className="w-4 h-4" /> Göndər</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMarketing;
