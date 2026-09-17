"use client";

/* ============================================================================
 * SellerBrandPage.tsx
 * Enterprise-grade Seller / Brand storefront page (Next.js App Router).
 *
 * Delivery constraint: this file (+ globals.css) is the entire implementation.
 * Internally it is organized as if each section below were its own module:
 * types -> enums -> constants -> mock data -> utils -> redux -> primitives ->
 * identity -> campaigns -> categories -> filters -> products -> reviews ->
 * related-stores -> header/footer -> page composition.
 * ==========================================================================*/

import React, { useCallback, useId, useMemo, useState } from "react";
import {
  configureStore,
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import {
  Award,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Grid3x3,
  Heart,
  List as ListIcon,
  MapPin,
  Menu,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  ThumbsUp,
  Truck,
  User,
  X,
} from "lucide-react";

/* ============================================================================
 * 2. TYPES / INTERFACES
 * ==========================================================================*/

interface StoreLocation {
  city: string;
  country: string;
}

interface SellerMetrics {
  orderFulfillmentRate: number;
  responseRate: number;
  responseTimeHours: number;
  onTimeShippingRate: number;
  returnHandlingRate: number;
  customerSatisfaction: number;
}

interface BrandProfile {
  foundedYear: number;
  officialWebsite: string;
  warrantyInfo: string;
  certifications: string[];
}

interface Store {
  id: string;
  type: StoreType;
  name: string;
  slug: string;
  logoInitials: string;
  tagline: string;
  description: string;
  verification: VerificationStatus;
  rating: number;
  reviewCount: number;
  followerCount: number;
  productCount: number;
  location: StoreLocation;
  joinedDate: string;
  responseTime: string;
  sellerMetrics?: SellerMetrics;
  brandProfile?: BrandProfile;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  collection?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  stock: number;
  sold: number;
  badges: ProductBadge[];
  deliveryEstimate: string;
  createdAt: string;
  colorway: string;
}

interface StoreCategoryItem {
  id: string;
  name: string;
  productCount: number;
  swatch: string;
}

interface StoreCampaign {
  id: string;
  title: string;
  subtitle: string;
  discountLabel: string;
  ctaLabel: string;
  expiresAt: string;
  swatch: string;
}

interface Coupon {
  id: string;
  code: string;
  discountLabel: string;
  minOrder: number;
  expiresAt: string;
  status: "active" | "expired";
  eligibility: string;
}

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  verifiedPurchase: boolean;
  title: string;
  content: string;
  helpfulCount: number;
  photoCount: number;
}

interface RelatedStoreCardData {
  id: string;
  name: string;
  initials: string;
  verification: VerificationStatus;
  rating: number;
  category: string;
  followerCount: number;
}

interface FilterOption {
  id: string;
  label: string;
}

interface FiltersState {
  categories: string[];
  priceRange: string | null;
  rating: string | null;
  discount: string | null;
  availability: string[];
}

/* ============================================================================
 * 3. ENUMS
 * ==========================================================================*/

enum StoreType {
  SELLER = "seller",
  BRAND = "brand",
}

enum VerificationStatus {
  VERIFIED = "verified",
  OFFICIAL_BRAND = "official_brand",
  AUTHORIZED_SELLER = "authorized_seller",
  TOP_SELLER = "top_seller",
  PREFERRED_SELLER = "preferred_seller",
}

enum StoreTab {
  OVERVIEW = "overview",
  PRODUCTS = "products",
  DEALS = "deals",
  CATEGORIES = "categories",
  REVIEWS = "reviews",
  ABOUT = "about",
}

enum SortOption {
  RELEVANCE = "relevance",
  POPULAR = "popular",
  BEST_SELLING = "best_selling",
  NEWEST = "newest",
  PRICE_LOW = "price_low",
  PRICE_HIGH = "price_high",
  RATING = "rating",
  DISCOUNT = "discount",
}

enum ViewMode {
  GRID = "grid",
  LIST = "list",
}

enum ProductBadge {
  NEW = "new",
  BEST_SELLER = "bestSeller",
  DISCOUNTED = "discounted",
  LOW_STOCK = "lowStock",
  OUT_OF_STOCK = "outOfStock",
  SPONSORED = "sponsored",
}

/* ============================================================================
 * 4. CONSTANTS
 * ==========================================================================*/

const STORE_NAV_LINKS = ["Electronics", "Audio", "Wearables", "Home", "Gaming", "Deals"] as const;

const STORE_TAB_CONFIG: { id: StoreTab; label: string }[] = [
  { id: StoreTab.OVERVIEW, label: "Overview" },
  { id: StoreTab.PRODUCTS, label: "Products" },
  { id: StoreTab.DEALS, label: "Deals" },
  { id: StoreTab.CATEGORIES, label: "Categories" },
  { id: StoreTab.REVIEWS, label: "Reviews" },
  { id: StoreTab.ABOUT, label: "About" },
];

const SORT_OPTION_LABELS: Record<SortOption, string> = {
  [SortOption.RELEVANCE]: "Relevance",
  [SortOption.POPULAR]: "Popular",
  [SortOption.BEST_SELLING]: "Best Selling",
  [SortOption.NEWEST]: "Newest",
  [SortOption.PRICE_LOW]: "Price: Low to High",
  [SortOption.PRICE_HIGH]: "Price: High to Low",
  [SortOption.RATING]: "Customer Rating",
  [SortOption.DISCOUNT]: "Biggest Discount",
};

const CATEGORY_FILTER_OPTIONS: FilterOption[] = [
  { id: "headphones", label: "Headphones" },
  { id: "speakers", label: "Speakers" },
  { id: "turntables", label: "Turntables" },
  { id: "wearables", label: "Wearables" },
  { id: "accessories", label: "Accessories" },
  { id: "studio", label: "Studio Gear" },
];

const PRICE_FILTER_OPTIONS: FilterOption[] = [
  { id: "under-50", label: "Under $50" },
  { id: "50-100", label: "$50 – $100" },
  { id: "100-250", label: "$100 – $250" },
  { id: "250-500", label: "$250 – $500" },
  { id: "500-plus", label: "$500+" },
];

const RATING_FILTER_OPTIONS: FilterOption[] = [
  { id: "4-plus", label: "4★ & above" },
  { id: "3-plus", label: "3★ & above" },
];

const DISCOUNT_FILTER_OPTIONS: FilterOption[] = [
  { id: "10-plus", label: "10% off or more" },
  { id: "20-plus", label: "20% off or more" },
  { id: "30-plus", label: "30% off or more" },
  { id: "50-plus", label: "50% off or more" },
];

const AVAILABILITY_FILTER_OPTIONS: FilterOption[] = [
  { id: "in-stock", label: "In Stock" },
  { id: "fast-delivery", label: "Fast Delivery" },
  { id: "available-today", label: "Available Today" },
];

const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  [VerificationStatus.VERIFIED]: "Verified",
  [VerificationStatus.OFFICIAL_BRAND]: "Official Brand",
  [VerificationStatus.AUTHORIZED_SELLER]: "Authorized Seller",
  [VerificationStatus.TOP_SELLER]: "Top Seller",
  [VerificationStatus.PREFERRED_SELLER]: "Preferred Seller",
};

const PRODUCT_BADGE_LABELS: Record<ProductBadge, string> = {
  [ProductBadge.NEW]: "New",
  [ProductBadge.BEST_SELLER]: "Best Seller",
  [ProductBadge.DISCOUNTED]: "Sale",
  [ProductBadge.LOW_STOCK]: "Low Stock",
  [ProductBadge.OUT_OF_STOCK]: "Out of Stock",
  [ProductBadge.SPONSORED]: "Sponsored",
};

/* ============================================================================
 * 5. MOCK DATA
 * ==========================================================================*/

const MOCK_STORE: Store = {
  id: "str_meridian",
  type: StoreType.BRAND,
  name: "Meridian Audio Co.",
  slug: "meridian-audio",
  logoInitials: "MA",
  tagline: "Precision sound, engineered for the long listen.",
  description:
    "Meridian Audio Co. designs headphones, speakers, and turntables for people who notice the difference between good sound and the right sound. Every product is tuned in-house and backed by our own engineering team, not licensed from a catalog.",
  verification: VerificationStatus.OFFICIAL_BRAND,
  rating: 4.8,
  reviewCount: 18432,
  followerCount: 245800,
  productCount: 128,
  location: { city: "Portland", country: "United States" },
  joinedDate: "2014-03-01",
  responseTime: "Usually responds within 2 hours",
  brandProfile: {
    foundedYear: 2014,
    officialWebsite: "meridianaudio.example",
    warrantyInfo: "2-year manufacturer warranty on all electronics",
    certifications: ["Hi-Res Audio Certified", "RoHS Compliant", "Bluetooth SIG Member"],
  },
};

const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Meridian Aria M2 Wireless Headphones",
    brand: "Meridian",
    category: "headphones",
    collection: "Aria Series",
    price: 279,
    originalPrice: 349,
    currency: "USD",
    rating: 4.8,
    reviewCount: 3421,
    stock: 240,
    sold: 12400,
    badges: [ProductBadge.BEST_SELLER, ProductBadge.DISCOUNTED],
    deliveryEstimate: "Arrives in 2–3 days",
    createdAt: "2025-11-02",
    colorway: "Graphite",
  },
  {
    id: "p2",
    name: "Meridian Halo Open-Back Studio Headphones",
    brand: "Meridian",
    category: "studio",
    collection: "Halo Series",
    price: 449,
    currency: "USD",
    rating: 4.9,
    reviewCount: 1287,
    stock: 64,
    sold: 4210,
    badges: [ProductBadge.NEW],
    deliveryEstimate: "Arrives in 3–5 days",
    createdAt: "2026-08-14",
    colorway: "Walnut",
  },
  {
    id: "p3",
    name: "Meridian Orbit Mini Bookshelf Speakers (Pair)",
    brand: "Meridian",
    category: "speakers",
    collection: "Orbit Series",
    price: 329,
    originalPrice: 399,
    currency: "USD",
    rating: 4.7,
    reviewCount: 986,
    stock: 88,
    sold: 5620,
    badges: [ProductBadge.DISCOUNTED],
    deliveryEstimate: "Arrives in 2–3 days",
    createdAt: "2025-06-20",
    colorway: "Oak / Black",
  },
  {
    id: "p4",
    name: "Meridian Current TT-3 Belt-Drive Turntable",
    brand: "Meridian",
    category: "turntables",
    price: 599,
    currency: "USD",
    rating: 4.6,
    reviewCount: 512,
    stock: 21,
    sold: 1840,
    badges: [ProductBadge.LOW_STOCK],
    deliveryEstimate: "Arrives in 4–6 days",
    createdAt: "2025-02-11",
    colorway: "Matte Black",
  },
  {
    id: "p5",
    name: "Meridian Pulse Active Noise-Cancelling Earbuds",
    brand: "Meridian",
    category: "headphones",
    collection: "Pulse Series",
    price: 159,
    originalPrice: 199,
    currency: "USD",
    rating: 4.5,
    reviewCount: 6742,
    stock: 512,
    sold: 28900,
    badges: [ProductBadge.BEST_SELLER, ProductBadge.DISCOUNTED, ProductBadge.SPONSORED],
    deliveryEstimate: "Arrives tomorrow",
    createdAt: "2025-09-30",
    colorway: "Storm Grey",
  },
  {
    id: "p6",
    name: "Meridian Field Portable Bluetooth Speaker",
    brand: "Meridian",
    category: "speakers",
    price: 129,
    currency: "USD",
    rating: 4.4,
    reviewCount: 2211,
    stock: 0,
    sold: 9430,
    badges: [ProductBadge.OUT_OF_STOCK],
    deliveryEstimate: "Restocking soon",
    createdAt: "2024-11-18",
    colorway: "Sand",
  },
  {
    id: "p7",
    name: "Meridian Cadence Wired In-Ear Monitors",
    brand: "Meridian",
    category: "headphones",
    collection: "Cadence Series",
    price: 89,
    currency: "USD",
    rating: 4.6,
    reviewCount: 1543,
    stock: 320,
    sold: 7100,
    badges: [ProductBadge.NEW],
    deliveryEstimate: "Arrives in 2–3 days",
    createdAt: "2026-07-01",
    colorway: "Clear",
  },
  {
    id: "p8",
    name: "Meridian Loop Fitness Earbuds",
    brand: "Meridian",
    category: "wearables",
    price: 99,
    originalPrice: 129,
    currency: "USD",
    rating: 4.3,
    reviewCount: 987,
    stock: 210,
    sold: 4320,
    badges: [ProductBadge.DISCOUNTED],
    deliveryEstimate: "Arrives in 2–3 days",
    createdAt: "2025-04-05",
    colorway: "Cobalt",
  },
  {
    id: "p9",
    name: "Meridian Ridge Over-Ear Travel Headphones",
    brand: "Meridian",
    category: "headphones",
    price: 219,
    currency: "USD",
    rating: 4.7,
    reviewCount: 2065,
    stock: 145,
    sold: 8900,
    badges: [],
    deliveryEstimate: "Arrives in 2–3 days",
    createdAt: "2025-01-22",
    colorway: "Midnight Blue",
  },
  {
    id: "p10",
    name: "Meridian Anchor Studio Monitor Speakers (Pair)",
    brand: "Meridian",
    category: "studio",
    price: 549,
    currency: "USD",
    rating: 4.9,
    reviewCount: 431,
    stock: 40,
    sold: 1290,
    badges: [ProductBadge.BEST_SELLER],
    deliveryEstimate: "Arrives in 4–6 days",
    createdAt: "2024-09-09",
    colorway: "Black",
  },
  {
    id: "p11",
    name: "Meridian Strap Replacement Headband Cushions",
    brand: "Meridian",
    category: "accessories",
    price: 19,
    currency: "USD",
    rating: 4.2,
    reviewCount: 344,
    stock: 800,
    sold: 6200,
    badges: [],
    deliveryEstimate: "Arrives tomorrow",
    createdAt: "2023-12-01",
    colorway: "Black",
  },
  {
    id: "p12",
    name: "Meridian Current Phono Preamp",
    brand: "Meridian",
    category: "turntables",
    price: 149,
    originalPrice: 179,
    currency: "USD",
    rating: 4.5,
    reviewCount: 268,
    stock: 55,
    sold: 1420,
    badges: [ProductBadge.DISCOUNTED],
    deliveryEstimate: "Arrives in 3–5 days",
    createdAt: "2025-05-15",
    colorway: "Silver",
  },
];

const MOCK_CATEGORIES: StoreCategoryItem[] = [
  { id: "headphones", name: "Headphones", productCount: 42, swatch: "oklch(58% 0.135 48)" },
  { id: "speakers", name: "Speakers", productCount: 24, swatch: "oklch(58% 0.11 232)" },
  { id: "turntables", name: "Turntables", productCount: 11, swatch: "oklch(46% 0.02 262)" },
  { id: "wearables", name: "Wearables", productCount: 18, swatch: "oklch(59% 0.13 148)" },
  { id: "accessories", name: "Accessories", productCount: 27, swatch: "oklch(76% 0.15 82)" },
  { id: "studio", name: "Studio Gear", productCount: 16, swatch: "oklch(56% 0.21 25)" },
];

const MOCK_CAMPAIGNS: StoreCampaign[] = [
  {
    id: "camp1",
    title: "Aria Series Restock",
    subtitle: "Our best-selling wireless line, back and improved",
    discountLabel: "Up to 20% off",
    ctaLabel: "Shop Aria",
    expiresAt: "2026-09-30",
    swatch: "oklch(58% 0.135 48)",
  },
  {
    id: "camp2",
    title: "Turntable Trade-In",
    subtitle: "Trade any turntable toward a Current TT-3",
    discountLabel: "Save up to $150",
    ctaLabel: "See Details",
    expiresAt: "2026-10-15",
    swatch: "oklch(30% 0.02 262)",
  },
];

const MOCK_COUPONS: Coupon[] = [
  {
    id: "cp1",
    code: "MERIDIAN20",
    discountLabel: "20% off",
    minOrder: 100,
    expiresAt: "2026-09-30",
    status: "active",
    eligibility: "Orders over $100",
  },
  {
    id: "cp2",
    code: "FREESHIP",
    discountLabel: "Free shipping",
    minOrder: 0,
    expiresAt: "2026-12-31",
    status: "active",
    eligibility: "All orders",
  },
  {
    id: "cp3",
    code: "STUDIO50",
    discountLabel: "$50 off",
    minOrder: 400,
    expiresAt: "2026-09-25",
    status: "active",
    eligibility: "Studio Gear category",
  },
  {
    id: "cp4",
    code: "WELCOME10",
    discountLabel: "10% off",
    minOrder: 0,
    expiresAt: "2026-01-15",
    status: "expired",
    eligibility: "First-time followers",
  },
];

const MOCK_REVIEWS: Review[] = [
  {
    id: "r1",
    author: "Jordan P.",
    rating: 5,
    date: "2026-08-28",
    verifiedPurchase: true,
    title: "Best headphones I've owned",
    content:
      "The Aria M2 pair replaced a much more expensive set for me. Bass is controlled, not boomy, and they're comfortable past the three-hour mark.",
    helpfulCount: 214,
    photoCount: 3,
  },
  {
    id: "r2",
    author: "Sam K.",
    rating: 4,
    date: "2026-08-11",
    verifiedPurchase: true,
    title: "Great sound, app could improve",
    content:
      "Audio quality is excellent and the noise cancelling is genuinely usable on flights. The companion app is a little clunky when pairing multiple devices.",
    helpfulCount: 98,
    photoCount: 0,
  },
  {
    id: "r3",
    author: "Alicia R.",
    rating: 5,
    date: "2026-07-30",
    verifiedPurchase: true,
    title: "Turntable exceeded expectations",
    content:
      "Set up the TT-3 in ten minutes and the difference from my old belt-drive is obvious. Meridian's support team also answered a setup question same day.",
    helpfulCount: 76,
    photoCount: 2,
  },
  {
    id: "r4",
    author: "Marcus T.",
    rating: 3,
    date: "2026-07-02",
    verifiedPurchase: false,
    title: "Good, not great for the price",
    content:
      "The Orbit Mini speakers sound good for the size but I expected a bit more low-end presence at this price point compared to competitors.",
    helpfulCount: 41,
    photoCount: 0,
  },
  {
    id: "r5",
    author: "Priya N.",
    rating: 5,
    date: "2026-06-19",
    verifiedPurchase: true,
    title: "Warranty support was seamless",
    content:
      "Had a minor issue with a earbud charging case after eight months. Meridian replaced it under warranty with no hassle within a week.",
    helpfulCount: 133,
    photoCount: 1,
  },
  {
    id: "r6",
    author: "Diego F.",
    rating: 4,
    date: "2026-05-27",
    verifiedPurchase: true,
    title: "Solid daily driver",
    content:
      "The Cadence IEMs punch above their price. Cable could be a bit softer but the tuning is balanced and detailed for the cost.",
    helpfulCount: 59,
    photoCount: 0,
  },
];

const MOCK_RELATED_STORES: RelatedStoreCardData[] = [
  { id: "rs1", name: "Nordic Sound Labs", initials: "NS", verification: VerificationStatus.OFFICIAL_BRAND, rating: 4.7, category: "Audio Equipment", followerCount: 98200 },
  { id: "rs2", name: "Vantage Electronics", initials: "VE", verification: VerificationStatus.TOP_SELLER, rating: 4.6, category: "Consumer Electronics", followerCount: 156400 },
  { id: "rs3", name: "Warmtone Vinyl Co.", initials: "WV", verification: VerificationStatus.AUTHORIZED_SELLER, rating: 4.8, category: "Turntables & Vinyl", followerCount: 41300 },
  { id: "rs4", name: "Circuit & Co.", initials: "CC", verification: VerificationStatus.PREFERRED_SELLER, rating: 4.5, category: "Wearable Tech", followerCount: 72900 },
];

/* ============================================================================
 * 6. UTILITY FUNCTIONS
 * ==========================================================================*/

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function calculateDiscountPercent(price: number, originalPrice?: number): number {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

function getVerificationTokenClass(status: VerificationStatus): string {
  switch (status) {
    case VerificationStatus.OFFICIAL_BRAND:
      return "bg-official-brand text-official-brand-foreground";
    case VerificationStatus.TOP_SELLER:
    case VerificationStatus.PREFERRED_SELLER:
      return "bg-top-seller text-top-seller-foreground";
    default:
      return "bg-verified text-verified-foreground";
  }
}

function priceRangeMatches(rangeId: string, price: number): boolean {
  switch (rangeId) {
    case "under-50":
      return price < 50;
    case "50-100":
      return price >= 50 && price <= 100;
    case "100-250":
      return price > 100 && price <= 250;
    case "250-500":
      return price > 250 && price <= 500;
    case "500-plus":
      return price > 500;
    default:
      return true;
  }
}

function ratingMeetsFilter(rangeId: string, rating: number): boolean {
  if (rangeId === "4-plus") return rating >= 4;
  if (rangeId === "3-plus") return rating >= 3;
  return true;
}

function discountMeetsFilter(rangeId: string, discountPercent: number): boolean {
  if (rangeId === "10-plus") return discountPercent >= 10;
  if (rangeId === "20-plus") return discountPercent >= 20;
  if (rangeId === "30-plus") return discountPercent >= 30;
  if (rangeId === "50-plus") return discountPercent >= 50;
  return true;
}

function availabilityMeetsFilter(filterId: string, product: Product): boolean {
  if (filterId === "in-stock") return product.stock > 0;
  if (filterId === "fast-delivery") return /tomorrow|2–3 days/i.test(product.deliveryEstimate);
  if (filterId === "available-today") return /tomorrow/i.test(product.deliveryEstimate);
  return true;
}

/* ============================================================================
 * 7. REDUX TOOLKIT — SLICES, STORE, SELECTORS
 * ==========================================================================*/

interface StoreIdentityState {
  activeTab: StoreTab;
  isFollowing: boolean;
  followerCount: number;
}

const storeIdentitySlice = createSlice({
  name: "storeIdentity",
  initialState: {
    activeTab: StoreTab.OVERVIEW,
    isFollowing: false,
    followerCount: MOCK_STORE.followerCount,
  } as StoreIdentityState,
  reducers: {
    setStoreTab(state, action: PayloadAction<StoreTab>) {
      state.activeTab = action.payload;
    },
    toggleFollow(state) {
      state.isFollowing = !state.isFollowing;
      state.followerCount += state.isFollowing ? 1 : -1;
    },
  },
});

const initialFiltersState: FiltersState = {
  categories: [],
  priceRange: null,
  rating: null,
  discount: null,
  availability: [],
};

const filtersSlice = createSlice({
  name: "filters",
  initialState: initialFiltersState,
  reducers: {
    toggleCategoryFilter(state, action: PayloadAction<string>) {
      const idx = state.categories.indexOf(action.payload);
      if (idx >= 0) state.categories.splice(idx, 1);
      else state.categories.push(action.payload);
    },
    toggleAvailabilityFilter(state, action: PayloadAction<string>) {
      const idx = state.availability.indexOf(action.payload);
      if (idx >= 0) state.availability.splice(idx, 1);
      else state.availability.push(action.payload);
    },
    setPriceRange(state, action: PayloadAction<string | null>) {
      state.priceRange = state.priceRange === action.payload ? null : action.payload;
    },
    setRatingFilter(state, action: PayloadAction<string | null>) {
      state.rating = state.rating === action.payload ? null : action.payload;
    },
    setDiscountFilter(state, action: PayloadAction<string | null>) {
      state.discount = state.discount === action.payload ? null : action.payload;
    },
    removeFilter(state, action: PayloadAction<{ group: keyof FiltersState; value?: string }>) {
      const { group, value } = action.payload;
      if (group === "categories" && value) {
        state.categories = state.categories.filter((v) => v !== value);
      } else if (group === "availability" && value) {
        state.availability = state.availability.filter((v) => v !== value);
      } else if (group === "priceRange") {
        state.priceRange = null;
      } else if (group === "rating") {
        state.rating = null;
      } else if (group === "discount") {
        state.discount = null;
      }
    },
    clearFilters() {
      return initialFiltersState;
    },
  },
});

const sortSlice = createSlice({
  name: "sort",
  initialState: { option: SortOption.RELEVANCE },
  reducers: {
    setSort(state, action: PayloadAction<SortOption>) {
      state.option = action.payload;
    },
  },
});

interface UiState {
  viewMode: ViewMode;
  isFilterDrawerOpen: boolean;
}

const uiSlice = createSlice({
  name: "ui",
  initialState: { viewMode: ViewMode.GRID, isFilterDrawerOpen: false } as UiState,
  reducers: {
    setViewMode(state, action: PayloadAction<ViewMode>) {
      state.viewMode = action.payload;
    },
    openFilterDrawer(state) {
      state.isFilterDrawerOpen = true;
    },
    closeFilterDrawer(state) {
      state.isFilterDrawerOpen = false;
    },
  },
});

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: { productIds: [] as string[] },
  reducers: {
    toggleWishlist(state, action: PayloadAction<string>) {
      const idx = state.productIds.indexOf(action.payload);
      if (idx >= 0) state.productIds.splice(idx, 1);
      else state.productIds.push(action.payload);
    },
  },
});

interface CartItem {
  productId: string;
  quantity: number;
}

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: [] as CartItem[] },
  reducers: {
    addToCart(state, action: PayloadAction<string>) {
      const existing = state.items.find((item) => item.productId === action.payload);
      if (existing) existing.quantity += 1;
      else state.items.push({ productId: action.payload, quantity: 1 });
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.productId !== action.payload);
    },
  },
});

export const {
  toggleCategoryFilter,
  toggleAvailabilityFilter,
  setPriceRange,
  setRatingFilter,
  setDiscountFilter,
  removeFilter,
  clearFilters,
} = filtersSlice.actions;
export const { setStoreTab, toggleFollow } = storeIdentitySlice.actions;
export const { setSort } = sortSlice.actions;
export const { setViewMode, openFilterDrawer, closeFilterDrawer } = uiSlice.actions;
export const { toggleWishlist } = wishlistSlice.actions;
export const { addToCart, removeFromCart } = cartSlice.actions;

const store = configureStore({
  reducer: {
    storeIdentity: storeIdentitySlice.reducer,
    filters: filtersSlice.reducer,
    sort: sortSlice.reducer,
    ui: uiSlice.reducer,
    wishlist: wishlistSlice.reducer,
    cart: cartSlice.reducer,
  },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

const selectFilters = (state: RootState) => state.filters;
const selectSortOption = (state: RootState) => state.sort.option;

const selectFilteredSortedProducts = createSelector(
  [selectFilters, selectSortOption],
  (filters, sortOption) => {
    let result = MOCK_PRODUCTS.filter((product) => {
      if (filters.categories.length > 0 && !filters.categories.includes(product.category)) return false;
      if (filters.priceRange && !priceRangeMatches(filters.priceRange, product.price)) return false;
      if (filters.rating && !ratingMeetsFilter(filters.rating, product.rating)) return false;
      if (filters.discount) {
        const pct = calculateDiscountPercent(product.price, product.originalPrice);
        if (!discountMeetsFilter(filters.discount, pct)) return false;
      }
      if (filters.availability.length > 0 && !filters.availability.every((f) => availabilityMeetsFilter(f, product))) {
        return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case SortOption.PRICE_LOW:
          return a.price - b.price;
        case SortOption.PRICE_HIGH:
          return b.price - a.price;
        case SortOption.RATING:
          return b.rating - a.rating;
        case SortOption.NEWEST:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case SortOption.BEST_SELLING:
        case SortOption.POPULAR:
          return b.sold - a.sold;
        case SortOption.DISCOUNT:
          return calculateDiscountPercent(b.price, b.originalPrice) - calculateDiscountPercent(a.price, a.originalPrice);
        default:
          return 0;
      }
    });

    return result;
  }
);

/* ============================================================================
 * 8. REUSABLE PRIMITIVES
 * ==========================================================================*/

function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md";
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
    outline: "border border-border bg-transparent text-foreground hover:bg-muted",
    ghost: "bg-transparent text-foreground hover:bg-muted",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
  };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

function Badge({ tone = "default", className, children }: { tone?: "default" | "success" | "discount" | "warning"; className?: string; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-success text-success-foreground",
    discount: "bg-discount text-discount-foreground",
    warning: "bg-warning text-warning-foreground",
  };
  return (
    <span className={cn("inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium leading-none", tones[tone], className)}>
      {children}
    </span>
  );
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`Rated ${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.round(rating);
        return <Star key={i} width={size} height={size} className={filled ? "star-fill" : "star-empty"} strokeWidth={1.5} />;
      })}
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
      {action}
    </div>
  );
}

/* ============================================================================
 * 9. STORE IDENTITY COMPONENTS
 * ==========================================================================*/

function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium", getVerificationTokenClass(status))}>
      <BadgeCheck width={13} height={13} aria-hidden="true" />
      {VERIFICATION_LABELS[status]}
    </span>
  );
}

function StoreStats({ store: s }: { store: Store }) {
  const stats = [
    { label: "Rating", value: s.rating.toFixed(1) },
    { label: "Reviews", value: formatCompactNumber(s.reviewCount) },
    { label: "Followers", value: formatCompactNumber(s.followerCount) },
    { label: "Products", value: formatCompactNumber(s.productCount) },
  ];
  return (
    <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-baseline gap-1.5">
          <dt className="sr-only">{stat.label}</dt>
          <dd className="font-display font-semibold text-foreground">{stat.value}</dd>
          <span className="text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </dl>
  );
}

function FollowButton() {
  const dispatch = useAppDispatch();
  const isFollowing = useAppSelector((s) => s.storeIdentity.isFollowing);
  return (
    <Button
      variant={isFollowing ? "outline" : "primary"}
      aria-pressed={isFollowing}
      onClick={() => dispatch(toggleFollow())}
    >
      <Heart width={16} height={16} className={isFollowing ? "fill-current" : undefined} aria-hidden="true" />
      {isFollowing ? "Following" : "Follow Store"}
    </Button>
  );
}

function StoreHero({ store: s }: { store: Store }) {
  return (
    <section aria-labelledby="store-name" className="border-b border-border">
      <div className="h-36 w-full bg-[linear-gradient(120deg,oklch(30%_0.02_262),oklch(58%_0.135_48))] sm:h-48" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 pb-6 sm:flex-row sm:items-end sm:gap-6">
          <div
            className="-mt-10 flex h-20 w-20 flex-none items-center justify-center rounded-lg border-4 border-background bg-card font-display text-2xl font-semibold text-foreground shadow-sm sm:-mt-12 sm:h-24 sm:w-24"
            aria-hidden="true"
          >
            {s.logoInitials}
          </div>
          <div className="flex flex-1 flex-col gap-2 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 id="store-name" className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
                {s.name}
              </h1>
              <VerificationBadge status={s.verification} />
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">{s.tagline}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <StoreStats store={s} />
              <span className="flex items-center gap-1">
                <MapPin width={14} height={14} aria-hidden="true" />
                {s.location.city}, {s.location.country}
              </span>
            </div>
          </div>
          <div className="flex flex-none items-center gap-2 pt-2">
            <FollowButton />
            <Button variant="outline" aria-label="Share this store">
              <Share2 width={16} height={16} aria-hidden="true" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoreNavigation() {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector((s) => s.storeIdentity.activeTab);
  return (
    <nav aria-label="Store sections" className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 no-scrollbar sm:px-6 lg:px-8" role="tablist">
        {STORE_TAB_CONFIG.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => dispatch(setStoreTab(tab.id))}
              className={cn(
                "relative flex-none whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors focus-visible:ring-2",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {isActive && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 py-3 text-xs text-muted-foreground sm:px-6 lg:px-8">
      <ol className="flex flex-wrap items-center gap-1">
        <li><a href="#" className="hover:text-foreground">Home</a></li>
        <li aria-hidden="true">/</li>
        <li><a href="#" className="hover:text-foreground">Audio</a></li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-foreground">{MOCK_STORE.name}</li>
      </ol>
    </nav>
  );
}

/* ============================================================================
 * 10. CAMPAIGN COMPONENTS
 * ==========================================================================*/

function CampaignCard({ campaign }: { campaign: StoreCampaign }) {
  return (
    <article className="flex min-w-[280px] flex-col justify-between gap-4 rounded-lg border border-border p-5 sm:min-w-[340px]" style={{ background: `color-mix(in oklch, ${campaign.swatch} 10%, var(--card))` }}>
      <div>
        <Badge tone="discount">{campaign.discountLabel}</Badge>
        <h3 className="mt-2 font-display text-lg font-semibold text-foreground">{campaign.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{campaign.subtitle}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock width={13} height={13} aria-hidden="true" />
          Ends {formatDate(campaign.expiresAt)}
        </span>
        <Button size="sm" variant="secondary">{campaign.ctaLabel}</Button>
      </div>
    </article>
  );
}

function StoreCampaigns() {
  return (
    <section aria-labelledby="campaigns-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="Featured Campaigns" />
      <div id="campaigns-heading" className="sr-only" />
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {MOCK_CAMPAIGNS.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
 * 11. CATEGORY COMPONENTS
 * ==========================================================================*/

function CategoryCard({ category, onSelect }: { category: StoreCategoryItem; onSelect: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelect(category.id)}
      className="group flex min-w-[128px] flex-none flex-col items-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:border-primary focus-visible:ring-2 sm:min-w-[144px]"
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: category.swatch }}
        aria-hidden="true"
      >
        {category.name.slice(0, 1)}
      </span>
      <span className="text-sm font-medium text-foreground">{category.name}</span>
      <span className="text-xs text-muted-foreground">{category.productCount} items</span>
    </button>
  );
}

function StoreCategories({ onSelectCategory }: { onSelectCategory: (id: string) => void }) {
  return (
    <section aria-labelledby="categories-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="Shop by Category" />
      <div id="categories-heading" className="sr-only" />
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {MOCK_CATEGORIES.map((category) => (
          <CategoryCard key={category.id} category={category} onSelect={onSelectCategory} />
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
 * 12. FILTER COMPONENTS
 * ==========================================================================*/

function FilterCheckboxGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset className="border-b border-border py-4">
      <legend className="mb-2 text-sm font-semibold text-foreground">{title}</legend>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded-sm border-border accent-[var(--primary)]"
              checked={selected.includes(option.id)}
              onChange={() => onToggle(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FilterRadioGroup({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: FilterOption[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <fieldset className="border-b border-border py-4">
      <legend className="mb-2 text-sm font-semibold text-foreground">{title}</legend>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <input
              type="radio"
              name={title}
              className="h-4 w-4 border-border accent-[var(--primary)]"
              checked={selected === option.id}
              onChange={() => onSelect(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FilterSidebarContent() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);
  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <h2 className="font-display text-base font-semibold text-foreground">Filters</h2>
        <button onClick={() => dispatch(clearFilters())} className="text-xs font-medium text-primary hover:underline">
          Clear all
        </button>
      </div>
      <FilterCheckboxGroup
        title="Category"
        options={CATEGORY_FILTER_OPTIONS}
        selected={filters.categories}
        onToggle={(id) => dispatch(toggleCategoryFilter(id))}
      />
      <FilterRadioGroup
        title="Price"
        options={PRICE_FILTER_OPTIONS}
        selected={filters.priceRange}
        onSelect={(id) => dispatch(setPriceRange(id))}
      />
      <FilterRadioGroup
        title="Rating"
        options={RATING_FILTER_OPTIONS}
        selected={filters.rating}
        onSelect={(id) => dispatch(setRatingFilter(id))}
      />
      <FilterRadioGroup
        title="Discount"
        options={DISCOUNT_FILTER_OPTIONS}
        selected={filters.discount}
        onSelect={(id) => dispatch(setDiscountFilter(id))}
      />
      <FilterCheckboxGroup
        title="Availability"
        options={AVAILABILITY_FILTER_OPTIONS}
        selected={filters.availability}
        onToggle={(id) => dispatch(toggleAvailabilityFilter(id))}
      />
    </div>
  );
}

function FilterSidebar() {
  return (
    <aside aria-label="Product filters" className="hidden w-64 flex-none lg:block">
      <FilterSidebarContent />
    </aside>
  );
}

function FilterDrawer() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.ui.isFilterDrawerOpen);
  const titleId = useId();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-black/40" onClick={() => dispatch(closeFilterDrawer())} aria-hidden="true" />
      <div className="absolute inset-y-0 right-0 w-full max-w-xs overflow-y-auto bg-background p-4 shadow-xl">
        <div className="flex items-center justify-between pb-2">
          <h2 id={titleId} className="font-display text-base font-semibold text-foreground">Filters</h2>
          <button onClick={() => dispatch(closeFilterDrawer())} aria-label="Close filters" className="rounded-md p-1 hover:bg-muted focus-visible:ring-2">
            <X width={18} height={18} />
          </button>
        </div>
        <FilterSidebarContent />
        <Button className="mt-4 w-full" onClick={() => dispatch(closeFilterDrawer())}>
          View Results
        </Button>
      </div>
    </div>
  );
}

function ActiveFilterChips() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);

  const chips: { key: string; label: string; group: keyof FiltersState; value?: string }[] = [
    ...filters.categories.map((id) => ({
      key: `cat-${id}`,
      label: CATEGORY_FILTER_OPTIONS.find((o) => o.id === id)?.label ?? id,
      group: "categories" as const,
      value: id,
    })),
    ...(filters.priceRange
      ? [{ key: "price", label: PRICE_FILTER_OPTIONS.find((o) => o.id === filters.priceRange)?.label ?? "", group: "priceRange" as const }]
      : []),
    ...(filters.rating
      ? [{ key: "rating", label: RATING_FILTER_OPTIONS.find((o) => o.id === filters.rating)?.label ?? "", group: "rating" as const }]
      : []),
    ...(filters.discount
      ? [{ key: "discount", label: DISCOUNT_FILTER_OPTIONS.find((o) => o.id === filters.discount)?.label ?? "", group: "discount" as const }]
      : []),
    ...filters.availability.map((id) => ({
      key: `avail-${id}`,
      label: AVAILABILITY_FILTER_OPTIONS.find((o) => o.id === id)?.label ?? id,
      group: "availability" as const,
      value: id,
    })),
  ];

  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={() => dispatch(removeFilter({ group: chip.group, value: chip.value }))}
          className="flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground hover:bg-muted focus-visible:ring-2"
        >
          {chip.label}
          <X width={12} height={12} aria-hidden="true" />
        </button>
      ))}
      <button onClick={() => dispatch(clearFilters())} className="text-xs font-medium text-primary hover:underline">
        Clear all
      </button>
    </div>
  );
}

function SortControl() {
  const dispatch = useAppDispatch();
  const option = useAppSelector(selectSortOption);
  return (
    <div className="relative">
      <label htmlFor="sort-select" className="sr-only">Sort products</label>
      <select
        id="sort-select"
        value={option}
        onChange={(e) => dispatch(setSort(e.target.value as SortOption))}
        className="h-9 appearance-none rounded-md border border-border bg-card py-0 pl-3 pr-8 text-sm text-foreground focus-visible:ring-2"
      >
        {Object.values(SortOption).map((value) => (
          <option key={value} value={value}>
            {SORT_OPTION_LABELS[value]}
          </option>
        ))}
      </select>
      <ChevronDown width={14} height={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}

function ViewModeToggle() {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector((s) => s.ui.viewMode);
  return (
    <div className="flex items-center rounded-md border border-border p-0.5" role="group" aria-label="Change view mode">
      <button
        aria-pressed={viewMode === ViewMode.GRID}
        aria-label="Grid view"
        onClick={() => dispatch(setViewMode(ViewMode.GRID))}
        className={cn("rounded p-1.5", viewMode === ViewMode.GRID ? "bg-secondary text-foreground" : "text-muted-foreground")}
      >
        <Grid3x3 width={16} height={16} />
      </button>
      <button
        aria-pressed={viewMode === ViewMode.LIST}
        aria-label="List view"
        onClick={() => dispatch(setViewMode(ViewMode.LIST))}
        className={cn("rounded p-1.5", viewMode === ViewMode.LIST ? "bg-secondary text-foreground" : "text-muted-foreground")}
      >
        <ListIcon width={16} height={16} />
      </button>
    </div>
  );
}

function ListingToolbar({ resultCount }: { resultCount: number }) {
  const dispatch = useAppDispatch();
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{resultCount}</span> products
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="lg:hidden" onClick={() => dispatch(openFilterDrawer())}>
          <SlidersHorizontal width={14} height={14} aria-hidden="true" />
          Filters
        </Button>
        <SortControl />
        <ViewModeToggle />
      </div>
    </div>
  );
}

/* ============================================================================
 * 13. PRODUCT COMPONENTS
 * ==========================================================================*/

function ProductBadgeRow({ badges }: { badges: ProductBadge[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="absolute left-2 top-2 flex flex-col gap-1">
      {badges.map((badge) => (
        <Badge
          key={badge}
          tone={badge === ProductBadge.DISCOUNTED ? "discount" : badge === ProductBadge.BEST_SELLER ? "success" : badge === ProductBadge.LOW_STOCK ? "warning" : "default"}
        >
          {PRODUCT_BADGE_LABELS[badge]}
        </Badge>
      ))}
    </div>
  );
}

function ProductCard({ product, viewMode }: { product: Product; viewMode: ViewMode }) {
  const dispatch = useAppDispatch();
  const isWishlisted = useAppSelector((s) => s.wishlist.productIds.includes(product.id));
  const discountPercent = calculateDiscountPercent(product.price, product.originalPrice);
  const isOutOfStock = product.badges.includes(ProductBadge.OUT_OF_STOCK);

  const imageBlock = (
    <div className={cn("relative flex items-center justify-center overflow-hidden rounded-md bg-muted", viewMode === ViewMode.GRID ? "aspect-square" : "h-32 w-32 flex-none")}>
      <span className="font-display text-sm text-muted-foreground" aria-hidden="true">{product.colorway}</span>
      <ProductBadgeRow badges={product.badges} />
      <button
        onClick={() => dispatch(toggleWishlist(product.id))}
        aria-pressed={isWishlisted}
        aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 text-foreground hover:text-destructive focus-visible:ring-2"
      >
        <Heart width={15} height={15} className={isWishlisted ? "fill-current text-destructive" : undefined} />
      </button>
    </div>
  );

  const infoBlock = (
    <div className="flex flex-1 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{product.collection ?? product.brand}</span>
      <h3 className="line-clamp-2 text-sm font-medium text-foreground">{product.name}</h3>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <StarRating rating={product.rating} size={12} />
        <span>{product.rating.toFixed(1)}</span>
        <span aria-hidden="true">·</span>
        <span>{formatCompactNumber(product.reviewCount)} reviews</span>
      </div>
      <div className="flex items-baseline gap-2 pt-1">
        <span className="font-display text-base font-semibold text-[var(--price)]">{formatCurrency(product.price, product.currency)}</span>
        {product.originalPrice && (
          <>
            <span className="text-xs text-[var(--price-strike)] line-through">{formatCurrency(product.originalPrice, product.currency)}</span>
            <Badge tone="discount">-{discountPercent}%</Badge>
          </>
        )}
      </div>
      {viewMode === ViewMode.LIST && (
        <p className="mt-1 text-xs text-muted-foreground">
          Sold by {MOCK_STORE.name} · {product.stock > 0 ? `${product.stock} in stock` : "Currently unavailable"}
        </p>
      )}
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Truck width={12} height={12} aria-hidden="true" />
        {product.deliveryEstimate}
      </p>
    </div>
  );

  return (
    <article className={cn("flex gap-3 rounded-lg border border-border p-3 transition-shadow hover:shadow-sm", viewMode === ViewMode.GRID ? "flex-col" : "flex-row")}>
      {imageBlock}
      {infoBlock}
      <div className={cn(viewMode === ViewMode.GRID ? "" : "flex flex-none items-end")}>
        <Button size="sm" disabled={isOutOfStock} onClick={() => dispatch(addToCart(product.id))} className={viewMode === ViewMode.GRID ? "w-full" : ""}>
          <ShoppingCart width={14} height={14} aria-hidden="true" />
          {isOutOfStock ? "Notify Me" : "Add to Cart"}
        </Button>
      </div>
    </article>
  );
}

function ProductGrid({ products, viewMode }: { products: Product[]; viewMode: ViewMode }) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No products match your filters. Try clearing a filter to see more results.
      </div>
    );
  }
  return (
    <div className={cn(viewMode === ViewMode.GRID ? "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-3")}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} viewMode={viewMode} />
      ))}
    </div>
  );
}

function FeaturedProducts() {
  const bestSellers = useMemo(
    () => MOCK_PRODUCTS.filter((p) => p.badges.includes(ProductBadge.BEST_SELLER)).slice(0, 4),
    []
  );
  return (
    <section aria-labelledby="featured-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="Best Sellers" />
      <div id="featured-heading" className="sr-only" />
      <ProductGrid products={bestSellers} viewMode={ViewMode.GRID} />
    </section>
  );
}

function StoreProductListing({ categoryFilterRef }: { categoryFilterRef: string | null }) {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector((s) => s.ui.viewMode);
  const products = useAppSelector(selectFilteredSortedProducts);

  React.useEffect(() => {
    if (categoryFilterRef) {
      dispatch(clearFilters());
      dispatch(toggleCategoryFilter(categoryFilterRef));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilterRef]);

  return (
    <section aria-labelledby="listing-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="All Products" />
      <div id="listing-heading" className="sr-only" />
      <div className="flex gap-6">
        <FilterSidebar />
        <div className="flex-1">
          <ListingToolbar resultCount={products.length} />
          <ActiveFilterChips />
          <ProductGrid products={products} viewMode={viewMode} />
        </div>
      </div>
      <FilterDrawer />
    </section>
  );
}

/* ============================================================================
 * STORE DEALS (coupons + campaigns reuse)
 * ==========================================================================*/

function CouponCard({ coupon }: { coupon: Coupon }) {
  const [copied, setCopied] = useState(false);
  const isExpired = coupon.status === "expired";

  const handleCopy = useCallback(() => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, []);

  return (
    <div className={cn("coupon-card flex items-center justify-between gap-4 rounded-lg bg-card p-4", isExpired && "opacity-50")}>
      <div>
        <p className="font-display text-lg font-semibold text-foreground">{coupon.discountLabel}</p>
        <p className="text-xs text-muted-foreground">{coupon.eligibility}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isExpired ? "Expired" : "Expires"} {formatDate(coupon.expiresAt)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-display text-sm font-semibold tracking-wide text-foreground">{coupon.code}</span>
        <Button size="sm" variant="outline" disabled={isExpired} onClick={handleCopy} aria-label={`Copy code ${coupon.code}`}>
          {copied ? <Check width={13} height={13} /> : <Copy width={13} height={13} />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function Check(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function StoreDeals() {
  return (
    <section aria-labelledby="deals-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="Store Coupons" />
      <div id="deals-heading" className="sr-only" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {MOCK_COUPONS.map((coupon) => (
          <CouponCard key={coupon.id} coupon={coupon} />
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
 * 14. REVIEW COMPONENTS
 * ==========================================================================*/

function RatingDistributionBar({ stars, percent }: { stars: number; percent: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="w-8 flex-none">{stars}★</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${stars} star reviews`}>
        <div className="h-full rounded-full bg-[var(--rating-star)]" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-8 flex-none text-right">{percent}%</span>
    </div>
  );
}

function RatingSummary({ store: s }: { store: Store }) {
  const distribution = [
    { stars: 5, percent: 72 },
    { stars: 4, percent: 18 },
    { stars: 3, percent: 6 },
    { stars: 2, percent: 3 },
    { stars: 1, percent: 1 },
  ];
  return (
    <div className="grid grid-cols-1 gap-6 rounded-lg border border-border p-5 sm:grid-cols-2">
      <div className="flex flex-col items-start justify-center gap-1">
        <span className="font-display text-4xl font-semibold text-foreground">{s.rating.toFixed(1)}</span>
        <StarRating rating={s.rating} size={16} />
        <span className="text-sm text-muted-foreground">{formatCompactNumber(s.reviewCount)} reviews</span>
      </div>
      <div className="flex flex-col justify-center gap-1.5">
        {distribution.map((row) => (
          <RatingDistributionBar key={row.stars} stars={row.stars} percent={row.percent} />
        ))}
      </div>
    </div>
  );
}

const REVIEW_FILTERS = ["Most Relevant", "Most Recent", "Highest Rated", "Lowest Rated", "Verified Purchase", "With Photos"] as const;

function ReviewFilters() {
  const [active, setActive] = useState<(typeof REVIEW_FILTERS)[number]>("Most Relevant");
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Sort and filter reviews">
      {REVIEW_FILTERS.map((filter) => (
        <button
          key={filter}
          onClick={() => setActive(filter)}
          aria-pressed={active === filter}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2",
            active === filter ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="border-b border-border py-5 first:pt-0 last:border-0">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-muted" aria-hidden="true">
          <User width={15} height={15} className="text-muted-foreground" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">{review.author}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <StarRating rating={review.rating} size={12} />
            <span>{formatDate(review.date)}</span>
            {review.verifiedPurchase && (
              <span className="flex items-center gap-0.5 text-success">
                <BadgeCheck width={12} height={12} aria-hidden="true" /> Verified Purchase
              </span>
            )}
          </div>
        </div>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{review.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{review.content}</p>
      {review.photoCount > 0 && (
        <div className="mt-2 flex gap-2" aria-label={`${review.photoCount} photos attached`}>
          {Array.from({ length: review.photoCount }).map((_, i) => (
            <div key={i} className="h-14 w-14 rounded-md bg-muted" aria-hidden="true" />
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <button className="flex items-center gap-1 hover:text-foreground focus-visible:ring-2">
          <ThumbsUp width={13} height={13} aria-hidden="true" /> Helpful ({review.helpfulCount})
        </button>
        <button className="hover:text-foreground focus-visible:ring-2">Report</button>
      </div>
    </article>
  );
}

function StoreReviews() {
  return (
    <section aria-labelledby="reviews-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="Customer Reviews" />
      <div id="reviews-heading" className="sr-only" />
      <RatingSummary store={MOCK_STORE} />
      <div className="mt-6">
        <ReviewFilters />
        <div>
          {MOCK_REVIEWS.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * SELLER / BRAND TRUST + ABOUT
 * ==========================================================================*/

function SellerTrustSection({ store: s }: { store: Store }) {
  const brandItems = [
    { icon: BadgeCheck, label: "Official Brand" },
    { icon: ShieldCheck, label: "Authorized Products" },
    { icon: Award, label: "Manufacturer Warranty" },
  ];
  const sellerItems = [
    { icon: BadgeCheck, label: "Verified Seller" },
    { icon: Truck, label: "High Fulfillment Rate" },
    { icon: RotateCcw, label: "Reliable Returns" },
  ];
  const items = s.type === StoreType.BRAND ? brandItems : sellerItems;

  return (
    <section aria-labelledby="trust-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="Why Shop This Store" />
      <div id="trust-heading" className="sr-only" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border p-4">
            <item.icon width={20} height={20} className="flex-none text-primary" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">{item.label}</span>
          </div>
        ))}
        {s.sellerMetrics && (
          <>
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              {s.sellerMetrics.onTimeShippingRate}% orders shipped on time
            </div>
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              {s.sellerMetrics.responseRate}% response rate
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function StoreAbout({ store: s }: { store: Store }) {
  return (
    <section aria-labelledby="about-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="About This Store" />
      <div id="about-heading" className="sr-only" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <p className="text-sm leading-relaxed text-muted-foreground lg:col-span-2">{s.description}</p>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground">Location</dt>
            <dd className="text-foreground">{s.location.city}, {s.location.country}</dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground">Joined</dt>
            <dd className="text-foreground">{formatDate(s.joinedDate)}</dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted-foreground">Response Time</dt>
            <dd className="text-foreground">{s.responseTime}</dd>
          </div>
          {s.brandProfile && (
            <>
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">Founded</dt>
                <dd className="text-foreground">{s.brandProfile.foundedYear}</dd>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">Website</dt>
                <dd className="text-primary">{s.brandProfile.officialWebsite}</dd>
              </div>
              <div className="flex justify-between pb-2">
                <dt className="text-muted-foreground">Warranty</dt>
                <dd className="text-right text-foreground">{s.brandProfile.warrantyInfo}</dd>
              </div>
            </>
          )}
        </dl>
      </div>
    </section>
  );
}

/* ============================================================================
 * 15. RELATED-STORE COMPONENTS
 * ==========================================================================*/

function RelatedStoreCard({ relatedStore }: { relatedStore: RelatedStoreCardData }) {
  return (
    <article className="flex min-w-[220px] flex-none flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-md bg-muted font-display text-sm font-semibold text-foreground" aria-hidden="true">
          {relatedStore.initials}
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">{relatedStore.name}</p>
          <VerificationBadge status={relatedStore.verification} />
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <StarRating rating={relatedStore.rating} size={12} />
        <span>{relatedStore.rating.toFixed(1)}</span>
        <span aria-hidden="true">·</span>
        <span>{formatCompactNumber(relatedStore.followerCount)} followers</span>
      </div>
      <p className="text-xs text-muted-foreground">{relatedStore.category}</p>
      <Button size="sm" variant="outline">Visit Store</Button>
    </article>
  );
}

function RelatedStores() {
  return (
    <section aria-labelledby="related-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="Related Brands You May Like" />
      <div id="related-heading" className="sr-only" />
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {MOCK_RELATED_STORES.map((relatedStore) => (
          <RelatedStoreCard key={relatedStore.id} relatedStore={relatedStore} />
        ))}
      </div>
    </section>
  );
}

function RecentlyViewed() {
  const items = MOCK_PRODUCTS.slice(4, 8);
  return (
    <section aria-labelledby="recent-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="Recently Viewed" />
      <div id="recent-heading" className="sr-only" />
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {items.map((product) => (
          <div key={product.id} className="min-w-[160px] flex-none rounded-lg border border-border p-3">
            <div className="mb-2 flex aspect-square items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
              {product.colorway}
            </div>
            <p className="line-clamp-2 text-xs font-medium text-foreground">{product.name}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--price)]">{formatCurrency(product.price, product.currency)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustSection() {
  const items = [
    { icon: ShieldCheck, label: "Secure Payments" },
    { icon: BadgeCheck, label: "Buyer Protection" },
    { icon: RotateCcw, label: "Easy Returns" },
    { icon: Award, label: "Authentic Products" },
    { icon: Truck, label: "24/7 Support" },
  ];
  return (
    <section aria-label="Site-wide trust signals" className="border-y border-border bg-muted/40">
      <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
            <item.icon width={17} height={17} className="text-primary" aria-hidden="true" />
            {item.label}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
 * 16. HEADER / FOOTER
 * ==========================================================================*/

function AnnouncementBar() {
  return (
    <div className="bg-secondary py-1.5 text-center text-xs text-secondary-foreground">
      Free shipping on orders over $75 · 2-year warranty on every Meridian product
    </div>
  );
}

function SearchBar() {
  return (
    <div className="relative hidden flex-1 max-w-md sm:block">
      <label htmlFor="marketplace-search" className="sr-only">Search products and stores</label>
      <Search width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id="marketplace-search"
        type="search"
        placeholder="Search products, brands, and categories"
        className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2"
      />
    </div>
  );
}

function HeaderActions() {
  const cartCount = useAppSelector((s) => s.cart.items.reduce((sum, item) => sum + item.quantity, 0));
  const wishlistCount = useAppSelector((s) => s.wishlist.productIds.length);
  return (
    <div className="flex items-center gap-1">
      <button aria-label={`Wishlist, ${wishlistCount} items`} className="relative rounded-md p-2 text-foreground hover:bg-muted focus-visible:ring-2">
        <Heart width={19} height={19} />
        {wishlistCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {wishlistCount}
          </span>
        )}
      </button>
      <button aria-label={`Cart, ${cartCount} items`} className="relative rounded-md p-2 text-foreground hover:bg-muted focus-visible:ring-2">
        <ShoppingCart width={19} height={19} />
        {cartCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {cartCount}
          </span>
        )}
      </button>
      <button aria-label="Account" className="rounded-md p-2 text-foreground hover:bg-muted focus-visible:ring-2">
        <User width={19} height={19} />
      </button>
    </div>
  );
}

function CategoryNavigation() {
  return (
    <nav aria-label="Marketplace categories" className="hidden border-t border-border sm:block">
      <div className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-4 py-2 no-scrollbar sm:px-6 lg:px-8">
        {STORE_NAV_LINKS.map((link) => (
          <a key={link} href="#" className="flex-none whitespace-nowrap text-xs font-medium text-muted-foreground hover:text-foreground">
            {link}
          </a>
        ))}
      </div>
    </nav>
  );
}

function MainHeader() {
  return (
    <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <button aria-label="Open menu" className="rounded-md p-2 text-foreground hover:bg-muted sm:hidden">
        <Menu width={20} height={20} />
      </button>
      <a href="#" className="font-display text-lg font-semibold text-foreground">Marketplace</a>
      <SearchBar />
      <div className="flex-1 sm:hidden" />
      <HeaderActions />
    </div>
  );
}

function EcommerceHeader() {
  return (
    <header className="border-b border-border bg-background">
      <AnnouncementBar />
      <MainHeader />
      <CategoryNavigation />
    </header>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link}>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">{link}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EcommerceFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:grid-cols-6 lg:px-8">
        <FooterColumn title="Shop" links={["New Arrivals", "Best Sellers", "Deals", "Gift Cards"]} />
        <FooterColumn title="Customer Service" links={["Help Center", "Track Order", "Returns", "Contact Us"]} />
        <FooterColumn title="About" links={["Our Story", "Careers", "Press", "Sustainability"]} />
        <FooterColumn title="Sell With Us" links={["Become a Seller", "Brand Partnerships", "Seller Guidelines"]} />
        <FooterColumn title="Payments & Delivery" links={["Payment Methods", "Shipping Info", "International Orders"]} />
        <FooterColumn title="Legal" links={["Terms of Service", "Privacy Policy", "Accessibility"]} />
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          © 2026 Marketplace, Inc. Available on iOS and Android.
        </p>
      </div>
    </footer>
  );
}

/* ============================================================================
 * 17. PAGE COMPOSITION
 * ==========================================================================*/

function StoreTabContent() {
  const activeTab = useAppSelector((s) => s.storeIdentity.activeTab);
  const [categoryFilterRef, setCategoryFilterRef] = useState<string | null>(null);

  const handleSelectCategory = useCallback((id: string) => {
    setCategoryFilterRef(id);
  }, []);

  switch (activeTab) {
    case StoreTab.PRODUCTS:
      return <StoreProductListing categoryFilterRef={categoryFilterRef} />;
    case StoreTab.DEALS:
      return (
        <>
          <StoreCampaigns />
          <StoreDeals />
        </>
      );
    case StoreTab.CATEGORIES:
      return <StoreCategories onSelectCategory={handleSelectCategory} />;
    case StoreTab.REVIEWS:
      return <StoreReviews />;
    case StoreTab.ABOUT:
      return (
        <>
          <StoreAbout store={MOCK_STORE} />
          <SellerTrustSection store={MOCK_STORE} />
        </>
      );
    case StoreTab.OVERVIEW:
    default:
      return (
        <>
          <StoreCampaigns />
          <FeaturedProducts />
          <StoreCategories onSelectCategory={handleSelectCategory} />
          <SellerTrustSection store={MOCK_STORE} />
        </>
      );
  }
}

function SellerBrandPageContent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EcommerceHeader />
      <Breadcrumbs />
      <StoreHero store={MOCK_STORE} />
      <StoreNavigation />
      <main>
        <StoreTabContent />
        <RelatedStores />
        <RecentlyViewed />
      </main>
      <TrustSection />
      <EcommerceFooter />
    </div>
  );
}

/* ============================================================================
 * 18. EXPORT
 * ==========================================================================*/

export default function SellerBrandPage() {
  return (
    <Provider store={store}>
      <SellerBrandPageContent />
    </Provider>
  );
}