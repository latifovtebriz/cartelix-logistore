import { User, Product, Receipt, AIRecipe, Category, UpcomingSale, Review, Challenge, SystemSetting } from '../types';
// All AI logic handled by backend API - no frontend AI imports needed

// Use Vite proxy in development, production URL in build
// In development (npm run dev), Vite proxy will forward /api to localhost:8080
// In production (Cloudflare), use deployed backend URL
const API_BASE = import.meta.env.DEV
  ? '/api'  // Vite proxy handles this → http://localhost:8080/api
  : (import.meta.env.VITE_API_URL || '/api'); // Production: use relative path, handled by Nginx

// Helper for Fetch
const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('logi_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("API Error Body:", errorBody); // Log for debugging
    throw new Error(errorBody || `Request failed: ${response.status}`);
  }

  // Handle empty responses
  const text = await response.text();
  const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    return text ? JSON.parse(text) : {} as T;
  }

  // If not JSON, return the raw text (cast to T)
  return text as unknown as T;
};

// Mock Data Store (In-memory)
let mockNotifications = [
  {
    id: 1,
    title: 'Xüsusi Endirim! 🎉',
    message: 'Bu gün bütün süd məhsullarına 20% endirim var! Qaçırmayın.',
    date: new Date().toISOString().split('T')[0],
    read: false,
    type: 'success'
  },
  {
    id: 2,
    title: 'Bonus Kartınız',
    message: 'Təbrik edirik! Keçən ay 500 bonus qazandınız.',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    read: true,
    type: 'info'
  },
  {
    id: 3,
    title: 'Texniki İşlər',
    message: 'Sabah saat 03:00-da sistemdə profilaktik işlər aparılacaq.',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    read: true,
    type: 'warning'
  }
];

export const api = {
  // Auth - Password Based
  login: async (phone: string, password: string): Promise<{ token: string; user: User }> => {
    const user = await request<User>(`/auth/login?phone=${encodeURIComponent(phone)}&password=${encodeURIComponent(password)}`, {
      method: 'POST',
    });
    // Token is just the phone number for now
    const token = user.phone;
    localStorage.setItem('logi_token', token);
    localStorage.setItem('logi_user', JSON.stringify(user));
    return { token, user };
  },

  signup: async (phone: string, name: string, surname: string, email: string, password: string, dob?: string): Promise<{ token: string; user: User }> => {
    let url = `/auth/signup?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(name)}&password=${encodeURIComponent(password)}`;
    if (surname) url += `&surname=${encodeURIComponent(surname)}`;
    if (email) url += `&email=${encodeURIComponent(email)}`;
    if (dob) url += `&dob=${encodeURIComponent(dob)}`;

    const user = await request<User>(url, {
      method: 'POST',
    });
    const token = user.phone;
    localStorage.setItem('logi_token', token);
    localStorage.setItem('logi_user', JSON.stringify(user));
    return { token, user };
  },

  logout: async () => {
    localStorage.removeItem('logi_token');
    localStorage.removeItem('logi_user');
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      return await request<User>('/users/me');
    } catch {
      return null;
    }
  },

  // Products
  getProducts: async (page = 0, size = 20, filters?: { q?: string; category?: string; minPrice?: number; maxPrice?: number; marketId?: number; userId?: string; onlyDiscounted?: boolean; sort?: string }): Promise<{ content: Product[]; totalPages: number; totalElements: number }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      ...(filters?.q && { q: filters.q }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.minPrice && { minPrice: filters.minPrice.toString() }),
      ...(filters?.maxPrice && { maxPrice: filters.maxPrice.toString() }),
      ...(filters?.marketId && { marketId: filters.marketId.toString() }),
      ...(filters?.userId && { userId: filters.userId }),
    });
    return request<{ content: Product[]; totalPages: number; totalElements: number }>(`/products/search?${params.toString()}`);
  },

  getProduct: async (id: number, userId?: string): Promise<Product> => {
    const params = userId ? `?userId=${userId}` : '';
    return request<Product>(`/products/${id}${params}`);
  },

  getProductByBarcode: async (barcode: string, userId?: string): Promise<Product> => {
    const params = userId ? `?userId=${userId}` : '';
    return request<Product>(`/products/barcode/${barcode}${params}`);
  },

  // Personalized recommendations based on purchase history
  getRecommendations: async (userId: string): Promise<Product[]> => {
    return request<Product[]>(`/products/recommendations?userId=${userId}`);
  },

  // Best selling products for all users
  getBestSellers: async (userId?: string): Promise<Product[]> => {
    const params = userId ? `?userId=${userId}` : '';
    return request<Product[]>(`/products/bestsellers${params}`);
  },

  // Scan & Go
  getReceiptClaimStatus: async (qrString: string): Promise<{ status: string; claimed: boolean; userId?: string | null; receiptId?: string; fiscalId?: string; total?: number; posDeviceCode?: string; marketId?: number }> => {
    return request(`/receipts/claim/status?qrString=${encodeURIComponent(qrString)}`);
  },

  processPhysicalReceipt: async (receiptId: string, userId: string): Promise<{ success: boolean; receipt?: Receipt; message?: string }> => {
    try {
      // Changed to match Backend Controller: /receipts/claim?qrString=...&userId=...
      const receipt = await request<Receipt>(`/receipts/claim?qrString=${receiptId}&userId=${userId}`, { method: 'POST' });
      return { success: true, receipt };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  },

  // AI Features
  analyzeProductHealth: async (productId: number): Promise<string> => {
    // Matches ProductController/@PostMapping("/{id}/analyze-health")
    const res = await request<string>(`/products/${productId}/analyze-health`, { method: 'POST' });
    // Response might be a raw string or JSON depending on backend. Controller returns ResponseEntity<String>.
    return res;
  },

  generateRecipe: async (receiptId: string): Promise<AIRecipe> => {
    return request<AIRecipe>(`/ai/generate-recipe/${receiptId}`, { method: 'POST' });
  },

  // WebSocket URL Helper
  getWebSocketUrl: () => {
    if (import.meta.env.DEV) {
      return 'ws://localhost:8080/ws';
    }
    // Production: use wss:// with current domain
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  },

  // POS
  processPOSPayment: async (userId: string, cart: any[], posId: string, promoCode?: string, bonusSpend?: number, marketId?: number, campaignId?: number): Promise<Receipt> => {
    // New Flow: POST /api/pos/pay with { posId, userId, items }
    // Map cart items to the format backend expects (id, quantity) - NO PRICES!
    const items = cart.map(item => ({
      id: item.id,
      quantity: item.quantity
    }));

    return request<Receipt>(`/pos/pay`, {
      method: 'POST',
      body: JSON.stringify({ posId, userId: userId, items, promoCode, bonusSpend: bonusSpend || 0, marketId, campaignId })
    });
  },

  // User
  updateUser: async (userId: string, data: Partial<User>): Promise<User> => {
    return request<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  // Image Helper
  getImageUrl: (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // In development: use localhost, in production: use relative path
    const baseUrl = import.meta.env.DEV
      ? 'http://localhost:8080'
      : ''; // Empty string means use current domain/relative path
    return `${baseUrl}/images/${path}`;
  },

  // Categories - all data from database with hierarchy
  getCategories: async (): Promise<any[]> => {
    const cats = await request<any[]>('/categories');
    // Return full category objects with subCategories intact
    return cats.map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon || '📦',
      parentId: c.parentId,
      subCategories: c.subCategories?.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        icon: sub.icon || '📦'
      })) || []
    }));
  },

  // Active categories - only categories with products
  getActiveCategories: async (): Promise<any[]> => {
    const cats = await request<any[]>('/categories/active');
    return cats.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon || '📦',
      productCount: c.productCount
    }));
  },

  // Upcoming Sales
  getUpcomingSales: async (): Promise<any[]> => {
    return request<any[]>('/sales/upcoming');
  },

  // Reviews - moved to end of file for admin panel support

  addReview: async (productId: number, review: any): Promise<any> => {
    // Matches ReviewController/@PostMapping
    return request<any>(`/reviews`, {
      method: 'POST',
      body: JSON.stringify({ ...review, productId: productId, userId: localStorage.getItem('logi_token') })
    });
  },

  // Reviews with pagination (for ProductDetail page)
  getReviewsPaginated: async (productId: number, page: number = 0, size: number = 10): Promise<{ content: any[]; totalPages: number; number: number }> => {
    return request<{ content: any[]; totalPages: number; number: number }>(`/reviews/product/${productId}?page=${page}&size=${size}`);
  },

  // Rewards / Challenges
  getChallenges: async (): Promise<any[]> => {
    return request<any[]>('/rewards/challenges');
  },

  createChallenge: async (data: any): Promise<any> => {
    return request<any>('/rewards/challenges', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateChallenge: async (id: number, data: any): Promise<any> => {
    return request<any>(`/rewards/challenges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteChallenge: async (id: number): Promise<void> => {
    await request<any>(`/rewards/challenges/${id}`, { method: 'DELETE' });
  },

  // Campaign eligibility
  getEligibleCampaigns: async (userId: string): Promise<any[]> => {
    return request<any[]>(`/rewards/campaigns/eligible?userId=${userId}`);
  },

  applyCampaign: async (userId: string, campaignId: number, cartTotal: number): Promise<{ success: boolean; discount?: number; message?: string }> => {
    return request<any>('/rewards/campaigns/apply', {
      method: 'POST',
      body: JSON.stringify({ userId, campaignId, cartTotal })
    });
  },

  // Admin Reviews (all reviews for admin panel)
  getAllReviews: async (): Promise<any[]> => {
    // Get reviews for all products - for admin panel
    const products = await api.getProducts(0, 100);
    const allReviews: any[] = [];
    for (const product of products.content.slice(0, 10)) {
      try {
        const reviews = await request<any[]>(`/reviews/product/${product.id}`);
        allReviews.push(...reviews);
      } catch { /* ignore */ }
    }
    return allReviews;
  },

  // History
  getReceipts: async (userId: string, page = 0, size = 10): Promise<{ content: Receipt[]; totalPages: number }> => {
    return request<{ content: Receipt[]; totalPages: number }>(`/receipts?userId=${userId}&page=${page}&size=${size}`);
  },

  // Markets
  getMarkets: async (): Promise<any[]> => {
    return request<any[]>('/markets');
  },

  getNotifications: async (): Promise<any[]> => {
    try {
      const user = await api.getCurrentUser();
      if (!user) return [...mockNotifications];
      const notifications = await request<any[]>(`/notifications?userId=${user.id}`);
      // Merge with mock notifications for demo
      return [...notifications, ...mockNotifications];
    } catch (e) {
      console.error('Backend notifications error, using mock:', e);
      return [...mockNotifications];
    }
  },

  getUnreadNotificationCount: async (): Promise<number> => {
    // Helper for badge logic
    const notifs = await api.getNotifications();
    return notifs.filter((n: any) => !n.read && !n.isRead).length;
  },

  markNotificationsRead: async (): Promise<void> => {
    try {
      const user = await api.getCurrentUser();
      if (user) {
        await request(`/notifications/read-all?userId=${user.id}`, { method: 'PATCH' });
      }
    } catch (e) {
      console.error('Error marking notifications read:', e);
    }
    // Update in-memory state too
    mockNotifications = mockNotifications.map(n => ({ ...n, read: true }));
    return Promise.resolve();
  },

  // System Settings
  getSystemSettings: () => request<SystemSetting[]>('/admin/settings'),
  updateSystemSetting: (key: string, value: string) => request<SystemSetting>(`/admin/settings/${key}/simple?value=${encodeURIComponent(value)}`, {
    method: 'PUT',
  }),

  // Admin Features
  addProduct: async (productData: FormData): Promise<Product> => {
    // Uses Backend @PostMapping(consumes = MULTIPART_FORM_DATA_VALUE)
    // Note: 'request' helper sends JSON by default. We need custom fetch for FormData.
    const token = localStorage.getItem('logi_token');
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        // Content-Type not set, let browser set boundary for FormData
      },
      body: productData
    });
    if (!res.ok) throw new Error('Failed to add product');
    return res.json();
  },

  updateProduct: async (id: number, productData: any): Promise<Product> => {
    // Backend doesn't have explicit PUT /products/{id} in shared code, 
    // assuming it might exist or we use POST for update. 
    // For now, mock or use POST if capable. 
    // Simple mock to satisfy typecheck:
    return request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(productData) });
  },

  deleteProduct: async (id: number): Promise<void> => {
    await request<void>(`/products/${id}`, { method: 'DELETE' });
  },

  applyGlobalDiscount: async (percentage: number): Promise<string> => {
    const res = await fetch(`/api/products/global-discount?percentage=${percentage}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('logi_token')}`
      }
    });
    return res.text();
  },

  // Admin Stats & Users
  getAdminStats: async (): Promise<any> => {
    return request<any>('/admin/stats');
  },

  getAllUsers: async (page = 0, size = 20): Promise<{ content: User[]; totalPages: number }> => {
    return request<{ content: User[]; totalPages: number }>(`/admin/users?page=${page}&size=${size}`);
  },

  toggleUserBlockStatus: async (id: string): Promise<void> => {
    // Toggles general account access (isBlocked)
    const user = await api.getUserById(id);
    if (!user) return;
    const newState = !user.isBlocked;
    await request<void>(`/admin/users/${id}/block-account?blocked=${newState}`, { method: 'PATCH' });
  },

  toggleUserScanGo: async (id: string): Promise<void> => {
    // Same logic
    const user = await api.getUserById(id);
    if (!user) return;
    const newState = !user.isScanGoBlocked;
    await request<void>(`/admin/users/${id}/block?blocked=${newState}`, { method: 'PATCH' });
  },

  getUserById: async (id: string): Promise<User | null> => {
    // Helper for above
    return request<User>(`/admin/user/${id}`);
  },

  // Smart Chef - use backend API for reliability
  getSmartChefRecipe: async (ingredients: string[]): Promise<AIRecipe | null> => {
    try {
      // Filter out empty ingredients
      const validIngredients = ingredients.filter(i => i && i.trim() !== '');
      if (validIngredients.length === 0) {
        return {
          status: 'INSUFFICIENT',
          title: 'Təəssüf ki, ərzaq azdır',
          description: 'Çekdə məhsul məlumatı tapılmadı.',
          ingredients: [],
          steps: [],
        };
      }

      const response = await request<string>('/ai/recipe', {
        method: 'POST',
        body: JSON.stringify({ ingredients: validIngredients }),
      });

      // Parse JSON response from backend - handle potential errors
      try {
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        return parsed as AIRecipe;
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError, 'Response:', response);
        // Return a fallback if parsing fails
        return {
          status: 'FULL_MEAL',
          title: 'Resept hazırlandı',
          description: String(response).substring(0, 100) + '...',
          ingredients: validIngredients,
          steps: ['AI cavabını oxumaqda problem yarandı.'],
        };
      }
    } catch (error) {
      console.error('Smart Chef Error:', error);
      return null;
    }
  },

  // Feedback - Complaints (10 per page for pagination)
  getComplaints: async (page: number = 0, size: number = 10): Promise<any> => {
    return request<any>(`/complaints?page=${page}&size=${size}`);
  },
  getComplaintsByUser: async (userId: string): Promise<any> => {
    return request<any>(`/complaints/user/${userId}`);
  },
  createComplaint: async (data: { userId: string; subject: string; description: string; productId?: number }): Promise<any> => {
    return request<any>('/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  resolveComplaint: async (id: number): Promise<void> => {
    await request<void>(`/complaints/${id}/resolve`, { method: 'PATCH' });
  },
  updateComplaintStatus: async (id: number, status: string): Promise<void> => {
    await request<void>(`/complaints/${id}/status?status=${status}`, { method: 'PATCH' });
  },
  // Admin delete review
  deleteReview: async (id: number, isAdmin: boolean = true): Promise<void> => {
    await request<void>(`/reviews/${id}?isAdmin=${isAdmin}`, { method: 'DELETE' });
  },

  // User delete their own review
  deleteReviewAsUser: async (id: number, userId: string): Promise<void> => {
    await request<void>(`/reviews/${id}?userId=${userId}`, { method: 'DELETE' });
  },

  // Block/Unblock user (admin)
  blockUser: async (userId: string, blocked: boolean): Promise<any> => {
    return request<any>(`/admin/users/${userId}/block-account?blocked=${blocked}`, { method: 'PATCH' });
  },

  // Toggle Scan&Go permission
  toggleScanGoBlock: async (userId: string, blocked: boolean): Promise<any> => {
    return request<any>(`/admin/users/${userId}/block?blocked=${blocked}`, { method: 'PATCH' });
  },

  // Get all reviews for admin panel (legacy - for backward compatibility)
  getReviews: async (productId?: number): Promise<any[]> => {
    if (productId) {
      const response = await request<any>(`/reviews/product/${productId}?page=0&size=100`);
      return response.content || [];
    }
    // For admin - use new paginated endpoint
    try {
      const response = await request<any>('/reviews/admin/all?page=0&size=100');
      return response.content || [];
    } catch {
      return [];
    }
  },

  // Admin reviews with server-side pagination
  getAdminReviews: async (page: number = 0, size: number = 10): Promise<{ content: any[]; totalPages: number; totalElements: number; number: number }> => {
    return request<{ content: any[]; totalPages: number; totalElements: number; number: number }>(`/reviews/admin/all?page=${page}&size=${size}`);
  },

  // Promo Codes
  getUserPromoCodes: async (userId: string): Promise<any[]> => {
    return request<any[]>(`/promo-codes/user/${userId}`);
  },

  // Validate promo code
  validatePromoCode: async (code: string, userId: string, cartTotal: number): Promise<{ valid: boolean; discountAmount?: number; errorMessage?: string }> => {
    try {
      const result = await request<{ valid: boolean; discountAmount?: number; errorMessage?: string }>('/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId, cartTotal })
      });
      return result;
    } catch (e) {
      return { valid: false, errorMessage: (e as Error).message || 'Xəta baş verdi' };
    }
  },

  // ============ CASHIER API ============

  // Get cashier's assigned market
  getCashierMarket: async (cashierId: string): Promise<any> => {
    return request<any>('/cashier/market', {
      headers: { 'X-User-Id': cashierId }
    });
  },

  // Lookup customer by LogiStore Plus barcode
  lookupCustomerByBarcode: async (barcode: string): Promise<any> => {
    return request<any>(`/cashier/lookup-customer/${barcode}`);
  },

  // Complete checkout (create receipt)
  cashierCheckout: async (
    cashierId: string,
    data: {
      customerId?: string;
      items: { productId: number; quantity: number }[];
      paymentMethod: 'CASH' | 'CARD';
    }
  ): Promise<any> => {
    return request<any>('/cashier/checkout', {
      method: 'POST',
      headers: { 'X-User-Id': cashierId },
      body: JSON.stringify(data),
    });
  },

  // ============ ADMIN - USER MANAGEMENT ============

  searchUsers: async (q: string, page = 0, size = 20): Promise<{ content: User[]; totalPages: number; totalElements: number }> => {
    const params = new URLSearchParams({ q, page: page.toString(), size: size.toString() });
    return request<{ content: User[]; totalPages: number; totalElements: number }>(`/admin/users/search?${params.toString()}`);
  },

  getUserReceipts: async (userId: string, page = 0, size = 10): Promise<{ content: Receipt[]; totalPages: number }> => {
    return request<{ content: Receipt[]; totalPages: number }>(`/admin/users/${userId}/receipts?page=${page}&size=${size}`);
  },

  createAdminUser: async (data: { phone: string; name: string; surname?: string; role: string }): Promise<User> => {
    return request<User>('/admin/users/create-admin', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateUserAdmin: async (userId: string, data: Partial<User>): Promise<User> => {
    return request<User>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteUser: async (id: string): Promise<void> => {
    await request<void>(`/admin/users/${id}`, { method: 'DELETE' });
  },

  exportUsers: async (format: 'json' | 'csv' = 'json'): Promise<any> => {
    if (format === 'csv') {
      const token = localStorage.getItem('logi_token');
      const res = await fetch(`/api/admin/users/export?format=csv`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      return res.text();
    }
    return request<any>('/admin/users/export?format=json');
  },

  // ============ ADMIN - DISCOUNT MANAGEMENT ============

  getDiscounts: async (): Promise<any[]> => {
    return request<any[]>('/discounts');
  },

  getActiveDiscounts: async (): Promise<any[]> => {
    return request<any[]>('/discounts/active');
  },

  getDiscount: async (id: number): Promise<any> => {
    return request<any>(`/discounts/${id}`);
  },

  createDiscount: async (data: {
    name: string;
    description?: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y';
    value: number;
    target: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'SPECIFIC_CATEGORIES';
    startDate?: string;
    endDate?: string;
    priority?: number;
    active?: boolean;
    productIds?: number[];
    categoryIds?: number[];
    buyQuantity?: number;
    payQuantity?: number;
  }): Promise<any> => {
    return request<any>('/discounts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateDiscount: async (id: number, data: any): Promise<any> => {
    return request<any>(`/discounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteDiscount: async (id: number): Promise<void> => {
    await request<void>(`/discounts/${id}`, { method: 'DELETE' });
  },

  createPersonalDiscount: async (data: {
    userId: string;
    name: string;
    description?: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
    target: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'SPECIFIC_CATEGORIES';
    startDate?: string;
    endDate?: string;
    productIds?: number[];
    categoryIds?: number[];
  }): Promise<any> => {
    return request<any>('/discounts/personal', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getUserDiscounts: async (userId: string): Promise<any[]> => {
    return request<any[]>(`/discounts/user/${userId}`);
  },

  // ============ ADMIN - NOTIFICATIONS ============

  sendNotification: async (userId: string, title: string, message: string, type: string = 'info'): Promise<any> => {
    return request<any>('/notifications/send', {
      method: 'POST',
      body: JSON.stringify({ userId, title, message, type })
    });
  },

  broadcastNotification: async (title: string, message: string, type: string = 'info'): Promise<any> => {
    return request<any>('/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({ title, message, type })
    });
  },

  sendNotificationToUser: async (userId: string, title: string, message: string, type: string = 'info'): Promise<any> => {
    return request<any>(`/admin/notify/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ title, message, type })
    });
  },

  // ============ ADMIN - MARKETS ============

  createMarket: async (data: { name: string; location: string; posDeviceCode: string }): Promise<any> => {
    return request<any>('/markets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateMarket: async (id: number, data: { name?: string; location?: string; posDeviceCode?: string }): Promise<any> => {
    return request<any>(`/markets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteMarket: async (id: number): Promise<void> => {
    await request<void>(`/markets/${id}`, { method: 'DELETE' });
  },

  getPosTerminals: async (): Promise<any[]> => {
    return request<any[]>('/markets/pos-terminals');
  },

  addPosTerminal: async (marketName: string, qrString: string, marketId?: number): Promise<any> => {
    return request<any>('/markets/pos-terminals', {
      method: 'POST',
      body: JSON.stringify({ marketName, qrString, marketId })
    });
  },

  deletePosTerminal: async (id: number): Promise<void> => {
    await request<void>(`/markets/pos-terminals/${id}`, { method: 'DELETE' });
  },

  // ============ SCAN ANALYTICS ============

  // Track a product scan event
  trackProductScan: async (productId: number, userId?: string, scanSource?: string): Promise<{ id: number; productId: number; message: string }> => {
    return request<{ id: number; productId: number; message: string }>('/scan-analytics/track', {
      method: 'POST',
      body: JSON.stringify({ productId, userId, scanSource: scanSource || 'BARCODE' })
    });
  },

  // Mark scan event as added to cart
  markScanCartAdded: async (eventId: number): Promise<any> => {
    return request<any>(`/scan-analytics/${eventId}/cart-added`, { method: 'PUT' });
  },

  // Mark products as purchased after checkout
  markScanPurchased: async (userId: string, productIds: number[]): Promise<any> => {
    return request<any>('/scan-analytics/mark-purchased', {
      method: 'POST',
      body: JSON.stringify({ userId, productIds })
    });
  },

  // Get scan analytics overview
  getScanAnalyticsOverview: async (): Promise<any> => {
    return request<any>('/scan-analytics/overview');
  },

  // Get per-product scan stats
  getScanProductStats: async (): Promise<any[]> => {
    return request<any[]>('/scan-analytics/products');
  },

  // Get per-category scan stats
  getScanCategoryStats: async (): Promise<any[]> => {
    return request<any[]>('/scan-analytics/categories');
  },

  // Get per-user scan stats
  getScanUserStats: async (): Promise<any[]> => {
    return request<any[]>('/scan-analytics/users');
  },

  // Get top abandoned products
  getScanAbandonedProducts: async (): Promise<any[]> => {
    return request<any[]>('/scan-analytics/abandoned');
  },

  // Get hourly scan distribution
  getScanHourlyDistribution: async (): Promise<any[]> => {
    return request<any[]>('/scan-analytics/hourly');
  },

  // Get recent scans (live feed)
  getScanRecentEvents: async (): Promise<any[]> => {
    return request<any[]>('/scan-analytics/recent');
  },

  // Get AI marketing suggestions based on scan data
  getScanMarketingSuggestions: async (): Promise<any[]> => {
    return request<any[]>('/scan-analytics/suggestions');
  },

};

