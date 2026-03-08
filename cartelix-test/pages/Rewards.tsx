
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassComponents';
import { Challenge, User } from '../types';
import { api } from '../services/api';
import { Gift, Copy, Tag, Zap, User as UserIcon, Info, Menu, History, ScanLine, Calendar, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Barcode } from '../components/Barcode';

interface Props {
  user: User | null;
  onSimulateCashierScan: (mode?: 'product' | 'receipt' | 'pos') => void;
  onOpenSidebar: () => void;
  onNavigate: (route: any) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

// Extended interface for promo codes with details
interface PromoCodeDetail {
  id: number | string;
  code: string;
  title: string;
  description: string;
  type: 'promo' | 'discount' | 'points';
  status: 'active' | 'used' | 'expired' | 'completed';
  reward: string;
  promoCode?: string;
  isPersonalized?: boolean;
  startDate?: string;
  endDate?: string;
  expiryDate?: string;
  usageLimit?: number;
  userUsageLimit?: number;
  currentUsageCount?: number;
  minBasketValue?: number;
  discountAmount?: number;
  isPercentage?: boolean;
  progress?: number;
  total?: number;
  targetAmount?: number;
}

const Rewards: React.FC<Props> = ({ user, onSimulateCashierScan, onOpenSidebar, onNavigate, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [userPromoCodes, setUserPromoCodes] = useState<any[]>([]);
  const [userDiscounts, setUserDiscounts] = useState<any[]>([]);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const data = await api.getChallenges();
        setChallenges(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchChallenges();
  }, []);

  // Fetch user's promo codes
  useEffect(() => {
    const fetchUserPromoCodes = async () => {
      if (user) {
        try {
          const codes = await api.getUserPromoCodes(user.id);
          setUserPromoCodes(codes);

          // Also fetch active discounts for this user
          const discounts = await api.getUserDiscounts(user.id);
          setUserDiscounts(discounts);
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchUserPromoCodes();
  }, [user]);

  // Helper to format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  // Helper to check if date is expired
  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  // Helper to get days remaining
  const getDaysRemaining = (dateStr?: string) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  // Convert user promo codes to extended format
  const userPromoAsChallenges: PromoCodeDetail[] = userPromoCodes.map((pc, idx) => ({
    id: pc.id || 1000 + idx,
    code: pc.code,
    title: pc.name || pc.code,
    description: pc.description || (pc.isPercentage ? `${pc.discountAmount}% endirim` : `${pc.discountAmount} ₼ endirim`),
    type: 'promo' as const,
    status: pc.userStatus ? (pc.userStatus as 'active' | 'used' | 'expired') : (isExpired(pc.expiryDate) ? 'expired' : 'active'),
    reward: pc.isPercentage ? `${pc.discountAmount}%` : `${pc.discountAmount} ₼`,
    promoCode: pc.code,
    isPersonalized: !!pc.targetUserId,
    startDate: pc.startDate,
    endDate: pc.expiryDate,
    expiryDate: pc.expiryDate,
    usageLimit: pc.usageLimit,
    userUsageLimit: pc.userUsageLimit,
    currentUsageCount: pc.currentUsageCount,
    minBasketValue: pc.minBasketValue,
    discountAmount: pc.discountAmount,
    isPercentage: pc.isPercentage,
  }));

  // Convert user discounts (from Admin Panel) to extended format
  const userDiscountsFormatted: PromoCodeDetail[] = userDiscounts.map(d => ({
    id: `d_${d.id}`,
    code: d.name,
    title: d.name,
    description: d.description || (d.type === 'PERCENTAGE' ? `${d.value}% endirim` : `${d.value} ₼ endirim`),
    type: 'discount' as const,
    status: d.active && !isExpired(d.endDate) ? 'active' : 'expired',
    reward: d.type === 'PERCENTAGE' ? `${d.value}%` : (d.type === 'FIXED_AMOUNT' ? `${d.value} ₼` : `Al ${d.buyQuantity} Ödə ${d.payQuantity}`),
    promoCode: '', // Discounts don't imply a code to copy
    isPersonalized: !!d.targetUserId,
    startDate: d.startDate,
    endDate: d.endDate,
    expiryDate: d.endDate,
    minBasketValue: 0,
    discountAmount: d.value,
    isPercentage: d.type === 'PERCENTAGE',
  }));

  // Convert challenges to extended format
  const challengesExtended: PromoCodeDetail[] = challenges.map(c => ({
    ...c,
    code: c.promoCode || c.title,
    startDate: c.startDate,
    endDate: c.endDate,
  }));

  // All items combined
  const allItems = [...challengesExtended, ...userPromoAsChallenges, ...userDiscountsFormatted];

  // Active items (not expired, not used)
  const activeItems = allItems.filter(c =>
    c.status !== 'expired' &&
    c.status !== 'used' &&
    c.status !== 'completed' &&
    !isExpired(c.endDate || c.expiryDate)
  );

  // History items (expired or used)
  const historyItems = allItems.filter(c =>
    c.status === 'expired' ||
    c.status === 'used' ||
    c.status === 'completed' ||
    isExpired(c.endDate || c.expiryDate)
  );

  // Separate by type for active tab
  const promoCodes = activeItems.filter(c => c.type === 'promo');
  const discounts = activeItems.filter(c => c.type === 'discount' || c.type === 'points');

  // Status badge component
  const StatusBadge = ({ item }: { item: PromoCodeDetail }) => {
    const expDate = item.endDate || item.expiryDate;
    const expired = isExpired(expDate);
    const daysLeft = getDaysRemaining(expDate);

    if (item.status === 'used' || item.status === 'completed') {
      return (
        <span className="flex items-center gap-1 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs px-2 py-1 rounded-full font-bold">
          <CheckCircle className="w-3 h-3" /> İstifadə olunub
        </span>
      );
    }
    if (expired || item.status === 'expired') {
      return (
        <span className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-xs px-2 py-1 rounded-full font-bold">
          <XCircle className="w-3 h-3" /> Müddəti bitib
        </span>
      );
    }
    if (daysLeft !== null && daysLeft <= 3) {
      return (
        <span className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 text-xs px-2 py-1 rounded-full font-bold animate-pulse">
          <AlertTriangle className="w-3 h-3" /> {daysLeft} gün qaldı
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 text-xs px-2 py-1 rounded-full font-bold">
        <CheckCircle className="w-3 h-3" /> Aktiv
      </span>
    );
  };

  return (
    <div className="pb-32 pt-20 px-4 space-y-6">
      {/* Sticky Header */}
      <div className="fixed top-0 left-0 right-0 z-40 px-4 py-3 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 flex items-center gap-3 transition-all mb-4">
        <button
          onClick={onOpenSidebar}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 active:scale-95 transition-all border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Bonus Kartı</h1>
        </div>
      </div>

      {/* DIGITAL CARD SECTION */}
      <GlassCard className="p-0 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 border-emerald-500/30 shadow-xl shadow-emerald-500/10">
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>

        <div className="p-6 flex justify-between items-start relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <h2 className="font-bold text-2xl text-white tracking-wide">Logi <span className="text-emerald-400">PLUS</span></h2>
            </div>
            <p className="text-xs text-white/50 ml-10">Rəqəmsal Sadiqlik Kartı</p>
          </div>
          <div className="text-right bg-emerald-500/20 px-4 py-2 rounded-xl border border-emerald-500/30">
            <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Bonus</p>
            <p className="text-3xl font-bold text-white">{user ? user.points : 0}</p>
          </div>
        </div>

        <div className="bg-white w-[90%] mx-auto mb-5 p-4 rounded-xl flex flex-col items-center justify-center shadow-lg relative z-10">
          {user ? (
            <>
              <Barcode value={user.barcode || user.phone.replace(/\D/g, '')} width={320} height={120} className="w-full" />
              <p className="font-mono text-slate-900 font-bold tracking-[0.25em] text-sm mt-2">{user.barcode || user.phone.replace(/\+/g, '')}</p>
              <p className="text-[10px] text-slate-400 mt-1">{user.name} {user.surname}</p>
            </>
          ) : (
            <div className="h-20 flex items-center justify-center text-slate-400 text-sm">
              Giriş edilməyib
            </div>
          )}
        </div>

        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/30 rounded-full blur-3xl"></div>
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600"></div>
      </GlassCard>

      <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
          Kassada bu barkodu təqdim edərək hər alışda ümumi məbləğin <span className="text-slate-900 dark:text-white font-bold">2%</span>-ni bonus qazanın.
        </p>
      </div>

      {/* FIZIKI ÇEK OXUTMA BUTTON */}
      {user && (
        <button
          onClick={() => onSimulateCashierScan('receipt')}
          className="w-full p-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center gap-3 text-white font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <ScanLine className="w-6 h-6" />
          <span>Fiziki Çek Oxut (Bonus Al)</span>
        </button>
      )}

      {/* TABS */}
      <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white dark:bg-white/10 text-slate-900 shadow-sm dark:text-white' : 'text-slate-500 dark:text-white/50'}`}
        >
          Aktiv
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white dark:bg-white/10 text-slate-900 shadow-sm dark:text-white' : 'text-slate-500 dark:text-white/50'}`}
        >
          Keçmiş
        </button>
      </div>

      {/* CONTENT */}
      {activeTab === 'active' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* ACTIVE PROMO CODES */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-2">
              <Gift className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Aktiv Kuponlar</h2>
              <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-2 py-0.5 rounded-full">{promoCodes.length}</span>
            </div>

            {promoCodes.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-white/30 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                <Gift className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Hazırda aktiv kupon yoxdur.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {promoCodes.map(promo => {
                  const expDate = promo.endDate || promo.expiryDate;
                  const daysLeft = getDaysRemaining(expDate);

                  return (
                    <GlassCard key={promo.id} className={`p-4 border-l-4 ${daysLeft !== null && daysLeft <= 3 ? 'border-l-amber-400 bg-amber-50/50 dark:bg-amber-900/10' : 'border-l-orange-400'} flex flex-col gap-3`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 dark:text-white">{promo.title}</h3>
                            {promo.isPersonalized && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
                                <UserIcon className="w-3 h-3" /> Sizə özəl
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-white/60 mt-1">{promo.description}</p>
                        </div>
                        <span className="bg-orange-500/10 text-orange-600 dark:text-orange-300 text-sm px-3 py-1.5 rounded-lg font-bold border border-orange-500/20">
                          {promo.reward}
                        </span>
                      </div>

                      {/* Details Section */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {expDate && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-white/60 bg-white dark:bg-white/5 px-2 py-1.5 rounded-lg">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Son: {formatDate(expDate)}</span>
                          </div>
                        )}
                        {daysLeft !== null && (
                          <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${daysLeft <= 3 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-bold">{daysLeft} gün qaldı</span>
                          </div>
                        )}
                        {promo.minBasketValue && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-white/60 bg-white dark:bg-white/5 px-2 py-1.5 rounded-lg col-span-2">
                            <Tag className="w-3.5 h-3.5" />
                            <span>Min. səbət: <strong>{promo.minBasketValue} ₼</strong></span>
                          </div>
                        )}
                        {promo.userUsageLimit && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-white/60 bg-white dark:bg-white/5 px-2 py-1.5 rounded-lg col-span-2">
                            <Info className="w-3.5 h-3.5" />
                            <span>İstifadə limiti: {promo.userUsageLimit} dəfə</span>
                          </div>
                        )}
                      </div>

                      {/* Code & Copy */}
                      {!promo.description?.includes('%') && !promo.reward?.includes('%') && promo.promoCode && (
                        <div className="flex items-center justify-between bg-slate-100 dark:bg-black/20 p-3 rounded-lg border border-dashed border-slate-300 dark:border-white/10">
                          <span className="text-sm font-mono text-orange-600 dark:text-orange-300 tracking-wider font-bold">{promo.promoCode}</span>
                          <button
                            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                            onClick={() => {
                              navigator.clipboard.writeText(promo.promoCode || '');
                              if (onShowToast) onShowToast('success', 'Kupon kodu kopyalandı!');
                            }}
                          >
                            <Copy className="w-3 h-3" /> Kopyala
                          </button>
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>

          {/* CHALLENGES / SPECIAL OFFERS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-2">
              <Zap className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Kampaniyalar</h2>
              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-2 py-0.5 rounded-full">{discounts.length}</span>
            </div>

            {discounts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-white/30 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                <Zap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Aktiv kampaniya yoxdur.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {discounts.map(offer => {
                  const expDate = offer.endDate || offer.expiryDate;
                  const daysLeft = getDaysRemaining(expDate);
                  const progressPercent = offer.progress !== undefined && offer.total ? Math.round((offer.progress / offer.total) * 100) : null;

                  return (
                    <GlassCard key={offer.id} className={`p-4 ${offer.isPersonalized ? 'bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-500/30' : ''}`}>
                      {offer.isPersonalized && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wider mb-2">
                          <UserIcon className="w-3 h-3" /> Sizə Özəl
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">{offer.title}</h3>
                          <p className="text-xs text-slate-500 dark:text-white/60 mt-1">{offer.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="block text-lg font-bold text-emerald-600 dark:text-emerald-400">{offer.reward}</span>
                        </div>
                      </div>

                      {/* Date Info */}
                      <div className="flex flex-wrap gap-2 text-xs mb-3">
                        {offer.startDate && (
                          <div className="flex items-center gap-1 text-slate-500 dark:text-white/60 bg-white dark:bg-white/5 px-2 py-1 rounded">
                            <Calendar className="w-3 h-3" />
                            <span>Başlama: {formatDate(offer.startDate)}</span>
                          </div>
                        )}
                        {expDate && (
                          <div className="flex items-center gap-1 text-slate-500 dark:text-white/60 bg-white dark:bg-white/5 px-2 py-1 rounded">
                            <Calendar className="w-3 h-3" />
                            <span>Bitmə: {formatDate(expDate)}</span>
                          </div>
                        )}
                        {daysLeft !== null && (
                          <div className={`flex items-center gap-1 px-2 py-1 rounded font-bold ${daysLeft <= 3 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            <Clock className="w-3 h-3" />
                            <span>{daysLeft} gün</span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {offer.progress !== undefined && offer.total && offer.progress < offer.total && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-slate-400 dark:text-white/50 mb-1">
                            <span>{offer.progress}/{offer.total} {offer.targetAmount ? '(AZN)' : '(dəfə)'}</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">İndiki: {offer.progress} / {offer.total}</p>
                        </div>
                      )}

                      {/* Completed & Apply Button */}
                      {offer.progress !== undefined && offer.total && offer.progress >= offer.total && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg mb-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Hədəf tamamlandı!</span>
                          </div>
                          <button
                            onClick={() => {
                              // Save to localStorage or Context to be picked up by Cart
                              localStorage.setItem('active_campaign_id', String(offer.id));
                              if (onShowToast) onShowToast('success', 'Kampaniya tətbiq edildi! Növbəti alışda endirim olacaq.');
                            }}
                            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-sm transition-all active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                          >
                            <Gift className="w-4 h-4" /> Tətbiq Et
                          </button>
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>
        </div >
      ) : (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Keçmiş</h2>
            <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 px-2 py-0.5 rounded-full">{historyItems.length}</span>
          </div>

          {historyItems.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-white/30">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Keçmiş tarixçə boşdur.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {historyItems.map(item => {
                const isUsed = item.status === 'used' || item.status === 'completed';
                const expiredDate = item.endDate || item.expiryDate;

                return (
                  <GlassCard key={item.id} className={`p-4 ${isUsed ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-red-50/50 dark:bg-red-900/10'} opacity-80`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {isUsed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <h3 className={`font-bold ${isUsed ? 'text-slate-700 dark:text-white/70' : 'text-slate-500 dark:text-white/50 line-through'}`}>
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-white/50 mt-1 ml-6">{item.description}</p>
                        {expiredDate && (
                          <p className="text-xs text-slate-400 dark:text-white/40 mt-1 ml-6 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {isUsed ? 'İstifadə tarixi' : 'Bitmə tarixi'}: {formatDate(expiredDate)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${isUsed ? 'text-slate-500' : 'text-red-400 line-through'}`}>
                          {item.reward}
                        </span>
                        <StatusBadge item={item} />
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
              <div className="text-center text-xs text-slate-400 py-4">Son 30 günün tarixçəsi</div>
            </div>
          )}
        </div>
      )}

    </div >
  );
};

export default Rewards;
