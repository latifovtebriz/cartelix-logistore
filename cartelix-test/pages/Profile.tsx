
import React, { useState, useMemo, useEffect } from 'react';
import { User, AppRoute, Receipt } from '../types';
import { api } from '../services/api';
import { GlassCard, GlassButton } from '../components/GlassComponents';
import { User as UserIcon, History, Edit2, Check, Mail, Phone, X, Search, ArrowUpDown, Smartphone, ScanLine, ChevronRight, Calendar, Menu } from 'lucide-react';

interface ProfileProps {
  user: User | null;
  initialTab?: 'info' | 'history';
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
  onViewReceipt: (receipt: Receipt) => void;
  onUpdateUser: (user: User) => Promise<void>;
  onOpenSidebar: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, initialTab = 'info', onNavigate, onLogout, onViewReceipt, onUpdateUser, onOpenSidebar }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'history'>(initialTab);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'date' | 'price-high' | 'price-low'>('date');

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: ''
  });
  const [errors, setErrors] = useState<{ name?: string, email?: string, phone?: string }>({});

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        birthDate: user.birthDate || ''
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: any = {};
    if (editForm.name.trim().length < 3) {
      newErrors.name = "Ad ən azı 3 simvol olmalıdır.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (editForm.email && !emailRegex.test(editForm.email)) {
      newErrors.email = "Düzgün email formatı daxil edin.";
    }

    const azPhoneRegex = /^(\+994|994|0)(10|50|51|55|60|70|77|99)\d{7}$/;
    const cleanPhone = editForm.phone.replace(/\s+|[^0-9+]/g, '');
    if (!azPhoneRegex.test(cleanPhone)) {
      newErrors.phone = "Düzgün Azərbaycan nömrəsi daxil edin.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (validateForm() && user) {
      setIsSaving(true);
      try {
        await onUpdateUser({
          ...user,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          birthDate: editForm.birthDate
        });
        setIsEditing(false);
        alert("Məlumatlar yeniləndi!");
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeTab === 'history' && user && receipts.length === 0) {
      loadReceipts(0);
    }
  }, [activeTab, user]);

  const loadReceipts = async (pageNum: number) => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const data = await api.getReceipts(user.id, pageNum, 10);
      if (pageNum === 0) {
        setReceipts(data.content);
      } else {
        setReceipts(prev => [...prev, ...data.content]);
      }
      setHasMore(data.content.length === 10); // Simple check, or use data.last if available (api returns Page)
      setPage(pageNum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleLoadMore = () => {
    loadReceipts(page + 1);
  };

  const filteredHistory = useMemo(() => {
    let data = [...receipts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.items.some(i => i.name.toLowerCase().includes(q))
      );
    }

    data.sort((a, b) => {
      if (sortOrder === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortOrder === 'price-high') return b.total - a.total;
      if (sortOrder === 'price-low') return a.total - b.total;
      return 0;
    });

    return data;
  }, [receipts, searchQuery, sortOrder]);

  const scanGoCount = receipts.filter(r => r.type === 'SCAN_GO').length || 0;
  const physicalCount = receipts.filter(r => r.type === 'PHYSICAL').length || 0;

  if (!user) return null;

  return (
    <div className="pb-32 pt-20 px-4 space-y-6">
      <div className="fixed top-0 left-0 right-0 z-40 px-4 py-3 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 flex items-center gap-3 transition-all">
        <button
          onClick={onOpenSidebar}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 active:scale-95 transition-all border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {activeTab === 'info' ? 'Şəxsi Məlumatlar' : 'Alış Tarixçəsi'}
        </h1>
      </div>

      {/* ==================== PERSONAL INFO TAB ==================== */}
      {activeTab === 'info' && (
        <div className="space-y-6 animate-fadeIn">
          <GlassCard className="p-6 relative overflow-hidden border-t border-white/20 dark:bg-white/5 backdrop-blur-2xl">
            <div className="relative z-10 flex flex-col items-center text-center mb-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg text-white text-3xl font-bold mb-4">
                {user.name?.charAt(0) || <UserIcon />}
              </div>

              {!isEditing ? (
                <>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
                  <p className="text-emerald-600 dark:text-emerald-400 text-sm mb-4">{user.phone}</p>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 gap-3 w-full text-left mt-4">
                    <div className="bg-slate-100/50 dark:bg-white/5 p-3 rounded-xl border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
                      <Mail className="w-5 h-5 text-slate-400 dark:text-white/40" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-white/40">Email</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{user.email || 'Qeyd olunmayıb'}</p>
                      </div>
                    </div>
                    <div className="bg-slate-100/50 dark:bg-white/5 p-3 rounded-xl border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-slate-400 dark:text-white/40" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-white/40">Doğum Tarixi</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{user.birthDate || 'Qeyd olunmayıb'}</p>
                      </div>
                    </div>
                  </div>

                  <GlassButton
                    onClick={() => setIsEditing(true)}
                    className="mt-6 w-full py-3 flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Məlumatları Düzəlt
                  </GlassButton>
                </>
              ) : (
                /* EDIT FORM */
                <div className="w-full space-y-4 animate-fadeIn text-left">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-white/50 ml-1">Ad Soyad</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-white/40" />
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className={`w-full bg-slate-100/50 dark:bg-black/20 border ${errors.name ? 'border-red-500' : 'border-slate-200/50 dark:border-white/10'} rounded-xl pl-9 pr-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500`}
                        placeholder="Ad Soyad"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-white/50 ml-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-white/40" />
                      <input
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className={`w-full bg-slate-100/50 dark:bg-black/20 border ${errors.email ? 'border-red-500' : 'border-slate-200/50 dark:border-white/10'} rounded-xl pl-9 pr-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500`}
                        placeholder="Email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-white/50 ml-1">Mobil Nömrə</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-white/40" />
                      <input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className={`w-full bg-slate-100/50 dark:bg-black/20 border ${errors.phone ? 'border-red-500' : 'border-slate-200/50 dark:border-white/10'} rounded-xl pl-9 pr-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500`}
                        placeholder="050 123 45 67"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-white/50 ml-1">Doğum Tarixi</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-white/40" />
                      <input
                        type="date"
                        value={editForm.birthDate}
                        onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                        className="w-full bg-slate-100/50 dark:bg-black/20 border border-slate-200/50 dark:border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <GlassButton onClick={handleSave} className="flex-1 py-3 text-sm bg-emerald-600 hover:bg-emerald-500" disabled={isSaving}>
                      {isSaving ? 'Yadda saxlanılır...' : <><Check className="w-4 h-4 mr-1" /> Yadda saxla</>}
                    </GlassButton>
                    <button onClick={() => setIsEditing(false)} disabled={isSaving} className="flex-1 py-3 rounded-xl border border-slate-200/50 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 text-sm hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/60">
                      <X className="w-4 h-4 inline mr-1" /> Ləğv et
                    </button>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ==================== HISTORY TAB ==================== */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-slideUp">

          {/* History Specific Stats */}
          <div className="grid grid-cols-2 gap-3">
            <GlassCard className="p-3 flex flex-col items-center justify-center bg-emerald-100/50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20">
              <div className="w-10 h-10 bg-emerald-200/50 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{scanGoCount}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-300/70 font-medium uppercase">Scan & Go</span>
            </GlassCard>
            <GlassCard className="p-3 flex flex-col items-center justify-center bg-indigo-100/50 dark:bg-indigo-500/10 border-indigo-200/50 dark:border-indigo-500/20">
              <div className="w-10 h-10 bg-indigo-200/50 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mb-2">
                <ScanLine className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{physicalCount}</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-300/70 font-medium uppercase">Fiziki Alış</span>
            </GlassCard>
          </div>

          {/* Filters & Sorting */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-white/40" />
              <input
                placeholder="Çek və ya məhsul axtar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-slate-50 dark:focus:bg-white/10 transition placeholder:text-slate-400 dark:placeholder:text-white/30"
              />
            </div>

            <button
              onClick={() => {
                if (sortOrder === 'date') setSortOrder('price-high');
                else if (sortOrder === 'price-high') setSortOrder('price-low');
                else setSortOrder('date');
              }}
              className="bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2.5 flex items-center gap-2 text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/10 active:scale-95 transition min-w-[110px] justify-center"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-xs font-medium">
                {sortOrder === 'date' && 'Tarix'}
                {sortOrder === 'price-high' && 'Məbləğ (Çox)'}
                {sortOrder === 'price-low' && 'Məbləğ (Az)'}
              </span>
            </button>
          </div>

          {/* List */}
          <div className="pb-6 space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-white/30 bg-white/50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200/50 dark:border-white/10">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Tarixçə boşdur</p>
              </div>
            ) : (
              filteredHistory.map(receipt => (
                <GlassCard
                  key={receipt.id}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/10 active:scale-95 transition group border-slate-200/50 dark:border-white/5"
                  onClick={() => onViewReceipt(receipt)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${receipt.type === 'SCAN_GO' ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 text-emerald-600 dark:text-emerald-400' : 'bg-gradient-to-br from-indigo-500/20 to-indigo-700/20 text-indigo-600 dark:text-indigo-400'}`}>
                      {receipt.type === 'SCAN_GO' ? <Smartphone className="w-6 h-6" /> : <ScanLine className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition">{receipt.total.toFixed(2)} ₼</h4>
                      <p className="text-xs text-slate-500 dark:text-white/50 flex items-center gap-2">
                        <span>{receipt.date}</span>
                        <span className="w-1 h-1 bg-slate-300 dark:bg-white/30 rounded-full"></span>
                        <span>{receipt.items.length} məhsul</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${receipt.type === 'SCAN_GO' ? 'bg-emerald-100/50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-100/50 dark:bg-indigo-500/10 border-indigo-200/50 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400'}`}>
                      {receipt.type === 'SCAN_GO' ? 'Digital' : 'Fiziki'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-white/20 group-hover:translate-x-1 transition mt-1" />
                  </div>
                </GlassCard>
              ))
            )}

            {filteredHistory.length > 0 && hasMore && (
              <GlassButton onClick={handleLoadMore} disabled={loadingHistory} className="w-full py-2 text-sm mt-4">
                {loadingHistory ? 'Yüklənir...' : 'Daha çox göstər'}
              </GlassButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
