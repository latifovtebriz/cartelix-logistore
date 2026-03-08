
export interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  description?: string;
  type?: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  ingredients: string;
  description: string;
  brand: string;
  attributes?: {
    fat?: string;
    sugar?: string;
    [key: string]: any;
  };
  isNew?: boolean;
  isDiscount?: boolean;
  oldPrice?: number;

  // Personal discount fields (from backend enrichment)
  personalPrice?: number;
  hasPersonalDiscount?: boolean;
  discountLabel?: string;
  globalDiscountPrice?: number;
  originalPriceDisplay?: number;

  // Admin Strict Fields
  stockQuantity: number;
  barcode: string; // Manual entry, must be unique
  unitType: 'count' | 'kg';
  healthTags: string; // For AI analysis
}

export interface Review {
  id: number;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  verifiedPurchase: boolean;
  productId?: number; // For linking to product
  productName?: string; // Added for admin panel
  barcode?: string; // Product barcode for filtering
}

export interface Complaint {
  id: number;
  userId: string;
  text: string;
  date: string;
  status: 'pending' | 'resolved';
}

export interface Challenge {
  id: number;
  title: string;
  // Targeting
  isPersonalized: boolean;
  targetUserId?: string; // If empty, applies to all

  // Progress tracking (Frontend specific)
  progress?: number;
  total?: number;
  relatedProductId?: number;
  promoCode?: string;

  // Added to support promo code discounts in Cart logic
  discountValue?: number;
  type: 'promo' | 'discount' | 'points';
  description: string;
  reward: string;
  status: 'active' | 'expired' | 'used';

  // Purchase-based campaign fields
  requiredPurchaseCount?: number;
  minAmountPerPurchase?: number;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  isEligible?: boolean; // For cart display
  startDate?: string;
  endDate?: string;
  targetAmount?: number;
}

export interface UpcomingSale {
  id: number;
  productName: string;
  image: string;
  discountStart: string; // ISO Date
  futurePrice: number;
  originalPrice: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  productCount?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Receipt {
  id: string;
  date: string;
  total: number;               // Final price after discounts (before payment split)
  originalTotal?: number;      // Sum of original prices
  discountTotal?: number;      // Total discounts applied (auto + promo)
  bonusSpent?: number;         // Paid with bonus wallet
  cardSpent?: number;          // Paid with card/cash
  promoCodeUsed?: string;
  posDeviceCode?: string;
  items: { productId: number; name: string; price: number; quantity: number; originalPrice?: number; discountedPrice?: number; discountLabel?: string }[];
  paymentMethod: string;
  type: 'SCAN_GO' | 'PHYSICAL';
  fiscalId?: string;
  marketId?: string;
}

export interface AIRecipe {
  title: string;
  description: string;
  cookingTime?: string;
  difficulty?: string;
  ingredients: string[];
  steps: string[];
  calories?: string;
  status: 'FULL_MEAL' | 'PARTIAL_MEAL' | 'SNACK' | 'INSUFFICIENT';
  missingIngredients?: string[];
}

export enum AppRoute {
  LOGIN = 'login',
  HOME = 'home',
  CATEGORIES = 'categories',
  UPCOMING = 'upcoming',
  SCAN = 'scan',
  PRODUCT = 'product',
  REWARDS = 'rewards',
  PROFILE = 'profile',
  CART = 'cart',
  RECEIPT = 'receipt',
  SMART_CHEF = 'smart_chef',
  SETTINGS = 'settings',
  NOTIFICATIONS = 'notifications',
  SUPPORT = 'support',
  ADMIN = 'admin',
  CASHIER = 'cashier'
}

export type UserRole = 'USER' | 'ADMIN' | 'CASHIER';

export interface User {
  id: string;
  phone: string;
  name: string;
  surname?: string;
  email: string;
  birthDate: string;
  points: number;
  ageGroup: 'student' | 'young_adult' | 'parent' | 'senior';
  verifiedReceipts: string[];
  purchaseHistory: number[];
  barcode?: string; // User's unique barcode
  receiptHistory: Receipt[];
  role: UserRole;
  isBlocked?: boolean;
  isScanGoBlocked?: boolean; // Critical for Admin User Management
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'discount';
}

export interface CategoryPageState {
  activeCategory: string;
  sortBy: 'rating' | 'price-asc' | 'price-desc';
  showFilters: boolean;
  filters: {
    q: string;
    marketId?: number;
    type: string;
    maxPrice: number;
    onlyDiscounted: boolean;
    sugarFree: boolean;
  };
  scrollPosition: number;
}

export interface Market {
  id: string;
  name: string;
  address: string;
  posCodePrefix: string;
}

export interface PosTerminal {
  id: string;
  marketName: string;
  qrString: string;
  isActive: boolean;
}

export interface AdminLog {
  id: number;
  action: string;
  details: string;
  timestamp: string;
}

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  activeUsers: number;
  todaysRevenue: number;
  recentOrders: Receipt[];
  logs: AdminLog[];
  topSellingProducts: { name: string, count: number }[];
}

export interface Discount {
  id: number;
  name: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y';
  value: number;
  target: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'SPECIFIC_CATEGORIES';
  startDate?: string;
  endDate?: string;
  priority: number;
  active: boolean;
  isPersonal?: boolean;
  targetUserId?: string;
  productIds?: number[];
  categoryIds?: number[];
  buyQuantity?: number;
  payQuantity?: number;
}

export interface AdminNotification {
  id: number;
  userId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'discount';
  date: string;
  read: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type ScanMode = 'PRODUCT' | 'USER';
