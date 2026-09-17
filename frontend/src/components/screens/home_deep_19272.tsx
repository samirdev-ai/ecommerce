// ecommerce_home_page.tsx
"use client";

/**
 * ENTERPRISE E-COMMERCE HOME PAGE
 * ---------------------------------------------------------------------------
 * Single physical file, internally architected as a production feature.
 * Logical layers:
 *   1. Types & domain models
 *   2. Configuration & constants
 *   3. Mock API (server-shaped responses)
 *   4. Utilities & formatting
 *   5. Redux slices (UI state only)
 *   6. RTK Query API (server state)
 *   7. Selectors & hooks
 *   8. Primitives (Button, Badge, Card, Container, ...)
 *   9. Shared components (SectionHeader, Price, Rating, Skeleton, ...)
 *  10. Product components (ProductCard, ProductCarousel)
 *  11. Section components
 *  12. Layout components (Header, Footer, MobileNav)
 *  13. Page composition
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  configureStore,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  Provider,
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  MapPin,
  User,
  Heart,
  ShoppingCart,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
  Plus,
  Minus,
  Trash2,
  Eye,
  Zap,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  BadgeCheck,
  TrendingUp,
  Sparkles,
  Clock,
  Check,
  AlertCircle,
  Package,
  ChevronUp,
  Smartphone,
  Apple,
  Play,
  Mail,
  ArrowRight,
} from "lucide-react";

/* ===========================================================================
 * 1. TYPES & DOMAIN MODELS
 * ========================================================================= */

export interface Price {
  currency: "USD";
  amount: number;
  formatted: string;
}

export interface Rating {
  value: number;
  count: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  color?: string;
  inStock: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  imageAlt: string;
  price: Price;
  originalPrice?: Price;
  discountPercent?: number;
  rating: Rating;
  badge?: "new" | "sale" | "trending" | "bestseller" | "limited";
  stock: number;
  installment?: { months: number; perMonth: string };
  variants?: ProductVariant[];
  category: string;
  freeShipping?: boolean;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  productCount: number;
  image?: string;
  description?: string;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logo: string;
  category: string;
  productCount: number;
}

export interface HeroBanner {
  id: string;
  headline: string;
  subheadline: string;
  eyebrow?: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
  tone: "primary" | "dark" | "warm" | "cool";
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
  variant: "large" | "medium" | "compact";
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  discountLabel: string;
  expiresAt: string;
  ctaLabel: string;
  ctaHref: string;
  productCount: number;
}

export interface ReviewSummary {
  rating: number;
  count: number;
  verifiedPercent: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  unitPrice: Price;
  quantity: number;
  maxQuantity: number;
}

export interface CartSummary {
  items: CartItem[];
  itemCount: number;
  subtotal: Price;
  estimatedTotal: Price;
}

export interface WishlistItem {
  id: string;
  productId: string;
  addedAt: string;
}

export interface Customer {
  id: string;
  firstName: string;
  email: string;
  isAuthenticated: boolean;
  avatarUrl?: string;
}

export interface Recommendation {
  id: string;
  product: Product;
  reason: string;
}

export interface SearchSuggestion {
  id: string;
  type: "product" | "category" | "query";
  label: string;
  href: string;
  image?: string;
  meta?: string;
}

export interface FlashSale {
  id: string;
  title: string;
  endsAt: string;
  products: Product[];
}

export interface HomePagePayload {
  heroBanners: HeroBanner[];
  quickCategories: Category[];
  flashSale: FlashSale;
  trending: Product[];
  bestSellers: Product[];
  newArrivals: Product[];
  topRated: Product[];
  featuredCategories: Category[];
  featuredBrands: Brand[];
  deals: Deal[];
  promotions: Promotion[];
}

export type ProductCardVariant =
  | "default"
  | "compact"
  | "horizontal"
  | "featured"
  | "sale";

/* ===========================================================================
 * 2. CONFIGURATION & CONSTANTS
 * ========================================================================= */

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COMPACT_CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return CURRENCY_FORMATTER.format(amount);
}

export function formatCompactPrice(amount: number): string {
  return COMPACT_CURRENCY_FORMATTER.format(amount);
}

export function makePrice(amount: number): Price {
  return { currency: "USD", amount, formatted: formatPrice(amount) };
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export interface CategoryNavItem {
  id: string;
  label: string;
  href: string;
  columns?: { title: string; links: { label: string; href: string }[] }[];
  featured?: { title: string; image: string; href: string };
}

export const CATEGORY_NAVIGATION: CategoryNavItem[] = [
  {
    id: "electronics",
    label: "Electronics",
    href: "/c/electronics",
    columns: [
      {
        title: "Computers",
        links: [
          { label: "Laptops", href: "/c/laptops" },
          { label: "Desktops", href: "/c/desktops" },
          { label: "Monitors", href: "/c/monitors" },
          { label: "Tablets", href: "/c/tablets" },
        ],
      },
      {
        title: "Audio",
        links: [
          { label: "Headphones", href: "/c/headphones" },
          { label: "Earbuds", href: "/c/earbuds" },
          { label: "Speakers", href: "/c/speakers" },
          { label: "Soundbars", href: "/c/soundbars" },
        ],
      },
      {
        title: "Mobile",
        links: [
          { label: "Smartphones", href: "/c/smartphones" },
          { label: "Cases", href: "/c/cases" },
          { label: "Chargers", href: "/c/chargers" },
          { label: "Power Banks", href: "/c/power-banks" },
        ],
      },
    ],
    featured: {
      title: "New Flagship Phones",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=70",
      href: "/c/smartphones",
    },
  },
  {
    id: "fashion",
    label: "Fashion",
    href: "/c/fashion",
    columns: [
      {
        title: "Women",
        links: [
          { label: "Dresses", href: "/c/dresses" },
          { label: "Tops", href: "/c/tops" },
          { label: "Shoes", href: "/c/womens-shoes" },
          { label: "Bags", href: "/c/bags" },
        ],
      },
      {
        title: "Men",
        links: [
          { label: "Shirts", href: "/c/shirts" },
          { label: "Jackets", href: "/c/jackets" },
          { label: "Sneakers", href: "/c/sneakers" },
          { label: "Watches", href: "/c/watches" },
        ],
      },
    ],
  },
  {
    id: "home",
    label: "Home & Kitchen",
    href: "/c/home",
    columns: [
      {
        title: "Kitchen",
        links: [
          { label: "Cookware", href: "/c/cookware" },
          { label: "Appliances", href: "/c/appliances" },
          { label: "Dining", href: "/c/dining" },
        ],
      },
      {
        title: "Living",
        links: [
          { label: "Furniture", href: "/c/furniture" },
          { label: "Decor", href: "/c/decor" },
          { label: "Bedding", href: "/c/bedding" },
        ],
      },
    ],
  },
  { id: "beauty", label: "Beauty", href: "/c/beauty" },
  { id: "sports", label: "Sports", href: "/c/sports" },
  { id: "toys", label: "Toys", href: "/c/toys" },
  { id: "grocery", label: "Grocery", href: "/c/grocery" },
  { id: "auto", label: "Automotive", href: "/c/auto" },
  { id: "books", label: "Books", href: "/c/books" },
];

export interface TrustItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export const TRUST_ITEMS: TrustItem[] = [
  {
    id: "shipping",
    icon: Truck,
    title: "Free & Fast Delivery",
    description: "Free shipping on orders over $35",
  },
  {
    id: "secure",
    icon: ShieldCheck,
    title: "Secure Payments",
    description: "256-bit SSL encrypted checkout",
  },
  {
    id: "returns",
    icon: RotateCcw,
    title: "30-Day Returns",
    description: "Hassle-free returns & refunds",
  },
  {
    id: "support",
    icon: Headphones,
    title: "24/7 Support",
    description: "Real people, anytime you need",
  },
];

export interface FooterGroup {
  id: string;
  title: string;
  links: { label: string; href: string }[];
}

export const FOOTER_GROUPS: FooterGroup[] = [
  {
    id: "shop",
    title: "Shop",
    links: [
      { label: "All Categories", href: "/c" },
      { label: "Deals", href: "/deals" },
      { label: "New Arrivals", href: "/new" },
      { label: "Best Sellers", href: "/best" },
      { label: "Gift Cards", href: "/gift-cards" },
    ],
  },
  {
    id: "service",
    title: "Customer Service",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Track Order", href: "/track" },
      { label: "Returns", href: "/returns" },
      { label: "Shipping Info", href: "/shipping" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    id: "about",
    title: "About",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Sustainability", href: "/sustainability" },
    ],
  },
  {
    id: "policies",
    title: "Policies",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Accessibility", href: "/accessibility" },
    ],
  },
  {
    id: "seller",
    title: "Seller",
    links: [
      { label: "Sell on Meridian", href: "/sell" },
      { label: "Seller Center", href: "/seller" },
      { label: "Fees", href: "/seller/fees" },
      { label: "Advertise", href: "/ads" },
    ],
  },
  {
    id: "business",
    title: "Business",
    links: [
      { label: "Meridian Business", href: "/business" },
      { label: "Wholesale", href: "/wholesale" },
      { label: "Enterprise", href: "/enterprise" },
    ],
  },
];

export interface ProductCardVariantConfig {
  imageAspect: string;
  showRating: boolean;
  showBrand: boolean;
  showInstallment: boolean;
  showQuickView: boolean;
  showStock: boolean;
  layout: "vertical" | "horizontal";
  size: "sm" | "md" | "lg";
}

export const PRODUCT_CARD_VARIANTS: Record<ProductCardVariant, ProductCardVariantConfig> = {
  default: {
    imageAspect: "aspect-square",
    showRating: true,
    showBrand: true,
    showInstallment: false,
    showQuickView: true,
    showStock: true,
    layout: "vertical",
    size: "md",
  },
  compact: {
    imageAspect: "aspect-square",
    showRating: false,
    showBrand: false,
    showInstallment: false,
    showQuickView: false,
    showStock: false,
    layout: "vertical",
    size: "sm",
  },
  horizontal: {
    imageAspect: "aspect-square",
    showRating: true,
    showBrand: true,
    showInstallment: false,
    showQuickView: false,
    showStock: true,
    layout: "horizontal",
    size: "md",
  },
  featured: {
    imageAspect: "aspect-[4/3]",
    showRating: true,
    showBrand: true,
    showInstallment: true,
    showQuickView: true,
    showStock: true,
    layout: "vertical",
    size: "lg",
  },
  sale: {
    imageAspect: "aspect-square",
    showRating: true,
    showBrand: true,
    showInstallment: false,
    showQuickView: true,
    showStock: true,
    layout: "vertical",
    size: "md",
  },
};

/* ===========================================================================
 * 3. MOCK API — server-shaped, paginated, resilient
 * ========================================================================= */

const IMG = (id: string, w = 600) =>
  `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;

const PRODUCT_SEED: Product[] = [
  {
    id: "p1",
    slug: "aurora-x1-wireless-headphones",
    name: "Aurora X1 Active Noise-Cancelling Headphones",
    brand: "Sonic Labs",
    image: IMG("photo-1505740420928-5e560c06d30e"),
    imageAlt: "Aurora X1 over-ear headphones in matte black",
    price: makePrice(249),
    originalPrice: makePrice(349),
    discountPercent: 29,
    rating: { value: 4.8, count: 3241 },
    badge: "bestseller",
    stock: 42,
    installment: { months: 6, perMonth: formatPrice(41.5) },
    category: "electronics",
    freeShipping: true,
  },
  {
    id: "p2",
    slug: "nova-pro-15-laptop",
    name: "Nova Pro 15\u2033 Laptop — 16GB / 1TB SSD",
    brand: "Nova",
    image: IMG("photo-1517336714731-489689fd1ca8"),
    imageAlt: "Nova Pro 15 inch laptop open on a desk",
    price: makePrice(1299),
    originalPrice: makePrice(1499),
    discountPercent: 13,
    rating: { value: 4.7, count: 1876 },
    badge: "new",
    stock: 12,
    installment: { months: 12, perMonth: formatPrice(108.25) },
    category: "electronics",
    freeShipping: true,
  },
  {
    id: "p3",
    slug: "lumen-smartwatch-s4",
    name: "Lumen Smartwatch S4 with Always-On Display",
    brand: "Lumen",
    image: IMG("photo-1523275335684-37898b6baf30"),
    imageAlt: "Lumen Smartwatch S4 with silver band",
    price: makePrice(199),
    originalPrice: makePrice(279),
    discountPercent: 29,
    rating: { value: 4.6, count: 2140 },
    badge: "trending",
    stock: 8,
    category: "electronics",
    freeShipping: true,
  },
  {
    id: "p4",
    slug: "cloudstep-running-shoes",
    name: "Cloudstep Everyday Running Shoes",
    brand: "Stride",
    image: IMG("photo-1542291026-7eec264c27ff"),
    imageAlt: "Cloudstep running shoes in coral and white",
    price: makePrice(89),
    originalPrice: makePrice(129),
    discountPercent: 31,
    rating: { value: 4.5, count: 4820 },
    badge: "sale",
    stock: 120,
    category: "fashion",
    freeShipping: true,
  },
  {
    id: "p5",
    slug: "terra-ceramic-cookware-set",
    name: "Terra 10-Piece Ceramic Cookware Set",
    brand: "Terra",
    image: IMG("photo-1584990347449-39b4a9c2b2b6"),
    imageAlt: "Terra ceramic cookware set on a stovetop",
    price: makePrice(179),
    originalPrice: makePrice(249),
    discountPercent: 28,
    rating: { value: 4.7, count: 934 },
    stock: 30,
    category: "home",
    freeShipping: true,
  },
  {
    id: "p6",
    slug: "pulse-buds-pro",
    name: "Pulse Buds Pro True Wireless Earbuds",
    brand: "Sonic Labs",
    image: IMG("photo-1590658268037-6bf12165a8df"),
    imageAlt: "Pulse Buds Pro in charging case",
    price: makePrice(129),
    originalPrice: makePrice(179),
    discountPercent: 28,
    rating: { value: 4.6, count: 5610 },
    badge: "bestseller",
    stock: 200,
    category: "electronics",
    freeShipping: true,
  },
  {
    id: "p7",
    slug: "linen-relaxed-shirt",
    name: "Linen Relaxed-Fit Shirt",
    brand: "Northwind",
    image: IMG("photo-1596755094514-f87e34085b2c"),
    imageAlt: "Linen shirt in sand color",
    price: makePrice(59),
    originalPrice: makePrice(89),
    discountPercent: 34,
    rating: { value: 4.4, count: 1280 },
    badge: "new",
    stock: 64,
    category: "fashion",
  },
  {
    id: "p8",
    slug: "everglow-skincare-set",
    name: "Everglow Hydration Skincare Set",
    brand: "Everglow",
    image: IMG("photo-1556228720-195a672e8a03"),
    imageAlt: "Everglow skincare set with bottles",
    price: makePrice(74),
    originalPrice: makePrice(99),
    discountPercent: 25,
    rating: { value: 4.8, count: 3020 },
    badge: "trending",
    stock: 45,
    category: "beauty",
    freeShipping: true,
  },
  {
    id: "p9",
    slug: "atlas-yoga-mat",
    name: "Atlas Pro Non-Slip Yoga Mat",
    brand: "Atlas",
    image: IMG("photo-1601925260368-ae2f83cf8b7f"),
    imageAlt: "Atlas Pro yoga mat rolled up",
    price: makePrice(45),
    originalPrice: makePrice(69),
    discountPercent: 35,
    rating: { value: 4.5, count: 2210 },
    stock: 88,
    category: "sports",
  },
  {
    id: "p10",
    slug: "hearth-cast-iron-skillet",
    name: "Hearth 12\u2033 Cast Iron Skillet",
    brand: "Hearth",
    image: IMG("photo-1556909212-d5b604d0c90d"),
    imageAlt: "Hearth cast iron skillet on a wooden table",
    price: makePrice(39),
    originalPrice: makePrice(59),
    discountPercent: 34,
    rating: { value: 4.9, count: 8800 },
    badge: "bestseller",
    stock: 300,
    category: "home",
  },
  {
    id: "p11",
    slug: "orbit-mechanical-keyboard",
    name: "Orbit 75% Mechanical Keyboard",
    brand: "Orbit",
    image: IMG("photo-1587829741301-dc798b83add3"),
    imageAlt: "Orbit mechanical keyboard with RGB lighting",
    price: makePrice(139),
    originalPrice: makePrice(189),
    discountPercent: 26,
    rating: { value: 4.7, count: 1520 },
    badge: "trending",
    stock: 24,
    category: "electronics",
  },
  {
    id: "p12",
    slug: "solstice-polarized-sunglasses",
    name: "Solstice Polarized Sunglasses",
    brand: "Solstice",
    image: IMG("photo-1511499767150-a48a237f0083"),
    imageAlt: "Solstice sunglasses with tortoise frame",
    price: makePrice(89),
    originalPrice: makePrice(149),
    discountPercent: 40,
    rating: { value: 4.3, count: 640 },
    badge: "sale",
    stock: 55,
    category: "fashion",
  },
];

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Deterministic pseudo-random failure injection, controlled by a flag. */
const SIMULATE_FAILURES = false;
function maybeFail(rate = 0.04): void {
  if (SIMULATE_FAILURES && Math.random() < rate) {
    throw { status: 500, data: "Simulated upstream failure" };
  }
}

const MOCK_DB = {
  home: async (): Promise<HomePagePayload> => {
    await delay(null, 180);
    maybeFail();
    const heroBanners: HeroBanner[] = [
      {
        id: "h1",
        eyebrow: "Spring Drop",
        headline: "Sound that moves with you",
        subheadline:
          "Premium audio gear engineered for everyday life. Up to 40% off this week.",
        ctaLabel: "Shop Audio",
        ctaHref: "/c/audio",
        image: IMG("photo-1546435770-a3e426bf472b", 1600),
        imageAlt: "Person wearing premium over-ear headphones",
        tone: "dark",
      },
      {
        id: "h2",
        eyebrow: "New Arrivals",
        headline: "Built for the work ahead",
        subheadline:
          "Laptops, monitors, and desk essentials trusted by professionals.",
        ctaLabel: "Explore Computing",
        ctaHref: "/c/computers",
        image: IMG("photo-1498050108023-c5249f4df085", 1600),
        imageAlt: "Modern workspace with laptop and monitor",
        tone: "cool",
      },
      {
        id: "h3",
        eyebrow: "Home Refresh",
        headline: "Everyday upgrades, honest prices",
        subheadline: "Cookware, decor, and storage that last. Free shipping over $35.",
        ctaLabel: "Shop Home",
        ctaHref: "/c/home",
        image: IMG("photo-1556909114-f6e7ad7d3136", 1600),
        imageAlt: "Bright modern kitchen with cookware",
        tone: "warm",
      },
    ];

    const quickCategories: Category[] = [
      { id: "c-electronics", slug: "electronics", name: "Electronics", icon: "💻", productCount: 12480 },
      { id: "c-fashion", slug: "fashion", name: "Fashion", icon: "👕", productCount: 24500 },
      { id: "c-home", slug: "home", name: "Home", icon: "🏠", productCount: 18700 },
      { id: "c-beauty", slug: "beauty", name: "Beauty", icon: "💄", productCount: 9800 },
      { id: "c-sports", slug: "sports", name: "Sports", icon: "🏀", productCount: 7600 },
      { id: "c-toys", slug: "toys", name: "Toys", icon: "🧸", productCount: 5400 },
      { id: "c-grocery", slug: "grocery", name: "Grocery", icon: "🛒", productCount: 15800 },
      { id: "c-books", slug: "books", name: "Books", icon: "📚", productCount: 42000 },
    ];

    const flashSale: FlashSale = {
      id: "fs1",
      title: "Flash Sale — Electronics",
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 6 + 1000 * 60 * 42).toISOString(),
      products: PRODUCT_SEED.filter((p) => p.category === "electronics").slice(0, 8),
    };

    const trending = [...PRODUCT_SEED]
      .filter((p) => p.badge === "trending" || p.rating.value >= 4.6)
      .slice(0, 10);

    const bestSellers = [...PRODUCT_SEED]
      .sort((a, b) => b.rating.count - a.rating.count)
      .slice(0, 10);

    const newArrivals = PRODUCT_SEED.filter((p) => p.badge === "new").concat(
      PRODUCT_SEED.slice(0, 4),
    ).slice(0, 10);

    const topRated = [...PRODUCT_SEED]
      .sort((a, b) => b.rating.value - a.rating.value)
      .slice(0, 10);

    const featuredCategories: Category[] = [
      {
        id: "fc1",
        slug: "audio",
        name: "Audio & Headphones",
        icon: "🎧",
        productCount: 3200,
        image: IMG("photo-1505740420928-5e560c06d30e"),
        description: "Studio-grade sound for work, travel, and everything between.",
      },
      {
        id: "fc2",
        slug: "computers",
        name: "Computers & Laptops",
        icon: "💻",
        productCount: 2100,
        image: IMG("photo-1517336714731-489689fd1ca8"),
        description: "Machines built for creators, coders, and everyday pros.",
      },
      {
        id: "fc3",
        slug: "home",
        name: "Home & Kitchen",
        icon: "🏠",
        productCount: 8700,
        image: IMG("photo-1556909114-f6e7ad7d3136"),
        description: "Tools and touches that make everyday living better.",
      },
      {
        id: "fc4",
        slug: "fashion",
        name: "Fashion Essentials",
        icon: "👟",
        productCount: 12400,
        image: IMG("photo-1445205170230-053b83016050"),
        description: "Wardrobe staples with an honest price tag.",
      },
    ];

    const featuredBrands: Brand[] = [
      { id: "b1", slug: "sonic-labs", name: "Sonic Labs", logo: "SL", category: "Audio", productCount: 240 },
      { id: "b2", slug: "nova", name: "Nova", logo: "NV", category: "Computing", productCount: 180 },
      { id: "b3", slug: "stride", name: "Stride", logo: "ST", category: "Footwear", productCount: 410 },
      { id: "b4", slug: "terra", name: "Terra", logo: "TR", category: "Kitchen", productCount: 320 },
      { id: "b5", slug: "lumen", name: "Lumen", logo: "LM", category: "Wearables", productCount: 150 },
      { id: "b6", slug: "everglow", name: "Everglow", logo: "EG", category: "Beauty", productCount: 280 },
    ];

    const deals: Deal[] = [
      {
        id: "d1",
        title: "Audio Week",
        description: "Up to 40% off headphones, earbuds, and speakers.",
        discountLabel: "40% OFF",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
        ctaLabel: "Shop Audio",
        ctaHref: "/c/audio",
        productCount: 1240,
      },
      {
        id: "d2",
        title: "Home Refresh",
        description: "Cookware, decor, and storage from $19.",
        discountLabel: "FROM $19",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 96).toISOString(),
        ctaLabel: "Shop Home",
        ctaHref: "/c/home",
        productCount: 860,
      },
      {
        id: "d3",
        title: "New Customer Offer",
        description: "Extra 15% off your first order over $50.",
        discountLabel: "15% OFF",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        ctaLabel: "Claim Offer",
        ctaHref: "/signup",
        productCount: 999,
      },
    ];

    const promotions: Promotion[] = [
      {
        id: "pr1",
        title: "Trade in. Trade up.",
        description:
          "Get instant credit toward your next device when you trade in your old one.",
        ctaLabel: "See trade-in value",
        ctaHref: "/trade-in",
        image: IMG("photo-1517336714731-489689fd1ca8", 900),
        imageAlt: "Laptop and phone trade-in",
        variant: "large",
      },
      {
        id: "pr2",
        title: "Free 2-day shipping",
        description: "On thousands of eligible items with Meridian Plus.",
        ctaLabel: "Learn more",
        ctaHref: "/plus",
        image: IMG("photo-1586528116311-ad8dd3c8310d", 600),
        imageAlt: "Delivery boxes",
        variant: "medium",
      },
      {
        id: "pr3",
        title: "Student discount",
        description: "Save 10% with verified student status.",
        ctaLabel: "Verify",
        ctaHref: "/student",
        image: IMG("photo-1523240795612-9a054b0db644", 600),
        imageAlt: "Student with laptop",
        variant: "medium",
      },
    ];

    return {
      heroBanners,
      quickCategories,
      flashSale,
      trending,
      bestSellers,
      newArrivals,
      topRated,
      featuredCategories,
      featuredBrands,
      deals,
      promotions,
    };
  },

  search: async (query: string): Promise<SearchSuggestion[]> => {
    await delay(null, 140);
    maybeFail(0.03);
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const products = PRODUCT_SEED.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.includes(q),
    )
      .slice(0, 5)
      .map<SearchSuggestion>((p) => ({
        id: `sp-${p.id}`,
        type: "product",
        label: p.name,
        href: `/p/${p.slug}`,
        image: p.image,
        meta: p.price.formatted,
      }));
    const categories = CATEGORY_NAVIGATION.filter((c) =>
      c.label.toLowerCase().includes(q),
    )
      .slice(0, 3)
      .map<SearchSuggestion>((c) => ({
        id: `sc-${c.id}`,
        type: "category",
        label: c.label,
        href: c.href,
        meta: "Category",
      }));
    return [...products, ...categories];
  },

  recentlyViewed: async (): Promise<Product[]> => {
    await delay(null, 120);
    maybeFail(0.05);
    // Empty for guests — section is hidden when empty.
    return [];
  },

  recommendations: async (customerId: string | null): Promise<Recommendation[]> => {
    await delay(null, 220);
    maybeFail();
    const pool = customerId
      ? PRODUCT_SEED.slice(0, 10)
      : PRODUCT_SEED.slice(4, 10);
    return pool.slice(0, 8).map((p, i) => ({
      id: `r-${p.id}`,
      product: p,
      reason:
        i % 3 === 0
          ? "Based on your browsing"
          : i % 3 === 1
            ? "Because you viewed similar items"
            : "Top picks for you",
    }));
  },

  cart: async (): Promise<CartSummary> => {
    await delay(null, 90);
    maybeFail(0.02);
    return { items: [], itemCount: 0, subtotal: makePrice(0), estimatedTotal: makePrice(0) };
  },

  wishlist: async (): Promise<WishlistItem[]> => {
    await delay(null, 80);
    maybeFail(0.02);
    return [];
  },
};

/* ===========================================================================
 * 4. REDUX — UI state only (server state lives in RTK Query)
 * ========================================================================= */

interface CartUiState {
  isMiniCartOpen: boolean;
  lastAddedProductId: string | null;
}

const cartUiSlice = createSlice({
  name: "cartUi",
  initialState: { isMiniCartOpen: false, lastAddedProductId: null } as CartUiState,
  reducers: {
    openMiniCart(state) {
      state.isMiniCartOpen = true;
    },
    closeMiniCart(state) {
      state.isMiniCartOpen = false;
    },
    markLastAdded(state, action: PayloadAction<string | null>) {
      state.lastAddedProductId = action.payload;
    },
  },
});

interface WishlistUiState {
  optimisticIds: string[];
}

const wishlistUiSlice = createSlice({
  name: "wishlistUi",
  initialState: { optimisticIds: [] } as WishlistUiState,
  reducers: {
    toggleOptimistic(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.optimisticIds.indexOf(id);
      if (idx >= 0) state.optimisticIds.splice(idx, 1);
      else state.optimisticIds.push(id);
    },
  },
});

interface UiState {
  isMobileNavOpen: boolean;
  isSearchFocused: boolean;
  activeMegaMenu: string | null;
  theme: "light" | "dark";
}

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isMobileNavOpen: false,
    isSearchFocused: false,
    activeMegaMenu: null,
    theme: "light",
  } as UiState,
  reducers: {
    toggleMobileNav(state, action: PayloadAction<boolean | undefined>) {
      state.isMobileNavOpen = action.payload ?? !state.isMobileNavOpen;
    },
    setSearchFocused(state, action: PayloadAction<boolean>) {
      state.isSearchFocused = action.payload;
    },
    setActiveMegaMenu(state, action: PayloadAction<string | null>) {
      state.activeMegaMenu = action.payload;
    },
    setTheme(state, action: PayloadAction<"light" | "dark">) {
      state.theme = action.payload;
    },
  },
});

interface PreferencesState {
  currency: "USD";
  locale: "en-US";
  location: string;
}

const preferencesSlice = createSlice({
  name: "preferences",
  initialState: { currency: "USD", locale: "en-US", location: "New York, NY" } as PreferencesState,
  reducers: {
    setLocation(state, action: PayloadAction<string>) {
      state.location = action.payload;
    },
  },
});

interface SearchUiState {
  recentQueries: string[];
}

const searchUiSlice = createSlice({
  name: "searchUi",
  initialState: { recentQueries: ["headphones", "laptop", "running shoes"] } as SearchUiState,
  reducers: {
    addRecentQuery(state, action: PayloadAction<string>) {
      const q = action.payload.trim();
      if (!q) return;
      state.recentQueries = [q, ...state.recentQueries.filter((x) => x !== q)].slice(0, 6);
    },
    clearRecentQueries(state) {
      state.recentQueries = [];
    },
  },
});

export const { openMiniCart, closeMiniCart, markLastAdded } = cartUiSlice.actions;
export const { toggleOptimistic } = wishlistUiSlice.actions;
export const { toggleMobileNav, setSearchFocused, setActiveMegaMenu, setTheme } =
  uiSlice.actions;
export const { setLocation } = preferencesSlice.actions;
export const { addRecentQuery, clearRecentQueries } = searchUiSlice.actions;

/* ===========================================================================
 * 5. RTK QUERY — server state
 * ========================================================================= */

type SimulatedBaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>;

const simulatedBaseQuery: SimulatedBaseQuery = async (args) => {
  // In production this would be fetchBaseQuery({ baseUrl: "/api" }).
  // Here we route to the in-file mock DB with the same semantics.
  return { data: { args } };
};

export const ecommerceApi = createApi({
  reducerPath: "ecommerceApi",
  baseQuery: simulatedBaseQuery,
  tagTypes: [
    "Home",
    "Cart",
    "Wishlist",
    "Recommendations",
    "Search",
    "RecentlyViewed",
  ],
  keepUnusedDataFor: 300,
  refetchOnFocus: false,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getHomePage: builder.query<HomePagePayload, void>({
      queryFn: async () => {
        try {
          const data = await MOCK_DB.home();
          return { data };
        } catch (e) {
          return { error: e as FetchBaseQueryError };
        }
      },
      providesTags: ["Home"],
    }),
    getRecommendations: builder.query<Recommendation[], { customerId: string | null }>({
      queryFn: async ({ customerId }) => {
        try {
          const data = await MOCK_DB.recommendations(customerId);
          return { data };
        } catch (e) {
          return { error: e as FetchBaseQueryError };
        }
      },
      providesTags: ["Recommendations"],
    }),
    getRecentlyViewed: builder.query<Product[], void>({
      queryFn: async () => {
        try {
          const data = await MOCK_DB.recentlyViewed();
          return { data };
        } catch (e) {
          return { error: e as FetchBaseQueryError };
        }
      },
      providesTags: ["RecentlyViewed"],
    }),
    getSearchSuggestions: builder.query<SearchSuggestion[], string>({
      queryFn: async (q) => {
        try {
          const data = await MOCK_DB.search(q);
          return { data };
        } catch (e) {
          return { error: e as FetchBaseQueryError };
        }
      },
      providesTags: ["Search"],
      keepUnusedDataFor: 60,
    }),
    getCart: builder.query<CartSummary, void>({
      queryFn: async () => {
        try {
          const data = await MOCK_DB.cart();
          return { data };
        } catch (e) {
          return { error: e as FetchBaseQueryError };
        }
      },
      providesTags: ["Cart"],
    }),
    getWishlist: builder.query<WishlistItem[], void>({
      queryFn: async () => {
        try {
          const data = await MOCK_DB.wishlist();
          return { data };
        } catch (e) {
          return { error: e as FetchBaseQueryError };
        }
      },
      providesTags: ["Wishlist"],
    }),
  }),
});

export const {
  useGetHomePageQuery,
  useGetRecommendationsQuery,
  useGetRecentlyViewedQuery,
  useGetSearchSuggestionsQuery,
  useGetCartQuery,
  useGetWishlistQuery,
} = ecommerceApi;

/* ===========================================================================
 * 6. STORE
 * ========================================================================= */

export function makeStore() {
  return configureStore({
    reducer: {
      cartUi: cartUiSlice.reducer,
      wishlistUi: wishlistUiSlice.reducer,
      ui: uiSlice.reducer,
      preferences: preferencesSlice.reducer,
      searchUi: searchUiSlice.reducer,
      [ecommerceApi.reducerPath]: ecommerceApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(ecommerceApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/* ===========================================================================
 * 7. AUTH CONTEXT — minimal, secrets never live here
 * ========================================================================= */

interface AuthContextValue {
  customer: Customer | null;
}

const AuthContext = createContext<AuthContextValue>({ customer: null });

export function AuthProvider({
  customer,
  children,
}: {
  customer: Customer | null;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ customer }), [customer]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useCustomer(): Customer | null {
  return useContext(AuthContext).customer;
}

/* ===========================================================================
 * 8. UTILITIES & HOOKS
 * ========================================================================= */

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Media query hook, SSR-safe. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

/** Prefers-reduced-motion, SSR-safe. */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** IntersectionObserver-based lazy rendering. */
export function useInView<T extends HTMLElement>(
  options?: IntersectionObserverInit,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setInView(true);
      },
      { rootMargin: "300px 0px", threshold: 0.01, ...options },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, options]);
  return [ref, inView];
}

/** Lock body scroll while a modal/drawer is open. */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

/** Focus trap for dialogs. */
export function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active || !ref.current) return;
    const root = ref.current;
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || focusables.length === 0) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [ref, active]);
}

/** Countdown state isolated in its own component so ticks don't rerender the page. */
function useCountdown(targetIso: string) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(targetIso).getTime() - Date.now()),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(targetIso).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, expired: remaining <= 0 };
}

/* ===========================================================================
 * 9. PRIMITIVES
 * ========================================================================= */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]",
  secondary:
    "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:opacity-90",
  ghost:
    "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
  danger:
    "bg-[var(--color-danger)] text-white hover:opacity-90",
  outline:
    "bg-transparent border border-[var(--color-border-strong)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-small gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-10 px-4 text-body gap-2 rounded-[var(--radius-md)]",
  lg: "h-12 px-6 text-body-lg gap-2.5 rounded-[var(--radius-lg)]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  iconLeft,
  iconRight,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "transition-[background-color,opacity,transform] duration-[var(--duration-fast)]",
        "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        iconLeft
      )}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "solid";
}

export function IconButton({
  label,
  size = "md",
  variant = "ghost",
  className,
  children,
  ...rest
}: IconButtonProps) {
  const sz = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex items-center justify-center rounded-[var(--radius-md)]",
        "transition-colors duration-[var(--duration-fast)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
        variant === "solid"
          ? "bg-[var(--color-muted)] hover:bg-[var(--color-border)]"
          : "hover:bg-[var(--color-muted)]",
        sz,
        className,
      )}
    >
      {children}
    </button>
  );
}

interface BadgeProps {
  tone?: "neutral" | "sale" | "new" | "success" | "warning" | "info";
  children: ReactNode;
  className?: string;
}

const BADGE_TONES: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-[var(--color-muted)] text-[var(--color-foreground)]",
  sale: "bg-[var(--color-sale)] text-white",
  new: "bg-[var(--color-success)] text-white",
  success: "bg-[var(--color-success-subtle)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]",
  info: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return (
    <As
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Container({
  children,
  className,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "wide" | "narrow";
}) {
  const max =
    size === "wide"
      ? "max-w-[1440px]"
      : size === "narrow"
        ? "max-w-[960px]"
        : "max-w-[1280px]";
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", max, className)}>
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-[var(--radius-md)]", className)} />;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-t border-[var(--color-border)]", className)} />;
}

/* ===========================================================================
 * 10. SHARED COMPONENTS
 * ========================================================================= */

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-h2 font-semibold tracking-tight text-balance">{title}</h2>
        {description && (
          <p className="mt-1 text-body text-[var(--color-muted-foreground)] text-pretty">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Price({
  price,
  originalPrice,
  size = "md",
  className,
}: {
  price: Price;
  originalPrice?: Price;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "text-body font-semibold",
    md: "text-body-lg font-semibold",
    lg: "text-h3 font-bold",
  } as const;
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("text-[var(--color-foreground)] tabular-nums", sizes[size])}>
        {price.formatted}
      </span>
      {originalPrice && (
        <span className="text-small text-[var(--color-muted-foreground)] line-through tabular-nums">
          {originalPrice.formatted}
        </span>
      )}
    </div>
  );
}

export function RatingStars({
  rating,
  size = 14,
  className,
}: {
  rating: Rating;
  size?: number;
  className?: string;
}) {
  const full = Math.floor(rating.value);
  const hasHalf = rating.value - full >= 0.5;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < full || (i === full && hasHalf);
          return (
            <Star
              key={i}
              width={size}
              height={size}
              className={cn(
                filled
                  ? "fill-[var(--color-rating)] text-[var(--color-rating)]"
                  : "text-[var(--color-border-strong)]",
              )}
            />
          );
        })}
      </div>
      <span className="text-small text-[var(--color-muted-foreground)] tabular-nums">
        {rating.value.toFixed(1)}
      </span>
      <span className="text-small text-[var(--color-muted-foreground)]">
        ({formatCount(rating.count)})
      </span>
      <span className="sr-only">
        Rated {rating.value.toFixed(1)} out of 5 from {rating.count} reviews
      </span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Package,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-6 py-12 text-center">
      <Icon className="size-8 text-[var(--color-muted-foreground)]" />
      <div>
        <p className="text-body-lg font-semibold">{title}</p>
        {description && (
          <p className="mt-1 text-body text-[var(--color-muted-foreground)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this section. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-danger-subtle)] px-6 py-10 text-center"
    >
      <AlertCircle className="size-7 text-[var(--color-danger)]" />
      <div>
        <p className="text-body-lg font-semibold">{title}</p>
        <p className="mt-1 text-body text-[var(--color-muted-foreground)]">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ===========================================================================
 * 11. PRODUCT COMPONENTS
 * ========================================================================= */

interface ProductCardProps {
  product: Product;
  variant?: ProductCardVariant;
  priority?: boolean;
  onQuickView?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  isWishlisted?: boolean;
}

export function ProductCard({
  product,
  variant = "default",
  priority = false,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
}: ProductCardProps) {
  const cfg = PRODUCT_CARD_VARIANTS[variant];
  const [imgError, setImgError] = useState(false);
  const isHorizontal = cfg.layout === "horizontal";
  const lowStock = product.stock > 0 && product.stock <= 10;

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        "transition-[border-color,box-shadow] duration-[var(--duration-base)]",
        "hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)]",
        isHorizontal ? "flex-row" : "flex-col",
      )}
    >
      {/* Image */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-[var(--color-muted)]",
          isHorizontal ? "w-32 sm:w-40" : "w-full",
          !isHorizontal && cfg.imageAspect,
        )}
      >
        <a
          href={`/p/${product.slug}`}
          className="block size-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)]"
          aria-label={product.name}
        >
          {imgError ? (
            <div className="flex size-full items-center justify-center text-[var(--color-muted-foreground)]">
              <Package className="size-8" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.imageAlt}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
              onError={() => setImgError(true)}
              className={cn(
                "size-full object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)]",
                "group-hover:scale-[1.03] motion-reduce:group-hover:scale-100",
              )}
            />
          )}
        </a>

        {/* Badges */}
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {product.badge === "sale" && product.discountPercent && (
            <Badge tone="sale">-{product.discountPercent}%</Badge>
          )}
          {product.badge === "new" && (
            <Badge tone="new">
              <Sparkles className="size-3" /> New
            </Badge>
          )}
          {product.badge === "trending" && (
            <Badge tone="info">
              <TrendingUp className="size-3" /> Trending
            </Badge>
          )}
          {product.badge === "bestseller" && <Badge tone="warning">Bestseller</Badge>}
        </div>

        {/* Wishlist */}
        {onToggleWishlist && (
          <IconButton
            label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onToggleWishlist(product);
            }}
            className={cn(
              "absolute right-2 top-2 bg-[var(--color-surface)]/85 backdrop-blur-sm",
              "shadow-[var(--shadow-xs)] hover:bg-[var(--color-surface)]",
              isWishlisted && "text-[var(--color-danger)]",
            )}
          >
            <Heart className={cn("size-4", isWishlisted && "fill-current")} />
          </IconButton>
        )}

        {/* Quick view */}
        {cfg.showQuickView && onQuickView && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden justify-center p-2 opacity-0 transition-opacity duration-[var(--duration-base)] group-hover:pointer-events-auto group-hover:opacity-100 md:flex">
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Eye className="size-3.5" />}
              onClick={() => onQuickView(product)}
              className="shadow-[var(--shadow-md)]"
            >
              Quick view
            </Button>
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1.5",
          cfg.size === "sm" ? "p-2.5" : "p-3 sm:p-4",
        )}
      >
        {cfg.showBrand && (
          <p className="text-caption font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {product.brand}
          </p>
        )}

        <h3
          className={cn(
            "line-clamp-2 font-medium leading-snug",
            cfg.size === "sm" ? "text-small" : "text-body",
          )}
        >
          <a
            href={`/p/${product.slug}`}
            className="after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none"
          >
            {product.name}
          </a>
        </h3>

        {cfg.showRating && <RatingStars rating={product.rating} size={cfg.size === "sm" ? 12 : 14} />}

        <div className="mt-auto flex flex-col gap-1 pt-1">
          <Price
            price={product.price}
            originalPrice={product.originalPrice}
            size={cfg.size === "sm" ? "sm" : "md"}
          />

          {cfg.showInstallment && product.installment && (
            <p className="text-caption text-[var(--color-muted-foreground)]">
              or {product.installment.perMonth}/mo for {product.installment.months} mo
            </p>
          )}

          {cfg.showStock && (
            <div className="flex items-center gap-2 text-caption">
              {product.stock === 0 ? (
                <span className="font-medium text-[var(--color-danger)]">Out of stock</span>
              ) : lowStock ? (
                <span className="font-medium text-[var(--color-warning)]">
                  Only {product.stock} left
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[var(--color-success)]">
                  <Check className="size-3" /> In stock
                </span>
              )}
              {product.freeShipping && (
                <span className="text-[var(--color-muted-foreground)]">· Free shipping</span>
              )}
            </div>
          )}

          {onAddToCart && (
            <div className="relative z-10 pt-2">
              <Button
                size="sm"
                variant="primary"
                className="w-full"
                disabled={product.stock === 0}
                onClick={() => onAddToCart(product)}
                iconLeft={<ShoppingCart className="size-3.5" />}
              >
                {product.stock === 0 ? "Unavailable" : "Add to cart"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton({
  variant = "default",
}: {
  variant?: ProductCardVariant;
}) {
  const cfg = PRODUCT_CARD_VARIANTS[variant];
  return (
    <div
      aria-hidden
      className={cn(
        "flex overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        cfg.layout === "horizontal" ? "flex-row" : "flex-col",
      )}
    >
      <Skeleton
        className={cn(
          "rounded-none",
          cfg.layout === "horizontal" ? "w-32 sm:w-40 aspect-square" : cn("w-full", cfg.imageAspect),
        )}
      />
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-full" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface ProductCarouselProps {
  products: Product[];
  variant?: ProductCardVariant;
  ariaLabel: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onQuickView?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  wishlistedIds?: Set<string>;
  priorityCount?: number;
}

export function ProductCarousel({
  products,
  variant = "default",
  ariaLabel,
  isLoading,
  isError,
  onRetry,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
  priorityCount = 0,
}: ProductCarouselProps) {
  const railRef = useRef<HTMLUListElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = railRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateArrows, products.length]);

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const amount = Math.max(240, el.clientWidth * 0.8);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }, []);

  if (isError) {
    return <ErrorState title="Couldn't load products" onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <ProductCardSkeleton key={i} variant={variant} />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <EmptyState
        title="No products to show"
        description="Check back soon — we're restocking this collection."
      />
    );
  }

  return (
    <div className="relative">
      {/* Desktop arrows */}
      <div className="pointer-events-none absolute -top-12 right-0 hidden items-center gap-1 md:flex">
        <IconButton
          label={`Scroll ${ariaLabel} left`}
          onClick={() => scrollBy(-1)}
          disabled={!canLeft}
          className={cn(
            "pointer-events-auto border border-[var(--color-border)] bg-[var(--color-surface)]",
            !canLeft && "opacity-40",
          )}
        >
          <ChevronLeft className="size-4" />
        </IconButton>
        <IconButton
          label={`Scroll ${ariaLabel} right`}
          onClick={() => scrollBy(1)}
          disabled={!canRight}
          className={cn(
            "pointer-events-auto border border-[var(--color-border)] bg-[var(--color-surface)]",
            !canRight && "opacity-40",
          )}
        >
          <ChevronRight className="size-4" />
        </IconButton>
      </div>

      <ul
        ref={railRef}
        onScroll={updateArrows}
        aria-label={ariaLabel}
        className={cn(
          "no-scrollbar snap-rail flex gap-3 overflow-x-auto pb-1",
          "scroll-px-4 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-5",
        )}
      >
        {products.map((p, i) => (
          <li
            key={p.id}
            className="snap-item w-[62%] min-w-[168px] shrink-0 sm:w-[38%] md:w-auto md:min-w-0 md:shrink"
          >
            <ProductCard
              product={p}
              variant={variant}
              priority={i < priorityCount}
              onQuickView={onQuickView}
              onAddToCart={onAddToCart}
              onToggleWishlist={onToggleWishlist}
              isWishlisted={wishlistedIds?.has(p.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ===========================================================================
 * 12. DOMAIN COMPONENTS
 * ========================================================================= */

export function CategoryCard({ category }: { category: Category }) {
  return (
    <a
      href={`/c/${category.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        "transition-[border-color,box-shadow] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)]",
      )}
    >
      {category.image && (
        <div className="aspect-[4/3] overflow-hidden bg-[var(--color-muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={category.image}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)] group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
          />
        </div>
      )}
      <div className="flex flex-col gap-1 p-4">
        <h3 className="text-body-lg font-semibold">{category.name}</h3>
        {category.description && (
          <p className="line-clamp-2 text-small text-[var(--color-muted-foreground)]">
            {category.description}
          </p>
        )}
        <span className="mt-1 text-caption text-[var(--color-muted-foreground)]">
          {formatCount(category.productCount)} products
        </span>
      </div>
    </a>
  );
}

export function BrandCard({ brand }: { brand: Brand }) {
  return (
    <a
      href={`/b/${brand.slug}`}
      className={cn(
        "flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center",
        "transition-[border-color,box-shadow] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)]",
      )}
    >
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-full bg-[var(--color-primary-subtle)] text-h3 font-bold text-[var(--color-primary)]"
      >
        {brand.logo}
      </span>
      <div>
        <p className="text-body font-semibold">{brand.name}</p>
        <p className="text-caption text-[var(--color-muted-foreground)]">
          {brand.category} · {formatCount(brand.productCount)} items
        </p>
      </div>
    </a>
  );
}

export function PromoBanner({ promo }: { promo: Promotion }) {
  const aspect =
    promo.variant === "large"
      ? "aspect-[16/9] sm:aspect-[21/9]"
      : promo.variant === "medium"
        ? "aspect-[16/9]"
        : "aspect-[4/3]";
  return (
    <a
      href={promo.ctaHref}
      className={cn(
        "group relative block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
      )}
    >
      <div className={cn("relative w-full bg-[var(--color-muted)]", aspect)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={promo.image}
          alt={promo.imageAlt}
          loading="lazy"
          className="size-full object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <h3 className="text-h3 font-semibold text-white text-balance">{promo.title}</h3>
        <p className="mt-1 max-w-md text-body text-white/80 text-pretty">
          {promo.description}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-body font-medium text-white underline-offset-4 group-hover:underline">
          {promo.ctaLabel} <ArrowRight className="size-4" />
        </span>
      </div>
    </a>
  );
}

export function DealCard({ deal }: { deal: Deal }) {
  return (
    <a
      href={deal.ctaHref}
      className="group flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-[border-color,box-shadow] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)]"
    >
      <Badge tone="sale">{deal.discountLabel}</Badge>
      <h3 className="text-body-lg font-semibold">{deal.title}</h3>
      <p className="text-small text-[var(--color-muted-foreground)] text-pretty">
        {deal.description}
      </p>
      <CountdownInline target={deal.expiresAt} />
      <span className="mt-auto pt-2 inline-flex items-center gap-1.5 text-body font-medium text-[var(--color-primary)]">
        {deal.ctaLabel} <ArrowRight className="size-4" />
      </span>
    </a>
  );
}

/** Isolated countdown — only this subtree rerenders each second. */
export function CountdownInline({ target }: { target: string }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(target);
  if (expired) {
    return <span className="text-small font-medium text-[var(--color-danger)]">Expired</span>;
  }
  return (
    <p className="text-small text-[var(--color-muted-foreground)] tabular-nums">
      <Clock className="mr-1 inline size-3.5 -translate-y-px" />
      Ends in {days > 0 && `${days}d `}
      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
      {String(seconds).padStart(2, "0")}
    </p>
  );
}

export function TrustBar({ items }: { items: TrustItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map(({ id, icon: Icon, title, description }) => (
        <li key={id} className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-body font-semibold">{title}</p>
            <p className="text-small text-[var(--color-muted-foreground)]">{description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ===========================================================================
 * 13. HEADER & NAVIGATION
 * ========================================================================= */

export function SearchBar({
  onSelectSuggestion,
}: {
  onSelectSuggestion?: (s: SearchSuggestion) => void;
}) {
  const dispatch = useAppDispatch();
  const recentQueries = useAppSelector((s) => s.searchUi.recentQueries);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const { data: suggestions = [], isFetching, isError } = useGetSearchSuggestionsQuery(query, {
    skip: query.trim().length < 2,
  });

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showRecent = query.length < 2 && recentQueries.length > 0;
  const items: SearchSuggestion[] = showRecent
    ? recentQueries.map<SearchSuggestion>((q) => ({
        id: `recent-${q}`,
        type: "query",
        label: q,
        href: `/search?q=${encodeURIComponent(q)}`,
      }))
    : suggestions;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        commit(items[activeIndex]);
      } else if (query.trim()) {
        commit({
          id: "submit",
          type: "query",
          label: query,
          href: `/search?q=${encodeURIComponent(query)}`,
        });
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const commit = (s: SearchSuggestion) => {
    dispatch(addRecentQuery(s.label));
    onSelectSuggestion?.(s);
    setOpen(false);
    // Real app: router.push(s.href)
    if (typeof window !== "undefined") window.location.assign(s.href);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          "flex h-11 items-center gap-2 rounded-[var(--radius-lg)] border bg-[var(--color-surface)] px-3",
          "transition-[border-color,box-shadow]",
          open
            ? "border-[var(--color-primary)] shadow-[var(--shadow-focus)]"
            : "border-[var(--color-border-strong)]",
        )}
      >
        <Search className="size-4 shrink-0 text-[var(--color-muted-foreground)]" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products, brands, and categories"
          className="h-full min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-[var(--color-muted-foreground)]"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="rounded-full p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && (items.length > 0 || isFetching || showRecent) && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-lg)] animate-scale-in">
          {showRecent && (
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
              <p className="text-caption font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Recent searches
              </p>
              <button
                type="button"
                className="text-caption text-[var(--color-primary)] hover:underline"
                onClick={() => dispatch(clearRecentQueries())}
              >
                Clear
              </button>
            </div>
          )}
          {isFetching && (
            <div className="space-y-2 p-4" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-[var(--radius-sm)]" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {isError && (
            <p className="p-4 text-small text-[var(--color-muted-foreground)]">
              Suggestions unavailable. Press Enter to search.
            </p>
          )}
          {!isFetching && items.length > 0 && (
            <ul id={listboxId} role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
              {items.map((s, i) => (
                <li
                  key={s.id}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commit(s)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left",
                      i === activeIndex
                        ? "bg-[var(--color-muted)]"
                        : "hover:bg-[var(--color-muted)]",
                    )}
                  >
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.image}
                        alt=""
                        className="size-9 rounded-[var(--radius-sm)] object-cover"
                      />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                        {s.type === "query" ? (
                          <Clock className="size-4" />
                        ) : (
                          <Search className="size-4" />
                        )}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body">{s.label}</span>
                      {s.meta && (
                        <span className="block truncate text-caption text-[var(--color-muted-foreground)]">
                          {s.meta}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function LocationSelector() {
  const dispatch = useAppDispatch();
  const location = useAppSelector((s) => s.preferences.location);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const options = ["New York, NY", "San Francisco, CA", "Austin, TX", "Seattle, WA"];

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-small hover:bg-[var(--color-muted)]"
      >
        <MapPin className="size-4 text-[var(--color-muted-foreground)]" />
        <span className="max-w-[10rem] truncate">
          <span className="text-[var(--color-muted-foreground)]">Deliver to </span>
          <span className="font-medium">{location}</span>
        </span>
        <ChevronDown className="size-3.5 text-[var(--color-muted-foreground)]" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-40 min-w-[14rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-[var(--shadow-lg)] animate-scale-in"
        >
          {options.map((o) => (
            <li key={o} role="option" aria-selected={o === location}>
              <button
                type="button"
                onClick={() => {
                  dispatch(setLocation(o));
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2 text-left text-body hover:bg-[var(--color-muted)]",
                  o === location && "font-medium text-[var(--color-primary)]",
                )}
              >
                {o}
                {o === location && <Check className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AccountMenu() {
  const customer = useCustomer();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-small hover:bg-[var(--color-muted)]"
      >
        <User className="size-5" />
        <span className="hidden text-left leading-tight xl:block">
          <span className="block text-caption text-[var(--color-muted-foreground)]">
            {customer ? "Hello," : "Sign in"}
          </span>
          <span className="block font-medium">
            {customer ? customer.firstName : "Account"}
          </span>
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-64 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1 shadow-[var(--shadow-lg)] animate-scale-in"
        >
          {!customer && (
            <div className="border-b border-[var(--color-border)] p-3">
              <a
                href="/signin"
                className="block w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-center text-body font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]"
              >
                Sign in
              </a>
              <p className="mt-2 text-center text-caption text-[var(--color-muted-foreground)]">
                New customer?{" "}
                <a href="/register" className="text-[var(--color-primary)] hover:underline">
                  Start here
                </a>
              </p>
            </div>
          )}
          <ul className="py-1">
            {[
              { label: "Your account", href: "/account" },
              { label: "Your orders", href: "/orders" },
              { label: "Your wishlist", href: "/wishlist" },
              { label: "Recommendations", href: "/recommendations" },
              { label: "Customer service", href: "/help" },
            ].map((item) => (
              <li key={item.href} role="none">
                <a
                  role="menuitem"
                  href={item.href}
                  className="block rounded-[var(--radius-sm)] px-3 py-2 text-body hover:bg-[var(--color-muted)]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SiteHeader({
  onOpenCart,
  onOpenWishlist,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
}: {
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
}) {
  const dispatch = useAppDispatch();
  const customer = useCustomer();
  const { data: cart } = useGetCartQuery();
  const { data: wishlist } = useGetWishlistQuery(undefined, { skip: !customer });
  const cartCount = cart?.itemCount ?? 0;
  const wishlistCount = (wishlist?.length ?? 0) + wishlistedIds.size;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/80">
      {/* Announcement bar */}
      <AnnouncementBar />

      <Container size="wide">
        <div className="flex h-16 items-center gap-3">
          <IconButton
            label="Open menu"
            className="lg:hidden"
            onClick={() => dispatch(toggleMobileNav(true))}
          >
            <Menu className="size-5" />
          </IconButton>

          <a
            href="/"
            className="flex shrink-0 items-center gap-2"
            aria-label="Meridian home"
          >
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-body-lg font-bold text-[var(--color-primary-foreground)]"
            >
              M
            </span>
            <span className="hidden text-h3 font-semibold tracking-tight sm:block">
              Meridian
            </span>
          </a>

          <LocationSelector />

          <div className="mx-1 hidden min-w-0 flex-1 md:block">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-0.5">
            <AccountMenu />

            <IconButton
              label="Wishlist"
              onClick={onOpenWishlist}
              className="hidden sm:inline-flex"
            >
              <Heart className="size-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold leading-4 text-white">
                  {wishlistCount}
                </span>
              )}
            </IconButton>

            <IconButton label="Cart" onClick={onOpenCart}>
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold leading-4 text-[var(--color-primary-foreground)]">
                  {cartCount}
                </span>
              )}
            </IconButton>
          </div>
        </div>

        {/* Mobile search */}
        <div className="pb-3 md:hidden">
          <SearchBar />
        </div>
      </Container>
    </header>
  );
}

export function AnnouncementBar() {
  return (
    <div className="bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]">
      <Container size="wide">
        <p className="flex items-center justify-center gap-2 py-2 text-center text-small">
          <Truck className="size-3.5" aria-hidden />
          <span>
            Free shipping on orders over $35 ·{" "}
            <a href="/plus" className="underline underline-offset-2 hover:opacity-90">
              Join Meridian Plus for free 2-day delivery
            </a>
          </span>
        </p>
      </Container>
    </div>
  );
}

export function CategoryNavigation() {
  const dispatch = useAppDispatch();
  const active = useAppSelector((s) => s.ui.activeMegaMenu);

  return (
    <nav
      aria-label="Primary categories"
      className="border-b border-[var(--color-border)] bg-[var(--color-surface)]"
      onMouseLeave={() => dispatch(setActiveMegaMenu(null))}
    >
      <Container size="wide">
        <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto py-1">
          <li className="shrink-0">
            <a
              href="/c"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-body font-medium hover:bg-[var(--color-muted)]"
            >
              <Menu className="size-4" /> All
            </a>
          </li>
          {CATEGORY_NAVIGATION.map((cat) => (
            <li
              key={cat.id}
              className="shrink-0"
              onMouseEnter={() => cat.columns && dispatch(setActiveMegaMenu(cat.id))}
            >
              <a
                href={cat.href}
                aria-haspopup={cat.columns ? "true" : undefined}
                aria-expanded={cat.columns ? active === cat.id : undefined}
                className={cn(
                  "inline-flex items-center gap-1 rounded-[var(--radius-md)] px-3 py-2 text-body",
                  "transition-colors hover:bg-[var(--color-muted)]",
                  active === cat.id && "bg-[var(--color-muted)]",
                )}
              >
                {cat.label}
                {cat.columns && <ChevronDown className="size-3.5 opacity-60" />}
              </a>
            </li>
          ))}
        </ul>
      </Container>

      {active && <MegaMenu item={CATEGORY_NAVIGATION.find((c) => c.id === active) ?? null} />}
    </nav>
  );
}

export function MegaMenu({ item }: { item: CategoryNavItem | null }) {
  if (!item?.columns) return null;
  return (
    <div
      className="absolute left-0 right-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-lg)] animate-fade-in"
      role="region"
      aria-label={`${item.label} menu`}
    >
      <Container size="wide">
        <div className="grid grid-cols-4 gap-8 py-6">
          {item.columns.map((col) => (
            <div key={col.title}>
              <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {col.title}
              </p>
              <ul className="space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="block rounded-[var(--radius-sm)] px-1 py-1 text-body hover:text-[var(--color-primary)]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {item.featured && (
            <a href={item.featured.href} className="group block">
              <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-muted)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.featured.image}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                />
              </div>
              <p className="mt-2 text-body font-medium">{item.featured.title}</p>
            </a>
          )}
        </div>
      </Container>
    </div>
  );
}

/* ===========================================================================
 * 14. SECTIONS
 * ========================================================================= */

export function HeroSection({
  banners,
  isLoading,
  isError,
  onRetry,
}: {
  banners: HeroBanner[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (paused || reduced || count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => clearInterval(id);
  }, [paused, reduced, count]);

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count),
    [count],
  );

  if (isError) {
    return (
      <Container size="wide" className="pt-5">
        <ErrorState title="Couldn't load featured promotions" onRetry={onRetry} />
      </Container>
    );
  }

  if (isLoading || count === 0) {
    return (
      <Container size="wide" className="pt-5">
        <Skeleton className="aspect-[16/7] w-full rounded-[var(--radius-xl)]" />
      </Container>
    );
  }

  const slide = banners[index];
  const toneBg: Record<HeroBanner["tone"], string> = {
    primary: "from-[var(--color-primary)]/85",
    dark: "from-black/75",
    warm: "from-[oklch(45%_0.13_45)]/80",
    cool: "from-[oklch(40%_0.12_240)]/80",
  };

  return (
    <section aria-label="Featured promotions" className="pt-5">
      <Container size="wide">
        <div
          className="group relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-muted)]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="relative aspect-[16/9] sm:aspect-[16/7] lg:aspect-[21/8]">
            {banners.map((b, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={b.id}
                src={b.image}
                alt={b.imageAlt}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-out)]",
                  i === index ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
            <div
              aria-hidden
              className={cn(
                "absolute inset-0 bg-gradient-to-r via-black/25 to-transparent",
                toneBg[slide.tone],
              )}
            />
          </div>

          <div className="absolute inset-0 flex items-center">
            <Container size="wide">
              <div className="max-w-xl text-white animate-slide-up" key={slide.id}>
                {slide.eyebrow && (
                  <p className="mb-2 text-caption font-semibold uppercase tracking-widest text-white/85">
                    {slide.eyebrow}
                  </p>
                )}
                <h1 className="text-h1 font-bold tracking-tight text-balance sm:text-display">
                  {slide.headline}
                </h1>
                <p className="mt-3 max-w-md text-body-lg text-white/85 text-pretty">
                  {slide.subheadline}
                </p>
                <a
                  href={slide.ctaHref}
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-[var(--radius-lg)] bg-white px-6 text-body-lg font-medium text-[oklch(20%_0.02_250)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {slide.ctaLabel} <ArrowRight className="size-4" />
                </a>
              </div>
            </Container>
          </div>

          {/* Controls */}
          {count > 1 && (
            <>
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3 sm:px-4">
                <IconButton
                  label="Previous slide"
                  onClick={() => go(-1)}
                  className="bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <ChevronLeft className="size-5" />
                </IconButton>
                <IconButton
                  label="Next slide"
                  onClick={() => go(1)}
                  className="bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <ChevronRight className="size-5" />
                </IconButton>
              </div>
              <div
                role="tablist"
                aria-label="Choose slide"
                className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5"
              >
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-[var(--duration-base)]",
                      i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80",
                    )}
                  />
                ))}
              </div>
              <span className="sr-only" aria-live="polite">
                Slide {index + 1} of {count}
              </span>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}

export function QuickCategorySection({
  categories,
  isLoading,
  isError,
  onRetry,
}: {
  categories: Category[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  if (isError) {
    return (
      <Container className="pt-8">
        <ErrorState title="Couldn't load categories" onRetry={onRetry} />
      </Container>
    );
  }
  return (
    <section aria-label="Shop by category" className="pt-8">
      <Container>
        {isLoading ? (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="size-16 rounded-full" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="no-scrollbar flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-8">
            {categories.map((c) => (
              <li key={c.id} className="w-[76px] shrink-0 sm:w-auto sm:shrink">
                <a
                  href={`/c/${c.slug}`}
                  className="group flex flex-col items-center gap-2 text-center focus-visible:outline-none"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-16 items-center justify-center rounded-full bg-[var(--color-muted)] text-2xl",
                      "transition-[background-color,transform] duration-[var(--duration-base)]",
                      "group-hover:bg-[var(--color-primary-subtle)] group-hover:scale-105 motion-reduce:group-hover:scale-100",
                    )}
                  >
                    {c.icon}
                  </span>
                  <span className="text-small font-medium leading-tight group-hover:text-[var(--color-primary)]">
                    {c.name}
                  </span>
                  <span className="text-caption text-[var(--color-muted-foreground)]">
                    {formatCount(c.productCount)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

export function FlashSaleSection({
  sale,
  isLoading,
  isError,
  onRetry,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
}: {
  sale?: FlashSale;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
}) {
  if (isError) return null;

  return (
    <section aria-labelledby="flash-sale-heading" className="pt-10">
      <Container>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-danger-subtle)] to-transparent p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-[var(--color-sale)] text-white">
                <Zap className="size-5" />
              </span>
              <div>
                <h2 id="flash-sale-heading" className="text-h3 font-semibold">
                  {sale?.title ?? "Flash Sale"}
                </h2>
                <p className="text-small text-[var(--color-muted-foreground)]">
                  Limited quantities · while supplies last
                </p>
              </div>
            </div>
            {sale && <FlashCountdown target={sale.endsAt} />}
          </div>

          <ProductCarousel
            products={sale?.products ?? []}
            variant="sale"
            ariaLabel="Flash sale products"
            isLoading={isLoading}
            onRetry={onRetry}
            onQuickView={onQuickView}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            wishlistedIds={wishlistedIds}
          />
        </div>
      </Container>
    </section>
  );
}

/** Isolated countdown display for flash sale header. */
function FlashCountdown({ target }: { target: string }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(target);
  if (expired) {
    return <span className="text-body font-medium text-[var(--color-danger)]">Sale ended</span>;
  }
  const cells: { label: string; value: number }[] = [
    ...(days > 0 ? [{ label: "days", value: days }] : []),
    { label: "hrs", value: hours },
    { label: "min", value: minutes },
    { label: "sec", value: seconds },
  ];
  return (
    <div className="flex items-center gap-1.5" aria-label="Time remaining">
      <Clock className="size-4 text-[var(--color-sale)]" aria-hidden />
      {cells.map((c) => (
        <span
          key={c.label}
          className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-2 py-1 text-center tabular-nums shadow-[var(--shadow-xs)]"
        >
          <span className="block text-body font-bold leading-none">
            {String(c.value).padStart(2, "0")}
          </span>
          <span className="block text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {c.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export function PersonalizedSection({
  customer,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
}: {
  customer: Customer | null;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const { data, isLoading, isError, refetch } = useGetRecommendationsQuery(
    { customerId: customer?.id ?? null },
    { skip: !inView },
  );

  if (isError) return null;
  if (!isLoading && (!data || data.length === 0)) return null;

  const products = (data ?? []).map((r) => r.product);

  return (
    <section ref={ref} aria-labelledby="personalized-heading" className="pt-10">
      <Container>
        <SectionHeader
          eyebrow={customer ? "Personalized" : "Popular picks"}
          title={customer ? `Recommended for you, ${customer.firstName}` : "Top picks for you"}
          description="Based on your browsing and what customers like you are loving."
          action={
            <a
              href="/recommendations"
              className="hidden text-body font-medium text-[var(--color-primary)] hover:underline sm:inline-flex"
            >
              See all
            </a>
          }
        />
        <ProductCarousel
          products={products}
          ariaLabel="Recommended products"
          isLoading={isLoading}
          onRetry={refetch}
          onQuickView={onQuickView}
          onAddToCart={onAddToCart}
          onToggleWishlist={onToggleWishlist}
          wishlistedIds={wishlistedIds}
        />
      </Container>
    </section>
  );
}

export function StandardProductSection({
  id,
  eyebrow,
  title,
  description,
  products,
  isLoading,
  isError,
  onRetry,
  variant = "default",
  href,
  priorityCount = 0,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  products: Product[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  variant?: ProductCardVariant;
  href?: string;
  priorityCount?: number;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
}) {
  if (isError && !isLoading) return null;
  if (!isLoading && products.length === 0) return null;

  return (
    <section aria-labelledby={`${id}-heading`} className="pt-10">
      <Container>
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={
            href && (
              <a
                href={href}
                className="hidden text-body font-medium text-[var(--color-primary)] hover:underline sm:inline-flex"
              >
                View all
              </a>
            )
          }
        />
        <ProductCarousel
          products={products}
          variant={variant}
          ariaLabel={title}
          isLoading={isLoading}
          isError={isError}
          onRetry={onRetry}
          priorityCount={priorityCount}
          onQuickView={onQuickView}
          onAddToCart={onAddToCart}
          onToggleWishlist={onToggleWishlist}
          wishlistedIds={wishlistedIds}
        />
      </Container>
    </section>
  );
}

export function BestSellersSection({
  products,
  isLoading,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
}: {
  products: Product[];
  isLoading?: boolean;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
}) {
  if (!isLoading && products.length === 0) return null;
  return (
    <section aria-labelledby="best-sellers-heading" className="pt-10">
      <Container>
        <SectionHeader
          eyebrow="Customer favorites"
          title="Best Sellers"
          description="The most-loved products across Meridian this month."
          action={
            <a href="/best" className="hidden text-body font-medium text-[var(--color-primary)] hover:underline sm:inline-flex">
              View all
            </a>
          }
        />
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ProductCardSkeleton key={i} variant="horizontal" />
            ))}
          </div>
        ) : (
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((p, i) => (
              <li key={p.id} className="relative flex gap-3">
                <span
                  aria-hidden
                  className="flex w-8 shrink-0 items-start justify-center pt-4 text-h2 font-bold text-[var(--color-muted-foreground)] tabular-nums"
                >
                  {i + 1}
                </span>
                <span className="sr-only">Rank {i + 1}</span>
                <div className="min-w-0 flex-1">
                  <ProductCard
                    product={p}
                    variant="horizontal"
                    onQuickView={onQuickView}
                    onAddToCart={onAddToCart}
                    onToggleWishlist={onToggleWishlist}
                    isWishlisted={wishlistedIds.has(p.id)}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Container>
    </section>
  );
}

export function FeaturedCategoriesSection({
  categories,
  isLoading,
}: {
  categories: Category[];
  isLoading?: boolean;
}) {
  if (!isLoading && categories.length === 0) return null;
  return (
    <section aria-labelledby="featured-categories-heading" className="pt-10">
      <Container>
        <SectionHeader
          eyebrow="Collections"
          title="Featured Categories"
          description="Curated collections to help you find exactly what you need."
        />
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <Skeleton className="aspect-[4/3] rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

export function BrandShowcaseSection({
  brands,
  isLoading,
}: {
  brands: Brand[];
  isLoading?: boolean;
}) {
  if (!isLoading && brands.length === 0) return null;
  return (
    <section aria-labelledby="brands-heading" className="pt-10">
      <Container>
        <SectionHeader
          eyebrow="Trusted names"
          title="Featured Brands"
          description="Shop directly from the brands you trust."
        />
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {brands.map((b) => (
              <li key={b.id}>
                <BrandCard brand={b} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

export function DealsSection({ deals, isLoading }: { deals: Deal[]; isLoading?: boolean }) {
  if (!isLoading && deals.length === 0) return null;
  return (
    <section aria-labelledby="deals-heading" className="pt-10">
      <Container>
        <SectionHeader
          eyebrow="Limited time"
          title="Deals & Offers"
          description="Current offers across Meridian — no surprises at checkout."
        />
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {deals.map((d) => (
              <li key={d.id}>
                <DealCard deal={d} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

export function PromotionalBannerSection({
  promotions,
  isLoading,
}: {
  promotions: Promotion[];
  isLoading?: boolean;
}) {
  if (!isLoading && promotions.length === 0) return null;
  const large = promotions.find((p) => p.variant === "large");
  const rest = promotions.filter((p) => p.variant !== "large").slice(0, 2);

  return (
    <section aria-labelledby="promotions-heading" className="pt-10">
      <Container>
        <SectionHeader eyebrow="More to explore" title="Promotions" />
        {isLoading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <Skeleton className="aspect-[21/9] w-full rounded-[var(--radius-lg)]" />
            <div className="grid gap-3">
              <Skeleton className="aspect-[16/9] w-full rounded-[var(--radius-lg)]" />
              <Skeleton className="aspect-[16/9] w-full rounded-[var(--radius-lg)]" />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {large && <PromoBanner promo={large} />}
            <div className="grid gap-3">
              {rest.map((p) => (
                <PromoBanner key={p.id} promo={p} />
              ))}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}

export function RecentlyViewedSection({
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
}: {
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const { data, isLoading } = useGetRecentlyViewedQuery(undefined, { skip: !inView });

  // Hide section entirely when the customer has no history.
  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <section ref={ref} aria-labelledby="recently-viewed-heading" className="pt-10">
      <Container>
        <SectionHeader eyebrow="Pick up where you left off" title="Recently Viewed" />
        <ProductCarousel
          products={data ?? []}
          variant="compact"
          ariaLabel="Recently viewed products"
          isLoading={isLoading}
          onQuickView={onQuickView}
          onAddToCart={onAddToCart}
          onToggleWishlist={onToggleWishlist}
          wishlistedIds={wishlistedIds}
        />
      </Container>
    </section>
  );
}

export function TrustSection() {
  return (
    <section aria-label="Why shop with Meridian" className="pt-12">
      <Container>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-muted)] p-6">
          <TrustBar items={TRUST_ITEMS} />
        </div>
      </Container>
    </section>
  );
}

const newsletterSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(254, "Email is too long"),
});

type NewsletterValues = z.infer<typeof newsletterSchema>;

export function NewsletterSection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate">("idle");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewsletterValues>({
    resolver: zodResolver(newsletterSchema),
    mode: "onBlur",
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus("loading");
    try {
      await delay(null, 650);
      // Simulate duplicate detection on the server.
      if (values.email.toLowerCase().startsWith("dup")) {
        setStatus("duplicate");
        return;
      }
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  });

  return (
    <section aria-labelledby="newsletter-heading" className="pt-12">
      <Container>
        <div className="grid gap-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              <Mail className="size-3.5" /> Newsletter
            </p>
            <h2 id="newsletter-heading" className="text-h2 font-semibold">
              Get early access to deals
            </h2>
            <p className="mt-1 max-w-md text-body text-[var(--color-muted-foreground)]">
              Sign up for weekly offers, new arrivals, and product drops. Unsubscribe anytime.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="newsletter-email">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "newsletter-error" : undefined}
                {...register("email")}
                disabled={status === "loading" || status === "success"}
                className={cn(
                  "h-11 min-w-0 flex-1 rounded-[var(--radius-lg)] border bg-[var(--color-surface)] px-4 text-body outline-none",
                  "placeholder:text-[var(--color-muted-foreground)]",
                  "focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-focus)]",
                  errors.email ? "border-[var(--color-danger)]" : "border-[var(--color-border-strong)]",
                )}
              />
              <Button
                type="submit"
                size="lg"
                loading={status === "loading"}
                iconRight={<ArrowRight className="size-4" />}
                className="sm:w-auto"
              >
                Subscribe
              </Button>
            </div>

            {errors.email && (
              <p id="newsletter-error" role="alert" className="text-small text-[var(--color-danger)]">
                {errors.email.message}
              </p>
            )}
            {status === "success" && (
              <p role="status" className="inline-flex items-center gap-1.5 text-small text-[var(--color-success)]">
                <Check className="size-4" /> You're subscribed. Check your inbox for a welcome offer.
              </p>
            )}
            {status === "duplicate" && (
              <p role="status" className="inline-flex items-center gap-1.5 text-small text-[var(--color-warning)]">
                <AlertCircle className="size-4" /> This email is already subscribed.
              </p>
            )}
            {status === "error" && (
              <p role="alert" className="inline-flex items-center gap-1.5 text-small text-[var(--color-danger)]">
                <AlertCircle className="size-4" /> Something went wrong. Please try again.
              </p>
            )}
            <p className="text-caption text-[var(--color-muted-foreground)]">
              By subscribing you agree to our{" "}
              <a href="/privacy" className="underline underline-offset-2 hover:text-[var(--color-foreground)]">
                Privacy Policy
              </a>
              .
            </p>
          </form>
        </div>
      </Container>
    </section>
  );
}

export function AppPromotionSection() {
  return (
    <section aria-labelledby="app-heading" className="pt-12">
      <Container>
        <div className="grid items-center gap-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-secondary)] p-6 text-[var(--color-secondary-foreground)] sm:p-8 lg:grid-cols-2">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider opacity-80">
              <Smartphone className="size-3.5" /> Meridian App
            </p>
            <h2 id="app-heading" className="text-h2 font-semibold">
              Shop faster on the app
            </h2>
            <p className="mt-1 max-w-md text-body opacity-80">
              Track orders, get app-only deals, and check out in seconds.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {/* Non-functional placeholders are intentionally avoided: these link to a real route. */}
              <a
                href="/app/ios"
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-4 text-body font-medium text-[var(--color-foreground)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Apple className="size-5" aria-hidden />
                <span className="flex flex-col leading-none">
                  <span className="text-[10px] uppercase tracking-wide opacity-70">Download on</span>
                  <span className="text-body font-semibold">App Store</span>
                </span>
              </a>
              <a
                href="/app/android"
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-4 text-body font-medium text-[var(--color-foreground)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="size-5" aria-hidden />
                <span className="flex flex-col leading-none">
                  <span className="text-[10px] uppercase tracking-wide opacity-70">Get it on</span>
                  <span className="text-body font-semibold">Google Play</span>
                </span>
              </a>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 lg:justify-end">
            <div
              aria-hidden
              className="flex size-32 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-3"
            >
              {/* QR-ready area: structured for a real QR code in production. */}
              <div className="grid size-full grid-cols-6 grid-rows-6 gap-0.5">
                {Array.from({ length: 36 }).map((_, i) => {
                  const on =
                    i < 3 ||
                    i === 5 ||
                    i === 6 ||
                    i === 11 ||
                    i === 12 ||
                    i === 17 ||
                    i === 18 ||
                    i === 23 ||
                    i === 24 ||
                    i === 29 ||
                    i === 30 ||
                    i > 32;
                  return (
                    <span
                      key={i}
                      className={cn(
                        "rounded-[1px]",
                        on ? "bg-[var(--color-foreground)]" : "bg-transparent",
                      )}
                    />
                  );
                })}
              </div>
            </div>
            <p className="max-w-[10rem] text-small opacity-80">
              Scan to download the app and unlock app-only pricing.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--color-border)] bg-[var(--color-muted)]">
      <Container>
        <div className="grid gap-8 py-10 lg:grid-cols-6">
          {FOOTER_GROUPS.map((group) => (
            <FooterGroupBlock key={group.id} group={group} />
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-[var(--color-border)] py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-small text-[var(--color-muted-foreground)]">
            <span>© {new Date().getFullYear()} Meridian Commerce, Inc.</span>
            <a href="/legal" className="hover:text-[var(--color-foreground)]">Legal</a>
            <a href="/privacy" className="hover:text-[var(--color-foreground)]">Privacy</a>
            <a href="/terms" className="hover:text-[var(--color-foreground)]">Terms</a>
          </div>
          <ul className="flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
            {["Visa", "MC", "Amex", "PayPal", "Apple Pay", "Google Pay"].map((m) => (
              <li
                key={m}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-caption font-medium"
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}

export function FooterGroupBlock({ group }: { group: FooterGroup }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between text-left lg:cursor-default lg:pointer-events-none"
      >
        <span className="text-caption font-semibold uppercase tracking-wide text-[var(--color-foreground)]">
          {group.title}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 text-[var(--color-muted-foreground)] transition-transform duration-[var(--duration-base)] lg:hidden",
            open && "rotate-180",
          )}
        />
      </button>
      <ul
        id={id}
        className={cn(
          "mt-2 space-y-1.5 overflow-hidden",
          "lg:mt-3 lg:max-h-none lg:opacity-100",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0 lg:opacity-100",
          "transition-[max-height,opacity] duration-[var(--duration-base)] ease-[var(--ease-out)]",
        )}
      >
        {group.links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="text-small text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ===========================================================================
 * 15. OVERLAYS — MiniCart, Wishlist, QuickView, MobileNav
 * ========================================================================= */

export function Overlay({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close dialog"
      onClick={onClose}
      className="absolute inset-0 bg-[var(--color-overlay)] animate-fade-in"
    />
  );
}

export function Drawer({
  open,
  onClose,
  side = "right",
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useBodyScrollLock(open);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <Overlay onClose={onClose} />
      <div
        ref={ref}
        className={cn(
          "absolute top-0 flex h-full w-full max-w-md flex-col bg-[var(--color-surface-elevated)] shadow-[var(--shadow-lg)]",
          side === "right" ? "right-0 animate-slide-in-right" : "left-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-h3 font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useBodyScrollLock(open);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const max = size === "sm" ? "max-w-md" : size === "md" ? "max-w-xl" : "max-w-3xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <Overlay onClose={onClose} />
      <div
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-lg)] animate-scale-in",
          max,
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <h2 className="text-h3 font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function MiniCart({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, isLoading, isError, refetch } = useGetCartQuery();

  return (
    <Drawer open={open} onClose={onClose} title="Your Cart">
      {isLoading && (
        <div className="space-y-4 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-20 rounded-[var(--radius-md)]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}
      {isError && (
        <div className="p-4">
          <ErrorState title="Couldn't load your cart" onRetry={refetch} />
        </div>
      )}
      {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
        <div className="p-4">
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Browse our best sellers and start filling it up."
            action={<Button onClick={onClose}>Continue shopping</Button>}
          />
        </div>
      )}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <ul className="divide-y divide-[var(--color-border)]">
            {data.items.map((item) => (
              <li key={item.id} className="flex gap-3 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" className="size-20 rounded-[var(--radius-md)] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-body font-medium">{item.name}</p>
                  <p className="mt-1 text-body font-semibold">{item.unitPrice.formatted}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)]">
                      <IconButton label="Decrease quantity" size="sm">
                        <Minus className="size-3" />
                      </IconButton>
                      <span className="min-w-6 text-center text-small tabular-nums">{item.quantity}</span>
                      <IconButton label="Increase quantity" size="sm">
                        <Plus className="size-3" />
                      </IconButton>
                    </div>
                    <IconButton label={`Remove ${item.name}`} size="sm">
                      <Trash2 className="size-3.5" />
                    </IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--color-border)] p-4">
            <div className="flex justify-between text-body">
              <span>Subtotal</span>
              <span className="font-semibold tabular-nums">{data.subtotal.formatted}</span>
            </div>
            <p className="mt-1 text-caption text-[var(--color-muted-foreground)]">
              Shipping and taxes calculated at checkout.
            </p>
            <Button size="lg" className="mt-3 w-full">
              Checkout · {data.estimatedTotal.formatted}
            </Button>
          </div>
        </>
      )}
    </Drawer>
  );
}

export function WishlistDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const customer = useCustomer();
  const { data, isLoading } = useGetWishlistQuery(undefined, { skip: !customer });

  return (
    <Drawer open={open} onClose={onClose} title="Your Wishlist">
      {!customer && (
        <div className="p-4">
          <EmptyState
            icon={Heart}
            title="Sign in to save items"
            description="Your wishlist is synced across devices when you're signed in."
            action={<Button onClick={onClose}>Sign in</Button>}
          />
        </div>
      )}
      {customer && isLoading && (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}
      {customer && !isLoading && (data?.length ?? 0) === 0 && (
        <div className="p-4">
          <EmptyState
            icon={Heart}
            title="No saved items yet"
            description="Tap the heart on any product to save it here."
          />
        </div>
      )}
    </Drawer>
  );
}

export function QuickViewModal({
  product,
  onClose,
  onAddToCart,
}: {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (p: Product) => void;
}) {
  if (!product) return null;
  return (
    <Modal open={!!product} onClose={onClose} title="Quick view" size="lg">
      <div className="grid gap-6 p-5 sm:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image} alt={product.imageAlt} className="size-full object-cover" />
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {product.brand}
            </p>
            <h3 className="mt-1 text-h3 font-semibold">{product.name}</h3>
          </div>
          <RatingStars rating={product.rating} size={16} />
          <Price price={product.price} originalPrice={product.originalPrice} size="lg" />
          {product.installment && (
            <p className="text-small text-[var(--color-muted-foreground)]">
              or {product.installment.perMonth}/mo for {product.installment.months} months
            </p>
          )}
          <p className="text-body text-[var(--color-muted-foreground)] text-pretty">
            {product.freeShipping ? "Free shipping on this item. " : ""}
            In stock and ready to ship. 30-day returns.
          </p>
          <Button
            size="lg"
            iconLeft={<ShoppingCart className="size-4" />}
            onClick={() => {
              onAddToCart(product);
              onClose();
            }}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? "Out of stock" : "Add to cart"}
          </Button>
          <a
            href={`/p/${product.slug}`}
            className="text-center text-body font-medium text-[var(--color-primary)] hover:underline"
          >
            View full details
          </a>
        </div>
      </div>
    </Modal>
  );
}

export function MobileNavigation({ open, onClose }: { open: boolean; onClose: () => void }) {
  const customer = useCustomer();
  return (
    <Drawer open={open} onClose={onClose} side="left" title="Menu">
      <nav aria-label="Mobile categories" className="p-2">
        {!customer && (
          <div className="mb-3 rounded-[var(--radius-md)] bg-[var(--color-muted)] p-3">
            <p className="text-body font-medium">Welcome to Meridian</p>
            <a
              href="/signin"
              className="mt-2 inline-block text-body font-medium text-[var(--color-primary)] hover:underline"
            >
              Sign in or create an account
            </a>
          </div>
        )}
        <ul className="space-y-1">
          {CATEGORY_NAVIGATION.map((cat) => (
            <li key={cat.id}>
              <a
                href={cat.href}
                className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2.5 text-body hover:bg-[var(--color-muted)]"
              >
                {cat.label}
                <ChevronRight className="size-4 text-[var(--color-muted-foreground)]" />
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-[var(--color-border)] pt-3">
          <ul className="space-y-1">
            {[
              { label: "Your orders", href: "/orders" },
              { label: "Wishlist", href: "/wishlist" },
              { label: "Help & support", href: "/help" },
            ].map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="block rounded-[var(--radius-md)] px-3 py-2.5 text-body hover:bg-[var(--color-muted)]"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </Drawer>
  );
}

/* ===========================================================================
 * 16. PAGE COMPOSITION
 * ========================================================================= */

function EcommerceHomeContent() {
  const dispatch = useAppDispatch();
  const customer = useCustomer();

  const { data: home, isLoading, isError, refetch } = useGetHomePageQuery();
  const { data: wishlist } = useGetWishlistQuery(undefined, { skip: !customer });
  const wishlistedIds = useMemo(
    () => new Set(wishlist?.map((w) => w.productId) ?? []),
    [wishlist],
  );

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);

  const handleAddToCart = useCallback(
    (p: Product) => {
      dispatch(markLastAdded(p.id));
      dispatch(openMiniCart());
      setCartOpen(true);
    },
    [dispatch],
  );

  const handleToggleWishlist = useCallback(
    (p: Product) => {
      dispatch(toggleOptimistic(p.id));
    },
    [dispatch],
  );

  const handleQuickView = useCallback((p: Product) => setQuickViewProduct(p), []);

  const isMobileNavOpen = useAppSelector((s) => s.ui.isMobileNavOpen);
  const miniCartOpen = useAppSelector((s) => s.cartUi.isMiniCartOpen);

  useEffect(() => {
    setCartOpen(miniCartOpen);
  }, [miniCartOpen]);

  const handleOpenCart = () => {
    setCartOpen(true);
    dispatch(openMiniCart());
  };
  const handleCloseCart = () => {
    setCartOpen(false);
    dispatch(closeMiniCart());
  };

  return (
    <div className="min-h-dvh bg-[var(--color-background)] text-[var(--color-foreground)]">
      <SiteHeader
        onOpenCart={handleOpenCart}
        onOpenWishlist={() => setWishlistOpen(true)}
        onQuickView={handleQuickView}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        wishlistedIds={wishlistedIds}
      />

      <CategoryNavigation />

      <main>
        {isError && !home ? (
          <Container size="wide" className="pt-8">
            <ErrorState
              title="We couldn't load the home page"
              description="Please check your connection and try again."
              onRetry={refetch}
            />
          </Container>
        ) : (
          <>
            <HeroSection
              banners={home?.heroBanners ?? []}
              isLoading={isLoading}
              isError={false}
              onRetry={refetch}
            />

            <QuickCategorySection
              categories={home?.quickCategories ?? []}
              isLoading={isLoading}
              isError={false}
              onRetry={refetch}
            />

            {isError ? null : (
              <FlashSaleSection
                sale={home?.flashSale}
                isLoading={isLoading}
                isError={false}
                onRetry={refetch}
                onQuickView={handleQuickView}
                onAddToCart={handleAddToCart}
                onToggleWishlist={handleToggleWishlist}
                wishlistedIds={wishlistedIds}
              />
            )}

            <PersonalizedSection
              customer={customer}
              onQuickView={handleQuickView}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              wishlistedIds={wishlistedIds}
            />

            <StandardProductSection
              id="trending"
              eyebrow="What's hot"
              title="Trending Products"
              description="The products gaining momentum across Meridian this week."
              href="/trending"
              products={home?.trending ?? []}
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
              onQuickView={handleQuickView}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              wishlistedIds={wishlistedIds}
            />

            <BestSellersSection
              products={home?.bestSellers ?? []}
              isLoading={isLoading}
              onQuickView={handleQuickView}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              wishlistedIds={wishlistedIds}
            />

            <FeaturedCategoriesSection
              categories={home?.featuredCategories ?? []}
              isLoading={isLoading}
            />

            <StandardProductSection
              id="new-arrivals"
              eyebrow="Just landed"
              title="New Arrivals"
              description="Fresh products from the brands you follow."
              href="/new"
              variant="featured"
              products={home?.newArrivals ?? []}
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
              onQuickView={handleQuickView}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              wishlistedIds={wishlistedIds}
            />

            <BrandShowcaseSection
              brands={home?.featuredBrands ?? []}
              isLoading={isLoading}
            />

            <DealsSection deals={home?.deals ?? []} isLoading={isLoading} />

            <StandardProductSection
              id="top-rated"
              eyebrow="Highest rated"
              title="Top Rated"
              description="Products customers rate highest for quality and value."
              href="/top-rated"
              products={home?.topRated ?? []}
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
              onQuickView={handleQuickView}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              wishlistedIds={wishlistedIds}
            />

            <RecentlyViewedSection
              onQuickView={handleQuickView}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              wishlistedIds={wishlistedIds}
            />

            <PromotionalBannerSection
              promotions={home?.promotions ?? []}
              isLoading={isLoading}
            />

            <TrustSection />

            <NewsletterSection />

            <AppPromotionSection />
          </>
        )}
      </main>

      <SiteFooter />

      {/* Overlays */}
      <MiniCart open={cartOpen} onClose={handleCloseCart} />
      <WishlistDrawer open={wishlistOpen} onClose={() => setWishlistOpen(false)} />
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
      />
      <MobileNavigation
        open={isMobileNavOpen}
        onClose={() => dispatch(toggleMobileNav(false))}
      />
    </div>
  );
}

/**
 * Root export.
 * Next.js App Router usage:
 *   const store = makeStore(); // module scope or per-request in RSC setups
 *   <EcommerceHomePage customer={customer} />
 */
export default function EcommerceHomePage({
  customer = null,
}: {
  customer?: Customer | null;
}) {
  const store = useMemo(() => makeStore(), []);
  return (
    <Provider store={store}>
      <AuthProvider customer={customer}>
        <EcommerceHomeContent />
      </AuthProvider>
    </Provider>
  );
}