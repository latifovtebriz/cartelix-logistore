import React, { useState, useEffect, useCallback } from 'react';
import { Product, AppRoute, User, Review } from '../types';
import { GlassCard, GlassButton } from '../components/GlassComponents';
import { Star, ChevronLeft, ShoppingBag, AlertCircle, ShieldCheck, Info, ScanLine, Send, Lock, Trash2, Edit2, Activity, Sparkles, ChevronRight, CheckCircle } from 'lucide-react';
import { SmartPrice } from '../components/SmartPrice';
import { HealthAnalyzer } from '../components/AiTools';
import { api } from '../services/api';
import { ToastMessage } from '../components/Toast';

interface Props {
  product?: Product;
  productId?: number;
  onBack: () => void;
  currentUser: User | null;
  onNavigate: (route: AppRoute, productId?: number) => void;
  isScanContext: boolean;
  onAddToCart: (product: Product) => void;
  showToast?: (message: string, type: ToastMessage['type']) => void;
}

// Azerbaijani date formatter
const formatDateAZ = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const ProductDetail: React.FC<Props> = ({ product, productId, onBack, currentUser, onNavigate, isScanContext, onAddToCart, showToast }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'complaint'>('details');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(product || null);
  const [loading, setLoading] = useState(false);

  // Review pagination state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewTotalPages, setReviewTotalPages] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [alternatives, setAlternatives] = useState<Product[]>([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Complaint form state
  const [complaintForm, setComplaintForm] = useState({ subject: '', description: '' });
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);

  useEffect(() => {
    // If we have a productId (from navigation), fetch that product
    if (productId) {
      // Only fetch if we don't have it, OR if the current one doesn't match the requested ID
      if (!currentProduct || currentProduct.id !== productId) {
        setLoading(true);
        setCurrentProduct(null); // Clear old content while loading new
        api.getProduct(productId, currentUser?.id).then(data => {
          if (data) setCurrentProduct(data);
          setLoading(false);
          window.scrollTo(0, 0); // Ensure scroll to top inside component too just in case
        }).catch(() => setLoading(false));
      }
    }
  }, [productId]); // Dependent on productId changes

  // Convenience variable for the rest of the component
  const p = currentProduct;

  // Load reviews with pagination
  const loadReviews = useCallback(async (page: number = 0) => {
    if (!p) return;
    setReviewsLoading(true);
    try {
      const response = await api.getReviewsPaginated(p.id, page, 10);
      setReviews(response.content || []);
      setReviewTotalPages(response.totalPages || 0);
      setReviewPage(response.number || 0);
    } catch (e) {
      console.error('Error loading reviews:', e);
    }
    setReviewsLoading(false);
  }, [p?.id]);

  // Fetch Data
  useEffect(() => {
    if (!p) return;
    const loadData = async () => {
      try {
        const allProducts = await api.getProducts(0, 50, { userId: currentUser?.id });
        // Simple client-side alternative logic: same category, not current product
        const alts = allProducts.content.filter(item => item.category === p.category && item.id !== p.id).slice(0, 5);
        setAlternatives(alts);
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
    loadReviews(0);
  }, [p?.id, p?.category, loadReviews]);

  const hasPurchased = currentUser?.purchaseHistory?.includes(p?.id || 0) || false;

  // Find user's review - compare as strings to handle type mismatches
  const userReview = reviews.find(r => String(r.userId) === String(currentUser?.id));

  useEffect(() => {
    if (editingReviewId && userReview) {
      setReviewForm({ rating: userReview.rating, comment: userReview.comment });
    } else {
      setReviewForm({ rating: 5, comment: '' });
    }
  }, [editingReviewId, userReview]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Yüklənir...</div>;
  }

  if (!p) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Məhsul tapılmadı</div>;
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (editingReviewId) {
      showToast?.("Redaktə hələlik dəstəklənmir", 'info');
    } else {
      const newReview = {
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        userName: currentUser.name
      };
      try {
        await api.addReview(p.id, newReview);
        loadReviews(0); // Reload first page
        showToast?.("Rəyiniz uğurla əlavə edildi!", 'success');
      } catch (e) {
        showToast?.("Xəta baş verdi", 'error');
      }
    }
    setReviewForm({ rating: 5, comment: '' });
  };

  const handleDeleteReview = async (id: number) => {
    if (!currentUser) return;
    try {
      await api.deleteReviewAsUser(id, currentUser.id);
      loadReviews(reviewPage);
      if (editingReviewId === id) {
        setEditingReviewId(null);
        setReviewForm({ rating: 5, comment: '' });
      }
      showToast?.("Rəy silindi", 'success');
    } catch (e) {
      console.error('Error deleting review:', e);
      showToast?.('Rəyi silmək mümkün olmadı', 'error');
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !complaintForm.subject.trim()) {
      showToast?.("Mövzu daxil edin", 'error');
      return;
    }

    setComplaintSubmitting(true);
    try {
      await api.createComplaint({
        userId: currentUser.id,
        subject: complaintForm.subject,
        description: complaintForm.description,
        productId: p.id
      });
      setComplaintForm({ subject: '', description: '' });
      showToast?.("Şikayətiniz uğurla göndərildi!", 'success');
    } catch (e) {
      showToast?.("Şikayət göndərilə bilmədi", 'error');
    }
    setComplaintSubmitting(false);
  };

  return (
    <div className="pb-32 pt-20 min-h-screen relative">

      {/* Sticky Header */}
      <div className="fixed top-0 left-0 right-0 w-full z-40 flex items-center justify-between px-4 py-4 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-lg border-b border-slate-200 dark:border-white/10">
        <button onClick={onBack} className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition">
          <ChevronLeft />
        </button>
        <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{p.name}</h2>
        <div className="w-10" />
      </div>

      {/* Product Image */}
      <div className="h-[30vh] w-full relative bg-white dark:bg-white/5">
        <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/10 dark:to-[#0f172a]/10"></div>
      </div>

      {/* Content Body */}
      <div className="relative z-10 px-4 pt-4">
        <div className="p-0">

          {/* Title & Price */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{p.name}</h1>
              <p className="text-sm text-slate-500 dark:text-white/50 mb-2">{p.brand}</p>
              <div className="flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(p.rating) ? 'fill-current' : 'text-slate-300 dark:text-white/20'}`} />
                  ))}
                </div>
                <span className="text-sm text-slate-500 dark:text-white/60">
                  {p.reviewCount < 10 ? '(Yeni)' : `(${p.reviewCount} rəy)`}
                </span>
              </div>
            </div>
            <div className="text-right">
              <SmartPrice
                originalPrice={p.oldPrice || p.price}
                globalPrice={p.price}
                personalPrice={p.personalPrice}
                size="lg"
                className="items-end"
              />
              <span className="text-xs text-slate-400 dark:text-white/50 mt-1">{p.category}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-slate-200/50 dark:bg-white/5 rounded-xl mb-6">
            {(['details', 'reviews', 'complaint'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow'
                  : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70'
                  }`}
              >
                {tab === 'details' ? 'Məlumat' : tab === 'reviews' ? 'Rəylər' : 'Şikayət'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px] mb-20">
            {activeTab === 'details' && (
              <div className="space-y-6 animate-fadeIn">

                {/* AI Health Analysis Component */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-blue-600 dark:text-blue-300 font-bold flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Sağlamlıq Analizi (AI)
                    </h4>
                    <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400 animate-pulse" />
                  </div>

                  <HealthAnalyzer
                    productName={p.name}
                    productId={p.id}
                    ingredients={p.ingredients}
                    onAnalyze={() => api.analyzeProductHealth(p.id)}
                  />
                </div>

                <div>
                  <h3 className="text-slate-800 dark:text-white/80 font-semibold mb-2">Təsvir</h3>
                  <p className="text-slate-600 dark:text-white/60 text-sm leading-relaxed">{p.description}</p>
                </div>

                {/* Attributes */}
                {p.attributes && (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(p.attributes).map(([key, value]) => (
                      <div key={key} className="bg-white/50 dark:bg-white/5 p-3 rounded-lg border border-slate-200/50 dark:border-white/5 text-center">
                        <span className="block text-xs text-slate-400 dark:text-white/40 uppercase">{key}</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <h3 className="text-slate-800 dark:text-white/80 font-semibold mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Tərkib
                  </h3>
                  <p className="text-slate-700 dark:text-white/80 text-sm leading-relaxed bg-emerald-50/50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200/50 dark:border-emerald-500/20">
                    {p.ingredients}
                  </p>
                </div>

                {/* Alternatives */}
                {alternatives.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                    <h3 className="text-slate-800 dark:text-white/80 font-semibold mb-3">Alternativ Məhsullar</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                      {alternatives.map(alt => (
                        <div
                          key={alt.id}
                          className="min-w-[120px] max-w-[120px] cursor-pointer group flex-shrink-0 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-2 flex flex-col"
                          onClick={() => onNavigate(AppRoute.PRODUCT, alt.id)}
                        >
                          <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 border border-slate-100 dark:border-white/5 relative bg-white">
                            <img src={alt.image} alt={alt.name} className="w-full h-full object-contain p-1 group-hover:scale-110 transition duration-300" />
                          </div>
                          <p className="text-[10px] sm:text-xs text-slate-700 dark:text-white/80 line-clamp-2 leading-tight h-8 mb-1" title={alt.name}>{alt.name}</p>
                          <SmartPrice
                            originalPrice={alt.oldPrice || alt.price}
                            globalPrice={alt.price}
                            personalPrice={alt.personalPrice}
                            size="sm"
                            className="mt-auto"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Review Form */}
                {hasPurchased ? (
                  <form onSubmit={handleSubmitReview} className="bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 mb-6 animate-slideUp">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        {editingReviewId ? 'Rəyi Düzəliş Et' : 'Rəy Yazın'}
                      </h3>
                      {editingReviewId && (
                        <button type="button" onClick={() => { setEditingReviewId(null); setReviewForm({ rating: 5, comment: '' }); }} className="text-xs text-slate-500 dark:text-white/50">
                          Ləğv et
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          className="focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star className={`w-6 h-6 ${star <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 dark:text-white/20'}`} />
                        </button>
                      ))}
                    </div>

                    <textarea
                      placeholder="Məhsul haqqında fikirləriniz..."
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      className="w-full bg-slate-50/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm text-slate-900 dark:text-white mb-3 focus:outline-none focus:border-emerald-500/50 h-20 placeholder:text-slate-400 dark:placeholder:text-white/30"
                      required
                    />

                    <GlassButton className="w-full py-2 text-sm flex items-center justify-center gap-2">
                      <Send className="w-3 h-3" /> {editingReviewId ? 'Yenilə' : 'Rəyi Göndər'}
                    </GlassButton>
                  </form>
                ) : (
                  <div className="bg-white/50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/20 p-5 rounded-xl mb-6 text-center">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Lock className="w-5 h-5 text-slate-400 dark:text-white/40" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Rəy yazmaq mümkün deyil</h4>
                    <p className="text-xs text-slate-500 dark:text-white/50 mb-3">Bu məhsulu almamısınız.</p>
                    <button onClick={() => onNavigate(AppRoute.SCAN)} className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1 mx-auto hover:underline">
                      <ScanLine className="w-3 h-3" /> Fiziki Çeki Oxut
                    </button>
                  </div>
                )}

                <h4 className="text-slate-800 dark:text-white/80 font-semibold text-sm mb-2">
                  Müştəri Rəyləri {reviewTotalPages > 1 && <span className="text-xs text-slate-400 font-normal ml-2">Səhifə {reviewPage + 1}/{reviewTotalPages}</span>}
                </h4>

                {reviewsLoading ? (
                  <div className="text-center py-8 text-slate-400">Yüklənir...</div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">Hələ rəy yoxdur</div>
                ) : (
                  <>
                    {reviews.map(review => {
                      // Compare as strings to handle type mismatches
                      const isMyReview = currentUser && String(review.userId) === String(currentUser.id);

                      return (
                        <div key={review.id} className={`border-b border-slate-200 dark:border-white/10 pb-4 last:border-0 animate-fadeIn ${isMyReview ? 'bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border-none ring-1 ring-emerald-200 dark:ring-emerald-500/20' : ''}`}>
                          <div className="flex justify-between mb-1">
                            <span className="font-medium text-slate-900 dark:text-white text-sm flex items-center gap-2">
                              {review.userName}
                              {isMyReview && (
                                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <CheckCircle className="w-2.5 h-2.5" /> Siz
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-white/40">{formatDateAZ(review.date)}</span>
                          </div>

                          <div className="flex justify-between items-start">
                            <div className="flex text-yellow-400 w-3 h-3 gap-0.5 mb-2">
                              {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-slate-300 dark:text-white/20'}`} />)}
                            </div>

                            {isMyReview && (
                              <div className="flex gap-3">
                                <button onClick={() => setEditingReviewId(review.id)} className="text-slate-400 hover:text-slate-700 dark:text-white/50 dark:hover:text-white">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteReview(review.id)} className="text-slate-400 hover:text-red-500 dark:text-white/50 dark:hover:text-red-400">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          <p className="text-sm text-slate-700 dark:text-white/70">{review.comment}</p>
                          {review.verifiedPurchase && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                              <ShieldCheck className="w-3 h-3" /> Təsdiqlənmiş Alış
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Pagination */}
                    {reviewTotalPages > 1 && (
                      <div className="flex justify-center items-center gap-4 pt-4">
                        <button
                          onClick={() => loadReviews(reviewPage - 1)}
                          disabled={reviewPage === 0}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-white/10 rounded-lg text-sm disabled:opacity-50"
                        >
                          <ChevronLeft className="w-4 h-4" /> Əvvəlki
                        </button>
                        <span className="text-sm text-slate-500">{reviewPage + 1} / {reviewTotalPages}</span>
                        <button
                          onClick={() => loadReviews(reviewPage + 1)}
                          disabled={reviewPage >= reviewTotalPages - 1}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-white/10 rounded-lg text-sm disabled:opacity-50"
                        >
                          Növbəti <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'complaint' && (
              <div className="animate-fadeIn">
                <div className="flex items-start gap-3 bg-red-50/50 dark:bg-red-500/10 p-4 rounded-xl border border-red-200 dark:border-red-500/20 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-red-600 dark:text-red-300">Şikayət Paneli</h4>
                    <p className="text-xs text-slate-600 dark:text-white/60 mt-1">Şikayətiniz birbaşa keyfiyyətə nəzarət departamentinə göndəriləcək.</p>
                  </div>
                </div>
                <form className="space-y-3" onSubmit={handleSubmitComplaint}>
                  <div>
                    <input
                      type="text"
                      placeholder="Şikayət mövzusu..."
                      value={complaintForm.subject}
                      onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })}
                      className="w-full bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-red-500/50"
                      required
                    />
                  </div>
                  <textarea
                    placeholder="Problemi ətraflı təsvir edin..."
                    value={complaintForm.description}
                    onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                    className="w-full bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-red-500/50 min-h-[100px]"
                  />
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Məhsul: <strong>{p.name}</strong> avtomatik əlavə ediləcək
                  </p>
                  <GlassButton className="w-full py-2 text-sm" disabled={complaintSubmitting}>
                    {complaintSubmitting ? 'Göndərilir...' : 'Göndər'}
                  </GlassButton>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Action Bar for Scan */}
      {isScanContext && (
        <div className="fixed bottom-[80px] left-0 right-0 px-4 z-30 pointer-events-none">
          <GlassButton onClick={() => onAddToCart(p)} className="w-full flex items-center justify-center gap-2 py-4 shadow-xl shadow-emerald-500/20 pointer-events-auto">
            <ShoppingBag className="w-5 h-5" />
            Scan & Go Səbətinə At
          </GlassButton>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
