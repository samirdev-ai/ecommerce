// ============================================================================
// EcommerceHomePage.tsx
// ============================================================================

'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react';
import {
  configureStore,
  createSlice,
  createSelector,
  PayloadAction,
} from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';

// ============================================================================
// TYPES & ENUMS
// ============================================================================

export enum ProductState {
  Default = 'default',
  Discounted = 'discounted',
  LowStock = 'low-stock',
  OutOfStock = 'out-of-stock',
  New = 'new',
  BestSeller = 'best-seller',
}

export enum ThemeMode {
  Light = 'light',
  Dark = 'dark',
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  rating: number;
  reviewCount: number;
  state: ProductState;
  stock: number;
  maxStock: number;
  installment?: string;
  badge?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  productCount: number;
}

export interface Brand {
  id: string;
  name: string;
  category: string;
  logo: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaLink: string;
  secondaryCta?: string;
  secondaryCtaLink?: string;
  image: string;
  bgColor: string;
  textColor: string;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  bgColor: string;
}

export interface TrustFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  hasDropdown?: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface FlashDeal {
  id: string;
  product: Product;
  endsAt: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FREE_SHIPPING_THRESHOLD = 49;
const CAROUSEL_INTERVAL_MS = 6000;
const MAX_RECENTLY_VIEWED = 6;

const NAV_ITEMS: NavigationItem[] = [
  { id: 'nav-categories', label: 'Categories', href: '#categories', hasDropdown: true },
  { id: 'nav-deals', label: "Today's Deals", href: '#flash-deals' },
  { id: 'nav-new', label: 'New Arrivals', href: '#new-arrivals' },
  { id: 'nav-best', label: 'Best Sellers', href: '#best-sellers' },
  { id: 'nav-trending', label: 'Trending', href: '#trending' },
  { id: 'nav-brands', label: 'Brands', href: '#brands', hasDropdown: true },
  { id: 'nav-offers', label: 'Offers', href: '#promotions' },
];

const TRUST_FEATURES: TrustFeature[] = [
  { id: 'trust-shipping', icon: '🚚', title: 'Free Shipping', description: 'On orders over $49' },
  { id: 'trust-payments', icon: '🔒', title: 'Secure Payments', description: '256-bit SSL encryption' },
  { id: 'trust-returns', icon: '↩️', title: 'Easy Returns', description: '30-day return policy' },
  { id: 'trust-protection', icon: '🛡️', title: 'Buyer Protection', description: 'Full refund guarantee' },
  { id: 'trust-support', icon: '💬', title: '24/7 Support', description: 'Chat, email & phone' },
];

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-1',
    title: 'Summer Tech Fest',
    subtitle: 'Up to 40% off on premium electronics',
    cta: 'Shop Electronics',
    ctaLink: '#electronics',
    secondaryCta: 'View Deals',
    secondaryCtaLink: '#flash-deals',
    image: '🎧',
    bgColor: 'oklch(0.25 0.08 250)',
    textColor: 'oklch(0.98 0 0)',
  },
  {
    id: 'hero-2',
    title: 'New Season Fashion',
    subtitle: 'Discover the latest trends from top brands',
    cta: 'Explore Fashion',
    ctaLink: '#fashion',
    secondaryCta: 'New Arrivals',
    secondaryCtaLink: '#new-arrivals',
    image: '👗',
    bgColor: 'oklch(0.30 0.06 330)',
    textColor: 'oklch(0.98 0 0)',
  },
  {
    id: 'hero-3',
    title: 'Home & Living Sale',
    subtitle: 'Transform your space for less',
    cta: 'Shop Home',
    ctaLink: '#home',
    image: '🛋️',
    bgColor: 'oklch(0.28 0.05 160)',
    textColor: 'oklch(0.98 0 0)',
  },
];

const CATEGORIES: Category[] = [
  { id: 'cat-electronics', name: 'Electronics', icon: '💻', productCount: 12450 },
  { id: 'cat-fashion', name: 'Fashion', icon: '👔', productCount: 28300 },
  { id: 'cat-home', name: 'Home & Garden', icon: '🏡', productCount: 9870 },
  { id: 'cat-beauty', name: 'Beauty', icon: '💄', productCount: 6420 },
  { id: 'cat-sports', name: 'Sports', icon: '⚽', productCount: 5310 },
  { id: 'cat-toys', name: 'Toys & Games', icon: '🎮', productCount: 7890 },
  { id: 'cat-automotive', name: 'Automotive', icon: '🚗', productCount: 3450 },
  { id: 'cat-books', name: 'Books', icon: '📚', productCount: 15600 },
];

const BRANDS: Brand[] = [
  { id: 'brand-samsung', name: 'Samsung', category: 'Electronics', logo: '📱' },
  { id: 'brand-nike', name: 'Nike', category: 'Fashion', logo: '👟' },
  { id: 'brand-apple', name: 'Apple', category: 'Electronics', logo: '🍎' },
  { id: 'brand-sony', name: 'Sony', category: 'Electronics', logo: '🎮' },
  { id: 'brand-adidas', name: 'Adidas', category: 'Fashion', logo: '👕' },
  { id: 'brand-lg', name: 'LG', category: 'Home', logo: '📺' },
];

const PROMOTIONS: Promotion[] = [
  { id: 'promo-electronics', title: 'Electronics', subtitle: 'Top deals on gadgets', cta: 'Shop Now', image: '🖥️', bgColor: 'oklch(0.92 0.03 250)' },
  { id: 'promo-fashion', title: 'Fashion', subtitle: 'Up to 60% off', cta: 'Explore', image: '👜', bgColor: 'oklch(0.92 0.03 330)' },
  { id: 'promo-home', title: 'Home', subtitle: 'Refresh your space', cta: 'Discover', image: '🪑', bgColor: 'oklch(0.92 0.03 160)' },
  { id: 'promo-beauty', title: 'Beauty', subtitle: 'Glow up savings', cta: 'Shop Now', image: '🧴', bgColor: 'oklch(0.92 0.03 30)' },
  { id: 'promo-gaming', title: 'Gaming', subtitle: 'Level up your setup', cta: 'Browse', image: '🕹️', bgColor: 'oklch(0.92 0.03 280)' },
];

// ============================================================================
// MOCK PRODUCT DATA
// ============================================================================

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Samsung Galaxy S24 Ultra 256GB',
    brand: 'Samsung',
    category: 'Electronics',
    image: '📱',
    price: 1199.99,
    originalPrice: 1419.99,
    discountPercent: 15,
    rating: 4.8,
    reviewCount: 3421,
    state: ProductState.Discounted,
    stock: 45,
    maxStock: 100,
    installment: 'or $49.99/mo for 24 mo',
    badge: 'Top Pick',
  },
  {
    id: 'prod-2',
    name: 'Apple MacBook Pro 14" M3 Pro',
    brand: 'Apple',
    category: 'Electronics',
    image: '💻',
    price: 1899.00,
    originalPrice: 2199.00,
    discountPercent: 14,
    rating: 4.9,
    reviewCount: 1876,
    state: ProductState.Discounted,
    stock: 12,
    maxStock: 50,
    installment: 'or $79.12/mo for 24 mo',
    badge: 'Best Seller',
  },
  {
    id: 'prod-3',
    name: 'Nike Air Max 270 React',
    brand: 'Nike',
    category: 'Fashion',
    image: '👟',
    price: 129.99,
    originalPrice: 169.99,
    discountPercent: 24,
    rating: 4.6,
    reviewCount: 8920,
    state: ProductState.Discounted,
    stock: 230,
    maxStock: 500,
    badge: 'Trending',
  },
  {
    id: 'prod-4',
    name: 'Sony WH-1000XM5 Wireless Headphones',
    brand: 'Sony',
    category: 'Electronics',
    image: '🎧',
    price: 348.00,
    originalPrice: 399.99,
    discountPercent: 13,
    rating: 4.9,
    reviewCount: 12100,
    state: ProductState.BestSeller,
    stock: 8,
    maxStock: 200,
    installment: 'or $14.50/mo for 24 mo',
    badge: 'Best Seller',
  },
  {
    id: 'prod-5',
    name: 'LG C3 65" OLED evo 4K Smart TV',
    brand: 'LG',
    category: 'Electronics',
    image: '📺',
    price: 1596.99,
    originalPrice: 2499.99,
    discountPercent: 36,
    rating: 4.8,
    reviewCount: 4520,
    state: ProductState.Discounted,
    stock: 3,
    maxStock: 30,
    installment: 'or $66.54/mo for 24 mo',
    badge: 'Low Stock',
  },
  {
    id: 'prod-6',
    name: 'Adidas Ultraboost Light Running Shoes',
    brand: 'Adidas',
    category: 'Fashion',
    image: '👟',
    price: 159.99,
    originalPrice: 189.99,
    discountPercent: 16,
    rating: 4.7,
    reviewCount: 5670,
    state: ProductState.New,
    stock: 400,
    maxStock: 500,
    badge: 'New',
  },
  {
    id: 'prod-7',
    name: 'Dyson V15 Detect Cordless Vacuum',
    brand: 'Dyson',
    category: 'Home & Garden',
    image: '🧹',
    price: 649.99,
    originalPrice: 749.99,
    discountPercent: 13,
    rating: 4.8,
    reviewCount: 2340,
    state: ProductState.Discounted,
    stock: 25,
    maxStock: 80,
    installment: 'or $27.08/mo for 24 mo',
  },
  {
    id: 'prod-8',
    name: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker',
    brand: 'Instant Pot',
    category: 'Home & Garden',
    image: '🍲',
    price: 89.95,
    originalPrice: 129.95,
    discountPercent: 31,
    rating: 4.7,
    reviewCount: 45200,
    state: ProductState.BestSeller,
    stock: 1200,
    maxStock: 2000,
    badge: 'Best Seller',
  },
  {
    id: 'prod-9',
    name: 'Canon EOS R6 Mark II Mirrorless Camera',
    brand: 'Canon',
    category: 'Electronics',
    image: '📷',
    price: 2499.00,
    originalPrice: 2799.00,
    discountPercent: 11,
    rating: 4.9,
    reviewCount: 890,
    state: ProductState.Discounted,
    stock: 5,
    maxStock: 20,
    installment: 'or $104.12/mo for 24 mo',
    badge: 'Premium',
  },
  {
    id: 'prod-10',
    name: 'Levi\'s 501 Original Fit Jeans',
    brand: "Levi's",
    category: 'Fashion',
    image: '👖',
    price: 59.99,
    originalPrice: 79.99,
    discountPercent: 25,
    rating: 4.5,
    reviewCount: 18900,
    state: ProductState.Discounted,
    stock: 800,
    maxStock: 1000,
  },
  {
    id: 'prod-11',
    name: 'Nintendo Switch OLED Model',
    brand: 'Nintendo',
    category: 'Toys & Games',
    image: '🎮',
    price: 349.99,
    originalPrice: 399.99,
    discountPercent: 13,
    rating: 4.9,
    reviewCount: 23400,
    state: ProductState.BestSeller,
    stock: 0,
    maxStock: 100,
    badge: 'Out of Stock',
  },
  {
    id: 'prod-12',
    name: 'KitchenAid Artisan Stand Mixer 5qt',
    brand: 'KitchenAid',
    category: 'Home & Garden',
    image: '🥣',
    price: 379.99,
    originalPrice: 449.99,
    discountPercent: 16,
    rating: 4.9,
    reviewCount: 15600,
    state: ProductState.Discounted,
    stock: 18,
    maxStock: 60,
    installment: 'or $15.83/mo for 24 mo',
  },
  {
    id: 'prod-13',
    name: 'Samsung 49" Odyssey G9 Gaming Monitor',
    brand: 'Samsung',
    category: 'Electronics',
    image: '🖥️',
    price: 1299.99,
    originalPrice: 1599.99,
    discountPercent: 19,
    rating: 4.7,
    reviewCount: 1120,
    state: ProductState.Discounted,
    stock: 7,
    maxStock: 40,
    installment: 'or $54.17/mo for 24 mo',
    badge: 'Gaming',
  },
  {
    id: 'prod-14',
    name: 'Bose QuietComfort Earbuds II',
    brand: 'Bose',
    category: 'Electronics',
    image: '🎧',
    price: 249.00,
    originalPrice: 299.00,
    discountPercent: 17,
    rating: 4.6,
    reviewCount: 6780,
    state: ProductState.Discounted,
    stock: 55,
    maxStock: 200,
  },
  {
    id: 'prod-15',
    name: 'Lululemon Align High-Rise Leggings 28"',
    brand: 'Lululemon',
    category: 'Fashion',
    image: '🩳',
    price: 98.00,
    originalPrice: 118.00,
    discountPercent: 17,
    rating: 4.8,
    reviewCount: 32100,
    state: ProductState.BestSeller,
    stock: 300,
    maxStock: 500,
    badge: 'Best Seller',
  },
  {
    id: 'prod-16',
    name: 'Weber Spirit II E-310 3-Burner Gas Grill',
    brand: 'Weber',
    category: 'Home & Garden',
    image: '🍖',
    price: 499.00,
    originalPrice: 569.00,
    discountPercent: 12,
    rating: 4.7,
    reviewCount: 4560,
    state: ProductState.Discounted,
    stock: 14,
    maxStock: 50,
  },
];

// ============================================================================
// REDUX TOOLKIT — SLICES
// ============================================================================

interface CartState {
  items: CartItem[];
}

const initialCartState: CartState = { items: [] };

const cartSlice = createSlice({
  name: 'cart',
  initialState: initialCartState,
  reducers: {
    addToCart(state, action: PayloadAction<{ productId: string; quantity?: number }>) {
      const { productId, quantity = 1 } = action.payload;
      const existing = state.items.find((i) => i.productId === productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.items.push({ productId, quantity });
      }
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    updateQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const item = state.items.find((i) => i.productId === action.payload.productId);
      if (item) {
        item.quantity = Math.max(1, action.payload.quantity);
      }
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

interface WishlistState {
  productIds: string[];
}

const initialWishlistState: WishlistState = { productIds: [] };

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: initialWishlistState,
  reducers: {
    toggleWishlist(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.productIds.indexOf(id);
      if (idx >= 0) {
        state.productIds.splice(idx, 1);
      } else {
        state.productIds.push(id);
      }
    },
    clearWishlist(state) {
      state.productIds = [];
    },
  },
});

interface SearchState {
  query: string;
  isFocused: boolean;
  recentSearches: string[];
}

const initialSearchState: SearchState = {
  query: '',
  isFocused: false,
  recentSearches: ['wireless headphones', 'running shoes', '4k tv'],
};

const searchSlice = createSlice({
  name: 'search',
  initialState: initialSearchState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    setSearchFocused(state, action: PayloadAction<boolean>) {
      state.isFocused = action.payload;
    },
    addRecentSearch(state, action: PayloadAction<string>) {
      const q = action.payload.trim();
      if (!q) return;
      state.recentSearches = [q, ...state.recentSearches.filter((s) => s !== q)].slice(0, 5);
    },
    clearRecentSearches(state) {
      state.recentSearches = [];
    },
  },
});

interface UIState {
  theme: ThemeMode;
  isMobileMenuOpen: boolean;
  isCartDrawerOpen: boolean;
  activeHeroSlide: number;
}

const initialUIState: UIState = {
  theme: ThemeMode.Light,
  isMobileMenuOpen: false,
  isCartDrawerOpen: false,
  activeHeroSlide: 0,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: initialUIState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
    toggleTheme(state) {
      state.theme = state.theme === ThemeMode.Light ? ThemeMode.Dark : ThemeMode.Light;
    },
    toggleMobileMenu(state) {
      state.isMobileMenuOpen = !state.isMobileMenuOpen;
    },
    setMobileMenuOpen(state, action: PayloadAction<boolean>) {
      state.isMobileMenuOpen = action.payload;
    },
    toggleCartDrawer(state) {
      state.isCartDrawerOpen = !state.isCartDrawerOpen;
    },
    setCartDrawerOpen(state, action: PayloadAction<boolean>) {
      state.isCartDrawerOpen = action.payload;
    },
    setActiveHeroSlide(state, action: PayloadAction<number>) {
      state.activeHeroSlide = action.payload;
    },
  },
});

interface UserPrefsState {
  location: string;
  currency: string;
}

const initialUserPrefsState: UserPrefsState = {
  location: 'New York, 10001',
  currency: 'USD',
};

const userPrefsSlice = createSlice({
  name: 'userPrefs',
  initialState: initialUserPrefsState,
  reducers: {
    setLocation(state, action: PayloadAction<string>) {
      state.location = action.payload;
    },
  },
});

// ============================================================================
// REDUX STORE
// ============================================================================

export const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
    wishlist: wishlistSlice.reducer,
    search: searchSlice.reducer,
    ui: uiSlice.reducer,
    userPrefs: userPrefsSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
} = cartSlice.actions;

export const { toggleWishlist, clearWishlist } = wishlistSlice.actions;

export const {
  setSearchQuery,
  setSearchFocused,
  addRecentSearch,
  clearRecentSearches,
} = searchSlice.actions;

export const {
  setTheme,
  toggleTheme,
  toggleMobileMenu,
  setMobileMenuOpen,
  toggleCartDrawer,
  setCartDrawerOpen,
  setActiveHeroSlide,
} = uiSlice.actions;

export const { setLocation } = userPrefsSlice.actions;

// ============================================================================
// SELECTORS
// ============================================================================

const selectCartItems = (state: RootState) => state.cart.items;
const selectWishlistIds = (state: RootState) => state.wishlist.productIds;
const selectSearchState = (state: RootState) => state.search;
const selectUIState = (state: RootState) => state.ui;
const selectUserPrefs = (state: RootState) => state.userPrefs;

export const selectCartCount = createSelector(
  [selectCartItems],
  (items) => items.reduce((sum, i) => sum + i.quantity, 0),
);

export const selectCartTotal = createSelector(
  [selectCartItems],
  (items) =>
    items.reduce((sum, i) => {
      const product = MOCK_PRODUCTS.find((p) => p.id === i.productId);
      return sum + (product ? product.price * i.quantity : 0);
    }, 0),
);

export const selectIsWishlisted = (productId: string) => (state: RootState) =>
  state.wishlist.productIds.includes(productId);

export const selectWishlistCount = createSelector(
  [selectWishlistIds],
  (ids) => ids.length,
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatReviewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

export function getStockPercent(stock: number, maxStock: number): number {
  if (maxStock <= 0) return 0;
  return Math.round((stock / maxStock) * 100);
}

export function getTimeRemaining(endsAt: number): { hours: number; minutes: number; seconds: number } {
  const diff = Math.max(0, endsAt - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
}

export function padNumber(n: number): string {
  return n.toString().padStart(2, '0');
}

// ============================================================================
// HOOKS
// ============================================================================

export function useAppDispatch(): AppDispatch {
  return useDispatch<AppDispatch>();
}

export function useAppSelector<T>(selector: (state: RootState) => T): T {
  return useSelector(selector);
}

// ============================================================================
// SUB-COMPONENTS — PRIMITIVES
// ============================================================================

const ProductRating = React.memo(function ProductRating({
  rating,
  reviewCount,
  size = 'sm',
}: {
  rating: number;
  reviewCount: number;
  size?: 'sm' | 'md';
}) {
  const starSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-1" aria-label={`Rated ${rating} out of 5 stars, ${reviewCount} reviews`}>
      <span className={`flex ${starSize} text-amber-500`} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => {
          if (i < fullStars) return '★';
          if (i === fullStars && hasHalf) return '★';
          return '☆';
        }).join('')}
      </span>
      <span className={`text-muted-foreground ${size === 'sm' ? 'text-[11px]' : 'text-xs'}`}>
        ({formatReviewCount(reviewCount)})
      </span>
    </div>
  );
});

const DiscountBadge = React.memo(function DiscountBadge({ percent }: { percent: number }) {
  return (
    <span className="inline-flex items-center rounded-md bg-destructive/10 px-1.5 py-0.5 text-[11px] font-semibold text-destructive">
      -{percent}%
    </span>
  );
});

const WishlistButton = React.memo(function WishlistButton({
  productId,
  size = 'md',
}: {
  productId: string;
  size?: 'sm' | 'md';
}) {
  const dispatch = useAppDispatch();
  const isWishlisted = useAppSelector(selectIsWishlisted(productId));

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch(toggleWishlist(productId));
    },
    [dispatch, productId],
  );

  const btnSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`flex ${btnSize} items-center justify-center rounded-full border border-border bg-card/80 backdrop-blur-sm transition-all hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      <span className={`${iconSize} ${isWishlisted ? 'text-destructive' : 'text-muted-foreground'}`}>
        {isWishlisted ? '♥' : '♡'}
      </span>
    </button>
  );
});

const AddToCartButton = React.memo(function AddToCartButton({
  productId,
  disabled = false,
  compact = false,
}: {
  productId: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const dispatch = useAppDispatch();
  const [added, setAdded] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dispatch(addToCart({ productId }));
      setAdded(true);
      const timer = setTimeout(() => setAdded(false), 1500);
      return () => clearTimeout(timer);
    },
    [dispatch, productId, disabled],
  );

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={disabled ? 'Out of stock' : 'Add to cart'}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          disabled
            ? 'cursor-not-allowed bg-muted text-muted-foreground'
            : added
              ? 'bg-success text-success-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
      >
        {disabled ? '✕' : added ? '✓' : '+'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`w-full rounded-lg px-3 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        disabled
          ? 'cursor-not-allowed bg-muted text-muted-foreground'
          : added
            ? 'bg-success text-success-foreground'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
      }`}
    >
      {disabled ? 'Out of Stock' : added ? 'Added ✓' : 'Add to Cart'}
    </button>
  );
});

const PriceDisplay = React.memo(function PriceDisplay({
  price,
  originalPrice,
  installment,
  size = 'md',
}: {
  price: number;
  originalPrice?: number;
  installment?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const priceClass =
    size === 'lg'
      ? 'text-xl font-bold'
      : size === 'md'
        ? 'text-base font-bold'
        : 'text-sm font-bold';

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-2">
        <span className={`${priceClass} text-foreground`}>{formatCurrency(price)}</span>
        {originalPrice && originalPrice > price && (
          <span className="text-xs text-muted-foreground line-through">
            {formatCurrency(originalPrice)}
          </span>
        )}
      </div>
      {installment && (
        <span className="text-[11px] text-muted-foreground">{installment}</span>
      )}
    </div>
  );
});

// ============================================================================
// PRODUCT CARD
// ============================================================================

const ProductCard = React.memo(function ProductCard({
  product,
  variant = 'default',
  rank,
}: {
  product: Product;
  variant?: 'default' | 'compact' | 'horizontal';
  rank?: number;
}) {
  const isOutOfStock = product.state === ProductState.OutOfStock;
  const isLowStock = product.state === ProductState.LowStock;
  const stockPercent = getStockPercent(product.stock, product.maxStock);

  if (variant === 'horizontal') {
    return (
      <article className="group flex gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm">
        {rank !== undefined && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {rank}
          </div>
        )}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-muted text-4xl">
          {product.image}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {product.brand}
            </p>
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
              {product.name}
            </h3>
          </div>
          <div className="flex items-center justify-between gap-2">
            <PriceDisplay price={product.price} originalPrice={product.originalPrice} size="sm" />
            <div className="flex items-center gap-1">
              <WishlistButton productId={product.id} size="sm" />
              <AddToCartButton productId={product.id} disabled={isOutOfStock} compact />
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-md"
      aria-label={product.name}
    >
      {/* Image area */}
      <div className="relative flex aspect-square items-center justify-center bg-muted/50 text-6xl">
        <span aria-hidden="true">{product.image}</span>

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.discountPercent && product.discountPercent > 0 && (
            <DiscountBadge percent={product.discountPercent} />
          )}
          {product.badge && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                product.badge === 'New'
                  ? 'bg-info/10 text-info'
                  : product.badge === 'Best Seller'
                    ? 'bg-amber-500/10 text-amber-600'
                    : product.badge === 'Low Stock'
                      ? 'bg-warning/10 text-warning'
                      : product.badge === 'Out of Stock'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/10 text-primary'
              }`}
            >
              {product.badge}
            </span>
          )}
        </div>

        {/* Wishlist */}
        <div className="absolute right-2 top-2">
          <WishlistButton productId={product.id} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {product.brand}
        </p>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-foreground">
          {product.name}
        </h3>

        <ProductRating rating={product.rating} reviewCount={product.reviewCount} />

        <PriceDisplay
          price={product.price}
          originalPrice={product.originalPrice}
          installment={product.installment}
        />

        {/* Stock bar */}
        {(isLowStock || (product.stock > 0 && stockPercent < 30)) && (
          <div className="mt-1">
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-warning transition-all"
                style={{ width: `${stockPercent}%` }}
                role="progressbar"
                aria-valuenow={stockPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${stockPercent}% stock remaining`}
              />
            </div>
            <p className="mt-0.5 text-[10px] font-medium text-warning">
              Only {product.stock} left
            </p>
          </div>
        )}

        {product.stock > 0 && !isLowStock && stockPercent >= 30 && (
          <p className="text-[10px] text-muted-foreground">
            {product.stock} in stock
          </p>
        )}

        {isOutOfStock && (
          <p className="text-[10px] font-medium text-destructive">Out of stock</p>
        )}

        <div className="mt-auto pt-2">
          <AddToCartButton productId={product.id} disabled={isOutOfStock} />
        </div>
      </div>
    </article>
  );
});

// ============================================================================
// SECTION HEADER
// ============================================================================

const SectionHeader = React.memo(function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {actionLabel} →
        </button>
      )}
    </div>
  );
});

// ============================================================================
// COUNTDOWN TIMER
// ============================================================================

const CountdownTimer = React.memo(function CountdownTimer({ endsAt }: { endsAt: number }) {
  const [time, setTime] = useState(() => getTimeRemaining(endsAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining(endsAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const units = [
    { label: 'Hrs', value: time.hours },
    { label: 'Min', value: time.minutes },
    { label: 'Sec', value: time.seconds },
  ];

  return (
    <div className="flex items-center gap-1" role="timer" aria-label="Deal countdown">
      {units.map((unit) => (
        <div key={unit.label} className="flex flex-col items-center">
          <span className="flex h-7 w-8 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background tabular-nums">
            {padNumber(unit.value)}
          </span>
          <span className="mt-0.5 text-[9px] font-medium uppercase text-muted-foreground">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
});

// ============================================================================
// CAROUSEL CONTROLS
// ============================================================================

const CarouselControls = React.memo(function CarouselControls({
  onPrev,
  onNext,
  currentIndex,
  totalSlides,
  onSelect,
}: {
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  totalSlides: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5" role="tablist" aria-label="Hero carousel slides">
        {Array.from({ length: totalSlides }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === currentIndex}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => onSelect(i)}
            className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              i === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous slide"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next slide"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ›
        </button>
      </div>
    </div>
  );
});

// ============================================================================
// HEADER
// ============================================================================

function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="relative flex items-center justify-center gap-2 bg-primary px-4 py-1.5 text-center text-xs font-medium text-primary-foreground">
      <span aria-hidden="true">🚚</span>
      <span>
        Free shipping on orders over ${FREE_SHIPPING_THRESHOLD} —{' '}
        <a href="#deals" className="underline underline-offset-2 hover:opacity-80">
          Shop now
        </a>
      </span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-primary-foreground/70 transition-colors hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ✕
      </button>
    </div>
  );
}

function SearchBar() {
  const dispatch = useAppDispatch();
  const { query, isFocused, recentSearches } = useAppSelector(selectSearchState);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const matchingProducts = MOCK_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.brand.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower),
    )
      .slice(0, 5)
      .map((p) => p.name);
    const matchingCategories = CATEGORIES.filter((c) =>
      c.name.toLowerCase().includes(lower),
    ).map((c) => c.name);
    return [...new Set([...matchingCategories, ...matchingProducts])].slice(0, 6);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        dispatch(setSearchFocused(false));
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dispatch]);

  const handleSelect = useCallback(
    (value: string) => {
      dispatch(setSearchQuery(value));
      dispatch(addRecentSearch(value));
      setShowSuggestions(false);
      dispatch(setSearchFocused(false));
    },
    [dispatch],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        dispatch(addRecentSearch(query));
        setShowSuggestions(false);
      }
    },
    [dispatch, query],
  );

  const isOpen = showSuggestions && (suggestions.length > 0 || recentSearches.length > 0);

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <form onSubmit={handleSubmit} role="search" className="relative">
        <label htmlFor="search-input" className="sr-only">
          Search products
        </label>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          🔍
        </span>
        <input
          id="search-input"
          type="search"
          autoComplete="off"
          placeholder="Search for products, brands, categories..."
          value={query}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          onFocus={() => {
            setShowSuggestions(true);
            dispatch(setSearchFocused(true));
          }}
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          aria-expanded={isOpen}
          aria-controls="search-suggestions"
          aria-haspopup="listbox"
        />
      </form>

      {isOpen && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          {suggestions.length > 0 && (
            <div className="p-2">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Suggestions
              </p>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(s)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <span className="text-muted-foreground">🔍</span>
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </div>
          )}

          {!query && recentSearches.length > 0 && (
            <div className="border-t border-border p-2">
              <div className="flex items-center justify-between px-2 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Searches
                </p>
                <button
                  type="button"
                  onClick={() => dispatch(clearRecentSearches())}
                  className="text-[10px] text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(s)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <span className="text-muted-foreground">🕐</span>
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HeaderActions() {
  const dispatch = useAppDispatch();
  const cartCount = useAppSelector(selectCartCount);
  const wishlistCount = useAppSelector(selectWishlistCount);
  const { theme } = useAppSelector(selectUIState);

  const actions = [
    {
      id: 'theme',
      icon: theme === ThemeMode.Light ? '🌙' : '☀️',
      label: theme === ThemeMode.Light ? 'Switch to dark mode' : 'Switch to light mode',
      onClick: () => dispatch(toggleTheme()),
      badge: null as number | null,
    },
    {
      id: 'wishlist',
      icon: '♡',
      label: `Wishlist, ${wishlistCount} items`,
      onClick: () => {},
      badge: wishlistCount || null,
    },
    {
      id: 'cart',
      icon: '🛒',
      label: `Cart, ${cartCount} items`,
      onClick: () => dispatch(toggleCartDrawer()),
      badge: cartCount || null,
    },
    {
      id: 'account',
      icon: '👤',
      label: 'Account menu',
      onClick: () => {},
      badge: null as number | null,
    },
  ];

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={action.onClick}
          aria-label={action.label}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true">{action.icon}</span>
          {action.badge !== null && action.badge > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {action.badge > 99 ? '99+' : action.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function MobileMenu() {
  const dispatch = useAppDispatch();
  const { isMobileMenuOpen } = useAppSelector(selectUIState);

  if (!isMobileMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => dispatch(setMobileMenuOpen(false))}
        aria-hidden="true"
      />
      <nav
        className="absolute left-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto bg-background shadow-xl"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <span className="text-lg font-bold text-foreground">Menu</span>
          <button
            type="button"
            onClick={() => dispatch(setMobileMenuOpen(false))}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ✕
          </button>
        </div>
        <ul className="p-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <a
                href={item.href}
                onClick={() => dispatch(setMobileMenuOpen(false))}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                {item.label}
                {item.hasDropdown && <span className="text-muted-foreground">›</span>}
              </a>
            </li>
          ))}
        </ul>
        <div className="border-t border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </p>
          <ul className="mt-2 space-y-1">
            {CATEGORIES.slice(0, 5).map((cat) => (
              <li key={cat.id}>
                <a
                  href={`#${cat.id}`}
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <span aria-hidden="true">{cat.icon}</span>
                  {cat.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
}

function MainHeader() {
  const dispatch = useAppDispatch();
  const { location } = useAppSelector(selectUserPrefs);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-4 lg:px-6">
        {/* Top row */}
        <div className="flex h-14 items-center gap-2 sm:gap-4">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => dispatch(toggleMobileMenu())}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            ☰
          </button>

          {/* Logo */}
          <a
            href="/"
            className="flex shrink-0 items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="ShopSphere home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
              S
            </span>
            <span className="hidden text-lg font-bold tracking-tight text-foreground sm:inline">
              ShopSphere
            </span>
          </a>

          {/* Location — desktop */}
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:flex"
            aria-label={`Deliver to ${location}. Change location`}
          >
            <span className="text-lg" aria-hidden="true">📍</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Deliver to
              </span>
              <span className="text-xs font-semibold text-foreground">{location}</span>
            </div>
          </button>

          {/* Search */}
          <div className="flex flex-1 justify-center px-1 sm:px-2">
            <div className="w-full max-w-2xl">
              <SearchBar />
            </div>
          </div>

          {/* Actions */}
          <HeaderActions />
        </div>

        {/* Navigation row — desktop */}
        <nav
          className="hidden h-10 items-center gap-1 lg:flex"
          aria-label="Primary navigation"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              {item.label}
              {item.hasDropdown && (
                <span className="text-[10px] text-muted-foreground" aria-hidden="true">▼</span>
              )}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

// ============================================================================
// HERO SECTION
// ============================================================================

function HeroSection() {
  const dispatch = useAppDispatch();
  const { activeHeroSlide } = useAppSelector(selectUIState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToSlide = useCallback(
    (index: number) => {
      dispatch(setActiveHeroSlide(index));
    },
    [dispatch],
  );

  const goNext = useCallback(() => {
    goToSlide((activeHeroSlide + 1) % HERO_SLIDES.length);
  }, [activeHeroSlide, goToSlide]);

  const goPrev = useCallback(() => {
    goToSlide((activeHeroSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, [activeHeroSlide, goToSlide]);

  useEffect(() => {
    timerRef.current = setInterval(goNext, CAROUSEL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [goNext]);

  const slide = HERO_SLIDES[activeHeroSlide];

  return (
    <section className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 lg:px-6" aria-label="Promotions">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Main carousel */}
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{ backgroundColor: slide.bgColor, color: slide.textColor }}
          aria-roledescription="carousel"
          aria-label="Featured promotions"
        >
          <div className="flex min-h-[280px] flex-col justify-center gap-3 p-6 sm:min-h-[340px] sm:p-10 lg:min-h-[400px] lg:p-14">
            <span className="text-5xl sm:text-6xl lg:text-7xl" aria-hidden="true">
              {slide.image}
            </span>
            <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-5xl">
              {slide.title}
            </h1>
            <p className="max-w-md text-sm opacity-90 sm:text-base">{slide.subtitle}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <a
                href={slide.ctaLink}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-gray-900 shadow-sm transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                {slide.cta} →
              </a>
              {slide.secondaryCta && (
                <a
                  href={slide.secondaryCtaLink}
                  className="inline-flex items-center rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {slide.secondaryCta}
                </a>
              )}
            </div>
          </div>

          <div className="absolute bottom-4 left-6 sm:left-10 lg:left-14">
            <CarouselControls
              onPrev={goPrev}
              onNext={goNext}
              currentIndex={activeHeroSlide}
              totalSlides={HERO_SLIDES.length}
              onSelect={goToSlide}
            />
          </div>
        </div>

        {/* Side promotions */}
        <div className="hidden flex-col gap-4 lg:flex">
          <a
            href="#new-arrivals"
            className="group flex flex-1 flex-col justify-center gap-2 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
          >
            <span className="text-4xl" aria-hidden="true">🎁</span>
            <h2 className="text-lg font-bold text-foreground">Membership Exclusive</h2>
            <p className="text-sm text-muted-foreground">
              Join ShopSphere Plus for free delivery and early access to sales.
            </p>
            <span className="mt-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              Learn more →
            </span>
          </a>
          <a
            href="#flash-deals"
            className="group flex flex-1 flex-col justify-center gap-2 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
          >
            <span className="text-4xl" aria-hidden="true">⏰</span>
            <h2 className="text-lg font-bold text-foreground">Flash Deals</h2>
            <p className="text-sm text-muted-foreground">
              Limited-time offers ending soon. Don't miss out.
            </p>
            <span className="mt-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              Shop deals →
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// CATEGORY SECTION
// ============================================================================

const CategoryCard = React.memo(function CategoryCard({ category }: { category: Category }) {
  return (
    <a
      href={`#${category.id}`}
      className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl transition-transform group-hover:scale-110" aria-hidden="true">
        {category.icon}
      </span>
      <span className="text-center text-sm font-semibold text-foreground">{category.name}</span>
      <span className="text-[11px] text-muted-foreground">
        {formatReviewCount(category.productCount)} products
      </span>
    </a>
  );
});

function CategorySection() {
  const displayCategories = useMemo(() => CATEGORIES.slice(0, 8), []);

  return (
    <section id="categories" className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 lg:px-6" aria-labelledby="categories-heading">
      <SectionHeader
        title="Shop by Category"
        subtitle="Explore our wide range of products"
        actionLabel="All categories"
        onAction={() => {}}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {displayCategories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// FLASH DEALS SECTION
// ============================================================================

function FlashDealsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const flashDeals: FlashDeal[] = useMemo(
    () =>
      MOCK_PRODUCTS.filter((p) => p.state === ProductState.Discounted)
        .slice(0, 8)
        .map((p, i) => ({
          id: `flash-${p.id}`,
          product: p,
          endsAt: Date.now() + (i + 1) * 3600000,
        })),
    [],
  );

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  }, []);

  return (
    <section id="flash-deals" className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 lg:px-6" aria-labelledby="flash-deals-heading">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 id="flash-deals-heading" className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              ⚡ Flash Deals
            </h2>
            {flashDeals[0] && <CountdownTimer endsAt={flashDeals[0].endsAt} />}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Scroll deals left"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Scroll deals right"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ›
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
          role="list"
          aria-label="Flash deal products"
        >
          {flashDeals.map((deal) => (
            <div key={deal.id} className="w-[160px] shrink-0 sm:w-[180px] md:w-[200px]" role="listitem">
              <ProductCard product={deal.product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PERSONALIZED PRODUCTS SECTION
// ============================================================================

function PersonalizedProductsSection() {
  const products = useMemo(
    () => MOCK_PRODUCTS.filter((p) => p.rating >= 4.5).slice(0, 4),
    [],
  );

  return (
    <section className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 lg:px-6" aria-labelledby="personalized-heading">
      <SectionHeader
        title="Recommended for You"
        subtitle="Based on your browsing and shopping activity"
        actionLabel="View all"
        onAction={() => {}}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// PROMOTIONAL DEALS SECTION
// ============================================================================

function PromotionalDealsSection() {
  return (
    <section id="promotions" className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 lg:px-6" aria-labelledby="promotions-heading">
      <SectionHeader
        title="Deals & Promotions"
        subtitle="Save big across your favorite categories"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PROMOTIONS.map((promo) => (
          <a
            key={promo.id}
            href={`#${promo.id}`}
            className="group flex flex-col justify-between gap-3 rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ backgroundColor: promo.bgColor }}
          >
            <span className="text-4xl transition-transform group-hover:scale-110" aria-hidden="true">
              {promo.image}
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">{promo.title}</h3>
              <p className="text-xs text-muted-foreground">{promo.subtitle}</p>
              <span className="mt-1 inline-block text-xs font-semibold text-primary">
                {promo.cta} →
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// FEATURED BRANDS SECTION
// ============================================================================

const BrandCard = React.memo(function BrandCard({ brand }: { brand: Brand }) {
  return (
    <a
      href={`#brand-${brand.id}`}
      className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl transition-transform group-hover:scale-110" aria-hidden="true">
        {brand.logo}
      </span>
      <span className="text-sm font-semibold text-foreground">{brand.name}</span>
      <span className="text-[11px] text-muted-foreground">{brand.category}</span>
      <span className="text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Shop now →
      </span>
    </a>
  );
});

function FeaturedBrandsSection() {
  return (
    <section id="brands" className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 lg:px-6" aria-labelledby="brands-heading">
      <SectionHeader
        title="Featured Brands"
        subtitle="Trusted by millions of shoppers"
        actionLabel="All brands"
        onAction={() => {}}
      />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {BRANDS.map((brand) => (
          <BrandCard key={brand.id} brand={brand} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// TRENDING PRODUCTS SECTION
// ============================================================================

function TrendingProductsSection() {
  const trending = useMemo(
    () => MOCK_PRODUCTS.filter((p) => p.state === ProductState.BestSeller).slice(0, 6),
    [],
  );

  return (
    <section id="trending" className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 lg:px-6" aria-labelledby="trending-heading">
      <SectionHeader
        title="Trending Now"
        subtitle="What everyone's buying this week"
        actionLabel="See all"
        onAction={() => {}}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {trending.map((p, i) => (
          <ProductCard key={p.id} product={p} variant="horizontal" rank={i + 1} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// RECOMMENDED PRODUCTS SECTION
// ============================================================================

function RecommendedProductsSection() {
  const products = useMemo(
    () => MOCK_PRODUCTS.filter((p) => p.state !== ProductState.OutOfStock).slice(4, 12),
    [],
  );

  return (
    <section id="recommended" className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 lg:px-6" aria-labelledby="recommended-heading">
      <SectionHeader
        title="More to Explore"
        subtitle="Handpicked recommendations for you"
        actionLabel="View all"
        onAction={() => {}}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// RECENTLY VIEWED SECTION
// ============================================================================

function RecentlyViewedSection() {
  const products = useMemo(
    () => MOCK_PRODUCTS.slice(-MAX_RECENTLY_VIEWED).reverse(),
    [],
  );

  if (products.length === 0) return null;

  return (
    <section id="recently-viewed" className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 lg:px-6" aria-labelledby="recently-viewed-heading">
      <SectionHeader
        title="Recently Viewed"
        subtitle="Pick up where you left off"
      />
      <div className="flex gap-3 overflow-x-auto pb-2">
        {products.map((p) => (
          <div key={p.id} className="w-[160px] shrink-0 sm:w-[180px]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// TRUST SECTION
// ============================================================================

function TrustSection() {
  return (
    <section className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 lg:px-6" aria-labelledby="trust-heading">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 id="trust-heading" className="sr-only">
          Why shop with us
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {TRUST_FEATURES.map((feature) => (
            <div key={feature.id} className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl" aria-hidden="true">
                {feature.icon}
              </span>
              <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// CART DRAWER
// ============================================================================

function CartDrawer() {
  const dispatch = useAppDispatch();
  const { isCartDrawerOpen } = useAppSelector(selectUIState);
  const cartItems = useAppSelector(selectCartItems);
  const cartTotal = useAppSelector(selectCartTotal);
  const cartCount = useAppSelector(selectCartCount);

  if (!isCartDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => dispatch(setCartDrawerOpen(false))}
        aria-hidden="true"
      />
      <aside
        className="absolute right-0 top-0 flex h-full w-96 max-w-[90vw] flex-col bg-background shadow-xl"
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-bold text-foreground">
            Cart {cartCount > 0 && `(${cartCount})`}
          </h2>
          <button
            type="button"
            onClick={() => dispatch(setCartDrawerOpen(false))}
            aria-label="Close cart"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="text-5xl" aria-hidden="true">🛒</span>
              <p className="text-sm font-medium text-foreground">Your cart is empty</p>
              <p className="text-xs text-muted-foreground">Add items to get started</p>
              <button
                type="button"
                onClick={() => dispatch(setCartDrawerOpen(false))}
                className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {cartItems.map((item) => {
                const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
                if (!product) return null;
                return (
                  <li key={item.productId} className="flex gap-3 rounded-xl border border-border p-3">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-3xl">
                      {product.image}
                    </span>
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="line-clamp-2 text-sm font-semibold text-foreground">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(product.price)}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            dispatch(
                              updateQuantity({
                                productId: item.productId,
                                quantity: item.quantity - 1,
                              }),
                            )
                          }
                          aria-label="Decrease quantity"
                          className="flex h-6 w-6 items-center justify-center rounded border border-border text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          −
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch(
                              updateQuantity({
                                productId: item.productId,
                                quantity: item.quantity + 1,
                              }),
                            )
                          }
                          aria-label="Increase quantity"
                          className="flex h-6 w-6 items-center justify-center rounded border border-border text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => dispatch(removeFromCart(item.productId))}
                          aria-label={`Remove ${product.name} from cart`}
                          className="ml-auto text-xs text-destructive transition-colors hover:underline focus-visible:outline-none"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
              <span className="text-lg font-bold text-foreground">{formatCurrency(cartTotal)}</span>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Shipping calculated at checkout
            </p>
            <button
              type="button"
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

function EcommerceFooter() {
  const footerGroups = [
    {
      title: 'Shop',
      links: ['All Products', 'New Arrivals', 'Best Sellers', 'Today\'s Deals', 'Gift Cards'],
    },
    {
      title: 'Customer Service',
      links: ['Help Center', 'Track Order', 'Returns & Exchanges', 'Shipping Info', 'Contact Us'],
    },
    {
      title: 'About',
      links: ['Our Story', 'Careers', 'Press', 'Sustainability', 'Affiliates'],
    },
    {
      title: 'Sell With Us',
      links: ['Start Selling', 'Seller Center', 'Fees & Pricing', 'Advertise', 'Partnerships'],
    },
    {
      title: 'Legal',
      links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Accessibility', 'Do Not Sell'],
    },
  ];

  const socialLinks = [
    { id: 'social-twitter', label: 'Twitter', icon: '𝕏' },
    { id: 'social-facebook', label: 'Facebook', icon: 'f' },
    { id: 'social-instagram', label: 'Instagram', icon: '📷' },
    { id: 'social-youtube', label: 'YouTube', icon: '▶' },
    { id: 'social-tiktok', label: 'TikTok', icon: '♪' },
  ];

  const paymentMethods = ['Visa', 'MC', 'Amex', 'PayPal', 'Apple Pay', 'G Pay'];

  return (
    <footer className="mt-8 border-t border-border bg-muted/30" aria-label="Site footer">
      <div className="mx-auto max-w-[1400px] px-3 py-8 sm:px-4 lg:px-6">
        {/* Top row */}
        <div className="grid gap-8 lg:grid-cols-[2fr_repeat(5,1fr)]">
          {/* Brand column */}
          <div className="space-y-4">
            <a
              href="/"
              className="flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="ShopSphere home"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
                S
              </span>
              <span className="text-lg font-bold tracking-tight text-foreground">ShopSphere</span>
            </a>
            <p className="max-w-xs text-sm text-muted-foreground">
              Your one-stop shop for electronics, fashion, home goods, and more. Trusted by millions worldwide.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  aria-label={s.label}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* App download & payment */}
        <div className="mt-8 flex flex-col gap-6 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Download App
            </span>
            <div className="flex gap-2">
              <a
                href="#app-store"
                aria-label="Download on the App Store"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden="true">🍎</span> App Store
              </a>
              <a
                href="#google-play"
                aria-label="Get it on Google Play"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden="true">▶</span> Google Play
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {paymentMethods.map((pm) => (
              <span
                key={pm}
                className="rounded border border-border bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground"
              >
                {pm}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-border pt-4 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ShopSphere Inc. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Prices and offers may vary. Terms apply.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// THEME PROVIDER (applies theme class to document)
// ============================================================================

function ThemeEffect() {
  const { theme } = useAppSelector(selectUIState);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === ThemeMode.Dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return null;
}

// ============================================================================
// PAGE COMPOSITION
// ============================================================================

function HomePageContent() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <ThemeEffect />
      <AnnouncementBar />
      <MainHeader />
      <MobileMenu />
      <main>
        <HeroSection />
        <CategorySection />
        <FlashDealsSection />
        <PersonalizedProductsSection />
        <PromotionalDealsSection />
        <FeaturedBrandsSection />
        <TrendingProductsSection />
        <RecommendedProductsSection />
        <RecentlyViewedSection />
        <TrustSection />
      </main>
      <EcommerceFooter />
      <CartDrawer />
    </div>
  );
}

// ============================================================================
// ROOT EXPORT
// ============================================================================

export default function EcommerceHomePage() {
  return (
    <Provider store={store}>
      <HomePageContent />
    </Provider>
  );
}