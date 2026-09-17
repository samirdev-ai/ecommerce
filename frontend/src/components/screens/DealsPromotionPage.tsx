'use client';

/**
 * DealsPromotionPage.tsx
 * Ecommerce Deals & Promotions — production-grade page
 * Next.js App Router · React · TypeScript · Tailwind CSS v4 · Redux Toolkit
 *
 * Usage in app/deals/page.tsx:
 *   import DealsPromotionPage from '@/components/DealsPromotionPage';
 *   export default function Page() { return <DealsPromotionPage />; }
 *
 * Dependencies: @reduxjs/toolkit  react-redux
 */

// ─────────────────────────────────────────────────────────────────────────────
// § 1. IMPORTS
// ─────────────────────────────────────────────────────────────────────────────
import {
  useState, useEffect, useCallback, useMemo, memo,
  useRef, type ReactNode, type CSSProperties,
} from 'react';
import {
  configureStore, createSlice, createSelector,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// § 2. TYPESCRIPT TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

type PromotionType =
  | 'percentageDiscount' | 'fixedDiscount' | 'buyOneGetOne'
  | 'bundle' | 'coupon' | 'freeShipping' | 'bankOffer'
  | 'membership' | 'cashback' | 'clearance' | 'flashDeal';

type CampaignStatus = 'upcoming' | 'active' | 'endingSoon' | 'ended';
type DealType       = 'flash' | 'daily' | 'limited' | 'clearance' | 'bundle' | 'coupon' | 'bank' | 'member';
type ProductState   = 'active' | 'lowStock' | 'soldOut' | 'endingSoon' | 'new' | 'bestSeller';
type ViewMode       = 'grid' | 'list';
type SortOption     =
  | 'relevance' | 'biggestDiscount' | 'endingSoon'
  | 'popularity' | 'bestSelling' | 'newest'
  | 'priceLow' | 'priceHigh' | 'rating';

interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  status: CampaignStatus;
  endsAt: number;       // unix ms
  startsAt: number;
  discountLabel: string;
  ctaLabel: string;
  secondaryCtaLabel?: string;
  bgColor: string;
  accentColor: string;
  tags: string[];
  dealCount: number;
}

interface DealProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageColor: string;   // placeholder bg color
  originalPrice: number;
  dealPrice: number;
  discountPct: number;
  rating: number;
  reviewCount: number;
  state: ProductState;
  promotionType: PromotionType;
  dealType: DealType;
  soldCount: number;
  totalStock: number;
  remainingStock: number;
  delivery: string;
  badge?: string;
  endsAt?: number;
  campaignId?: string;
  featured: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discountLabel: string;
  discountType: 'percent' | 'fixed' | 'shipping';
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  expiresAt: number;
  categories: string[];
  isEligible: boolean;
  usageLeft: number;
}

interface BrandDeal {
  id: string;
  brand: string;
  tagline: string;
  discountLabel: string;
  validUntil: number;
  color: string;
  productCount: number;
}

interface CategoryDeal {
  id: string;
  name: string;
  icon: string;
  discountLabel: string;
  dealCount: number;
  color: string;
}

interface UpcomingDeal {
  id: string;
  title: string;
  subtitle: string;
  startsAt: number;
  discountLabel: string;
  notified: boolean;
  color: string;
}

interface FilterState {
  dealTypes: DealType[];
  categories: string[];
  brands: string[];
  discountMin: number | null;
  priceMax: number | null;
  priceMin: number | null;
  inStockOnly: boolean;
  freeShipping: boolean;
  fastDelivery: boolean;
  campaigns: string[];
}

interface CartItem { productId: string; quantity: number; price: number; }
interface DealsRootState {
  deals:     { activeCampaignIdx: number; viewMode: ViewMode; sort: SortOption; };
  filters:   FilterState;
  cart:      { items: CartItem[]; };
  wishlist:  { productIds: string[]; };
  ui:        { filterDrawerOpen: boolean; copiedCoupon: string | null; notifiedDeals: string[]; };
}

// ─────────────────────────────────────────────────────────────────────────────
// § 3. CONSTANTS & ENUMS
// ─────────────────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance',       label: 'Relevance' },
  { value: 'biggestDiscount', label: 'Biggest Discount' },
  { value: 'endingSoon',      label: 'Ending Soon' },
  { value: 'popularity',      label: 'Popularity' },
  { value: 'bestSelling',     label: 'Best Selling' },
  { value: 'priceLow',        label: 'Price: Low to High' },
  { value: 'priceHigh',       label: 'Price: High to Low' },
  { value: 'rating',          label: 'Customer Rating' },
];

const DEAL_TYPE_OPTIONS: { value: DealType; label: string }[] = [
  { value: 'flash',     label: 'Flash Deals' },
  { value: 'daily',     label: 'Daily Deals' },
  { value: 'coupon',    label: 'Coupon Deals' },
  { value: 'bundle',    label: 'Bundle Offers' },
  { value: 'clearance', label: 'Clearance' },
  { value: 'bank',      label: 'Bank Offers' },
  { value: 'member',    label: 'Member Exclusive' },
];

const CATEGORY_OPTIONS = ['Electronics','Fashion','Home','Beauty','Gaming','Sports','Grocery','Books','Toys'];
const DISCOUNT_OPTIONS: { value: number; label: string }[] = [
  { value: 10, label: '10% and above' },
  { value: 20, label: '20% and above' },
  { value: 30, label: '30% and above' },
  { value: 50, label: '50% and above' },
  { value: 70, label: '70% and above' },
];

// ─────────────────────────────────────────────────────────────────────────────
// § 4. MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────

const now = Date.now();
const h = (n: number) => n * 3_600_000;
const d = (n: number) => n * 86_400_000;

const CAMPAIGNS: Campaign[] = [
  {
    id: 'c1', title: 'Mega Savings Week', subtitle: 'Up to 60% off thousands of products',
    description: 'Our biggest sale of the season across every category.',
    status: 'endingSoon', endsAt: now + h(8) + 14 * 60_000 + 32_000,
    startsAt: now - d(5),
    discountLabel: 'Up to 60% off', ctaLabel: 'Shop All Deals', secondaryCtaLabel: 'View Campaign',
    bgColor: '#0a1628', accentColor: '#f59e0b', tags: ['Electronics','Fashion','Home'], dealCount: 1248,
  },
  {
    id: 'c2', title: 'Tech Fest', subtitle: 'Premium tech at unbeatable prices',
    description: 'The best deals on laptops, smartphones, audio, and accessories.',
    status: 'active', endsAt: now + d(2) + h(5),
    startsAt: now - d(2),
    discountLabel: 'Up to 45% off', ctaLabel: 'Explore Tech Deals',
    bgColor: '#0f1f3d', accentColor: '#60a5fa', tags: ['Electronics','Gaming'], dealCount: 342,
  },
  {
    id: 'c3', title: 'Fashion Forward', subtitle: 'Style meets savings this season',
    description: 'Top brands, latest trends, unmatched discounts.',
    status: 'active', endsAt: now + d(4),
    startsAt: now - d(1),
    discountLabel: 'Up to 70% off', ctaLabel: 'Shop Fashion',
    bgColor: '#1a0a2e', accentColor: '#c084fc', tags: ['Fashion','Beauty'], dealCount: 589,
  },
];

const FLASH_PRODUCTS: DealProduct[] = [
  {
    id: 'fp1', name: 'Sony WH-1000XM5 Wireless Headphones', brand: 'Sony', category: 'Electronics',
    imageColor: '#1e3a5f', originalPrice: 399, dealPrice: 249, discountPct: 38,
    rating: 4.8, reviewCount: 12430, state: 'endingSoon',
    promotionType: 'flashDeal', dealType: 'flash', soldCount: 1840, totalStock: 2000,
    remainingStock: 160, delivery: 'Free delivery by tomorrow', badge: 'Flash Deal',
    endsAt: now + h(3) + 42 * 60_000 + 18_000, campaignId: 'c1', featured: true,
  },
  {
    id: 'fp2', name: 'Samsung 65" QLED 4K Smart TV', brand: 'Samsung', category: 'Electronics',
    imageColor: '#2d1b69', originalPrice: 1299, dealPrice: 849, discountPct: 35,
    rating: 4.6, reviewCount: 5820, state: 'lowStock',
    promotionType: 'percentageDiscount', dealType: 'flash', soldCount: 482, totalStock: 500,
    remainingStock: 18, delivery: 'Free delivery, 2-3 days', badge: 'Low Stock',
    endsAt: now + h(3) + 42 * 60_000 + 18_000, campaignId: 'c1', featured: true,
  },
  {
    id: 'fp3', name: 'Apple iPad Air (M2) 11-inch 256GB', brand: 'Apple', category: 'Electronics',
    imageColor: '#1c3d2e', originalPrice: 749, dealPrice: 619, discountPct: 17,
    rating: 4.9, reviewCount: 8920, state: 'active',
    promotionType: 'percentageDiscount', dealType: 'flash', soldCount: 630, totalStock: 1000,
    remainingStock: 370, delivery: 'Free delivery by tomorrow',
    endsAt: now + h(3) + 42 * 60_000 + 18_000, campaignId: 'c2', featured: true,
  },
  {
    id: 'fp4', name: 'Dyson V15 Detect Cordless Vacuum', brand: 'Dyson', category: 'Home',
    imageColor: '#4a1c1c', originalPrice: 749, dealPrice: 529, discountPct: 29,
    rating: 4.7, reviewCount: 3410, state: 'active',
    promotionType: 'percentageDiscount', dealType: 'flash', soldCount: 290, totalStock: 600,
    remainingStock: 310, delivery: 'Free delivery, next day',
    endsAt: now + h(3) + 42 * 60_000 + 18_000, campaignId: 'c1', featured: false,
  },
  {
    id: 'fp5', name: 'Nike Air Max 270 Running Shoes', brand: 'Nike', category: 'Fashion',
    imageColor: '#1a3a1a', originalPrice: 150, dealPrice: 89, discountPct: 41,
    rating: 4.5, reviewCount: 7230, state: 'bestSeller',
    promotionType: 'percentageDiscount', dealType: 'flash', soldCount: 2100, totalStock: 3000,
    remainingStock: 900, delivery: 'Free delivery on orders $50+', badge: 'Best Seller',
    endsAt: now + h(3) + 42 * 60_000 + 18_000, campaignId: 'c3', featured: false,
  },
];

const ALL_PRODUCTS: DealProduct[] = [
  ...FLASH_PRODUCTS,
  {
    id: 'p6', name: 'Instant Pot Duo 7-in-1 6Qt Pressure Cooker', brand: 'Instant Pot', category: 'Home',
    imageColor: '#2a2a4a', originalPrice: 99, dealPrice: 59, discountPct: 40,
    rating: 4.7, reviewCount: 28900, state: 'bestSeller',
    promotionType: 'percentageDiscount', dealType: 'daily', soldCount: 8200, totalStock: 10000,
    remainingStock: 1800, delivery: 'Free delivery on orders $50+', badge: 'Best Seller', featured: false,
  },
  {
    id: 'p7', name: "Levi's 512 Slim Taper Jeans — Men's", brand: "Levi's", category: 'Fashion',
    imageColor: '#1e2d3d', originalPrice: 89, dealPrice: 49, discountPct: 45,
    rating: 4.4, reviewCount: 4320, state: 'active',
    promotionType: 'percentageDiscount', dealType: 'daily', soldCount: 1240, totalStock: 5000,
    remainingStock: 3760, delivery: 'Free delivery on orders $50+', featured: false,
  },
  {
    id: 'p8', name: 'Anker 65W USB-C Charger 4-Port Hub', brand: 'Anker', category: 'Electronics',
    imageColor: '#2e1a00', originalPrice: 45, dealPrice: 27, discountPct: 40,
    rating: 4.6, reviewCount: 9810, state: 'new',
    promotionType: 'percentageDiscount', dealType: 'daily', soldCount: 3400, totalStock: 8000,
    remainingStock: 4600, delivery: 'Free delivery on orders $25+', badge: 'New', featured: false,
  },
  {
    id: 'p9', name: 'Laneige Lip Sleeping Mask Berry 20g', brand: 'Laneige', category: 'Beauty',
    imageColor: '#3d1a2e', originalPrice: 24, dealPrice: 17, discountPct: 29,
    rating: 4.9, reviewCount: 15620, state: 'lowStock',
    promotionType: 'clearance', dealType: 'clearance', soldCount: 6400, totalStock: 6500,
    remainingStock: 100, delivery: 'Standard delivery 3-5 days', badge: 'Low Stock', featured: false,
  },
  {
    id: 'p10', name: 'PlayStation 5 DualSense Wireless Controller', brand: 'Sony', category: 'Gaming',
    imageColor: '#0f2044', originalPrice: 74, dealPrice: 55, discountPct: 26,
    rating: 4.8, reviewCount: 11230, state: 'active',
    promotionType: 'percentageDiscount', dealType: 'daily', soldCount: 5600, totalStock: 8000,
    remainingStock: 2400, delivery: 'Free delivery by tomorrow', featured: false,
  },
  {
    id: 'p11', name: 'KitchenAid 5-Qt Artisan Stand Mixer — Pistachio', brand: 'KitchenAid', category: 'Home',
    imageColor: '#1a3a1a', originalPrice: 449, dealPrice: 299, discountPct: 33,
    rating: 4.9, reviewCount: 18400, state: 'bestSeller',
    promotionType: 'clearance', dealType: 'clearance', soldCount: 920, totalStock: 1000,
    remainingStock: 80, delivery: 'Free delivery, 2-3 days', badge: 'Clearance', featured: false,
  },
  {
    id: 'p12', name: 'Fitbit Charge 6 Advanced Fitness Tracker', brand: 'Fitbit', category: 'Electronics',
    imageColor: '#003333', originalPrice: 159, dealPrice: 99, discountPct: 38,
    rating: 4.5, reviewCount: 6780, state: 'active',
    promotionType: 'percentageDiscount', dealType: 'member', soldCount: 2100, totalStock: 5000,
    remainingStock: 2900, delivery: 'Free delivery for members', badge: 'Member Exclusive', featured: false,
  },
];

const COUPONS: Coupon[] = [
  {
    id: 'cu1', code: 'MEGA20', discountLabel: '20% OFF', discountType: 'percent',
    discountValue: 20, minOrder: 100, maxDiscount: 50,
    expiresAt: now + d(2), categories: ['All categories'], isEligible: true, usageLeft: 847,
  },
  {
    id: 'cu2', code: 'TECH15', discountLabel: '15% OFF', discountType: 'percent',
    discountValue: 15, minOrder: 75,
    expiresAt: now + d(4), categories: ['Electronics', 'Gaming'], isEligible: true, usageLeft: 2340,
  },
  {
    id: 'cu3', code: 'FREESHIP', discountLabel: 'FREE SHIPPING', discountType: 'shipping',
    discountValue: 0, minOrder: 30,
    expiresAt: now + d(7), categories: ['All categories'], isEligible: true, usageLeft: 9999,
  },
  {
    id: 'cu4', code: 'SAVE30', discountLabel: '$30 OFF', discountType: 'fixed',
    discountValue: 30, minOrder: 150,
    expiresAt: now + h(20), categories: ['Home', 'Beauty'], isEligible: false, usageLeft: 412,
  },
];

const BRAND_DEALS: BrandDeal[] = [
  { id: 'b1', brand: 'Sony',        tagline: 'Audio, TVs & Cameras',   discountLabel: 'Up to 35% off', validUntil: now + d(3), color: '#1a1a2e', productCount: 124 },
  { id: 'b2', brand: 'Samsung',     tagline: 'Phones, TVs & Appliances',discountLabel: 'Up to 40% off', validUntil: now + d(5), color: '#001f5b', productCount: 218 },
  { id: 'b3', brand: 'Nike',        tagline: 'Footwear & Apparel',      discountLabel: 'Up to 50% off', validUntil: now + d(2), color: '#111111', productCount: 340 },
  { id: 'b4', brand: 'Apple',       tagline: 'Mac, iPad & Accessories', discountLabel: 'Up to 20% off', validUntil: now + d(6), color: '#1c1c1e', productCount: 89  },
  { id: 'b5', brand: 'Dyson',       tagline: 'Vacuum & Air Treatment',  discountLabel: 'Up to 30% off', validUntil: now + d(1), color: '#2d1a00', productCount: 42  },
  { id: 'b6', brand: 'KitchenAid',  tagline: 'Stand Mixers & Appliances',discountLabel:'Up to 35% off', validUntil: now + d(4), color: '#1a3a1a', productCount: 67  },
];

const CATEGORY_DEALS: CategoryDeal[] = [
  { id: 'cd1', name: 'Electronics',  icon: '💻', discountLabel: 'Up to 50% off', dealCount: 342, color: '#1e3a5f' },
  { id: 'cd2', name: 'Fashion',      icon: '👗', discountLabel: 'Up to 70% off', dealCount: 589, color: '#3d1a4a' },
  { id: 'cd3', name: 'Home',         icon: '🏠', discountLabel: 'Up to 40% off', dealCount: 218, color: '#1a3a1a' },
  { id: 'cd4', name: 'Beauty',       icon: '✨', discountLabel: 'Up to 55% off', dealCount: 167, color: '#4a1a2e' },
  { id: 'cd5', name: 'Gaming',       icon: '🎮', discountLabel: 'Up to 45% off', dealCount: 124, color: '#1a1a4a' },
  { id: 'cd6', name: 'Sports',       icon: '⚡', discountLabel: 'Up to 60% off', dealCount: 203, color: '#1a2e2e' },
  { id: 'cd7', name: 'Grocery',      icon: '🛒', discountLabel: 'Up to 30% off', dealCount: 89,  color: '#2e2e1a' },
  { id: 'cd8', name: 'Clearance',    icon: '🏷', discountLabel: 'Up to 80% off', dealCount: 431, color: '#2e1a1a' },
];

const UPCOMING_DEALS: UpcomingDeal[] = [
  { id: 'u1', title: 'Weekend Blowout', subtitle: 'Electronics & Gaming special',  startsAt: now + d(1), discountLabel: 'Up to 55% off', notified: false, color: '#1e3a5f' },
  { id: 'u2', title: 'Beauty Bonanza',  subtitle: 'Premium skincare & cosmetics',   startsAt: now + d(2) + h(6), discountLabel: 'Up to 60% off', notified: false, color: '#4a1a2e' },
  { id: 'u3', title: 'Home Reset Sale', subtitle: 'Appliances, furniture & decor',  startsAt: now + d(3), discountLabel: 'Up to 45% off', notified: true, color: '#1a3a1a' },
];

// ─────────────────────────────────────────────────────────────────────────────
// § 5. UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

const fc = (v: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const savings = (orig: number, deal: number): string => fc(orig - deal);

const pct = (sold: number, total: number): number =>
  total === 0 ? 0 : Math.min(100, Math.round((sold / total) * 100));

const fmtCountdown = (ms: number): { days: number; hours: number; mins: number; secs: number } => {
  const total = Math.max(0, ms);
  const secs  = Math.floor((total / 1000) % 60);
  const mins  = Math.floor((total / 60000) % 60);
  const hours = Math.floor((total / 3_600_000) % 24);
  const days  = Math.floor(total / 86_400_000);
  return { days, hours, mins, secs };
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

const relTime = (ts: number): string => {
  const diff = ts - Date.now();
  const absDays  = Math.floor(Math.abs(diff) / 86_400_000);
  const absHours = Math.floor(Math.abs(diff) / 3_600_000);
  if (diff < 0) return 'Started';
  if (absDays >= 2)  return 'Starts in ' + absDays + ' days';
  if (absDays >= 1)  return 'Starts tomorrow';
  if (absHours >= 1) return 'Starts in ' + absHours + 'h';
  return 'Starting soon';
};

const expireLabel = (ts: number): string => {
  const diff = ts - Date.now();
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  if (days >= 1)  return 'Expires in ' + days + 'd';
  if (hours >= 1) return 'Expires in ' + hours + 'h';
  return 'Expiring soon';
};

// ─────────────────────────────────────────────────────────────────────────────
// § 6. REDUX — SLICES, STORE, SELECTORS
// ─────────────────────────────────────────────────────────────────────────────

const dealsSlice = createSlice({
  name: 'deals',
  initialState: { activeCampaignIdx: 0, viewMode: 'grid' as ViewMode, sort: 'relevance' as SortOption },
  reducers: {
    setActiveCampaign: (s, a: PayloadAction<number>) => { s.activeCampaignIdx = a.payload; },
    setViewMode:       (s, a: PayloadAction<ViewMode>)  => { s.viewMode = a.payload; },
    setSort:           (s, a: PayloadAction<SortOption>) => { s.sort     = a.payload; },
  },
});

const filtersSlice = createSlice({
  name: 'filters',
  initialState: {
    dealTypes: [] as DealType[], categories: [] as string[], brands: [] as string[],
    discountMin: null as number | null, priceMax: null as number | null,
    priceMin: null as number | null, inStockOnly: false, freeShipping: false,
    fastDelivery: false, campaigns: [] as string[],
  } as FilterState,
  reducers: {
    toggleDealType: (s, a: PayloadAction<DealType>) => {
      s.dealTypes = s.dealTypes.includes(a.payload)
        ? s.dealTypes.filter(x => x !== a.payload)
        : [...s.dealTypes, a.payload];
    },
    toggleCategory: (s, a: PayloadAction<string>) => {
      s.categories = s.categories.includes(a.payload)
        ? s.categories.filter(x => x !== a.payload)
        : [...s.categories, a.payload];
    },
    setDiscountMin: (s, a: PayloadAction<number | null>) => { s.discountMin  = a.payload; },
    toggleInStock:  (s) => { s.inStockOnly   = !s.inStockOnly; },
    toggleFreeShip: (s) => { s.freeShipping  = !s.freeShipping; },
    clearFilters:   (s) => {
      s.dealTypes = []; s.categories = []; s.brands = [];
      s.discountMin = null; s.priceMax = null; s.priceMin = null;
      s.inStockOnly = false; s.freeShipping = false;
      s.fastDelivery = false; s.campaigns = [];
    },
  },
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as CartItem[] },
  reducers: {
    addToCart: (s, a: PayloadAction<{ productId: string; price: number }>) => {
      const ex = s.items.find(i => i.productId === a.payload.productId);
      if (ex) { ex.quantity += 1; }
      else { s.items.push({ productId: a.payload.productId, quantity: 1, price: a.payload.price }); }
    },
    removeFromCart: (s, a: PayloadAction<string>) => {
      s.items = s.items.filter(i => i.productId !== a.payload);
    },
  },
});

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { productIds: [] as string[] },
  reducers: {
    toggleWishlist: (s, a: PayloadAction<string>) => {
      s.productIds = s.productIds.includes(a.payload)
        ? s.productIds.filter(x => x !== a.payload)
        : [...s.productIds, a.payload];
    },
  },
});

const uiSlice = createSlice({
  name: 'ui',
  initialState: { filterDrawerOpen: false, copiedCoupon: null as string | null, notifiedDeals: [] as string[] },
  reducers: {
    toggleFilterDrawer: (s) => { s.filterDrawerOpen = !s.filterDrawerOpen; },
    closeFilterDrawer:  (s) => { s.filterDrawerOpen = false; },
    setCopiedCoupon:    (s, a: PayloadAction<string | null>) => { s.copiedCoupon = a.payload; },
    toggleNotified:     (s, a: PayloadAction<string>) => {
      s.notifiedDeals = s.notifiedDeals.includes(a.payload)
        ? s.notifiedDeals.filter(x => x !== a.payload)
        : [...s.notifiedDeals, a.payload];
    },
  },
});

const store = configureStore({
  reducer: {
    deals:    dealsSlice.reducer,
    filters:  filtersSlice.reducer,
    cart:     cartSlice.reducer,
    wishlist: wishlistSlice.reducer,
    ui:       uiSlice.reducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

type AppDispatch = typeof store.dispatch;
const useAppDispatch = () => useDispatch<AppDispatch>();
const useAppSelector = <T,>(sel: (s: DealsRootState) => T) => useSelector(sel);

// Selectors
const selActiveCampaign = createSelector(
  (s: DealsRootState) => s.deals.activeCampaignIdx,
  (idx) => CAMPAIGNS[idx] ?? CAMPAIGNS[0]
);
const selCartCount   = (s: DealsRootState) => s.cart.items.reduce((a, i) => a + i.quantity, 0);
const selWishlist    = (s: DealsRootState) => s.wishlist.productIds;
const selFilters     = (s: DealsRootState) => s.filters;
const selSort        = (s: DealsRootState) => s.deals.sort;
const selViewMode    = (s: DealsRootState) => s.deals.viewMode;
const selDrawerOpen  = (s: DealsRootState) => s.ui.filterDrawerOpen;
const selCopied      = (s: DealsRootState) => s.ui.copiedCoupon;
const selNotified    = (s: DealsRootState) => s.ui.notifiedDeals;

const selActiveFilterCount = createSelector(selFilters, (f) => {
  let n = 0;
  n += f.dealTypes.length + f.categories.length + f.brands.length;
  if (f.discountMin !== null) n++;
  if (f.inStockOnly)   n++;
  if (f.freeShipping)  n++;
  if (f.fastDelivery)  n++;
  return n;
});

const selFilteredProducts = createSelector(
  selFilters, selSort,
  (filters, sort) => {
    let products = [...ALL_PRODUCTS];
    if (filters.dealTypes.length)   products = products.filter(p => filters.dealTypes.includes(p.dealType));
    if (filters.categories.length)  products = products.filter(p => filters.categories.includes(p.category));
    if (filters.discountMin !== null) products = products.filter(p => p.discountPct >= filters.discountMin!);
    if (filters.inStockOnly)        products = products.filter(p => p.state !== 'soldOut');
    if (filters.freeShipping)       products = products.filter(p => p.delivery.toLowerCase().includes('free'));
    switch (sort) {
      case 'biggestDiscount': products.sort((a, b) => b.discountPct - a.discountPct); break;
      case 'priceLow':        products.sort((a, b) => a.dealPrice - b.dealPrice); break;
      case 'priceHigh':       products.sort((a, b) => b.dealPrice - a.dealPrice); break;
      case 'rating':          products.sort((a, b) => b.rating - a.rating); break;
      case 'bestSelling':     products.sort((a, b) => b.soldCount - a.soldCount); break;
      case 'endingSoon':      products.sort((a, b) => (a.endsAt ?? Infinity) - (b.endsAt ?? Infinity)); break;
    }
    return products;
  }
);

const { setActiveCampaign, setViewMode, setSort } = dealsSlice.actions;
const { toggleDealType, toggleCategory, setDiscountMin, toggleInStock, toggleFreeShip, clearFilters } = filtersSlice.actions;
const { addToCart } = cartSlice.actions;
const { toggleWishlist } = wishlistSlice.actions;
const { toggleFilterDrawer, closeFilterDrawer, setCopiedCoupon, toggleNotified } = uiSlice.actions;

// ─────────────────────────────────────────────────────────────────────────────
// § 7. SHARED COUNTDOWN HOOK & COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Single shared ticker — all countdowns derive from one interval */
function useCountdownMs(targetMs: number): number {
  const [remaining, setRemaining] = useState(() => Math.max(0, targetMs - Date.now()));
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, targetMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return remaining;
}

interface CountdownProps {
  targetMs: number;
  size?: 'sm' | 'md' | 'lg';
  showDays?: boolean;
}
const Countdown = memo(function Countdown({ targetMs, size = 'md', showDays = false }: CountdownProps) {
  const ms = useCountdownMs(targetMs);
  const { days, hours, mins, secs } = fmtCountdown(ms);
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };

  if (ms === 0) return <span className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>Offer ended</span>;

  return (
    <div className="flex items-center gap-1.5" aria-label={`Time remaining: ${days}d ${hours}h ${mins}m ${secs}s`}>
      {showDays && days > 0 && (
        <>
          <span className={`cd-unit ${sizes[size]}`}>{pad2(days)}<span className="cd-label">days</span></span>
          <span style={{ color: 'var(--color-text-tertiary)' }}>:</span>
        </>
      )}
      <span className={`cd-unit ${sizes[size]}`}>{pad2(hours)}<span className="cd-label">hrs</span></span>
      <span style={{ color: 'var(--color-text-tertiary)' }} aria-hidden>:</span>
      <span className={`cd-unit ${sizes[size]}`}>{pad2(mins)}<span className="cd-label">min</span></span>
      <span style={{ color: 'var(--color-text-tertiary)' }} aria-hidden>:</span>
      <span className={`cd-unit ${sizes[size]}`}>{pad2(secs)}<span className="cd-label">sec</span></span>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// § 8. PRIMITIVE UI ATOMS
// ─────────────────────────────────────────────────────────────────────────────

const Badge = memo(function Badge({
  children, variant = 'default', className = '',
}: { children: ReactNode; variant?: 'default'|'flash'|'member'|'clearance'|'new'|'hot'; className?: string }) {
  const styles: Record<string, CSSProperties> = {
    default:   { background: 'var(--color-surface-sunken)',  color: 'var(--color-text-secondary)' },
    flash:     { background: 'var(--color-flash-subtle)',    color: 'var(--color-flash)' },
    member:    { background: 'var(--color-member-subtle)',   color: 'var(--color-member)' },
    clearance: { background: 'var(--color-clearance-subtle)',color: 'var(--color-clearance)' },
    new:       { background: 'var(--color-info-subtle)',     color: 'var(--color-info)' },
    hot:       { background: 'var(--color-warning-subtle)',  color: 'var(--color-warning)' },
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-semibold ${className}`}
      style={{ borderRadius: 'var(--radius-badge)', ...styles[variant] }}>
      {children}
    </span>
  );
});

const Btn = memo(function Btn({
  children, onClick, variant = 'primary', size = 'md', disabled = false, fullWidth = false, className = '', ariaLabel,
}: {
  children: ReactNode; onClick?: () => void; variant?: 'primary'|'secondary'|'ghost'|'outline';
  size?: 'sm'|'md'|'lg'; disabled?: boolean; fullWidth?: boolean; className?: string; ariaLabel?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-all cursor-pointer border-0';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-sm' };
  const variants: Record<string, CSSProperties> = {
    primary:   { background: 'var(--color-brand-500)', color: '#0a0f1e' },
    secondary: { background: 'var(--color-surface-sunken)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' },
    outline:   { background: 'transparent', color: 'var(--color-brand-500)', border: '1px solid var(--color-brand-500)' },
    ghost:     { background: 'transparent', color: 'var(--color-text-secondary)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      className={`${base} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'} ${className}`}
      style={{ borderRadius: 'var(--radius-md)', ...variants[variant] }}>
      {children}
    </button>
  );
});

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full  = Math.floor(rating);
  const frac  = rating % 1;
  const countLabel = count >= 1000 ? (count / 1000).toFixed(1) + 'k' : String(count);
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars, ${count.toLocaleString()} reviews`}>
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < full;
          const half   = i === full && frac > 0.4;
          return (
            <svg key={i} viewBox="0 0 12 12" className="w-3 h-3"
              fill={filled ? 'var(--color-brand-500)' : half ? 'url(#half-star)' : 'var(--color-border)'}
              aria-hidden="true">
              <defs>
                <linearGradient id="half-star">
                  <stop offset="50%" stopColor="var(--color-brand-500)"/>
                  <stop offset="50%" stopColor="var(--color-border)"/>
                </linearGradient>
              </defs>
              <path d="M6 0l1.5 3.5 3.5.5-2.5 2.5.6 3.5L6 8.5l-3.1 1.5.6-3.5L1 4l3.5-.5z"/>
            </svg>
          );
        })}
      </div>
      <span className="text-xs tabular" style={{ color: 'var(--color-text-tertiary)' }}>
        ({countLabel})
      </span>
    </div>
  );
}

function WishlistButton({ productId }: { productId: string }) {
  const dispatch = useAppDispatch();
  const wishlist = useAppSelector(selWishlist);
  const isWished = wishlist.includes(productId);
  return (
    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); dispatch(toggleWishlist(productId)); }}
      aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={isWished}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
      style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xs)' }}>
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill={isWished ? 'var(--color-flash)' : 'none'} stroke={isWished ? 'var(--color-flash)' : 'var(--color-text-secondary)'} strokeWidth={1.8} aria-hidden>
        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
      </svg>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 9. HEADER
// ─────────────────────────────────────────────────────────────────────────────

function AnnouncementBar() {
  return (
    <div className="flex items-center justify-center gap-6 px-4 text-xs font-medium"
      style={{ height: 'var(--announce-h)', background: 'var(--color-navy-950)', color: 'var(--color-brand-400)' }}>
      <span>🔥 MEGA SAVINGS WEEK — Up to 60% off</span>
      <span className="hidden sm:inline" style={{ color: 'var(--color-navy-700)' }}>|</span>
      <span className="hidden sm:inline" style={{ color: 'oklch(70% 0 0)' }}>Free shipping on orders $50+</span>
      <span className="hidden md:inline" style={{ color: 'var(--color-navy-700)' }}>|</span>
      <span className="hidden md:inline" style={{ color: 'oklch(70% 0 0)' }}>New deals every 24 hours</span>
    </div>
  );
}

function SearchBar() {
  const [q, setQ] = useState('');
  return (
    <div className="relative flex-1 max-w-2xl" role="search">
      <label htmlFor="site-search" className="sr-only">Search deals and products</label>
      <input id="site-search" type="search" value={q} onChange={e => setQ(e.target.value)}
        placeholder="Search deals, brands, products…"
        className="w-full pl-10 pr-4 py-2 text-sm rounded-lg outline-none transition-all"
        style={{
          background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)', borderRadius: 'var(--radius-lg)',
        }}
        aria-label="Search deals and products"
      />
      <svg className="absolute left-3 top-2.5 w-4 h-4 pointer-events-none" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden style={{ color: 'var(--color-text-tertiary)' }}>
        <circle cx="9" cy="9" r="5"/><path d="M16 16l-3-3"/>
      </svg>
    </div>
  );
}

function HeaderActions() {
  const cartCount = useAppSelector(selCartCount);
  return (
    <div className="flex items-center gap-1">
      {[
        { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Account' },
        { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', label: 'Notifications' },
      ].map(({ icon, label }) => (
        <button key={label} aria-label={label}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-surface-sunken"
          style={{ borderRadius: 'var(--radius-md)' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon}/>
          </svg>
        </button>
      ))}
      {/* Wishlist */}
      <button aria-label="Wishlist" className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-surface-sunken" style={{ borderRadius: 'var(--radius-md)' }}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
      </button>
      {/* Cart */}
      <button aria-label={`Cart, ${cartCount} items`}
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
        style={{ background: 'var(--color-brand-500)', color: '#0a0f1e', borderRadius: 'var(--radius-md)' }}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
        <span className="hidden sm:inline">Cart</span>
        {cartCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold px-1"
            style={{ background: 'var(--color-flash)', color: '#fff' }}
            aria-hidden>
            {cartCount}
          </span>
        )}
      </button>
    </div>
  );
}

function CategoryNavigation() {
  const navItems = ['All Deals', "Today's Deals", 'Flash Deals', 'New Arrivals', 'Best Sellers', 'Brands', 'Clearance'];
  const [active, setActive] = useState("Today's Deals");
  return (
    <nav aria-label="Deal categories" className="border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="max-w-screen-xl mx-auto px-4">
        <ul role="list" className="flex items-center gap-1 overflow-x-auto scrollbar-thin py-1">
          {navItems.map(item => (
            <li key={item}>
              <button onClick={() => setActive(item)} aria-current={active === item ? 'page' : undefined}
                className="whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-all"
                style={{
                  background: active === item ? 'var(--color-brand-50)' : 'transparent',
                  color: active === item ? 'var(--color-text-brand)' : 'var(--color-text-secondary)',
                  borderRadius: 'var(--radius-md)',
                }}>
                {item}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function EcommerceHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <header role="banner" className="sticky top-0 z-50" style={{ background: 'var(--color-surface-raised)', boxShadow: 'var(--shadow-sm)' }}>
      <AnnouncementBar />
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center gap-4 h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0" aria-label="ShopDeals home">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ background: 'var(--color-navy-950)', color: 'var(--color-brand-500)' }}>S</div>
            <span className="hidden sm:inline font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>ShopDeals</span>
          </Link>
          {/* Location */}
          <button className="hidden md:flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors hover:bg-surface-sunken"
            style={{ color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-md)' }}
            aria-label="Deliver to New York">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M8 2a4 4 0 00-4 4c0 3 4 8 4 8s4-5 4-8a4 4 0 00-4-4zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
            </svg>
            <span className="text-left"><span className="block" style={{ color: 'var(--color-text-tertiary)' }}>Deliver to</span><span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>New York</span></span>
          </button>
          <SearchBar />
          <HeaderActions />
          {/* Mobile menu */}
          <button className="md:hidden w-9 h-9 flex items-center justify-center" onClick={() => setMobileMenuOpen(o => !o)} aria-label="Open menu" aria-expanded={mobileMenuOpen}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}/>
            </svg>
          </button>
        </div>
      </div>
      <CategoryNavigation />
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 10. BREADCRUMBS
// ─────────────────────────────────────────────────────────────────────────────

function DealsBreadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="max-w-screen-xl mx-auto px-4 py-3">
      <ol className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        <li><Link href="/" className="transition-colors hover:underline" style={{ color: 'var(--color-text-secondary)' }}>Home</Link></li>
        <li aria-hidden="true"><svg viewBox="0 0 6 10" className="w-1.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4-4 4"/></svg></li>
        <li aria-current="page" style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>Deals &amp; Promotions</li>
      </ol>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 11. HERO CAMPAIGN
// ─────────────────────────────────────────────────────────────────────────────

function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const config = {
    upcoming:    { label: 'Coming Soon',  bg: 'var(--color-info-subtle)',    color: 'var(--color-info-fg)' },
    active:      { label: 'Live Now',     bg: 'var(--color-success-subtle)', color: 'var(--color-success-fg)' },
    endingSoon:  { label: 'Ending Soon',  bg: 'var(--color-flash-subtle)',   color: 'var(--color-flash)' },
    ended:       { label: 'Offer Ended',  bg: 'var(--color-surface-sunken)', color: 'var(--color-text-tertiary)' },
  }[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
      style={{ background: config.bg, color: config.color, borderRadius: 'var(--radius-pill)' }}>
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden/>}
      {config.label}
    </span>
  );
}

function HeroCampaign({ campaign }: { campaign: Campaign }) {
  const dispatch = useAppDispatch();
  const activeCampaignIdx = useAppSelector(s => s.deals.activeCampaignIdx);

  const ctaForStatus: Record<CampaignStatus, { primary: string; secondary?: string }> = {
    upcoming:   { primary: 'Notify Me',        secondary: 'View Details' },
    active:     { primary: campaign.ctaLabel,   secondary: campaign.secondaryCtaLabel },
    endingSoon: { primary: 'Shop Now',          secondary: 'View All Deals' },
    ended:      { primary: 'Explore Similar',   secondary: undefined },
  };
  const cta = ctaForStatus[campaign.status];

  return (
    <section aria-label={`Campaign: ${campaign.title}`}
      className="relative overflow-hidden rounded-xl"
      style={{ background: campaign.bgColor, boxShadow: 'var(--shadow-hero)', borderRadius: 'var(--radius-xl)' }}>
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" aria-hidden
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}/>
      <div className="relative px-6 py-10 md:px-12 md:py-16 grid md:grid-cols-2 gap-8 items-center">
        {/* Content */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <CampaignStatusBadge status={campaign.status} />
            <span className="text-xs font-medium" style={{ color: 'oklch(65% 0 0)' }}>
              {campaign.dealCount.toLocaleString()} deals
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
            style={{ color: '#fff', lineHeight: 1.15 }}>
            {campaign.title}
          </h1>
          <p className="text-lg mb-1" style={{ color: campaign.accentColor, fontWeight: 600 }}>
            {campaign.discountLabel}
          </p>
          <p className="text-sm mb-6" style={{ color: 'oklch(68% 0 0)' }}>{campaign.subtitle}</p>

          {/* Countdown */}
          {(campaign.status === 'active' || campaign.status === 'endingSoon') && (
            <div className="mb-6">
              <p className="text-xs font-medium mb-2" style={{ color: 'oklch(60% 0 0)' }}>
                {campaign.status === 'endingSoon' ? 'Ends in' : 'Time remaining'}
              </p>
              <Countdown targetMs={campaign.endsAt} size="lg" showDays />
            </div>
          )}
          {campaign.status === 'upcoming' && (
            <div className="mb-6">
              <p className="text-xs font-medium mb-2" style={{ color: 'oklch(60% 0 0)' }}>{relTime(campaign.startsAt)}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Btn variant="primary" size="lg">{cta.primary}</Btn>
            {cta.secondary && (
              <button className="text-sm font-medium underline underline-offset-4 transition-opacity hover:opacity-80"
                style={{ color: 'oklch(75% 0 0)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {cta.secondary}
              </button>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-5">
            {campaign.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 text-xs rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'oklch(78% 0 0)', borderRadius: 'var(--radius-pill)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Campaign artwork placeholder */}
        <div className="hidden md:flex items-center justify-center">
          <div className="relative w-72 h-56 rounded-2xl flex flex-col items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <span className="text-5xl mb-3" aria-hidden>🛍</span>
            <span className="text-2xl font-bold" style={{ color: campaign.accentColor }}>{campaign.discountLabel}</span>
            <span className="text-xs mt-1" style={{ color: 'oklch(55% 0 0)' }}>Limited time offer</span>
          </div>
        </div>
      </div>

      {/* Campaign carousel indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2" role="tablist" aria-label="Campaign slides">
        {CAMPAIGNS.map((c, i) => (
          <button key={c.id} role="tab" aria-selected={i === activeCampaignIdx}
            aria-label={`Campaign ${i + 1}: ${c.title}`}
            onClick={() => dispatch(setActiveCampaign(i))}
            className="transition-all"
            style={{
              width: i === activeCampaignIdx ? '24px' : '8px', height: '8px',
              borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
              background: i === activeCampaignIdx ? campaign.accentColor : 'rgba(255,255,255,0.3)',
            }}/>
        ))}
      </div>
    </section>
  );
}

function PromotionsHero() {
  const dispatch     = useAppDispatch();
  const campaign     = useAppSelector(selActiveCampaign);
  const campaignIdx  = useAppSelector(s => s.deals.activeCampaignIdx);

  // Auto-rotate hero every 8 seconds
  useEffect(() => {
    const id = setInterval(() => {
      dispatch(setActiveCampaign((campaignIdx + 1) % CAMPAIGNS.length));
    }, 8000);
    return () => clearInterval(id);
  }, [campaignIdx, dispatch]);

  return <HeroCampaign campaign={campaign} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// § 12. DEAL CATEGORY NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

function DealCategoryCard({ cat, active, onClick }: { cat: CategoryDeal; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all"
      style={{
        minWidth: '80px',
        background: active ? 'var(--color-brand-50)' : 'var(--color-surface-raised)',
        borderColor: active ? 'var(--color-brand-400)' : 'var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
      }}>
      <span className="text-2xl" aria-hidden>{cat.icon}</span>
      <span className="text-xs font-medium text-center leading-tight"
        style={{ color: active ? 'var(--color-text-brand)' : 'var(--color-text-primary)' }}>
        {cat.name}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        {cat.dealCount} deals
      </span>
    </button>
  );
}

function DealCategoryNavigation() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  return (
    <section aria-label="Browse deals by category">
      <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Browse by Category</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2" role="list">
        {CATEGORY_DEALS.map(cat => (
          <div key={cat.id} role="listitem">
            <DealCategoryCard
              cat={cat}
              active={activeCategory === cat.id}
              onClick={() => setActiveCategory(p => p === cat.id ? null : cat.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 13. FEATURED CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────

function FeaturedCampaignCard({ campaign }: { campaign: Campaign }) {
  const ended = campaign.status === 'ended';
  return (
    <article className="relative overflow-hidden rounded-xl flex flex-col justify-between p-5"
      style={{
        background: campaign.bgColor, minHeight: '180px', opacity: ended ? 0.65 : 1,
        boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-xl)',
      }}>
      <div>
        <CampaignStatusBadge status={campaign.status} />
        <h3 className="text-lg font-bold mt-3 mb-1" style={{ color: '#fff' }}>{campaign.title}</h3>
        <p className="text-sm" style={{ color: campaign.accentColor, fontWeight: 600 }}>{campaign.discountLabel}</p>
        <p className="text-xs mt-1" style={{ color: 'oklch(62% 0 0)' }}>{campaign.subtitle}</p>
      </div>
      <div className="flex items-end justify-between mt-5">
        {!ended && <Countdown targetMs={campaign.endsAt} size="sm" />}
        {ended && <span className="text-xs" style={{ color: 'oklch(50% 0 0)' }}>Campaign ended</span>}
        <Btn variant="outline" size="sm">{ended ? 'View archive' : campaign.ctaLabel}</Btn>
      </div>
    </article>
  );
}

function FeaturedCampaigns() {
  return (
    <section aria-label="Featured campaigns">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Featured Campaigns</h2>
        <button className="text-sm font-medium" style={{ color: 'var(--color-text-brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
          View all →
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CAMPAIGNS.map(c => <FeaturedCampaignCard key={c.id} campaign={c} />)}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 14. DEAL PRODUCT CARD
// ─────────────────────────────────────────────────────────────────────────────

function DealProgressBar({ sold, total }: { sold: number; total: number }) {
  const claimed = pct(sold, total);
  const danger  = claimed > 80;
  if (total <= 0) return null;
  return (
    <div>
      <div className="progress-track">
        <div className={`progress-fill ${danger ? 'progress-fill--danger' : ''}`} style={{ width: claimed + '%' }} role="progressbar" aria-valuenow={claimed} aria-valuemin={0} aria-valuemax={100} aria-label={`${claimed}% claimed`}/>
      </div>
      <p className="text-xs mt-1 font-medium tabular" style={{ color: danger ? 'var(--color-flash)' : 'var(--color-text-tertiary)' }}>
        {danger ? `Only ${total - sold} left` : `${claimed}% claimed`}
      </p>
    </div>
  );
}

function StateBadge({ state }: { state: ProductState }) {
  const map: Record<ProductState, { label: string; variant: 'flash'|'hot'|'new'|'clearance'|'member'|'default' } | null> = {
    active:      null,
    lowStock:    { label: 'Low Stock',   variant: 'flash'     },
    soldOut:     { label: 'Sold Out',    variant: 'default'   },
    endingSoon:  { label: 'Ending Soon', variant: 'flash'     },
    new:         { label: 'New',         variant: 'new'       },
    bestSeller:  { label: 'Best Seller', variant: 'hot'       },
  };
  const cfg = map[state];
  if (!cfg) return null;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

interface DealProductCardProps { product: DealProduct; view?: 'grid' | 'list'; }

const DealProductCard = memo(function DealProductCard({ product, view = 'grid' }: DealProductCardProps) {
  const dispatch = useAppDispatch();
  const inCart = useAppSelector(s => s.cart.items.some(i => i.productId === product.id));
  const soldOut = product.state === 'soldOut';

  if (view === 'list') {
    return (
      <article className="deal-card p-4 flex gap-4" aria-label={product.name}>
        {/* Image */}
        <div className="flex-shrink-0 w-28 h-24 rounded-lg flex items-center justify-center"
          style={{ background: product.imageColor, borderRadius: 'var(--radius-lg)' }}>
          <span className="text-3xl" aria-hidden>📦</span>
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{product.brand}</p>
              <h3 className="text-sm font-medium leading-tight truncate" style={{ color: 'var(--color-text-primary)' }}>{product.name}</h3>
            </div>
            <WishlistButton productId={product.id} />
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <StarRating rating={product.rating} count={product.reviewCount} />
            <StateBadge state={product.state} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-lg font-bold tabular" style={{ color: 'var(--color-text-primary)' }}>{fc(product.dealPrice)}</span>
            <span className="text-sm line-through tabular" style={{ color: 'var(--color-text-tertiary)' }}>{fc(product.originalPrice)}</span>
            <Badge variant="flash">{product.discountPct}% off</Badge>
            <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>Save {savings(product.originalPrice, product.dealPrice)}</span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{product.delivery}</p>
        </div>
        {/* CTA */}
        <div className="flex-shrink-0 flex flex-col gap-2 justify-center">
          <Btn variant={inCart ? 'secondary' : 'primary'} size="sm"
            onClick={() => !soldOut && dispatch(addToCart({ productId: product.id, price: product.dealPrice }))}
            disabled={soldOut}
            ariaLabel={soldOut ? 'Out of stock' : inCart ? 'Added to cart' : 'Add to cart'}>
            {soldOut ? 'Out of Stock' : inCart ? '✓ In Cart' : 'Add to Cart'}
          </Btn>
          <Btn variant="ghost" size="sm">Quick View</Btn>
        </div>
      </article>
    );
  }

  // Grid view
  return (
    <article className="deal-card flex flex-col" aria-label={product.name}>
      {/* Image area */}
      <div className="relative">
        <div className="w-full aspect-square flex items-center justify-center"
          style={{ background: product.imageColor }}>
          <span className="text-5xl" aria-hidden>📦</span>
        </div>
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.badge && <Badge variant={product.dealType === 'flash' ? 'flash' : product.dealType === 'member' ? 'member' : product.dealType === 'clearance' ? 'clearance' : 'hot'}>{product.badge}</Badge>}
          <Badge variant="flash">{product.discountPct}% off</Badge>
        </div>
        <div className="absolute top-2 right-2">
          <WishlistButton productId={product.id} />
        </div>
        {/* Countdown on card */}
        {product.endsAt && product.state === 'endingSoon' && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-center">
            <div className="px-2 py-1 rounded-md" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
              <Countdown targetMs={product.endsAt} size="sm" />
            </div>
          </div>
        )}
      </div>
      {/* Content */}
      <div className="p-3 flex flex-col flex-1 gap-1.5">
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{product.brand}</p>
        <h3 className="text-sm font-medium leading-snug line-clamp-2" style={{ color: 'var(--color-text-primary)', minHeight: '2.5rem' }}>
          {product.name}
        </h3>
        <StarRating rating={product.rating} count={product.reviewCount} />
        {/* Pricing */}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-base font-bold tabular" style={{ color: 'var(--color-text-primary)' }}>{fc(product.dealPrice)}</span>
          <span className="text-xs line-through tabular" style={{ color: 'var(--color-text-tertiary)' }}>{fc(product.originalPrice)}</span>
        </div>
        <p className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>
          Save {savings(product.originalPrice, product.dealPrice)}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{product.delivery}</p>

        {/* Progress */}
        {product.dealType === 'flash' && <DealProgressBar sold={product.soldCount} total={product.totalStock} />}

        {/* CTA */}
        <Btn variant={inCart ? 'secondary' : 'primary'} size="sm" fullWidth
          onClick={() => !soldOut && dispatch(addToCart({ productId: product.id, price: product.dealPrice }))}
          disabled={soldOut}
          ariaLabel={soldOut ? 'Out of stock' : inCart ? 'Added to cart' : 'Add to cart'}
          className="mt-auto">
          {soldOut ? 'Out of Stock' : inCart ? '✓ Added' : 'Add to Cart'}
        </Btn>
      </div>
    </article>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// § 15. FLASH DEALS SECTION
// ─────────────────────────────────────────────────────────────────────────────

function FlashDealsSection() {
  const endsAt = FLASH_PRODUCTS[0].endsAt ?? now + h(4);
  return (
    <section aria-label="Flash deals" className="rounded-xl p-5" style={{ background: 'var(--color-navy-950)', borderRadius: 'var(--radius-xl)' }}>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold" style={{ color: '#fff' }}>⚡ Flash Deals</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full"
                style={{ background: 'var(--color-flash)', color: '#fff', borderRadius: 'var(--radius-pill)' }}>
                LIVE
              </span>
            </div>
            <p className="text-xs" style={{ color: 'oklch(55% 0 0)' }}>Limited inventory at these prices</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'oklch(60% 0 0)' }}>Ends in</span>
            <Countdown targetMs={endsAt} size="md" />
          </div>
        </div>
        <button className="text-sm font-medium" style={{ color: 'var(--color-brand-400)', background: 'none', border: 'none', cursor: 'pointer' }}>
          View all flash deals →
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-2" role="list" aria-label="Flash deal products">
        {FLASH_PRODUCTS.map(p => (
          <div key={p.id} role="listitem" className="flex-shrink-0" style={{ width: '200px' }}>
            <DealProductCard product={p} view="grid" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 16. DEALS TOOLBAR
// ─────────────────────────────────────────────────────────────────────────────

function ActiveFilterChips() {
  const dispatch = useAppDispatch();
  const filters  = useAppSelector(selFilters);
  const chips: { label: string; onRemove: () => void }[] = [];
  filters.dealTypes.forEach(dt => {
    const opt = DEAL_TYPE_OPTIONS.find(o => o.value === dt);
    if (opt) chips.push({ label: opt.label, onRemove: () => dispatch(toggleDealType(dt)) });
  });
  filters.categories.forEach(cat =>
    chips.push({ label: cat, onRemove: () => dispatch(toggleCategory(cat)) })
  );
  if (filters.discountMin !== null) {
    chips.push({ label: `${filters.discountMin}%+ off`, onRemove: () => dispatch(setDiscountMin(null)) });
  }
  if (filters.inStockOnly) chips.push({ label: 'In Stock',      onRemove: () => dispatch(toggleInStock()) });
  if (filters.freeShipping) chips.push({ label: 'Free Shipping', onRemove: () => dispatch(toggleFreeShip()) });

  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Active filters">
      {chips.map(chip => (
        <div key={chip.label} role="listitem"
          className="flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-medium"
          style={{ background: 'var(--color-brand-50)', color: 'var(--color-text-brand)', border: '1px solid var(--color-brand-200)', borderRadius: 'var(--radius-pill)' }}>
          {chip.label}
          <button onClick={chip.onRemove} aria-label={`Remove ${chip.label} filter`}
            className="w-4 h-4 rounded-full flex items-center justify-center transition-colors hover:bg-brand-200"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-brand)' }}>
            <svg viewBox="0 0 8 8" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" d="M1 1l6 6M7 1L1 7"/>
            </svg>
          </button>
        </div>
      ))}
      <button onClick={() => dispatch(clearFilters())}
        className="text-xs font-medium underline underline-offset-2"
        style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
        Clear all
      </button>
    </div>
  );
}

function DealsToolbar({ count }: { count: number }) {
  const dispatch   = useAppDispatch();
  const sort       = useAppSelector(selSort);
  const viewMode   = useAppSelector(selViewMode);
  const filterCount = useAppSelector(selActiveFilterCount);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Result count */}
        <p className="text-sm flex-1" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="font-semibold tabular" style={{ color: 'var(--color-text-primary)' }}>{count.toLocaleString()}</span> active deals
        </p>
        {/* Mobile filter button */}
        <button onClick={() => dispatch(toggleFilterDrawer())}
          className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-md)' }}>
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h14M6 10h8M9 15h2"/>
          </svg>
          Filters{filterCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--color-brand-500)', color: '#0a0f1e' }}>{filterCount}</span>}
        </button>
        {/* Sort */}
        <label htmlFor="sort-select" className="sr-only">Sort deals</label>
        <select id="sort-select" value={sort} onChange={e => dispatch(setSort(e.target.value as SortOption))}
          className="px-3 py-2 text-sm rounded-lg border cursor-pointer"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-md)' }}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {/* View mode */}
        <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }} role="group" aria-label="View mode">
          {(['grid', 'list'] as ViewMode[]).map(mode => (
            <button key={mode} onClick={() => dispatch(setViewMode(mode))} aria-pressed={viewMode === mode}
              aria-label={mode === 'grid' ? 'Grid view' : 'List view'}
              className="w-9 h-9 flex items-center justify-center transition-colors"
              style={{ background: viewMode === mode ? 'var(--color-brand-50)' : 'var(--color-surface-raised)', border: 'none', cursor: 'pointer', color: viewMode === mode ? 'var(--color-text-brand)' : 'var(--color-text-tertiary)' }}>
              {mode === 'grid'
                ? <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor" aria-hidden><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
                : <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor" aria-hidden><rect x="1" y="2" width="14" height="2.5" rx="1"/><rect x="1" y="6.75" width="14" height="2.5" rx="1"/><rect x="1" y="11.5" width="14" height="2.5" rx="1"/></svg>}
            </button>
          ))}
        </div>
      </div>
      <ActiveFilterChips />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 17. FILTER SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-sm font-semibold mb-0"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)' }}
        aria-expanded={open}>
        {title}
        <svg viewBox="0 0 10 6" className="w-2.5 h-1.5 transition-transform" style={{ transform: open ? 'rotate(180deg)' : '' }} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4 4-4"/>
        </svg>
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

function CheckboxFilter({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  const id = 'filter-' + label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 cursor-pointer group">
      <input type="checkbox" id={id} checked={checked} onChange={onChange}
        className="w-4 h-4 rounded cursor-pointer accent-brand-500" style={{ accentColor: 'var(--color-brand-500)' }}/>
      <span className="text-sm transition-colors" style={{ color: checked ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
        {label}
      </span>
    </label>
  );
}

function DealFilterSidebar() {
  const dispatch = useAppDispatch();
  const filters  = useAppSelector(selFilters);
  const filterCount = useAppSelector(selActiveFilterCount);
  return (
    <aside aria-label="Deal filters" className="hidden lg:block sticky top-28 self-start" style={{ width: 'var(--sidebar-w)', flexShrink: 0 }}>
      <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius-xl)' }}>
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Filters {filterCount > 0 && <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full font-bold" style={{ background: 'var(--color-brand-500)', color: '#0a0f1e' }}>{filterCount}</span>}
          </h2>
          {filterCount > 0 && (
            <button onClick={() => dispatch(clearFilters())} className="text-xs font-medium"
              style={{ color: 'var(--color-text-brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear all
            </button>
          )}
        </div>

        <FilterSection title="Deal Type">
          {DEAL_TYPE_OPTIONS.map(opt => (
            <CheckboxFilter key={opt.value} label={opt.label}
              checked={filters.dealTypes.includes(opt.value)}
              onChange={() => dispatch(toggleDealType(opt.value))} />
          ))}
        </FilterSection>

        <FilterSection title="Category">
          {CATEGORY_OPTIONS.map(cat => (
            <CheckboxFilter key={cat} label={cat}
              checked={filters.categories.includes(cat)}
              onChange={() => dispatch(toggleCategory(cat))} />
          ))}
        </FilterSection>

        <FilterSection title="Discount">
          {DISCOUNT_OPTIONS.map(opt => (
            <CheckboxFilter key={opt.value} label={opt.label}
              checked={filters.discountMin === opt.value}
              onChange={() => dispatch(setDiscountMin(filters.discountMin === opt.value ? null : opt.value))} />
          ))}
        </FilterSection>

        <FilterSection title="Availability">
          <CheckboxFilter label="In Stock" checked={filters.inStockOnly} onChange={() => dispatch(toggleInStock())} />
          <CheckboxFilter label="Free Delivery" checked={filters.freeShipping} onChange={() => dispatch(toggleFreeShip())} />
        </FilterSection>
      </div>
    </aside>
  );
}

function FilterDrawer() {
  const dispatch = useAppDispatch();
  const open     = useAppSelector(selDrawerOpen);
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Filters">
      <div className="absolute inset-0 bg-black/50" onClick={() => dispatch(closeFilterDrawer())} aria-hidden/>
      <div className="relative ml-auto h-full w-80 overflow-y-auto p-4 flex flex-col gap-0"
        style={{ background: 'var(--color-surface-raised)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Filters</h2>
          <button onClick={() => dispatch(closeFilterDrawer())} aria-label="Close filters"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M14 6L6 14"/>
            </svg>
          </button>
        </div>
        <DealFilterSidebar />
        <Btn variant="primary" fullWidth onClick={() => dispatch(closeFilterDrawer())} className="mt-4">
          Show Results
        </Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 18. DEALS GRID / LISTING
// ─────────────────────────────────────────────────────────────────────────────

function DealsListing() {
  const products = useAppSelector(selFilteredProducts);
  const viewMode = useAppSelector(selViewMode);

  return (
    <section aria-label="All deals" className="flex gap-6 items-start">
      <DealFilterSidebar />
      <div className="flex-1 min-w-0 space-y-4">
        <DealsToolbar count={products.length} />
        {products.length === 0 ? (
          <div className="py-20 text-center rounded-xl" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <p className="text-4xl mb-3" aria-hidden>🔍</p>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>No deals match your filters</p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-tertiary)' }}>Try adjusting or clearing your filters to see more deals.</p>
            <Btn variant="secondary" onClick={() => {/* dispatch clearFilters */}}>Clear Filters</Btn>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" role="list" aria-label="Deal products">
            {products.map(p => (
              <div key={p.id} role="listitem"><DealProductCard product={p} view="grid" /></div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3" role="list" aria-label="Deal products">
            {products.map(p => (
              <div key={p.id} role="listitem"><DealProductCard product={p} view="list" /></div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 19. COUPONS SECTION
// ─────────────────────────────────────────────────────────────────────────────

function CouponCard({ coupon }: { coupon: Coupon }) {
  const dispatch = useAppDispatch();
  const copied   = useAppSelector(selCopied);
  const isCopied = copied === coupon.id;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(coupon.code).catch(() => {});
    dispatch(setCopiedCoupon(coupon.id));
    setTimeout(() => dispatch(setCopiedCoupon(null)), 2500);
  }, [coupon.code, coupon.id, dispatch]);

  return (
    <article className="rounded-xl border overflow-hidden flex flex-col"
      style={{ background: 'var(--color-surface-raised)', borderColor: coupon.isEligible ? 'var(--color-brand-200)' : 'var(--color-border)', boxShadow: 'var(--shadow-xs)', borderRadius: 'var(--radius-xl)' }}>
      {/* Colored stripe */}
      <div className="h-1.5 w-full" style={{ background: coupon.isEligible ? 'var(--color-brand-500)' : 'var(--color-border)' }}/>
      <div className="p-4 flex-1">
        <div className="flex items-start justify-between mb-2">
          <span className="text-2xl font-bold" style={{ color: coupon.isEligible ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
            {coupon.discountLabel}
          </span>
          {!coupon.isEligible && <Badge variant="default">Not eligible</Badge>}
          {coupon.isEligible && <Badge variant="new">Eligible</Badge>}
        </div>
        <div className="font-mono text-sm font-bold px-3 py-1.5 rounded-md inline-block mb-3"
          style={{ background: 'var(--color-surface-sunken)', color: 'var(--color-text-primary)', letterSpacing: '0.08em', borderRadius: 'var(--radius-md)' }}>
          {coupon.code}
        </div>
        <ul className="space-y-1 text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
          <li>Min. order: {fc(coupon.minOrder)}</li>
          {coupon.maxDiscount && <li>Max. discount: {fc(coupon.maxDiscount)}</li>}
          <li>Categories: {coupon.categories.join(', ')}</li>
          <li style={{ color: 'var(--color-flash)' }}>{expireLabel(coupon.expiresAt)}</li>
        </ul>
      </div>
      <div className="px-4 pb-4">
        <Btn variant={isCopied ? 'secondary' : coupon.isEligible ? 'primary' : 'outline'} size="sm" fullWidth
          onClick={handleCopy} ariaLabel={isCopied ? 'Code copied' : `Copy coupon code ${coupon.code}`}>
          {isCopied ? '✓ Copied!' : 'Copy Code'}
        </Btn>
      </div>
    </article>
  );
}

function CouponsSection() {
  return (
    <section aria-label="Available coupons">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Coupon Deals</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{COUPONS.length} coupons available today</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COUPONS.map(c => <CouponCard key={c.id} coupon={c} />)}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 20. BRAND DEALS SECTION
// ─────────────────────────────────────────────────────────────────────────────

function BrandDealCard({ deal }: { deal: BrandDeal }) {
  return (
    <article className="deal-card p-4 flex flex-col gap-3" aria-label={`${deal.brand} deals`}>
      <div className="w-full h-16 rounded-lg flex items-center justify-center font-bold text-lg"
        style={{ background: deal.color, color: '#fff', borderRadius: 'var(--radius-lg)' }}>
        {deal.brand}
      </div>
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{deal.discountLabel}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{deal.tagline}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          {deal.productCount} products · {expireLabel(deal.validUntil)}
        </p>
      </div>
      <Btn variant="outline" size="sm" fullWidth>Shop {deal.brand} Deals</Btn>
    </article>
  );
}

function BrandDealsSection() {
  return (
    <section aria-label="Brand deals">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Shop by Brand</h2>
        <button className="text-sm font-medium" style={{ color: 'var(--color-text-brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
          All brands →
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {BRAND_DEALS.map(b => <BrandDealCard key={b.id} deal={b} />)}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 21. UPCOMING DEALS SECTION
// ─────────────────────────────────────────────────────────────────────────────

function UpcomingDealCard({ deal }: { deal: UpcomingDeal }) {
  const dispatch  = useAppDispatch();
  const notified  = useAppSelector(selNotified);
  const isNotified = notified.includes(deal.id);

  return (
    <article className="deal-card p-4 flex items-center gap-4" aria-label={`Upcoming: ${deal.title}`}>
      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: deal.color, borderRadius: 'var(--radius-xl)' }}
        aria-hidden>🗓</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{deal.title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{deal.subtitle}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="new">{deal.discountLabel}</Badge>
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{relTime(deal.startsAt)}</span>
        </div>
      </div>
      <button onClick={() => dispatch(toggleNotified(deal.id))}
        aria-pressed={isNotified}
        aria-label={isNotified ? `Stop notifications for ${deal.title}` : `Notify me when ${deal.title} starts`}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all"
        style={{
          background: isNotified ? 'var(--color-brand-50)' : 'transparent',
          borderColor: isNotified ? 'var(--color-brand-400)' : 'var(--color-border)',
          color: isNotified ? 'var(--color-text-brand)' : 'var(--color-text-secondary)',
          borderRadius: 'var(--radius-md)',
        }}>
        {isNotified ? '🔔 Notified' : '🔔 Notify Me'}
      </button>
    </article>
  );
}

function UpcomingDealsSection() {
  return (
    <section aria-label="Upcoming deals">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Coming Soon</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>Get notified before they start</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {UPCOMING_DEALS.map(u => <UpcomingDealCard key={u.id} deal={u} />)}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 22. MEMBERSHIP SECTION
// ─────────────────────────────────────────────────────────────────────────────

function MembershipSection() {
  const benefits = [
    { icon: '🏷', title: 'Member-only prices', desc: 'Exclusive deals up to 20% below standard sale prices' },
    { icon: '🚀', title: 'Early access',        desc: 'Shop new deals 24 hours before everyone else' },
    { icon: '🚚', title: 'Free delivery',       desc: 'No minimum order for members on all deliveries' },
    { icon: '💳', title: '5% cashback',        desc: 'Earn on every purchase, redeemable any time' },
  ];
  return (
    <section aria-label="Membership benefits" className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-member-subtle)', border: '1px solid var(--color-member)', borderRadius: 'var(--radius-xl)' }}>
      <div className="p-6 md:p-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <Badge variant="member" className="mb-2">Members Only</Badge>
            <h2 className="text-xl font-bold mt-2" style={{ color: 'var(--color-text-primary)' }}>Members Get More</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Join ShopDeals Premium for exclusive access and savings.
            </p>
          </div>
          <Btn variant="primary" size="md">Join for $9.99/month</Btn>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map(b => (
            <div key={b.title} className="p-4 rounded-xl"
              style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
              <span className="text-2xl mb-2 block" aria-hidden>{b.icon}</span>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{b.title}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 23. PAYMENT OFFERS SECTION
// ─────────────────────────────────────────────────────────────────────────────

function PaymentOffersSection() {
  const offers = [
    { icon: '💳', title: '10% instant discount', desc: 'On purchases with Citi, HDFC, or Axis bank cards. Min. order $50.' },
    { icon: '📅', title: 'No-cost installments',  desc: '0% EMI for 3–24 months on purchases over $200 with select cards.' },
    { icon: '💰', title: '$15 cashback',           desc: 'On first purchase via ShopPay wallet. New users only, T&C apply.' },
  ];
  return (
    <section aria-label="Payment and bank offers">
      <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Payment Offers</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {offers.map(o => (
          <div key={o.title} className="deal-card p-4 flex gap-3 items-start">
            <span className="text-xl flex-shrink-0" aria-hidden>{o.icon}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{o.title}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{o.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 24. TRUST & TERMS
// ─────────────────────────────────────────────────────────────────────────────

function TrustSection() {
  const signals = [
    { icon: '🔒', label: 'Secure Payment',       detail: 'SSL encrypted checkout' },
    { icon: '↩',  label: 'Easy Returns',          detail: '30-day hassle-free returns' },
    { icon: '⚡',  label: 'Fast Shipping',         detail: 'Next-day on eligible orders' },
    { icon: '🏆',  label: '100% Genuine Products', detail: 'Official brand partners' },
  ];
  return (
    <section aria-label="Trust signals" className="border-t border-b py-6" style={{ borderColor: 'var(--color-border)' }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {signals.map(s => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-xl flex-shrink-0" aria-hidden>{s.icon}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{s.label}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DealTermsSection() {
  return (
    <section aria-label="Deal terms and conditions">
      <div className="rounded-xl p-5 text-xs space-y-2"
        style={{ background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', color: 'var(--color-text-tertiary)' }}>
        <p className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Terms & Conditions</p>
        <p>All prices shown include applicable taxes. Deals are subject to availability and may change without notice. Flash deal prices apply only while stock lasts. Coupon codes cannot be combined unless explicitly stated. ShopDeals reserves the right to cancel orders placed using fraudulent payment methods or coupons.</p>
        <p>Prices and discounts are compared to the highest price in the last 30 days. Savings shown are indicative. Delivery timelines are estimates and may vary by location. Free delivery threshold applies to the cart total before any discounts.</p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 25. FOOTER
// ─────────────────────────────────────────────────────────────────────────────

function EcommerceFooter() {
  const cols = [
    { title: 'ShopDeals',    links: ['About Us','Careers','Press','Blog','Investor Relations'] },
    { title: 'Help',         links: ['Help Center','Returns & Refunds','Track Order','Contact Us','Report a Product'] },
    { title: 'Deals',        links: ["Today's Deals",'Flash Deals','Membership Deals','Coupon Hub','Gift Cards'] },
    { title: 'Sellers',      links: ['Sell on ShopDeals','Seller Central','Advertising','Affiliate Program','Partner Portal'] },
  ];
  return (
    <footer role="contentinfo" style={{ background: 'var(--color-navy-950)', color: 'oklch(60% 0 0)' }}>
      <div className="max-w-screen-xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {cols.map(col => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-sm font-semibold mb-4" style={{ color: 'oklch(80% 0 0)' }}>{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm transition-colors hover:underline" style={{ color: 'oklch(58% 0 0)' }}>{link}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--color-navy-800)' }}>
          <p className="text-xs" style={{ color: 'oklch(45% 0 0)' }}>
            © {new Date().getFullYear()} ShopDeals Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'oklch(45% 0 0)' }}>
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">Cookie Settings</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 26. PAGE COMPOSITION
// ─────────────────────────────────────────────────────────────────────────────

function DealsPromotionContent() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface-base)' }}>
      <EcommerceHeader />
      <FilterDrawer />

      <div className="max-w-screen-xl mx-auto px-4">
        <DealsBreadcrumbs />

        {/* Main page stack */}
        <div className="space-y-10 pb-16">

          {/* § Hero */}
          <PromotionsHero />

          {/* § Category nav */}
          <DealCategoryNavigation />

          {/* § Flash deals — dark band full-width feel */}
          <FlashDealsSection />

          {/* § Featured campaigns */}
          <FeaturedCampaigns />

          {/* § Coupons */}
          <CouponsSection />

          {/* § Brand deals */}
          <BrandDealsSection />

          {/* § All deals with sidebar + grid/list */}
          <DealsListing />

          {/* § Upcoming */}
          <UpcomingDealsSection />

          {/* § Membership */}
          <MembershipSection />

          {/* § Payment offers */}
          <PaymentOffersSection />

          {/* § Trust */}
          <TrustSection />

          {/* § Terms */}
          <DealTermsSection />

        </div>
      </div>

      <EcommerceFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § 27. EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default function DealsPromotionPage() {
  return (
    <Provider store={store}>
      <DealsPromotionContent />
    </Provider>
  );
}