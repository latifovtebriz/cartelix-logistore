import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Review } from '../types';
import { CheckCircle, Star, Trash2, AlertCircle, ChevronLeft, ChevronRight, Search, Filter, ArrowUpDown, ExternalLink, Barcode, X, Package, User, Calendar, MessageSquare } from 'lucide-react';
import { ToastMessage } from '../components/Toast';

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

interface Props {
  onNavigateToProduct?: (productId: number) => void;
  showToast?: (message: string, type: ToastMessage['type']) => void;
}

const AdminFeedback: React.FC<Props> = ({ onNavigateToProduct, showToast }) => {
    const [tab, setTab] = useState<'reviews' | 'complaints'>('reviews');
    
    // Reviews state with pagination
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewPage, setReviewPage] = useState(0);
    const [reviewTotalPages, setReviewTotalPages] = useState(0);
    const [reviewTotalElements, setReviewTotalElements] = useState(0);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    
    // Complaints state with pagination
    const [complaints, setComplaints] = useState<any[]>([]);
    const [complaintPage, setComplaintPage] = useState(0);
    const [complaintTotalPages, setComplaintTotalPages] = useState(0);
    const [complaintTotalElements, setComplaintTotalElements] = useState(0);
    const [complaintsLoading, setComplaintsLoading] = useState(false);

    // Search, Filter, Sort states for reviews
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'rating' | 'product'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [filterVerified, setFilterVerified] = useState<boolean | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const loadReviews = useCallback(async (page: number = 0) => {
        setReviewsLoading(true);
        try {
            const data = await api.getAdminReviews(page, 10);
            setReviews(data.content || []);
            setReviewTotalPages(data.totalPages || 0);
            setReviewTotalElements(data.totalElements || 0);
            setReviewPage(data.number || 0);
        } catch (e) {
            console.error('Error loading reviews:', e);
            showToast?.('Rəyləri yükləmək mümkün olmadı', 'error');
        }
        setReviewsLoading(false);
    }, [showToast]);

    const loadComplaints = useCallback(async (page: number = 0) => {
        setComplaintsLoading(true);
        try {
            const data = await api.getComplaints(page, 10);
            setComplaints(data.content || []);
            setComplaintTotalPages(data.totalPages || 0);
            setComplaintTotalElements(data.totalElements || 0);
            setComplaintPage(data.number || 0);
        } catch (e) {
            console.error('Error loading complaints:', e);
            showToast?.('Şikayətləri yükləmək mümkün olmadı', 'error');
        }
        setComplaintsLoading(false);
    }, [showToast]);

    useEffect(() => {
        loadReviews(0);
        loadComplaints(0);
    }, [loadReviews, loadComplaints]);

    // Client-side filtering (on current page data)
    const filteredReviews = React.useMemo(() => {
        let result = [...reviews];

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.userName?.toLowerCase().includes(q) ||
                r.comment?.toLowerCase().includes(q) ||
                r.productName?.toLowerCase().includes(q) ||
                r.barcode?.toLowerCase().includes(q)
            );
        }

        // Rating filter
        if (filterRating !== null) {
            result = result.filter(r => r.rating === filterRating);
        }

        // Verified filter
        if (filterVerified !== null) {
            result = result.filter(r => r.verifiedPurchase === filterVerified);
        }

        return result;
    }, [reviews, searchQuery, filterRating, filterVerified]);

    const handleResolveComplaint = async (id: number) => {
        try {
            await api.resolveComplaint(id);
            loadComplaints(complaintPage);
            showToast?.('Şikayət həll edildi', 'success');
        } catch (e) {
            console.error('Error resolving complaint:', e);
            showToast?.('Şikayəti həll etmək mümkün olmadı', 'error');
        }
    };

    const handleDeleteReview = async (id: number) => {
        try {
            await api.deleteReview(id);
            loadReviews(reviewPage);
            showToast?.('Rəy silindi', 'success');
        } catch (e) {
            console.error('Error deleting review:', e);
            showToast?.('Rəyi silmək mümkün olmadı', 'error');
        }
    };

    const handleProductClick = (productId?: number) => {
        if (productId && onNavigateToProduct) {
            onNavigateToProduct(productId);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterRating(null);
        setFilterVerified(null);
        setSortBy('date');
        setSortOrder('desc');
    };

    const hasActiveFilters = searchQuery || filterRating !== null || filterVerified !== null;

    // Count pending complaints
    const pendingComplaintsCount = complaints.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;

    return (
        <div className="space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-bold">Feedback Mərkəzi</h2>

            <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                <button onClick={() => setTab('reviews')} className={`px-4 py-2 rounded-lg transition ${tab === 'reviews' ? 'bg-slate-200 dark:bg-white/20 font-bold' : 'text-slate-500'}`}>
                    Rəylər ({reviewTotalElements})
                </button>
                <button onClick={() => setTab('complaints')} className={`px-4 py-2 rounded-lg transition ${tab === 'complaints' ? 'bg-slate-200 dark:bg-white/20 font-bold' : 'text-slate-500'}`}>
                    Şikayətlər {pendingComplaintsCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">{pendingComplaintsCount}</span>}
                </button>
            </div>

            {tab === 'reviews' && (
                <div className="space-y-4">
                    {/* Search and Filter Bar */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Ad, məhsul, barkod və ya şərh axtar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition ${showFilters ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                        >
                            <Filter className="w-4 h-4" /> Filterlər
                        </button>

                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-1"
                            >
                                <X className="w-4 h-4" /> Təmizlə
                            </button>
                        )}
                    </div>

                    {/* Expanded Filters */}
                    {showFilters && (
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl flex flex-wrap gap-4 items-center animate-fadeIn">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">Reytinq:</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setFilterRating(filterRating === r ? null : r)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition ${filterRating === r ? 'bg-yellow-400 text-white' : 'bg-white dark:bg-white/10 hover:bg-yellow-100'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">Alış:</span>
                                <button
                                    onClick={() => setFilterVerified(filterVerified === true ? null : true)}
                                    className={`px-3 py-1 rounded-lg text-sm transition ${filterVerified === true ? 'bg-green-500 text-white' : 'bg-white dark:bg-white/10 hover:bg-green-100'}`}
                                >
                                    Təsdiqlənmiş
                                </button>
                                <button
                                    onClick={() => setFilterVerified(filterVerified === false ? null : false)}
                                    className={`px-3 py-1 rounded-lg text-sm transition ${filterVerified === false ? 'bg-gray-500 text-white' : 'bg-white dark:bg-white/10 hover:bg-gray-100'}`}
                                >
                                    Təsdiqlənməmiş
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Reviews List */}
                    {reviewsLoading ? (
                        <div className="text-center py-10 text-slate-400">Yüklənir...</div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredReviews.map(r => (
                                <div
                                    key={r.id}
                                    className="bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:shadow-md transition"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            {/* Header */}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="font-bold">{r.userName}</span>
                                                <div className="flex text-yellow-400 items-center">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-current' : 'text-slate-300'}`} />
                                                    ))}
                                                    <span className="text-xs text-slate-500 ml-1">{r.rating}/5</span>
                                                </div>
                                                {r.verifiedPurchase && (
                                                    <span className="text-[10px] bg-green-100 text-green-600 px-1.5 rounded flex items-center gap-1">
                                                        <CheckCircle className="w-2.5 h-2.5" /> Alıb
                                                    </span>
                                                )}
                                            </div>

                                            {/* Comment */}
                                            <p className="text-sm text-slate-600 dark:text-white/70 mb-3">{r.comment}</p>

                                            {/* Product Info - Clickable */}
                                            <div
                                                className={`flex items-center gap-3 p-2 bg-slate-50 dark:bg-white/5 rounded-lg text-xs ${r.productId && onNavigateToProduct ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10' : ''}`}
                                                onClick={() => handleProductClick(r.productId)}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    <span className="text-slate-400">{formatDateAZ(r.date)}</span>
                                                    {r.productName && (
                                                        <>
                                                            <span className="text-slate-300">•</span>
                                                            <Package className="w-3 h-3 text-blue-400" />
                                                            <span className="font-medium text-slate-700 dark:text-white/80">{r.productName}</span>
                                                            {r.productId && onNavigateToProduct && <ExternalLink className="w-3 h-3 text-blue-500" />}
                                                        </>
                                                    )}
                                                </div>
                                                {r.barcode && (
                                                    <div className="flex items-center gap-1 text-slate-400 ml-auto">
                                                        <Barcode className="w-3 h-3" />
                                                        <span className="font-mono">{r.barcode}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* User ID */}
                                            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                                <User className="w-3 h-3" /> {r.userId}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <button
                                            onClick={() => handleDeleteReview(r.id)}
                                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition ml-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredReviews.length === 0 && (
                                <p className="text-center text-slate-400 py-8">
                                    {hasActiveFilters ? 'Filtrə uyğun rəy tapılmadı.' : 'Rəy yoxdur.'}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Review Pagination */}
                    {reviewTotalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-4">
                            <button
                                onClick={() => loadReviews(reviewPage - 1)}
                                disabled={reviewPage === 0}
                                className="flex items-center gap-1 px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-lg disabled:opacity-50"
                            >
                                <ChevronLeft className="w-4 h-4" /> Əvvəlki
                            </button>
                            <span className="text-sm">Səhifə {reviewPage + 1} / {reviewTotalPages}</span>
                            <button
                                onClick={() => loadReviews(reviewPage + 1)}
                                disabled={reviewPage >= reviewTotalPages - 1}
                                className="flex items-center gap-1 px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-lg disabled:opacity-50"
                            >
                                Növbəti <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {tab === 'complaints' && (
                <div className="space-y-4">
                    {complaintsLoading ? (
                        <div className="text-center py-10 text-slate-400">Yüklənir...</div>
                    ) : (
                        <div className="grid gap-4">
                            {complaints.map(c => (
                                <div key={c.id} className={`bg-white dark:bg-white/5 p-4 rounded-xl border ${(c.status === 'OPEN' || c.status === 'IN_PROGRESS') ? 'border-orange-200 dark:border-orange-500/20' : 'border-slate-200 dark:border-white/10'}`}>
                                    <div className="flex gap-4 items-start">
                                        <div className={`p-2 rounded-full shrink-0 ${c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {c.status === 'RESOLVED' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {/* Subject */}
                                            <p className="font-bold text-sm mb-1">{c.subject || 'Mövzu yoxdur'}</p>
                                            
                                            {/* Description */}
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{c.description || '-'}</p>
                                            
                                            {/* Product Info if available */}
                                            {c.productName && (
                                                <div 
                                                    className={`flex items-center gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-lg mb-2 ${c.productId && onNavigateToProduct ? 'cursor-pointer hover:bg-slate-100' : ''}`}
                                                    onClick={() => c.productId && handleProductClick(c.productId)}
                                                >
                                                    <Package className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm font-medium">{c.productName}</span>
                                                    {c.productBarcode && (
                                                        <span className="text-xs text-slate-400 font-mono ml-auto">{c.productBarcode}</span>
                                                    )}
                                                    {c.productId && onNavigateToProduct && <ExternalLink className="w-3 h-3 text-blue-500 ml-1" />}
                                                </div>
                                            )}
                                            
                                            {/* Meta info */}
                                            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> {formatDateAZ(c.createdAt)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" /> {c.userName || c.userId}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="shrink-0">
                                            {(c.status === 'OPEN' || c.status === 'IN_PROGRESS') && (
                                                <button onClick={() => handleResolveComplaint(c.id)} className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Həll Et
                                                </button>
                                            )}
                                            {c.status === 'RESOLVED' && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Həll Olunub</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {complaints.length === 0 && <p className="text-center text-slate-400 py-8">Şikayət yoxdur.</p>}
                        </div>
                    )}

                    {/* Complaint Pagination */}
                    {complaintTotalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-4">
                            <button
                                onClick={() => loadComplaints(complaintPage - 1)}
                                disabled={complaintPage === 0}
                                className="flex items-center gap-1 px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-lg disabled:opacity-50"
                            >
                                <ChevronLeft className="w-4 h-4" /> Əvvəlki
                            </button>
                            <span className="text-sm">Səhifə {complaintPage + 1} / {complaintTotalPages}</span>
                            <button
                                onClick={() => loadComplaints(complaintPage + 1)}
                                disabled={complaintPage >= complaintTotalPages - 1}
                                className="flex items-center gap-1 px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-lg disabled:opacity-50"
                            >
                                Növbəti <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminFeedback;
