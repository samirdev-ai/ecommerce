"use client";

/**
 * ============================================================================
 * ENTERPRISE ECOMMERCE HOME PAGE
 * ----------------------------------------------------------------------------
 * Single-file page module. Internally layered as: types -> constants/config ->
 * mock data -> utilities -> Redux (store/slices/selectors) -> hooks ->
 * primitives -> domain components -> section components -> page composition.
 * Every unit is written so it could be extracted to its own module later
 * with only an import/export change.
 * ============================================================================
 */

// ============================================================================
// IMPORTS
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode, } from "react";
import { configureStore, createSlice, createSelector, type PayloadAction, } from "@reduxjs/toolkit";
import { Provider, useDispatch as useReduxDispatch, useSelector as useReduxSelector, type TypedUseSelectorHook, } from "react-redux";
import { Search, MapPin, User, Heart, ShoppingCart, Bell, Menu, X, ChevronLeft, ChevronRight, ChevronDown, Star, Truck, ShieldCheck, RotateCcw, Headphones, BadgeCheck, Flame, Clock, Eye, Plus, Minus, ArrowRight, Smartphone, Shirt, Sofa, Sparkles, Dumbbell, Gamepad2, Baby, Car, Apple as AppleIcon, MessageCircle, Camera, Rss, PlayCircle, Download, CreditCard, Wallet, Percent, type LucideIcon,} from "lucide-react";


// ============================================================================
// DOMAIN TYPES
// ============================================================================

type ThemeMode = "light" | "dark";

type ProductBadge = "new" | "best-seller" | "discounted" | "low-stock" | "out-of-stock" | "none";

interface Money {
  amount: number;
  currency: "USD";
}

interface ProductRatingSummary {
  average: number;
  count: number;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  price: number;
  originalPrice?: number;
  currency: "USD";
  rating: ProductRatingSummary;
  badge: ProductBadge;
  stockRemaining?: number;
  stockTotal?: number;
  installmentMonths?: number;
  colorwayCount?: number;
}

interface Category {
  id: string;
  name: string;
  productCount: number;
  icon: LucideIcon;
  accent: string;
}

interface Brand {
  id: string;
  name: string;
  category: string;
  initials: string;
}

interface Deal {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  accent: string;
  icon: LucideIcon;
}

interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  accent: string;
}

interface TrustFeature {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  highlight?: boolean;
}

interface CartLineItem {
  productId: string;
  quantity: number;
}

interface FooterLinkGroup {
  id: string;
  title: string;
  links: { label: string; href: string }[];
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const FREE_SHIPPING_THRESHOLD = 49;
const FLASH_DEAL_DURATION_SECONDS = 6 * 60 * 60; // 6 hours
const HERO_AUTOPLAY_INTERVAL_MS = 6000;
const LOW_STOCK_THRESHOLD_PERCENT = 30;
const RECENTLY_VIEWED_LIMIT = 6;

const PRIMARY_NAVIGATION: NavigationItem[] = [
  { id: "categories", label: "Categories", href: "#categories" },
  { id: "deals", label: "Today's Deals", href: "#flash-deals", highlight: true },
  { id: "new", label: "New Arrivals", href: "#recommended" },
  { id: "best-sellers", label: "Best Sellers", href: "#trending" },
  { id: "trending", label: "Trending", href: "#trending" },
  { id: "brands", label: "Brands", href: "#brands" },
  { id: "offers", label: "Offers", href: "#deals" },
];

const ANNOUNCEMENT_MESSAGES: string[] = [
  `Free shipping on orders over $${FREE_SHIPPING_THRESHOLD} — no code needed`,
  "Autumn Sale: up to 60% off electronics, ends Sunday",
  "Join Prime Plus for free next-day delivery on 2M+ items",
];

const SEARCH_SUGGESTIONS: string[] = [
  "wireless headphones",
  "running shoes",
  "robot vacuum",
  "espresso machine",
  "gaming laptop",
  "skincare set",
];

const CATEGORY_ICON_ACCENTS = {
  electronics: "oklch(0.55 0.15 250)",
  fashion: "oklch(0.6 0.16 350)",
  home: "oklch(0.55 0.12 152)",
  beauty: "oklch(0.62 0.14 15)",
  sports: "oklch(0.55 0.15 200)",
  gaming: "oklch(0.55 0.18 300)",
  baby: "oklch(0.68 0.1 75)",
  automotive: "oklch(0.4 0.02 60)",
} as const;

const CATEGORIES: Category[] = [
  { id: "electronics", name: "Electronics", productCount: 128430, icon: Smartphone, accent: CATEGORY_ICON_ACCENTS.electronics },
  { id: "fashion", name: "Fashion", productCount: 342110, icon: Shirt, accent: CATEGORY_ICON_ACCENTS.fashion },
  { id: "home", name: "Home & Kitchen", productCount: 96870, icon: Sofa, accent: CATEGORY_ICON_ACCENTS.home },
  { id: "beauty", name: "Beauty & Personal Care", productCount: 71540, icon: Sparkles, accent: CATEGORY_ICON_ACCENTS.beauty },
  { id: "sports", name: "Sports & Outdoors", productCount: 58200, icon: Dumbbell, accent: CATEGORY_ICON_ACCENTS.sports },
  { id: "gaming", name: "Gaming", productCount: 41980, icon: Gamepad2, accent: CATEGORY_ICON_ACCENTS.gaming },
  { id: "baby", name: "Baby & Kids", productCount: 33760, icon: Baby, accent: CATEGORY_ICON_ACCENTS.baby },
  { id: "automotive", name: "Automotive", productCount: 27690, icon: Car, accent: CATEGORY_ICON_ACCENTS.automotive },
];

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "autumn-sale",
    eyebrow: "Autumn Sale · Ends Sunday",
    title: "Up to 60% off electronics & home essentials",
    description: "Shop thousands of markdowns on the brands you trust, with free returns for 90 days.",
    primaryCtaLabel: "Shop the sale",
    secondaryCtaLabel: "See all deals",
    accent: "oklch(0.53 0.19 35)",
  },
  {
    id: "new-iphone",
    eyebrow: "Just launched",
    title: "The new Pixel 9 Pro is here",
    description: "Reserve yours today and get a $100 store credit plus a free case with trade-in.",
    primaryCtaLabel: "Pre-order now",
    secondaryCtaLabel: "Learn more",
    accent: "oklch(0.4 0.03 240)",
  },
  {
    id: "membership",
    eyebrow: "Prime Plus membership",
    title: "Unlimited free next-day delivery",
    description: "Join for $6.99/mo and unlock early access to flash deals and member-only pricing.",
    primaryCtaLabel: "Join Prime Plus",
    secondaryCtaLabel: "See benefits",
    accent: "oklch(0.53 0.13 152)",
  },
];

const PROMOTIONAL_DEALS: Deal[] = [
  { id: "electronics-deal", title: "Electronics blowout", subtitle: "Save up to 45% on laptops & audio", ctaLabel: "Shop electronics", accent: CATEGORY_ICON_ACCENTS.electronics, icon: Smartphone },
  { id: "fashion-deal", title: "Fall wardrobe refresh", subtitle: "New arrivals from 120+ brands", ctaLabel: "Shop fashion", accent: CATEGORY_ICON_ACCENTS.fashion, icon: Shirt },
  { id: "home-deal", title: "Home makeover event", subtitle: "Up to 35% off furniture & decor", ctaLabel: "Shop home", accent: CATEGORY_ICON_ACCENTS.home, icon: Sofa },
  { id: "beauty-deal", title: "Beauty essentials", subtitle: "Buy 2 get 1 free, sitewide", ctaLabel: "Shop beauty", accent: CATEGORY_ICON_ACCENTS.beauty, icon: Sparkles },
  { id: "gaming-deal", title: "Gaming week", subtitle: "Consoles, headsets & accessories", ctaLabel: "Shop gaming", accent: CATEGORY_ICON_ACCENTS.gaming, icon: Gamepad2 },
];

const BRANDS: Brand[] = [
  { id: "sony", name: "Sony", category: "Electronics & Audio", initials: "SN" },
  { id: "apple", name: "Apple", category: "Electronics", initials: "AP" },
  { id: "nike", name: "Nike", category: "Footwear & Apparel", initials: "NK" },
  { id: "samsung", name: "Samsung", category: "Electronics", initials: "SM" },
  { id: "dyson", name: "Dyson", category: "Home Appliances", initials: "DY" },
  { id: "levis", name: "Levi's", category: "Fashion", initials: "LV" },
  { id: "adidas", name: "Adidas", category: "Footwear & Apparel", initials: "AD" },
  { id: "lego", name: "LEGO", category: "Toys & Games", initials: "LG" },
];

const TRUST_FEATURES: TrustFeature[] = [
  { id: "shipping", title: "Free shipping", description: `On orders over $${FREE_SHIPPING_THRESHOLD}`, icon: Truck },
  { id: "payments", title: "Secure payments", description: "256-bit encrypted checkout", icon: ShieldCheck },
  { id: "returns", title: "Easy returns", description: "90-day return window", icon: RotateCcw },
  { id: "protection", title: "Buyer protection", description: "Money-back guarantee", icon: BadgeCheck },
  { id: "support", title: "24/7 support", description: "Live chat & phone support", icon: Headphones },
];

const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  { id: "shop", title: "Shop", links: [{ label: "New Arrivals", href: "#" }, { label: "Best Sellers", href: "#" }, { label: "Today's Deals", href: "#" }, { label: "Gift Cards", href: "#" }] },
  { id: "service", title: "Customer Service", links: [{ label: "Track Your Order", href: "#" }, { label: "Returns & Refunds", href: "#" }, { label: "Shipping Info", href: "#" }, { label: "Contact Us", href: "#" }] },
  { id: "about", title: "About", links: [{ label: "Our Story", href: "#" }, { label: "Careers", href: "#" }, { label: "Press", href: "#" }, { label: "Sustainability", href: "#" }] },
  { id: "sell", title: "Sell With Us", links: [{ label: "Become a Seller", href: "#" }, { label: "Seller Center", href: "#" }, { label: "Affiliate Program", href: "#" }, { label: "Advertise", href: "#" }] },
  { id: "legal", title: "Legal", links: [{ label: "Terms of Service", href: "#" }, { label: "Privacy Policy", href: "#" }, { label: "Cookie Policy", href: "#" }, { label: "Accessibility", href: "#" }] },
];

const SOCIAL_LINKS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "facebook", label: "Facebook", icon: MessageCircle },
  { id: "instagram", label: "Instagram", icon: Camera },
  { id: "twitter", label: "Twitter", icon: Rss },
  { id: "youtube", label: "YouTube", icon: PlayCircle },
];

const PAYMENT_METHODS: string[] = ["Visa", "Mastercard", "Amex", "PayPal", "Apple Pay", "Google Pay"];

// ============================================================================
// MOCK / DEMO PRODUCT DATA
// ----------------------------------------------------------------------------
// Structurally realistic catalog data. In production this arrives from a
// product API / search index; the shape here matches that contract so the
// swap to real data later touches only the data-fetching boundary.
// ============================================================================

const PRODUCT_IMAGE_PLACEHOLDER = "linear-gradient(135deg, var(--color-surface-sunken), var(--color-muted))";

const FLASH_DEAL_PRODUCTS: Product[] = [
  {
    id: "sony-wh1000xm5",
    name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
    brand: "Sony",
    category: "electronics",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 279.99,
    originalPrice: 399.99,
    currency: "USD",
    rating: { average: 4.7, count: 18420 },
    badge: "discounted",
    stockRemaining: 14,
    stockTotal: 60,
    installmentMonths: 12,
  },
  {
    id: "dyson-v15",
    name: "Dyson V15 Detect Cordless Vacuum Cleaner",
    brand: "Dyson",
    category: "home",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 549.99,
    originalPrice: 749.99,
    currency: "USD",
    rating: { average: 4.6, count: 9210 },
    badge: "low-stock",
    stockRemaining: 5,
    stockTotal: 40,
    installmentMonths: 12,
  },
  {
    id: "apple-watch-s9",
    name: "Apple Watch Series 9 GPS 41mm Midnight Aluminum",
    brand: "Apple",
    category: "electronics",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 329.0,
    originalPrice: 399.0,
    currency: "USD",
    rating: { average: 4.8, count: 26310 },
    badge: "discounted",
    stockRemaining: 22,
    stockTotal: 50,
    installmentMonths: 6,
  },
  {
    id: "nespresso-vertuo",
    name: "Nespresso Vertuo Next Espresso & Coffee Maker",
    brand: "Nespresso",
    category: "home",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 129.99,
    originalPrice: 199.99,
    currency: "USD",
    rating: { average: 4.5, count: 7640 },
    badge: "discounted",
    stockRemaining: 31,
    stockTotal: 45,
  },
  {
    id: "anker-737-powerbank",
    name: "Anker 737 Power Bank 24,000mAh 140W Fast Charging",
    brand: "Anker",
    category: "electronics",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 89.99,
    originalPrice: 149.99,
    currency: "USD",
    rating: { average: 4.6, count: 5120 },
    badge: "low-stock",
    stockRemaining: 8,
    stockTotal: 35,
  },
  {
    id: "levis-501",
    name: "Levi's 501 Original Fit Jeans, Men's",
    brand: "Levi's",
    category: "fashion",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 49.5,
    originalPrice: 69.5,
    currency: "USD",
    rating: { average: 4.4, count: 12980 },
    badge: "discounted",
    stockRemaining: 60,
    stockTotal: 80,
  },
];

const PERSONALIZED_PRODUCTS: Product[] = [
  {
    id: "nike-air-max-270",
    name: "Nike Air Max 270 Men's Running Shoes",
    brand: "Nike",
    category: "sports",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 139.99,
    currency: "USD",
    rating: { average: 4.5, count: 8340 },
    badge: "best-seller",
    colorwayCount: 6,
  },
  {
    id: "samsung-galaxy-buds3",
    name: "Samsung Galaxy Buds3 Pro True Wireless Earbuds",
    brand: "Samsung",
    category: "electronics",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 199.99,
    originalPrice: 249.99,
    currency: "USD",
    rating: { average: 4.4, count: 4210 },
    badge: "discounted",
    installmentMonths: 6,
  },
  {
    id: "cerave-moisturizing-cream",
    name: "CeraVe Moisturizing Cream for Face & Body, 19oz",
    brand: "CeraVe",
    category: "beauty",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 18.99,
    currency: "USD",
    rating: { average: 4.8, count: 41200 },
    badge: "best-seller",
  },
  {
    id: "instant-pot-duo",
    name: "Instant Pot Duo 7-in-1 Electric Pressure Cooker, 6 Qt",
    brand: "Instant Pot",
    category: "home",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 79.95,
    originalPrice: 99.95,
    currency: "USD",
    rating: { average: 4.7, count: 62810 },
    badge: "discounted",
  },
  {
    id: "adidas-ultraboost-22",
    name: "Adidas Ultraboost 22 Running Shoes, Women's",
    brand: "Adidas",
    category: "sports",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 159.99,
    currency: "USD",
    rating: { average: 4.5, count: 3980 },
    badge: "new",
    colorwayCount: 4,
  },
  {
    id: "logitech-mx-master-3s",
    name: "Logitech MX Master 3S Wireless Mouse",
    brand: "Logitech",
    category: "electronics",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 99.99,
    currency: "USD",
    rating: { average: 4.7, count: 15600 },
    badge: "none",
  },
  {
    id: "lego-icons-bouquet",
    name: "LEGO Icons Wildflower Bouquet Building Set",
    brand: "LEGO",
    category: "gaming",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 59.99,
    currency: "USD",
    rating: { average: 4.9, count: 7320 },
    badge: "best-seller",
  },
  {
    id: "theragun-mini",
    name: "Therabody Theragun Mini Percussive Massager",
    brand: "Therabody",
    category: "sports",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 149.0,
    currency: "USD",
    rating: { average: 4.6, count: 5780 },
    badge: "out-of-stock",
  },
];

const TRENDING_PRODUCTS: Product[] = [
  {
    id: "steam-deck-oled",
    name: "Valve Steam Deck OLED 512GB Handheld Console",
    brand: "Valve",
    category: "gaming",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 549.0,
    currency: "USD",
    rating: { average: 4.8, count: 9840 },
    badge: "best-seller",
    installmentMonths: 12,
  },
  {
    id: "dji-mini-4-pro",
    name: "DJI Mini 4 Pro Drone with RC 2 Controller",
    brand: "DJI",
    category: "electronics",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 959.0,
    currency: "USD",
    rating: { average: 4.7, count: 2140 },
    badge: "new",
    installmentMonths: 12,
  },
  {
    id: "stanley-quencher",
    name: "Stanley Quencher H2.0 FlowState Tumbler, 40oz",
    brand: "Stanley",
    category: "home",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 45.0,
    currency: "USD",
    rating: { average: 4.7, count: 88210 },
    badge: "best-seller",
  },
  {
    id: "kindle-paperwhite",
    name: "Kindle Paperwhite (16 GB) — Now with 6.8\" Display",
    brand: "Amazon",
    category: "electronics",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 149.99,
    currency: "USD",
    rating: { average: 4.6, count: 34210 },
    badge: "none",
  },
  {
    id: "ninja-creami",
    name: "Ninja CREAMi Ice Cream & Frozen Dessert Maker",
    brand: "Ninja",
    category: "home",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 199.99,
    originalPrice: 229.99,
    currency: "USD",
    rating: { average: 4.5, count: 12760 },
    badge: "discounted",
  },
  {
    id: "oura-ring-4",
    name: "Oura Ring 4 Health & Sleep Tracker",
    brand: "Oura",
    category: "electronics",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 349.0,
    currency: "USD",
    rating: { average: 4.3, count: 3410 },
    badge: "new",
  },
];

const RECOMMENDED_PRODUCTS: Product[] = [
  ...PERSONALIZED_PRODUCTS.slice(0, 4),
  {
    id: "bose-soundlink-flex",
    name: "Bose SoundLink Flex Portable Bluetooth Speaker",
    brand: "Bose",
    category: "electronics",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 129.0,
    currency: "USD",
    rating: { average: 4.7, count: 6210 },
    badge: "none",
  },
  {
    id: "patagonia-better-sweater",
    name: "Patagonia Better Sweater Fleece Jacket, Men's",
    brand: "Patagonia",
    category: "fashion",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 139.0,
    currency: "USD",
    rating: { average: 4.8, count: 4120 },
    badge: "new",
  },
  {
    id: "kitchenaid-stand-mixer",
    name: "KitchenAid Artisan Series 5 Qt. Stand Mixer",
    brand: "KitchenAid",
    category: "home",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 379.99,
    originalPrice: 449.99,
    currency: "USD",
    rating: { average: 4.9, count: 21870 },
    badge: "discounted",
    installmentMonths: 12,
  },
  {
    id: "fitbit-charge-6",
    name: "Fitbit Charge 6 Fitness & Health Tracker",
    brand: "Fitbit",
    category: "sports",
    image: PRODUCT_IMAGE_PLACEHOLDER,
    price: 129.95,
    currency: "USD",
    rating: { average: 4.2, count: 9870 },
    badge: "none",
  },
];

const RECENTLY_VIEWED_PRODUCTS: Product[] = [
  TRENDING_PRODUCTS[2],
  PERSONALIZED_PRODUCTS[1],
  FLASH_DEAL_PRODUCTS[0],
  RECOMMENDED_PRODUCTS[4],
  TRENDING_PRODUCTS[4],
  PERSONALIZED_PRODUCTS[6],
].slice(0, RECENTLY_VIEWED_LIMIT);

const ALL_PRODUCTS: Product[] = [
  ...FLASH_DEAL_PRODUCTS,
  ...PERSONALIZED_PRODUCTS,
  ...TRENDING_PRODUCTS,
  ...RECOMMENDED_PRODUCTS,
];

const PRODUCTS_BY_ID: Record<string, Product> = Object.fromEntries(
  ALL_PRODUCTS.map((product) => [product.id, product])
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatCompactCount(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function calculateDiscountPercent(price: number, originalPrice: number): number {
  if (originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

function calculateStockPercent(remaining: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((remaining / total) * 100));
}

function isLowStock(product: Product): boolean {
  if (!product.stockRemaining || !product.stockTotal) return false;
  return calculateStockPercent(product.stockRemaining, product.stockTotal) <= LOW_STOCK_THRESHOLD_PERCENT;
}

function formatCountdownSegment(totalSeconds: number): { hours: string; minutes: string; seconds: string } {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = Math.floor(clamped % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return { hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
}

function getInstallmentEstimate(price: number, months: number): string {
  return `${months} mo. installments of ${formatPrice(price / months)}`;
}

// ============================================================================
// REDUX STATE — SLICES
// ----------------------------------------------------------------------------
// Redux owns interactive client state that must persist and be shared across
// distant parts of the tree: cart, wishlist, search query, and top-level UI
// chrome. Static catalog/demo data is NOT duplicated into Redux — components
// read it directly from the mock data module and only store references
// (product ids) in state.
// ============================================================================

interface CartState {
  items: CartLineItem[];
}

const initialCartState: CartState = { items: [] };

const cartSlice = createSlice({
  name: "cart",
  initialState: initialCartState,
  reducers: {
    addToCart(state, action: PayloadAction<{ productId: string; quantity?: number }>) {
      const { productId, quantity = 1 } = action.payload;
      const existing = state.items.find((item) => item.productId === productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.items.push({ productId, quantity });
      }
    },
    removeFromCart(state, action: PayloadAction<{ productId: string }>) {
      state.items = state.items.filter((item) => item.productId !== action.payload.productId);
    },
    updateQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        state.items = state.items.filter((item) => item.productId !== productId);
        return;
      }
      const existing = state.items.find((item) => item.productId === productId);
      if (existing) existing.quantity = quantity;
    },
  },
});

const { addToCart, removeFromCart, updateQuantity } = cartSlice.actions;

interface WishlistState {
  productIds: string[];
}

const initialWishlistState: WishlistState = { productIds: [] };

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: initialWishlistState,
  reducers: {
    toggleWishlist(state, action: PayloadAction<{ productId: string }>) {
      const { productId } = action.payload;
      const index = state.productIds.indexOf(productId);
      if (index >= 0) state.productIds.splice(index, 1);
      else state.productIds.push(productId);
    },
  },
});

const { toggleWishlist } = wishlistSlice.actions;

interface SearchState {
  query: string;
  suggestionsOpen: boolean;
}

const initialSearchState: SearchState = { query: "", suggestionsOpen: false };

const searchSlice = createSlice({
  name: "search",
  initialState: initialSearchState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    setSuggestionsOpen(state, action: PayloadAction<boolean>) {
      state.suggestionsOpen = action.payload;
    },
  },
});

const { setSearchQuery, setSuggestionsOpen } = searchSlice.actions;

interface UIState {
  mobileMenuOpen: boolean;
  theme: ThemeMode;
  deliveryLocation: string;
}

const initialUIState: UIState = {
  mobileMenuOpen: false,
  theme: "light",
  deliveryLocation: "Seattle, 98101",
};

const uiSlice = createSlice({
  name: "ui",
  initialState: initialUIState,
  reducers: {
    toggleMobileMenu(state, action: PayloadAction<boolean | undefined>) {
      state.mobileMenuOpen = action.payload ?? !state.mobileMenuOpen;
    },
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
    setDeliveryLocation(state, action: PayloadAction<string>) {
      state.deliveryLocation = action.payload;
    },
  },
});

const { toggleMobileMenu, setTheme, setDeliveryLocation } = uiSlice.actions;

// ============================================================================
// REDUX SELECTORS — GRANULAR, MEMOIZED
// ============================================================================

interface RootState {
  cart: CartState;
  wishlist: WishlistState;
  search: SearchState;
  ui: UIState;
}

const selectCartItems = (state: RootState) => state.cart.items;
const selectWishlistIds = (state: RootState) => state.wishlist.productIds;
const selectSearchQuery = (state: RootState) => state.search.query;
const selectSuggestionsOpen = (state: RootState) => state.search.suggestionsOpen;
const selectMobileMenuOpen = (state: RootState) => state.ui.mobileMenuOpen;
const selectTheme = (state: RootState) => state.ui.theme;
const selectDeliveryLocation = (state: RootState) => state.ui.deliveryLocation;

const selectCartCount = createSelector([selectCartItems], (items) =>
  items.reduce((sum, item) => sum + item.quantity, 0)
);

const selectCartSubtotal = createSelector([selectCartItems], (items) =>
  items.reduce((sum, item) => {
    const product = PRODUCTS_BY_ID[item.productId];
    return product ? sum + product.price * item.quantity : sum;
  }, 0)
);

const selectWishlistCount = createSelector([selectWishlistIds], (ids) => ids.length);

function makeSelectIsWishlisted(productId: string) {
  return createSelector([selectWishlistIds], (ids) => ids.includes(productId));
}

// ============================================================================
// STORE ASSEMBLY & TYPED REACT-REDUX HOOKS
// ============================================================================

const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
    wishlist: wishlistSlice.reducer,
    search: searchSlice.reducer,
    ui: uiSlice.reducer,
  },
});

type AppDispatch = typeof store.dispatch;
const useAppDispatch: () => AppDispatch = useReduxDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useReduxSelector as TypedUseSelectorHook<RootState>;

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/** Local, non-shared UI state — intentionally kept out of Redux. */
function useCountdown(initialSeconds: number): { hours: string; minutes: string; seconds: string } {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 0 ? initialSeconds : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [initialSeconds]);

  return useMemo(() => formatCountdownSegment(secondsLeft), [secondsLeft]);
}

function useOnClickOutside<T extends HTMLElement>(ref: React.RefObject<T | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

/** Local carousel state — transient and view-only, not shared app state. */
function useCarousel(slideCount: number, autoplayIntervalMs: number) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || slideCount <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, autoplayIntervalMs);
    return () => window.clearInterval(timer);
  }, [isPaused, slideCount, autoplayIntervalMs]);

  const goToNext = useCallback(() => setActiveIndex((prev) => (prev + 1) % slideCount), [slideCount]);
  const goToPrevious = useCallback(() => setActiveIndex((prev) => (prev - 1 + slideCount) % slideCount), [slideCount]);
  const goToIndex = useCallback((index: number) => setActiveIndex(index), []);

  return { activeIndex, goToNext, goToPrevious, goToIndex, setIsPaused };
}

// ============================================================================
// PRIMITIVE / REUSABLE DOMAIN COMPONENTS
// ============================================================================

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
}

function IconButton({ icon: Icon, label, className, ...rest }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary active:scale-95",
        className
      )}
      {...rest}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}

function ProductRating({ rating, size = "sm" }: { rating: ProductRatingSummary; size?: "sm" | "md" }) {
  const starSize = size === "sm" ? "size-3.5" : "size-4";
  const fullStars = Math.round(rating.average);
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`Rated ${rating.average} out of 5 stars, ${rating.count} reviews`}>
      <span className="flex items-center" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={cn(starSize, i < fullStars ? "fill-warning text-warning" : "text-border")} />
        ))}
      </span>
      <span className="text-2xs font-medium text-foreground">{rating.average.toFixed(1)}</span>
      <span className="text-2xs text-muted-foreground">({formatCompactCount(rating.count)})</span>
    </div>
  );
}

function PriceDisplay({ price, originalPrice }: { price: number; originalPrice?: number }) {
  const hasDiscount = Boolean(originalPrice && originalPrice > price);
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-base font-semibold tabular-nums text-price">{formatPrice(price)}</span>
      {hasDiscount && originalPrice && (
        <span className="text-2xs tabular-nums text-price-strike line-through">{formatPrice(originalPrice)}</span>
      )}
    </div>
  );
}

function DiscountBadge({ percent }: { percent: number }) {
  if (percent <= 0) return null;
  return (
    <span className="inline-flex items-center rounded-sm bg-destructive px-1.5 py-0.5 text-2xs font-bold text-destructive-foreground">
      -{percent}%
    </span>
  );
}

const PRODUCT_BADGE_LABEL: Partial<Record<ProductBadge, string>> = {
  new: "New",
  "best-seller": "Best Seller",
  "low-stock": "Low Stock",
  "out-of-stock": "Out of Stock",
};

function ProductStatusBadge({ badge }: { badge: ProductBadge }) {
  const label = PRODUCT_BADGE_LABEL[badge];
  if (!label) return null;
  const toneClass =
    badge === "new"
      ? "bg-info text-info-foreground"
      : badge === "best-seller"
      ? "bg-accent text-accent-foreground"
      : badge === "low-stock"
      ? "bg-warning text-warning-foreground"
      : "bg-muted text-muted-foreground";
  return <span className={cn("inline-flex items-center rounded-sm px-1.5 py-0.5 text-2xs font-semibold", toneClass)}>{label}</span>;
}

function WishlistButton({ productId, size = "md" }: { productId: string; size?: "sm" | "md" }) {
  const dispatch = useAppDispatch();
  const selectIsWishlisted = useMemo(() => makeSelectIsWishlisted(productId), [productId]);
  const isWishlisted = useAppSelector(selectIsWishlisted);
  const dimension = size === "sm" ? "size-8" : "size-9";

  return (
    <button
      type="button"
      aria-pressed={isWishlisted}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      onClick={(event) => {
        event.stopPropagation();
        dispatch(toggleWishlist({ productId }));
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs transition-colors hover:border-destructive/40 hover:text-destructive",
        dimension
      )}
    >
      <Heart className={cn("size-4", isWishlisted && "fill-destructive text-destructive")} aria-hidden="true" />
    </button>
  );
}

function AddToCartButton({ product, fullWidth = true }: { product: Product; fullWidth?: boolean }) {
  const dispatch = useAppDispatch();
  const [justAdded, setJustAdded] = useState(false);
  const isOutOfStock = product.badge === "out-of-stock";

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (isOutOfStock) return;
      dispatch(addToCart({ productId: product.id }));
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1600);
    },
    [dispatch, product.id, isOutOfStock]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isOutOfStock}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
        fullWidth && "w-full"
      )}
    >
      <ShoppingCart className="size-4" aria-hidden="true" />
      {isOutOfStock ? "Out of stock" : justAdded ? "Added" : "Add to cart"}
    </button>
  );
}

function StockProgress({ remaining, total }: { remaining: number; total: number }) {
  const percent = calculateStockPercent(remaining, total);
  const low = percent <= LOW_STOCK_THRESHOLD_PERCENT;
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Stock remaining">
        <div className={cn("h-full rounded-full", low ? "bg-destructive" : "bg-warning")} style={{ width: `${percent}%` }} />
      </div>
      <p className={cn("text-2xs font-medium", low ? "text-destructive" : "text-muted-foreground")}>
        {low ? `Only ${remaining} left` : `${remaining} left`}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  href,
  hrefLabel = "See all",
}: {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {href && (
        <a href={href} className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex">
          {hrefLabel}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function CarouselControls({
  onPrevious,
  onNext,
  className,
}: {
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={onPrevious}
        aria-label="Previous slide"
        className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-secondary"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next slide"
        className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-secondary"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function HorizontalScroller({ children, ariaLabel }: { children: ReactNode; ariaLabel: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByAmount = useCallback((direction: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }, []);

  return (
    <div className="group/scroller relative">
      <div
        ref={scrollerRef}
        role="list"
        aria-label={ariaLabel}
        className="no-scrollbar snap-x-mandatory flex gap-3.5 overflow-x-auto scroll-px-4 pb-1"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scrollByAmount(-1)}
        aria-label="Scroll left"
        className="absolute -left-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md opacity-0 transition-opacity group-hover/scroller:opacity-100 lg:flex"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => scrollByAmount(1)}
        aria-label="Scroll right"
        className="absolute -right-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md opacity-0 transition-opacity group-hover/scroller:opacity-100 lg:flex"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// ============================================================================
// PRODUCT CARD
// ----------------------------------------------------------------------------
// The single reusable product card for the entire page. Visual treatment
// adapts to the product's badge/stock state rather than branching into
// separate components, since the structure is identical and only emphasis
// changes (dimmed imagery for out-of-stock, urgency styling for low-stock).
// ============================================================================

interface ProductCardProps {
  product: Product;
  rank?: number;
  variant?: "default" | "compact";
}

function ProductCard({ product, rank, variant = "default" }: ProductCardProps) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const discountPercent = product.originalPrice ? calculateDiscountPercent(product.price, product.originalPrice) : 0;
  const outOfStock = product.badge === "out-of-stock";
  const showStockProgress = !outOfStock && product.stockRemaining !== undefined && product.stockTotal !== undefined;

  return (
    <article
      role="listitem"
      className={cn(
        "group relative flex snap-start flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md",
        variant === "default" ? "w-[220px] shrink-0 sm:w-[240px]" : "w-full"
      )}
    >
      <div className="relative aspect-square overflow-hidden" style={{ background: product.image }}>
        {rank !== undefined && (
          <span className="absolute left-2 top-2 z-10 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-2xs font-bold text-background">
            {rank}
          </span>
        )}
        <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1" style={rank !== undefined ? { left: "2.25rem" } : undefined}>
          <ProductStatusBadge badge={product.badge} />
          {discountPercent > 0 && <DiscountBadge percent={discountPercent} />}
        </div>
        <div className="absolute right-2 top-2 z-10">
          <WishlistButton productId={product.id} size="sm" />
        </div>
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="rounded-md bg-foreground px-2.5 py-1 text-2xs font-semibold text-background">Out of stock</span>
          </div>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setQuickViewOpen(true);
          }}
          aria-label={`Quick view ${product.name}`}
          className="absolute bottom-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-card/90 text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <Eye className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{product.brand}</p>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-foreground">
          <a href={`#product-${product.id}`} className="hover:text-primary focus-visible:text-primary">
            {product.name}
          </a>
        </h3>
        <ProductRating rating={product.rating} />
        <PriceDisplay price={product.price} originalPrice={product.originalPrice} />
        {product.installmentMonths && (
          <p className="text-2xs text-muted-foreground">{getInstallmentEstimate(product.price, product.installmentMonths)}</p>
        )}
        {product.colorwayCount && !showStockProgress && (
          <p className="text-2xs text-muted-foreground">{product.colorwayCount} colors available</p>
        )}
        {showStockProgress && product.stockRemaining !== undefined && product.stockTotal !== undefined && (
          <StockProgress remaining={product.stockRemaining} total={product.stockTotal} />
        )}
        <div className="mt-auto pt-2">
          <AddToCartButton product={product} />
        </div>
      </div>

      {quickViewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Quick view: ${product.name}`}
          className="animate-in fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setQuickViewOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{product.brand}</p>
                <h3 className="text-base font-semibold text-foreground">{product.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickViewOpen(false)}
                aria-label="Close quick view"
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mb-3 aspect-video rounded-md" style={{ background: product.image }} />
            <ProductRating rating={product.rating} size="md" />
            <div className="mt-2">
              <PriceDisplay price={product.price} originalPrice={product.originalPrice} />
            </div>
            <div className="mt-4 flex gap-2">
              <AddToCartButton product={product} />
              <WishlistButton productId={product.id} />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// ============================================================================
// HEADER COMPONENTS
// ============================================================================

function AnnouncementBar() {
  const messages = useMemo(() => [...ANNOUNCEMENT_MESSAGES, ...ANNOUNCEMENT_MESSAGES], []);
  return (
    <div className="overflow-hidden bg-accent py-2 text-accent-foreground">
      <div className="no-scrollbar flex w-max animate-marquee gap-10 whitespace-nowrap px-4 text-2xs font-medium sm:text-sm" aria-hidden="true">
        {messages.map((message, i) => (
          <span key={i} className="flex items-center gap-2">
            <Percent className="size-3.5" />
            {message}
          </span>
        ))}
      </div>
      <p className="sr-only">{ANNOUNCEMENT_MESSAGES.join(". ")}</p>
    </div>
  );
}

function DeliveryLocationSelector() {
  const deliveryLocation = useAppSelector(selectDeliveryLocation);
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));

  const options = ["Seattle, 98101", "Austin, 73301", "New York, 10001", "Chicago, 60601"];

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-secondary"
      >
        <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
        <span>
          <span className="block text-2xs text-muted-foreground leading-none">Deliver to</span>
          <span className="block font-medium leading-tight">{deliveryLocation}</span>
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </button>
      {open && (
        <ul role="listbox" className="animate-in absolute left-0 top-full z-40 mt-1 w-56 rounded-md border border-border bg-popover py-1 shadow-lg">
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === deliveryLocation}
                onClick={() => {
                  dispatch(setDeliveryLocation(option));
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-secondary",
                  option === deliveryLocation ? "font-medium text-primary" : "text-popover-foreground"
                )}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchBar() {
  const query = useAppSelector(selectSearchQuery);
  const suggestionsOpen = useAppSelector(selectSuggestionsOpen);
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(containerRef, () => dispatch(setSuggestionsOpen(false)));

  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return SEARCH_SUGGESTIONS;
    return SEARCH_SUGGESTIONS.filter((s) => s.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch(setSuggestionsOpen(false));
        }}
        className="flex items-center rounded-md border border-input bg-card focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
      >
        <label htmlFor="site-search" className="sr-only">
          Search products
        </label>
        <Search className="ml-3 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          id="site-search"
          type="search"
          value={query}
          onChange={(event) => dispatch(setSearchQuery(event.target.value))}
          onFocus={() => dispatch(setSuggestionsOpen(true))}
          placeholder="Search products, brands, and categories"
          className="h-11 w-full bg-transparent px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          autoComplete="off"
        />
        <button
          type="submit"
          className="m-1 hidden h-9 shrink-0 items-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 sm:inline-flex"
        >
          Search
        </button>
      </form>
      {suggestionsOpen && filteredSuggestions.length > 0 && (
        <ul className="animate-in absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {filteredSuggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => {
                  dispatch(setSearchQuery(suggestion));
                  dispatch(setSuggestionsOpen(false));
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-popover-foreground hover:bg-secondary"
              >
                <Search className="size-3.5 text-muted-foreground" aria-hidden="true" />
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HeaderActions() {
  const cartCount = useAppSelector(selectCartCount);
  const wishlistCount = useAppSelector(selectWishlistCount);

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <IconButton icon={User} label="Account" className="hidden sm:inline-flex" />
      <div className="relative hidden sm:inline-flex">
        <IconButton icon={Heart} label={`Wishlist, ${wishlistCount} items`} />
        {wishlistCount > 0 && (
          <span className="pointer-events-none absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            {wishlistCount}
          </span>
        )}
      </div>
      <div className="relative hidden sm:inline-flex">
        <IconButton icon={Bell} label="Notifications" />
        <span className="pointer-events-none absolute right-2 top-2 size-2 animate-pulse-soft rounded-full bg-destructive" aria-hidden="true" />
      </div>
      <div className="relative inline-flex">
        <IconButton icon={ShoppingCart} label={`Cart, ${cartCount} items`} />
        {cartCount > 0 && (
          <span className="pointer-events-none absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {cartCount}
          </span>
        )}
      </div>
    </div>
  );
}

function NavigationBar() {
  return (
    <nav aria-label="Primary" className="hidden border-t border-border lg:block">
      <ul className="mx-auto flex max-w-screen-2xl items-center gap-6 px-4 py-2.5 sm:px-6 lg:px-8">
        {PRIMARY_NAVIGATION.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                item.highlight ? "text-destructive" : "text-foreground-secondary text-foreground/80"
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MobileMenuDrawer() {
  const open = useAppSelector(selectMobileMenuOpen);
  const dispatch = useAppDispatch();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <div className="absolute inset-0 animate-in bg-foreground/40" onClick={() => dispatch(toggleMobileMenu(false))} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Site menu" className="animate-in relative flex h-full w-72 flex-col bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border p-4">
          <span className="text-base font-bold text-foreground">Menu</span>
          <button
            type="button"
            onClick={() => dispatch(toggleMobileMenu(false))}
            aria-label="Close menu"
            className="rounded-full p-1.5 hover:bg-secondary"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Mobile primary" className="flex-1 overflow-y-auto p-2">
          <ul>
            {PRIMARY_NAVIGATION.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  onClick={() => dispatch(toggleMobileMenu(false))}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2.5 text-sm font-medium hover:bg-secondary",
                    item.highlight ? "text-destructive" : "text-foreground"
                  )}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-border pt-2">
            <a href="#" className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">
              <User className="size-4" aria-hidden="true" />
              Account
            </a>
            <a href="#" className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">
              <Heart className="size-4" aria-hidden="true" />
              Wishlist
            </a>
          </div>
        </nav>
      </div>
    </div>
  );
}

function MainHeader() {
  const dispatch = useAppDispatch();
  return (
    <div className="mx-auto flex max-w-screen-2xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => dispatch(toggleMobileMenu(true))}
        aria-label="Open menu"
        className="inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-secondary lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <a href="#" className="shrink-0 text-xl font-extrabold tracking-tight text-primary sm:text-2xl" aria-label="Aurora, home">
        aurora
      </a>
      <DeliveryLocationSelector />
      <div className="flex-1">
        <SearchBar />
      </div>
      <HeaderActions />
    </div>
  );
}

function EcommerceHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <AnnouncementBar />
      <MainHeader />
      <NavigationBar />
      <MobileMenuDrawer />
    </header>
  );
}

// ============================================================================
// HERO SECTION
// ============================================================================

function HeroIndicators({
  count,
  activeIndex,
  onSelect,
}: {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-2" role="tablist" aria-label="Hero slides">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          role="tab"
          aria-selected={index === activeIndex}
          aria-label={`Go to slide ${index + 1}`}
          onClick={() => onSelect(index)}
          className={cn(
            "h-1.5 rounded-full transition-all",
            index === activeIndex ? "w-6 bg-primary-foreground" : "w-1.5 bg-primary-foreground/40 hover:bg-primary-foreground/60"
          )}
        />
      ))}
    </div>
  );
}

function HeroSlideContent({ slide }: { slide: HeroSlide }) {
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-6 py-10 sm:px-10 sm:py-14 lg:w-3/5 lg:px-14">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80 sm:text-sm">{slide.eyebrow}</p>
      <h1 className="text-balance text-3xl font-bold leading-tight text-primary-foreground sm:text-4xl lg:text-5xl">{slide.title}</h1>
      <p className="max-w-md text-sm text-primary-foreground/85 sm:text-base">{slide.description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <a
          href="#flash-deals"
          className="inline-flex h-11 items-center rounded-md bg-primary-foreground px-5 text-sm font-semibold text-foreground transition-transform hover:scale-[1.02] active:scale-[0.99]"
        >
          {slide.primaryCtaLabel}
        </a>
        <a
          href="#categories"
          className="inline-flex h-11 items-center rounded-md border border-primary-foreground/40 px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
        >
          {slide.secondaryCtaLabel}
        </a>
      </div>
    </div>
  );
}

function HeroSection() {
  const { activeIndex, goToNext, goToPrevious, goToIndex, setIsPaused } = useCarousel(HERO_SLIDES.length, HERO_AUTOPLAY_INTERVAL_MS);
  const activeSlide = HERO_SLIDES[activeIndex];

  return (
    <section aria-label="Featured promotions" className="mx-auto max-w-screen-2xl px-4 pt-4 sm:px-6 lg:px-8">
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ backgroundColor: activeSlide.accent }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="min-h-[320px] sm:min-h-[380px] lg:min-h-[420px]">
          <HeroSlideContent slide={activeSlide} />
        </div>
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-6 sm:px-10 lg:px-14">
          <HeroIndicators count={HERO_SLIDES.length} activeIndex={activeIndex} onSelect={goToIndex} />
          <CarouselControls onPrevious={goToPrevious} onNext={goToNext} />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// CATEGORY DISCOVERY SECTION
// ============================================================================

function CategoryCard({ category }: { category: Category }) {
  const Icon = category.icon;
  return (
    <a
      href={`#category-${category.id}`}
      className="group flex flex-col items-center gap-2.5 rounded-lg border border-transparent p-3 text-center transition-colors hover:border-border hover:bg-card"
    >
      <span
        className="flex size-14 items-center justify-center rounded-full transition-transform group-hover:scale-105 sm:size-16"
        style={{ backgroundColor: `color-mix(in oklch, ${category.accent} 16%, transparent)` }}
      >
        <Icon className="size-6 sm:size-7" style={{ color: category.accent }} aria-hidden="true" />
      </span>
      <span className="text-sm font-medium text-foreground">{category.name}</span>
      <span className="text-2xs text-muted-foreground">{formatCompactCount(category.productCount)} items</span>
    </a>
  );
}

function CategorySection() {
  return (
    <section id="categories" aria-labelledby="categories-heading" className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h2 id="categories-heading" className="mb-5 text-lg font-semibold text-foreground sm:text-xl">
        Shop by category
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {CATEGORIES.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// FLASH DEALS SECTION
// ============================================================================

function CountdownTimer() {
  const { hours, minutes, seconds } = useCountdown(FLASH_DEAL_DURATION_SECONDS);
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1.5 text-background" role="timer" aria-live="off">
      <Clock className="size-3.5" aria-hidden="true" />
      <span className="sr-only">Deal ends in</span>
      <span className="flex items-center gap-1 font-mono text-sm font-semibold tabular-nums" aria-hidden="true">
        <span className="rounded bg-background/15 px-1.5 py-0.5">{hours}</span>:
        <span className="rounded bg-background/15 px-1.5 py-0.5">{minutes}</span>:
        <span className="rounded bg-background/15 px-1.5 py-0.5">{seconds}</span>
      </span>
    </div>
  );
}

function FlashDealsSection() {
  return (
    <section id="flash-deals" aria-labelledby="flash-deals-heading" className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
        <div className="flex items-center gap-2.5">
          <Flame className="size-5 text-destructive" aria-hidden="true" />
          <h2 id="flash-deals-heading" className="text-lg font-semibold text-foreground sm:text-xl">
            Flash Deals
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <CountdownTimer />
          <a href="#" className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex items-center gap-1">
            See all
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
      <HorizontalScroller ariaLabel="Flash deal products">
        {FLASH_DEAL_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </HorizontalScroller>
    </section>
  );
}

// ============================================================================
// PRODUCT GRID (shared by personalized / recommended sections)
// ============================================================================

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div role="list" className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant="compact" />
      ))}
    </div>
  );
}

function PersonalizedProductsSection() {
  return (
    <section id="personalized" aria-labelledby="personalized-heading" className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader
        title="Recommended for you"
        description="Based on your browsing and shopping activity"
        href="#"
      />
      <h3 id="personalized-heading" className="sr-only">
        Personalized product recommendations
      </h3>
      <ProductGrid products={PERSONALIZED_PRODUCTS} />
    </section>
  );
}

// ============================================================================
// PROMOTIONAL DEALS SECTION
// ============================================================================

function DealCard({ deal }: { deal: Deal }) {
  const Icon = deal.icon;
  return (
    <a
      href="#"
      className="group relative flex min-h-[160px] flex-col justify-between overflow-hidden rounded-lg border border-border p-4"
      style={{ backgroundColor: `color-mix(in oklch, ${deal.accent} 10%, var(--color-card))` }}
    >
      <Icon className="size-7 transition-transform group-hover:scale-110" style={{ color: deal.accent }} aria-hidden="true" />
      <div>
        <h3 className="text-sm font-semibold text-foreground">{deal.title}</h3>
        <p className="mt-1 text-2xs text-muted-foreground">{deal.subtitle}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-2xs font-semibold text-primary">
          {deal.ctaLabel}
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </a>
  );
}

function PromotionalDealsSection() {
  return (
    <section id="deals" aria-labelledby="deals-heading" className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h2 id="deals-heading" className="mb-5 text-lg font-semibold text-foreground sm:text-xl">
        Deals by category
      </h2>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {PROMOTIONAL_DEALS.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// FEATURED BRANDS SECTION
// ============================================================================

function BrandCard({ brand }: { brand: Brand }) {
  return (
    <a
      href={`#brand-${brand.id}`}
      className="flex shrink-0 snap-start flex-col items-center gap-2.5 rounded-lg border border-border bg-card px-6 py-5 transition-shadow hover:shadow-md sm:w-44"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-base font-bold text-secondary-foreground">
        {brand.initials}
      </span>
      <span className="text-sm font-semibold text-foreground">{brand.name}</span>
      <span className="text-2xs text-muted-foreground">{brand.category}</span>
    </a>
  );
}

function FeaturedBrandsSection() {
  return (
    <section id="brands" aria-labelledby="brands-heading" className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="Featured brands" description="Shop directly from the brands you love" href="#" />
      <h3 id="brands-heading" className="sr-only">
        Featured brand list
      </h3>
      <HorizontalScroller ariaLabel="Featured brands">
        {BRANDS.map((brand) => (
          <BrandCard key={brand.id} brand={brand} />
        ))}
      </HorizontalScroller>
    </section>
  );
}

// ============================================================================
// TRENDING PRODUCTS SECTION
// ============================================================================

function TrendingProductsSection() {
  return (
    <section id="trending" aria-labelledby="trending-heading" className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="Trending now" description="What shoppers are buying most this week" href="#" />
      <h3 id="trending-heading" className="sr-only">
        Trending products
      </h3>
      <HorizontalScroller ariaLabel="Trending products">
        {TRENDING_PRODUCTS.map((product, index) => (
          <ProductCard key={product.id} product={product} rank={index + 1} />
        ))}
      </HorizontalScroller>
    </section>
  );
}

// ============================================================================
// RECOMMENDED PRODUCTS SECTION (larger grid)
// ============================================================================

function RecommendedProductsSection() {
  return (
    <section id="recommended" aria-labelledby="recommended-heading" className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title="More to explore" description="A wider selection curated from top-rated listings" href="#" />
      <h3 id="recommended-heading" className="sr-only">
        Recommended products
      </h3>
      <ProductGrid products={RECOMMENDED_PRODUCTS} />
    </section>
  );
}

// ============================================================================
// RECENTLY VIEWED SECTION
// ============================================================================

function RecentlyViewedSection() {
  if (RECENTLY_VIEWED_PRODUCTS.length === 0) return null;
  return (
    <section id="recently-viewed" aria-labelledby="recently-viewed-heading" className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h2 id="recently-viewed-heading" className="mb-5 text-lg font-semibold text-foreground sm:text-xl">
        Recently viewed
      </h2>
      <HorizontalScroller ariaLabel="Recently viewed products">
        {RECENTLY_VIEWED_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} variant="compact" />
        ))}
      </HorizontalScroller>
    </section>
  );
}

// ============================================================================
// TRUST / SERVICE SECTION
// ============================================================================

function TrustItem({ feature }: { feature: TrustFeature }) {
  const Icon = feature.icon;
  return (
    <div className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{feature.title}</p>
        <p className="text-2xs text-muted-foreground">{feature.description}</p>
      </div>
    </div>
  );
}

function TrustSection() {
  return (
    <section aria-labelledby="trust-heading" className="border-y border-border bg-surface-sunken">
      <h2 id="trust-heading" className="sr-only">
        Why shop with us
      </h2>
      <div className="mx-auto grid max-w-screen-2xl grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:grid-cols-5 lg:px-8">
        {TRUST_FEATURES.map((feature) => (
          <TrustItem key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

function FooterLinkColumn({ group }: { group: FooterLinkGroup }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
      <ul className="mt-3 space-y-2">
        {group.links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EcommerceFooter() {
  return (
    <footer className="border-t border-border bg-surface-sunken">
      <div className="mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {FOOTER_LINK_GROUPS.map((group) => (
            <FooterLinkColumn key={group.id} group={group} />
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Get the app</p>
            <div className="mt-2.5 flex gap-2">
              <a href="#" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-2xs font-medium text-foreground hover:bg-secondary">
                <AppleIcon className="size-3.5" aria-hidden="true" />
                App Store
              </a>
              <a href="#" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-2xs font-medium text-foreground hover:bg-secondary">
                <Download className="size-3.5" aria-hidden="true" />
                Google Play
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Follow us</p>
            <div className="mt-2.5 flex gap-2">
              {SOCIAL_LINKS.map((social) => (
                <IconButton key={social.id} icon={social.icon} label={social.label} className="border border-border" />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">We accept</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <span key={method} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-2xs font-medium text-muted-foreground">
                  {method === "PayPal" ? <Wallet className="size-3.5" aria-hidden="true" /> : <CreditCard className="size-3.5" aria-hidden="true" />}
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-2xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Aurora Commerce, Inc. All rights reserved.</p>
          <p>Prices and availability are subject to change.</p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// THEME SYNC
// ----------------------------------------------------------------------------
// Bridges Redux theme state to the `.dark` class on <html> so the design
// system (CSS variables in globals.css) repaints via CSS only.
// ============================================================================

function ThemeSync() {
  const theme = useAppSelector(selectTheme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
}

// ============================================================================
// PAGE COMPOSITION
// ============================================================================

function EcommerceHomePageContent() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <ThemeSync />
      <EcommerceHeader />
      <main id="main-content">
        <HeroSection />
        <CategorySection />
        <FlashDealsSection />
        <PersonalizedProductsSection />
        <PromotionalDealsSection />
        <FeaturedBrandsSection />
        <TrendingProductsSection />
        <RecommendedProductsSection />
        <RecentlyViewedSection />
      </main>
      <TrustSection />
      <EcommerceFooter />
    </div>
  );
}

export default function EcommerceHomePage() {
  return (
    <Provider store={store}>
      <EcommerceHomePageContent />
    </Provider>
  );
}