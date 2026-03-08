import React, { useState, useMemo, useEffect } from 'react';
import { CartItem, AppRoute, User, Receipt, Challenge } from '../types';
import { GlassCard, GlassButton } from '../components/GlassComponents';
import { ShoppingBag, QrCode, ShoppingCart, Menu, X, CheckCircle, Check, AlertTriangle, Gift } from 'lucide-react';
import { api } from '../services/api';

// Use a simple scanner mock if library not available, or assume library availability.
// For MVP robustness, sticking to a Simulated Scanner + Manual Code fallback UI.

interface CartProps {
  cartItems: CartItem[];
  user: User | null;
  onCheckoutSuccess: (receipt: Receipt) => void;
  onNavigate: (route: AppRoute) => void;
  onUpdateCart: (items: CartItem[]) => void;
  onOpenSidebar: () => void;
}

const Cart: React.FC<CartProps> = ({ cartItems, user, onCheckoutSuccess, onNavigate, onUpdateCart, onOpenSidebar }) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'connecting' | 'success'>('idle');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [bonusSpend, setBonusSpend] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Campaign state
  const [eligibleCampaigns, setEligibleCampaigns] = useState<Challenge[]>([]);
  const [appliedCampaign, setAppliedCampaign] = useState<{ id: number; discount: number; title: string } | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);

  // Get effective price (personal price if available, otherwise regular price)
  const getEffectivePrice = (item: CartItem) => item.personalPrice ?? item.price;

  const subtotal = useMemo(() => cartItems.reduce((acc, item) => acc + getEffectivePrice(item) * item.quantity, 0), [cartItems]);
  const originalSubtotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + (item.oldPrice ?? item.price) * item.quantity, 0),
    [cartItems]
  );
  const discountTotal = Math.max(0, originalSubtotal - subtotal);
  const normalizedBonus = useMemo(() => {
    if (!user) return 0;
    const maxBonus = Math.min(user.points, subtotal);
    return Math.min(Math.max(bonusSpend, 0), maxBonus);
  }, [bonusSpend, subtotal, user]);

  // Apply promo discount if applicable
  const promoDiscount = promoApplied?.discount || 0;
  const campaignDiscount = appliedCampaign?.discount || 0;
  const payableTotal = Math.max(0, subtotal - normalizedBonus - promoDiscount - campaignDiscount);

  // Fetch eligible campaigns
  useEffect(() => {
    if (user && cartItems.length > 0) {
      const fetchCampaigns = async () => {
        try {
          const campaigns = await api.getEligibleCampaigns(user.id);
          setEligibleCampaigns(campaigns);
        } catch (e) {
          console.error("Failed to fetch campaigns:", e);
        }
      };
      fetchCampaigns();
    } else {
      setEligibleCampaigns([]);
      setAppliedCampaign(null);
    }
  }, [user, cartItems.length]);

  // Apply campaign
  const handleApplyCampaign = async (campaignId: number) => {
    if (!user) return;

    setCampaignLoading(true);
    try {
      const result = await api.applyCampaign(user.id, campaignId, subtotal);
      if (result.success && result.discount) {
        const campaign = eligibleCampaigns.find(c => c.id === campaignId);
        setAppliedCampaign({
          id: campaignId,
          discount: result.discount,
          title: campaign?.title || 'Kampaniya'
        });
      } else {
        alert(result.message || 'Kampaniya tətbiq edilə bilmədi');
      }
    } catch (e) {
      console.error('Campaign application error:', e);
      alert('Xəta baş verdi');
    } finally {
      setCampaignLoading(false);
    }
  };

  const handleQuantityChange = (id: number, delta: number) => {
    const updated = cartItems.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + delta);
        if (delta > 0 && item.unitType === 'count' && newQuantity > 5) {
          alert('Bu məhsuldan maksimum 5 ədəd ala bilərsiniz (Say limiti).');
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0);
    onUpdateCart(updated);
    // Reset promo if cart changes
    if (promoApplied) {
      setPromoApplied(null);
      setPromoError(null);
    }
  };

  const handleApplyPromo = async () => {
    if (!user) {
      setPromoError('Promokod üçün daxil olun');
      return;
    }
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoError('Promokod daxil edin');
      return;
    }

    setPromoLoading(true);
    setPromoError(null);

    try {
      const result = await api.validatePromoCode(code, user.id, subtotal);
      if (result.valid) {
        setPromoApplied({ code, discount: result.discountAmount || 0 });
        setPromoError(null);
      } else {
        setPromoError(result.errorMessage || 'Promokod keçərsizdir');
        setPromoApplied(null);
      }
    } catch (e) {
      setPromoError('Promokod yoxlanılarkən xəta baş verdi');
      setPromoApplied(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handlePay = async () => {
    if (!user) {
      alert("Ödəniş etmək üçün daxil olun.");
      onNavigate(AppRoute.LOGIN);
      return;
    }
    // Validate bonus spend
    setError(null);
    setBonusSpend(normalizedBonus);
    setIsScannerOpen(true);
  };

  // Auto-apply campaign from Rewards page
  useEffect(() => {
    const storedCampaignId = localStorage.getItem('active_campaign_id');
    if (storedCampaignId && eligibleCampaigns.length > 0) {
      const id = Number(storedCampaignId);
      // Only apply if not already applied and is eligible
      if (!appliedCampaign && eligibleCampaigns.find(c => c.id === id)) {
        handleApplyCampaign(id);
        // Optional: clear it so it doesn't re-apply if removed manually? 
        // Better to keep it until used? For now, clear it to avoid loops if errors.
        localStorage.removeItem('active_campaign_id');
      }
    }
  }, [eligibleCampaigns]);

  const handleScanCode = async (code: string) => {
    if (!code.startsWith("POS_")) {
      alert("Yanlış QR kod. Zəhmət olmasa POS terminalın QR kodunu oxudun.");
      return;
    }

    setError(null);
    setScanStatus('connecting');

    try {
      if (!user) return;
      const safeBonus = normalizedBonus;
      // Send the applied promo code to server
      const appliedPromo = promoApplied?.code || (promoCode.trim() || undefined);

      // Use the applied campaign ID from state
      const campaignId = appliedCampaign?.id;

      const receipt = await api.processPOSPayment(user.id, cartItems, code, appliedPromo, safeBonus, undefined, campaignId);

      setScanStatus('success');
      setTimeout(() => {
        onCheckoutSuccess(receipt);
        setIsScannerOpen(false);
        setScanStatus('idle');
      }, 1500);
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
      setScanStatus('idle');
    }
  };

  return (
    <div className="pb-32 pt-20 px-4 space-y-6">
      <div className="fixed top-0 left-0 right-0 z-40 px-4 py-3 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 flex items-center gap-3 transition-all">
        <button onClick={onOpenSidebar} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 active:scale-95 transition-all border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-emerald-500" /> Səbət <span className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">Scan & Go</span>
        </h1>
      </div>

      {cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-32 h-32 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <ShoppingCart className="w-12 h-12 text-slate-400" />
          </div>
          <p className="text-slate-500 text-center mb-6">Səbətiniz boşdur.</p>
          <GlassButton onClick={() => onNavigate(AppRoute.SCAN)} className="w-full max-w-xs">Alış-verişə Başla</GlassButton>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {cartItems.map(item => (
              <GlassCard key={item.id} className="p-4 flex gap-4 items-center hover:shadow-lg transition-shadow border border-slate-200/50 dark:border-white/10">
                {/* Product Image with gradient overlay */}
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  {(item.hasPersonalDiscount || item.isDiscount) && (
                    <div className="absolute top-1 left-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                      {item.hasPersonalDiscount ? '✨' : '🏷️'}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 mb-1">{item.name}</h4>

                  {/* Personal discount badge */}
                  {item.hasPersonalDiscount && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-500/30 mb-1">
                      ✨ Sizə Özəl Endirim
                    </span>
                  )}

                  {/* Price display */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{getEffectivePrice(item).toFixed(2)} ₼</span>
                    {item.hasPersonalDiscount && item.personalPrice ? (
                      <span className="text-xs text-slate-400 line-through">{item.price.toFixed(2)} ₼</span>
                    ) : item.oldPrice && item.oldPrice > item.price ? (
                      <span className="text-xs text-slate-400 line-through">{item.oldPrice.toFixed(2)} ₼</span>
                    ) : null}
                  </div>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center bg-slate-100 dark:bg-white/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => handleQuantityChange(item.id, -1)}
                    className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition font-bold text-lg"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-slate-900 dark:text-white">{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item.id, 1)}
                    className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition font-bold text-lg"
                  >
                    +
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>

          <GlassCard className="p-4 border-orange-500/20 bg-orange-50/30 dark:bg-orange-900/10 space-y-3">
            <div className="flex gap-2">
              <input
                value={promoCode}
                onChange={e => {
                  setPromoCode(e.target.value);
                  setPromoApplied(null);
                  setPromoError(null);
                }}
                type="text"
                placeholder="Promokod daxil edin..."
                disabled={promoLoading || !!promoApplied}
                className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 placeholder:text-slate-400 dark:placeholder:text-white/30 disabled:opacity-50"
              />
              {promoApplied ? (
                <button
                  onClick={() => {
                    setPromoApplied(null);
                    setPromoCode('');
                    setPromoError(null);
                  }}
                  className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Tətbiq edildi
                </button>
              ) : (
                <button
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoCode.trim()}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {promoLoading ? 'Yoxlanılır...' : 'Tətbiq Et'}
                </button>
              )}
            </div>
            {promoApplied && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                <Check className="w-4 h-4" />
                <span><strong>{promoApplied.code}</strong> tətbiq olundu - {promoApplied.discount.toFixed(2)} ₼ endirim</span>
              </div>
            )}
            {promoError && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span>{promoError}</span>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <label className="text-xs text-slate-500 dark:text-white/60">Bonusla ödə (₼)</label>
              <input
                value={bonusSpend}
                onChange={e => setBonusSpend(Number(e.target.value) || 0)}
                type="number"
                min={0}
                className="w-28 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              {user && <span className="text-[11px] text-slate-500 dark:text-white/50">Balans: {user.points} bonus</span>}
            </div>
            {error && <p className="text-center text-red-400 text-xs">{error}</p>}
            <p className="text-[10px] text-slate-400 dark:text-white/40">
              * Promokod yalnız uyğun məhsullara tətbiq olunur, bonus qismən və ya tam istifadə oluna bilər
            </p>
          </GlassCard>

          {/* Eligible Campaigns Section */}
          {eligibleCampaigns.length > 0 && (
            <GlassCard className="p-4 border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-900/10 space-y-3">
              <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Sizə Uyğun Kampaniyalar
              </h3>
              <div className="space-y-2">
                {eligibleCampaigns.map(campaign => (
                  <div key={campaign.id} className="bg-white dark:bg-white/5 p-3 rounded-lg border border-emerald-200 dark:border-emerald-700">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{campaign.title}</h4>
                        {campaign.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{campaign.description}</p>
                        )}
                        <div className="flex gap-2 mt-1 text-[10px] text-slate-500">
                          {campaign.requiredPurchaseCount && (
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              {campaign.requiredPurchaseCount} alış veriş
                            </span>
                          )}
                          {campaign.discountType && campaign.discountValue && (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                              {campaign.discountType === 'PERCENTAGE' ? `${campaign.discountValue}%` : `${campaign.discountValue} ₼`} endirim
                            </span>
                          )}
                        </div>
                      </div>
                      {appliedCampaign?.id === campaign.id ? (
                        <button
                          onClick={() => setAppliedCampaign(null)}
                          className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Tətbiq edildi
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApplyCampaign(campaign.id)}
                          disabled={campaignLoading || !!appliedCampaign}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Tətbiq Et
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                * Kampaniya yalnız bir dəfə tətbiq edilə bilər
              </p>
            </GlassCard>
          )}

          <GlassCard className="p-4 bg-gradient-to-b from-emerald-50/50 to-white/50 dark:from-emerald-900/20 dark:to-emerald-900/40 sticky bottom-20">
            <div className="space-y-2 text-sm text-slate-600 dark:text-white/70">
              <div className="flex justify-between">
                <span>Əsas qiymət</span>
                <span>{originalSubtotal.toFixed(2)} ₼</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-300">
                  <span>Endirimlər</span>
                  <span>-{discountTotal.toFixed(2)} ₼</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Ara cəm (endirimli)</span>
                <span>{subtotal.toFixed(2)} ₼</span>
              </div>
              {promoApplied && promoApplied.discount > 0 && (
                <div className="flex justify-between text-orange-600 dark:text-orange-300">
                  <span>Promokod ({promoApplied.code})</span>
                  <span>-{promoApplied.discount.toFixed(2)} ₼</span>
                </div>
              )}
              {appliedCampaign && appliedCampaign.discount > 0 && (
                <div className="flex justify-between text-purple-600 dark:text-purple-300">
                  <span>Kampaniya ({appliedCampaign.title})</span>
                  <span>-{appliedCampaign.discount.toFixed(2)} ₼</span>
                </div>
              )}
              {normalizedBonus > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-300">
                  <span>Bonus tətbiqi</span>
                  <span>-{normalizedBonus.toFixed(2)} ₼</span>
                </div>
              )}
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white mt-3">
              <span>Ödəniləcək</span><span>{payableTotal.toFixed(2)} ₼</span>
            </div>
            <GlassButton onClick={handlePay} className="w-full py-4 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-[1.02] active:scale-95 transition-all shadow-emerald-500/20">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold text-lg">Sifarişi Təsdiqlə</span>
            </GlassButton>
          </GlassCard>
        </>
      )}

      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          {scanStatus === 'connecting' ? (
            <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
              <div className="w-20 h-20 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin"></div>
              <h2 className="text-white text-xl font-bold animate-pulse">Terminala qoşulur...</h2>
              <p className="text-white/50 text-sm">Zəhmət olmasa gözləyin</p>
            </div>
          ) : scanStatus === 'success' ? (
            <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
              <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-white text-xl font-bold">Ödəniş Təsdiqləndi!</h2>
            </div>
          ) : (
            <div className="w-full h-full relative flex flex-col">
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
                <h3 className="text-white font-bold">POS Terminalı Skan Edin</h3>
                <button onClick={() => setIsScannerOpen(false)} className="p-2 bg-white/10 rounded-full"><X className="text-white" /></button>
              </div>

              <div className="flex-1 bg-slate-900 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1556742049-09379e5c8f60?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>

                <div className="w-64 h-64 border-2 border-white/50 rounded-xl relative overflow-hidden animate-pulse">
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)] animate-scan"></div>
                </div>
                <p className="absolute bottom-32 text-white/70 text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">Kameranı QR koda tuşlayın</p>
              </div>

              <div className="p-6 bg-black pb-10 space-y-3">
                <p className="text-white/50 text-xs text-center">Simulyasiya üçün aşağıdakı düymədən istifadə edin</p>
                {error && <p className="text-center text-red-400 text-xs">{error}</p>}
                <button
                  onClick={() => handleScanCode('POS_WALL_01')}
                  className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <QrCode className="w-5 h-5" />
                  [DEMO] QR Kodu Oxut (POS_WALL_01)
                </button>
                <button
                  onClick={() => handleScanCode('POS_100')}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <QrCode className="w-4 h-4" /> Simulyasiya (Yaxın POS)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Cart;
