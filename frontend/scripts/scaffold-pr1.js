#!/usr/bin/env node
/**
 * PR 1 — No-op extraction for ecommerce home page.
 * Moves types, config, lib, mocks, providers, and store out of the
 * single-file page into real modules. Zero behavior change.
 *
 * Run: node scripts/scaffold-pr1.js
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

let written = 0;
function write(relPath, content) {
  const full = path.join(SRC, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.replace(/^\n/, ""));
  console.log(`  \x1b[32m\u2713\x1b[0m src/${relPath}`);
  written++;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN
// ─────────────────────────────────────────────────────────────────────────────

write("domain/product.types.ts", `
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

export type ProductCardVariant =
  | "default"
  | "compact"
  | "horizontal"
  | "featured"
  | "sale";

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
`);

write("domain/category.types.ts", `
export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  productCount: number;
  image?: string;
  description?: string;
}

export interface CategoryNavItem {
  id: string;
  label: string;
  href: string;
  columns?: { title: string; links: { label: string; href: string }[] }[];
  featured?: { title: string; image: string; href: string };
}
`);

write("domain/campaign.types.ts", `
import type { Product } from "./product.types";

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

export interface FlashSale {
  id: string;
  title: string;
  endsAt: string;
  products: Product[];
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logo: string;
  category: string;
  productCount: number;
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

// Re-export to avoid a separate file for Category
import type { Category } from "./category.types";
`);

write("domain/cart.types.ts", `
import type { Price } from "./product.types";

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
`);

write("domain/customer.types.ts", `
export interface Customer {
  id: string;
  firstName: string;
  email: string;
  isAuthenticated: boolean;
  avatarUrl?: string;
}

export interface ReviewSummary {
  rating: number;
  count: number;
  verifiedPercent: number;
}
`);

write("domain/search.types.ts", `
import type { Product } from "./product.types";

export interface SearchSuggestion {
  id: string;
  type: "product" | "category" | "query";
  label: string;
  href: string;
  image?: string;
  meta?: string;
}

export interface Recommendation {
  id: string;
  product: Product;
  reason: string;
}
`);

write("domain/index.ts", `
export * from "./product.types";
export * from "./category.types";
export * from "./campaign.types";
export * from "./cart.types";
export * from "./customer.types";
export * from "./search.types";
`);

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

write("config/category-navigation.ts", `
import type { CategoryNavItem } from "@/domain/category.types";

export const CATEGORY_NAVIGATION: CategoryNavItem[] = [
  {
    id: "electronics",
    label: "Electronics",
    href: "/c/electronics",
    columns: [
      { title: "Computers", links: [
        { label: "Laptops", href: "/c/laptops" },
        { label: "Desktops", href: "/c/desktops" },
        { label: "Monitors", href: "/c/monitors" },
        { label: "Tablets", href: "/c/tablets" },
      ]},
      { title: "Audio", links: [
        { label: "Headphones", href: "/c/headphones" },
        { label: "Earbuds", href: "/c/earbuds" },
        { label: "Speakers", href: "/c/speakers" },
        { label: "Soundbars", href: "/c/soundbars" },
      ]},
      { title: "Mobile", links: [
        { label: "Smartphones", href: "/c/smartphones" },
        { label: "Cases", href: "/c/cases" },
        { label: "Chargers", href: "/c/chargers" },
        { label: "Power Banks", href: "/c/power-banks" },
      ]},
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
      { title: "Women", links: [
        { label: "Dresses", href: "/c/dresses" },
        { label: "Tops", href: "/c/tops" },
        { label: "Shoes", href: "/c/womens-shoes" },
        { label: "Bags", href: "/c/bags" },
      ]},
      { title: "Men", links: [
        { label: "Shirts", href: "/c/shirts" },
        { label: "Jackets", href: "/c/jackets" },
        { label: "Sneakers", href: "/c/sneakers" },
        { label: "Watches", href: "/c/watches" },
      ]},
    ],
  },
  {
    id: "home",
    label: "Home & Kitchen",
    href: "/c/home",
    columns: [
      { title: "Kitchen", links: [
        { label: "Cookware", href: "/c/cookware" },
        { label: "Appliances", href: "/c/appliances" },
        { label: "Dining", href: "/c/dining" },
      ]},
      { title: "Living", links: [
        { label: "Furniture", href: "/c/furniture" },
        { label: "Decor", href: "/c/decor" },
        { label: "Bedding", href: "/c/bedding" },
      ]},
    ],
  },
  { id: "beauty", label: "Beauty", href: "/c/beauty" },
  { id: "sports", label: "Sports", href: "/c/sports" },
  { id: "toys", label: "Toys", href: "/c/toys" },
  { id: "grocery", label: "Grocery", href: "/c/grocery" },
  { id: "auto", label: "Automotive", href: "/c/auto" },
  { id: "books", label: "Books", href: "/c/books" },
];
`);

write("config/trust-items.ts", `
import type { ComponentType } from "react";
import { Truck, ShieldCheck, RotateCcw, Headphones } from "lucide-react";

export interface TrustItem {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export const TRUST_ITEMS: TrustItem[] = [
  { id: "shipping", icon: Truck,       title: "Free & Fast Delivery", description: "Free shipping on orders over $35" },
  { id: "secure",   icon: ShieldCheck, title: "Secure Payments",      description: "256-bit SSL encrypted checkout" },
  { id: "returns",  icon: RotateCcw,   title: "30-Day Returns",       description: "Hassle-free returns & refunds" },
  { id: "support",  icon: Headphones,  title: "24/7 Support",         description: "Real people, anytime you need" },
];
`);

write("config/footer-groups.ts", `
export interface FooterGroup {
  id: string;
  title: string;
  links: { label: string; href: string }[];
}

export const FOOTER_GROUPS: FooterGroup[] = [
  { id: "shop", title: "Shop", links: [
    { label: "All Categories", href: "/c" },
    { label: "Deals", href: "/deals" },
    { label: "New Arrivals", href: "/new" },
    { label: "Best Sellers", href: "/best" },
    { label: "Gift Cards", href: "/gift-cards" },
  ]},
  { id: "service", title: "Customer Service", links: [
    { label: "Help Center", href: "/help" },
    { label: "Track Order", href: "/track" },
    { label: "Returns", href: "/returns" },
    { label: "Shipping Info", href: "/shipping" },
    { label: "Contact Us", href: "/contact" },
  ]},
  { id: "about", title: "About", links: [
    { label: "Our Story", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
    { label: "Sustainability", href: "/sustainability" },
  ]},
  { id: "policies", title: "Policies", links: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Accessibility", href: "/accessibility" },
  ]},
  { id: "seller", title: "Seller", links: [
    { label: "Sell on Meridian", href: "/sell" },
    { label: "Seller Center", href: "/seller" },
    { label: "Fees", href: "/seller/fees" },
    { label: "Advertise", href: "/ads" },
  ]},
  { id: "business", title: "Business", links: [
    { label: "Meridian Business", href: "/business" },
    { label: "Wholesale", href: "/wholesale" },
    { label: "Enterprise", href: "/enterprise" },
  ]},
];
`);

write("config/product-card-variants.ts", `
import type { ProductCardVariant, ProductCardVariantConfig } from "@/domain/product.types";

export const PRODUCT_CARD_VARIANTS: Record<ProductCardVariant, ProductCardVariantConfig> = {
  default: {
    imageAspect: "aspect-square",
    showRating: true, showBrand: true, showInstallment: false,
    showQuickView: true, showStock: true,
    layout: "vertical", size: "md",
  },
  compact: {
    imageAspect: "aspect-square",
    showRating: false, showBrand: false, showInstallment: false,
    showQuickView: false, showStock: false,
    layout: "vertical", size: "sm",
  },
  horizontal: {
    imageAspect: "aspect-square",
    showRating: true, showBrand: true, showInstallment: false,
    showQuickView: false, showStock: true,
    layout: "horizontal", size: "md",
  },
  featured: {
    imageAspect: "aspect-[4/3]",
    showRating: true, showBrand: true, showInstallment: true,
    showQuickView: true, showStock: true,
    layout: "vertical", size: "lg",
  },
  sale: {
    imageAspect: "aspect-square",
    showRating: true, showBrand: true, showInstallment: false,
    showQuickView: true, showStock: true,
    layout: "vertical", size: "md",
  },
};
`);

write("config/index.ts", `
export * from "./category-navigation";
export * from "./trust-items";
export * from "./footer-groups";
export * from "./product-card-variants";
`);

// ─────────────────────────────────────────────────────────────────────────────
// LIB
// ─────────────────────────────────────────────────────────────────────────────

write("lib/cn.ts", `
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
`);

write("lib/format.ts", `
import type { Price } from "@/domain/product.types";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD",
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

const COMPACT_CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD",
  minimumFractionDigits: 0, maximumFractionDigits: 0,
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
  if (n >= 1_000_000) return \`\${(n / 1_000_000).toFixed(1).replace(/\\.0$/, "")}M\`;
  if (n >= 1_000) return \`\${(n / 1_000).toFixed(1).replace(/\\.0$/, "")}K\`;
  return String(n);
}
`);

write("lib/use-media-query.ts", `
"use client";
import { useEffect, useState } from "react";

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
`);

write("lib/use-reduced-motion.ts", `
"use client";
import { useMediaQuery } from "./use-media-query";

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
`);

write("lib/use-in-view.ts", `
"use client";
import { useEffect, useRef, useState } from "react";

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
`);

write("lib/use-body-scroll-lock.ts", `
"use client";
import { useEffect } from "react";

export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [locked]);
}
`);

write("lib/use-focus-trap.ts", `
"use client";
import { useEffect } from "react";

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
        e.preventDefault(); last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first?.focus();
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [ref, active]);
}
`);

write("lib/use-countdown.ts", `
"use client";
import { useEffect, useState } from "react";

export function useCountdown(targetIso: string) {
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
`);

write("lib/index.ts", `
export * from "./cn";
export * from "./format";
export * from "./use-media-query";
export * from "./use-reduced-motion";
export * from "./use-in-view";
export * from "./use-body-scroll-lock";
export * from "./use-focus-trap";
export * from "./use-countdown";
`);

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

write("mocks/delay.ts", `
export function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const SIMULATE_FAILURES = false;

export function maybeFail(rate = 0.04): void {
  if (SIMULATE_FAILURES && Math.random() < rate) {
    throw { status: 500, data: "Simulated upstream failure" };
  }
}
`);

write("mocks/seed-products.ts", `
import type { Product } from "@/domain/product.types";
import { makePrice, formatPrice } from "@/lib/format";

const IMG = (id: string, w = 600) =>
  \`https://images.unsplash.com/\${id}?w=\${w}&q=70&auto=format&fit=crop\`;

export const PRODUCT_SEED: Product[] = [
  {
    id: "p1", slug: "aurora-x1-wireless-headphones",
    name: "Aurora X1 Active Noise-Cancelling Headphones",
    brand: "Sonic Labs",
    image: IMG("photo-1505740420928-5e560c06d30e"),
    imageAlt: "Aurora X1 over-ear headphones in matte black",
    price: makePrice(249), originalPrice: makePrice(349), discountPercent: 29,
    rating: { value: 4.8, count: 3241 }, badge: "bestseller", stock: 42,
    installment: { months: 6, perMonth: formatPrice(41.5) },
    category: "electronics", freeShipping: true,
  },
  {
    id: "p2", slug: "nova-pro-15-laptop",
    name: "Nova Pro 15\\u2033 Laptop \\u2014 16GB / 1TB SSD",
    brand: "Nova",
    image: IMG("photo-1517336714731-489689fd1ca8"),
    imageAlt: "Nova Pro 15 inch laptop open on a desk",
    price: makePrice(1299), originalPrice: makePrice(1499), discountPercent: 13,
    rating: { value: 4.7, count: 1876 }, badge: "new", stock: 12,
    installment: { months: 12, perMonth: formatPrice(108.25) },
    category: "electronics", freeShipping: true,
  },
  {
    id: "p3", slug: "lumen-smartwatch-s4",
    name: "Lumen Smartwatch S4 with Always-On Display",
    brand: "Lumen",
    image: IMG("photo-1523275335684-37898b6baf30"),
    imageAlt: "Lumen Smartwatch S4 with silver band",
    price: makePrice(199), originalPrice: makePrice(279), discountPercent: 29,
    rating: { value: 4.6, count: 2140 }, badge: "trending", stock: 8,
    category: "electronics", freeShipping: true,
  },
  {
    id: "p4", slug: "cloudstep-running-shoes",
    name: "Cloudstep Everyday Running Shoes",
    brand: "Stride",
    image: IMG("photo-1542291026-7eec264c27ff"),
    imageAlt: "Cloudstep running shoes in coral and white",
    price: makePrice(89), originalPrice: makePrice(129), discountPercent: 31,
    rating: { value: 4.5, count: 4820 }, badge: "sale", stock: 120,
    category: "fashion", freeShipping: true,
  },
  {
    id: "p5", slug: "terra-ceramic-cookware-set",
    name: "Terra 10-Piece Ceramic Cookware Set",
    brand: "Terra",
    image: IMG("photo-1584990347449-39b4a9c2b2b6"),
    imageAlt: "Terra ceramic cookware set on a stovetop",
    price: makePrice(179), originalPrice: makePrice(249), discountPercent: 28,
    rating: { value: 4.7, count: 934 }, stock: 30,
    category: "home", freeShipping: true,
  },
  {
    id: "p6", slug: "pulse-buds-pro",
    name: "Pulse Buds Pro True Wireless Earbuds",
    brand: "Sonic Labs",
    image: IMG("photo-1590658268037-6bf12165a8df"),
    imageAlt: "Pulse Buds Pro in charging case",
    price: makePrice(129), originalPrice: makePrice(179), discountPercent: 28,
    rating: { value: 4.6, count: 5610 }, badge: "bestseller", stock: 200,
    category: "electronics", freeShipping: true,
  },
  {
    id: "p7", slug: "linen-relaxed-shirt",
    name: "Linen Relaxed-Fit Shirt",
    brand: "Northwind",
    image: IMG("photo-1596755094514-f87e34085b2c"),
    imageAlt: "Linen shirt in sand color",
    price: makePrice(59), originalPrice: makePrice(89), discountPercent: 34,
    rating: { value: 4.4, count: 1280 }, badge: "new", stock: 64,
    category: "fashion",
  },
  {
    id: "p8", slug: "everglow-skincare-set",
    name: "Everglow Hydration Skincare Set",
    brand: "Everglow",
    image: IMG("photo-1556228720-195a672e8a03"),
    imageAlt: "Everglow skincare set with bottles",
    price: makePrice(74), originalPrice: makePrice(99), discountPercent: 25,
    rating: { value: 4.8, count: 3020 }, badge: "trending", stock: 45,
    category: "beauty", freeShipping: true,
  },
  {
    id: "p9", slug: "atlas-yoga-mat",
    name: "Atlas Pro Non-Slip Yoga Mat",
    brand: "Atlas",
    image: IMG("photo-1601925260368-ae2f83cf8b7f"),
    imageAlt: "Atlas Pro yoga mat rolled up",
    price: makePrice(45), originalPrice: makePrice(69), discountPercent: 35,
    rating: { value: 4.5, count: 2210 }, stock: 88,
    category: "sports",
  },
  {
    id: "p10", slug: "hearth-cast-iron-skillet",
    name: "Hearth 12\\u2033 Cast Iron Skillet",
    brand: "Hearth",
    image: IMG("photo-1556909212-d5b604d0c90d"),
    imageAlt: "Hearth cast iron skillet on a wooden table",
    price: makePrice(39), originalPrice: makePrice(59), discountPercent: 34,
    rating: { value: 4.9, count: 8800 }, badge: "bestseller", stock: 300,
    category: "home",
  },
  {
    id: "p11", slug: "orbit-mechanical-keyboard",
    name: "Orbit 75% Mechanical Keyboard",
    brand: "Orbit",
    image: IMG("photo-1587829741301-dc798b83add3"),
    imageAlt: "Orbit mechanical keyboard with RGB lighting",
    price: makePrice(139), originalPrice: makePrice(189), discountPercent: 26,
    rating: { value: 4.7, count: 1520 }, badge: "trending", stock: 24,
    category: "electronics",
  },
  {
    id: "p12", slug: "solstice-polarized-sunglasses",
    name: "Solstice Polarized Sunglasses",
    brand: "Solstice",
    image: IMG("photo-1511499767150-a48a237f0083"),
    imageAlt: "Solstice sunglasses with tortoise frame",
    price: makePrice(89), originalPrice: makePrice(149), discountPercent: 40,
    rating: { value: 4.3, count: 640 }, badge: "sale", stock: 55,
    category: "fashion",
  },
];
`);

write("mocks/db.ts", `
import type { HomePagePayload, HeroBanner, Category, FlashSale, Brand, Deal, Promotion } from "@/domain/campaign.types";
import type { Product } from "@/domain/product.types";
import type { SearchSuggestion, Recommendation } from "@/domain/search.types";
import type { CartSummary, WishlistItem } from "@/domain/cart.types";
import { PRODUCT_SEED } from "./seed-products";
import { delay, maybeFail } from "./delay";
import { makePrice, formatPrice } from "@/lib/format";

const IMG = (id: string, w = 600) =>
  \`https://images.unsplash.com/\${id}?w=\${w}&q=70&auto=format&fit=crop\`;

export const MOCK_DB = {
  home: async (): Promise<HomePagePayload> => {
    await delay(null, 180);
    maybeFail();
    const heroBanners: HeroBanner[] = [
      {
        id: "h1", eyebrow: "Spring Drop",
        headline: "Sound that moves with you",
        subheadline: "Premium audio gear engineered for everyday life. Up to 40% off this week.",
        ctaLabel: "Shop Audio", ctaHref: "/c/audio",
        image: IMG("photo-1546435770-a3e426bf472b", 1600),
        imageAlt: "Person wearing premium over-ear headphones",
        tone: "dark",
      },
      {
        id: "h2", eyebrow: "New Arrivals",
        headline: "Built for the work ahead",
        subheadline: "Laptops, monitors, and desk essentials trusted by professionals.",
        ctaLabel: "Explore Computing", ctaHref: "/c/computers",
        image: IMG("photo-1498050108023-c5249f4df085", 1600),
        imageAlt: "Modern workspace with laptop and monitor",
        tone: "cool",
      },
      {
        id: "h3", eyebrow: "Home Refresh",
        headline: "Everyday upgrades, honest prices",
        subheadline: "Cookware, decor, and storage that last. Free shipping over $35.",
        ctaLabel: "Shop Home", ctaHref: "/c/home",
        image: IMG("photo-1556909114-f6e7ad7d3136", 1600),
        imageAlt: "Bright modern kitchen with cookware",
        tone: "warm",
      },
    ];

    const quickCategories: Category[] = [
      { id: "c-electronics", slug: "electronics", name: "Electronics", icon: "\\u{1F4BB}", productCount: 12480 },
      { id: "c-fashion",     slug: "fashion",     name: "Fashion",     icon: "\\u{1F455}", productCount: 24500 },
      { id: "c-home",        slug: "home",        name: "Home",        icon: "\\u{1F3E0}", productCount: 18700 },
      { id: "c-beauty",      slug: "beauty",      name: "Beauty",      icon: "\\u{1F484}", productCount: 9800 },
      { id: "c-sports",      slug: "sports",      name: "Sports",      icon: "\\u{1F3C0}", productCount: 7600 },
      { id: "c-toys",        slug: "toys",        name: "Toys",        icon: "\\u{1F9F8}", productCount: 5400 },
      { id: "c-grocery",     slug: "grocery",     name: "Grocery",     icon: "\\u{1F6D2}", productCount: 15800 },
      { id: "c-books",       slug: "books",       name: "Books",       icon: "\\u{1F4DA}", productCount: 42000 },
    ];

    const flashSale: FlashSale = {
      id: "fs1",
      title: "Flash Sale \\u2014 Electronics",
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 6 + 1000 * 60 * 42).toISOString(),
      products: PRODUCT_SEED.filter((p) => p.category === "electronics").slice(0, 8),
    };

    const trending = PRODUCT_SEED.filter((p) => p.badge === "trending" || p.rating.value >= 4.6).slice(0, 10);
    const bestSellers = [...PRODUCT_SEED].sort((a, b) => b.rating.count - a.rating.count).slice(0, 10);
    const newArrivals = PRODUCT_SEED.filter((p) => p.badge === "new").concat(PRODUCT_SEED.slice(0, 4)).slice(0, 10);
    const topRated = [...PRODUCT_SEED].sort((a, b) => b.rating.value - a.rating.value).slice(0, 10);

    const featuredCategories: Category[] = [
      { id: "fc1", slug: "audio",     name: "Audio & Headphones", icon: "\\u{1F3A7}", productCount: 3200,  image: IMG("photo-1505740420928-5e560c06d30e"), description: "Studio-grade sound for work, travel, and everything between." },
      { id: "fc2", slug: "computers", name: "Computers & Laptops",icon: "\\u{1F4BB}", productCount: 2100,  image: IMG("photo-1517336714731-489689fd1ca8"), description: "Machines built for creators, coders, and everyday pros." },
      { id: "fc3", slug: "home",      name: "Home & Kitchen",     icon: "\\u{1F3E0}", productCount: 8700,  image: IMG("photo-1556909114-f6e7ad7d3136"),   description: "Tools and touches that make everyday living better." },
      { id: "fc4", slug: "fashion",   name: "Fashion Essentials", icon: "\\u{1F45F}", productCount: 12400, image: IMG("photo-1445205170230-053b83016050"), description: "Wardrobe staples with an honest price tag." },
    ];

    const featuredBrands: Brand[] = [
      { id: "b1", slug: "sonic-labs", name: "Sonic Labs", logo: "SL", category: "Audio",     productCount: 240 },
      { id: "b2", slug: "nova",       name: "Nova",       logo: "NV", category: "Computing", productCount: 180 },
      { id: "b3", slug: "stride",     name: "Stride",     logo: "ST", category: "Footwear",  productCount: 410 },
      { id: "b4", slug: "terra",      name: "Terra",      logo: "TR", category: "Kitchen",   productCount: 320 },
      { id: "b5", slug: "lumen",      name: "Lumen",      logo: "LM", category: "Wearables", productCount: 150 },
      { id: "b6", slug: "everglow",   name: "Everglow",   logo: "EG", category: "Beauty",    productCount: 280 },
    ];

    const deals: Deal[] = [
      { id: "d1", title: "Audio Week", description: "Up to 40% off headphones, earbuds, and speakers.", discountLabel: "40% OFF", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), ctaLabel: "Shop Audio", ctaHref: "/c/audio", productCount: 1240 },
      { id: "d2", title: "Home Refresh", description: "Cookware, decor, and storage from $19.", discountLabel: "FROM $19", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 96).toISOString(), ctaLabel: "Shop Home", ctaHref: "/c/home", productCount: 860 },
      { id: "d3", title: "New Customer Offer", description: "Extra 15% off your first order over $50.", discountLabel: "15% OFF", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), ctaLabel: "Claim Offer", ctaHref: "/signup", productCount: 999 },
    ];

    const promotions: Promotion[] = [
      { id: "pr1", title: "Trade in. Trade up.", description: "Get instant credit toward your next device when you trade in your old one.", ctaLabel: "See trade-in value", ctaHref: "/trade-in", image: IMG("photo-1517336714731-489689fd1ca8", 900), imageAlt: "Laptop and phone trade-in", variant: "large" },
      { id: "pr2", title: "Free 2-day shipping", description: "On thousands of eligible items with Meridian Plus.", ctaLabel: "Learn more", ctaHref: "/plus", image: IMG("photo-1586528116311-ad8dd3c8310d", 600), imageAlt: "Delivery boxes", variant: "medium" },
      { id: "pr3", title: "Student discount", description: "Save 10% with verified student status.", ctaLabel: "Verify", ctaHref: "/student", image: IMG("photo-1523240795612-9a054b0db644", 600), imageAlt: "Student with laptop", variant: "medium" },
    ];

    return { heroBanners, quickCategories, flashSale, trending, bestSellers, newArrivals, topRated, featuredCategories, featuredBrands, deals, promotions };
  },

  search: async (query: string): Promise<SearchSuggestion[]> => {
    await delay(null, 140);
    maybeFail(0.03);
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const products = PRODUCT_SEED
      .filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.includes(q))
      .slice(0, 5)
      .map<SearchSuggestion>((p) => ({ id: \`sp-\${p.id}\`, type: "product", label: p.name, href: \`/p/\${p.slug}\`, image: p.image, meta: p.price.formatted }));
    const categories = CATEGORY_NAVIGATION
      .filter((c) => c.label.toLowerCase().includes(q))
      .slice(0, 3)
      .map<SearchSuggestion>((c) => ({ id: \`sc-\${c.id}\`, type: "category", label: c.label, href: c.href, meta: "Category" }));
    return [...products, ...categories];
  },

  recentlyViewed: async (): Promise<Product[]> => {
    await delay(null, 120);
    maybeFail(0.05);
    return [];
  },

  recommendations: async (customerId: string | null): Promise<Recommendation[]> => {
    await delay(null, 220);
    maybeFail();
    const pool = customerId ? PRODUCT_SEED.slice(0, 10) : PRODUCT_SEED.slice(4, 10);
    return pool.slice(0, 8).map((p, i) => ({
      id: \`r-\${p.id}\`,
      product: p,
      reason: i % 3 === 0 ? "Based on your browsing" : i % 3 === 1 ? "Because you viewed similar items" : "Top picks for you",
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

// Avoid circular — import at end
import { CATEGORY_NAVIGATION } from "@/config/category-navigation";
`);

write("mocks/index.ts", `
export * from "./delay";
export * from "./seed-products";
export * from "./db";
`);

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDERS
// ─────────────────────────────────────────────────────────────────────────────

write("providers/AuthProvider.tsx", `
"use client";
import { createContext, useMemo, type ReactNode } from "react";
import type { Customer } from "@/domain/customer.types";

export interface AuthContextValue {
  customer: Customer | null;
}

export const AuthContext = createContext<AuthContextValue>({ customer: null });

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
`);

write("providers/use-customer.ts", `
"use client";
import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import type { Customer } from "@/domain/customer.types";

export function useCustomer(): Customer | null {
  return useContext(AuthContext).customer;
}
`);

write("providers/Providers.tsx", `
"use client";
import { useMemo, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store/store";
import { AuthProvider } from "./AuthProvider";
import type { Customer } from "@/domain/customer.types";

export function Providers({
  customer = null,
  children,
}: {
  customer?: Customer | null;
  children: ReactNode;
}) {
  const store = useMemo(() => makeStore(), []);
  return (
    <Provider store={store}>
      <AuthProvider customer={customer}>{children}</AuthProvider>
    </Provider>
  );
}
`);

write("providers/index.ts", `
export * from "./AuthProvider";
export * from "./use-customer";
export * from "./Providers";
`);

// ─────────────────────────────────────────────────────────────────────────────
// STORE — slices
// ─────────────────────────────────────────────────────────────────────────────

write("store/slices/cart-ui.slice.ts", `
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface CartUiState {
  isMiniCartOpen: boolean;
  lastAddedProductId: string | null;
}

const initialState: CartUiState = {
  isMiniCartOpen: false,
  lastAddedProductId: null,
};

export const cartUiSlice = createSlice({
  name: "cartUi",
  initialState,
  reducers: {
    openMiniCart(state) { state.isMiniCartOpen = true; },
    closeMiniCart(state) { state.isMiniCartOpen = false; },
    markLastAdded(state, action: PayloadAction<string | null>) {
      state.lastAddedProductId = action.payload;
    },
  },
});

export const { openMiniCart, closeMiniCart, markLastAdded } = cartUiSlice.actions;
`);

write("store/slices/wishlist-ui.slice.ts", `
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface WishlistUiState {
  optimisticIds: string[];
}

const initialState: WishlistUiState = { optimisticIds: [] };

export const wishlistUiSlice = createSlice({
  name: "wishlistUi",
  initialState,
  reducers: {
    toggleOptimistic(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.optimisticIds.indexOf(id);
      if (idx >= 0) state.optimisticIds.splice(idx, 1);
      else state.optimisticIds.push(id);
    },
  },
});

export const { toggleOptimistic } = wishlistUiSlice.actions;
`);

write("store/slices/ui.slice.ts", `
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface UiState {
  isMobileNavOpen: boolean;
  isSearchFocused: boolean;
  activeMegaMenu: string | null;
  theme: "light" | "dark";
}

const initialState: UiState = {
  isMobileNavOpen: false,
  isSearchFocused: false,
  activeMegaMenu: null,
  theme: "light",
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
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

export const { toggleMobileNav, setSearchFocused, setActiveMegaMenu, setTheme } = uiSlice.actions;
`);

write("store/slices/preferences.slice.ts", `
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface PreferencesState {
  currency: "USD";
  locale: "en-US";
  location: string;
}

const initialState: PreferencesState = {
  currency: "USD",
  locale: "en-US",
  location: "New York, NY",
};

export const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    setLocation(state, action: PayloadAction<string>) {
      state.location = action.payload;
    },
  },
});

export const { setLocation } = preferencesSlice.actions;
`);

write("store/slices/search-ui.slice.ts", `
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface SearchUiState {
  recentQueries: string[];
}

const initialState: SearchUiState = {
  recentQueries: ["headphones", "laptop", "running shoes"],
};

export const searchUiSlice = createSlice({
  name: "searchUi",
  initialState,
  reducers: {
    addRecentQuery(state, action: PayloadAction<string>) {
      const q = action.payload.trim();
      if (!q) return;
      state.recentQueries = [q, ...state.recentQueries.filter((x) => x !== q)].slice(0, 6);
    },
    clearRecentQueries(state) { state.recentQueries = []; },
  },
});

export const { addRecentQuery, clearRecentQueries } = searchUiSlice.actions;
`);

// ─────────────────────────────────────────────────────────────────────────────
// STORE — api
// ─────────────────────────────────────────────────────────────────────────────

write("store/api/ecommerce.api.ts", `
import { createApi, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { HomePagePayload } from "@/domain/campaign.types";
import type { Product } from "@/domain/product.types";
import type { SearchSuggestion, Recommendation } from "@/domain/search.types";
import type { CartSummary, WishlistItem } from "@/domain/cart.types";
import { MOCK_DB } from "@/mocks/db";

type SimulatedBaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>;

const simulatedBaseQuery: SimulatedBaseQuery = async (args) => {
  return { data: { args } };
};

export const ecommerceApi = createApi({
  reducerPath: "ecommerceApi",
  baseQuery: simulatedBaseQuery,
  tagTypes: ["Home", "Cart", "Wishlist", "Recommendations", "Search", "RecentlyViewed"],
  keepUnusedDataFor: 300,
  refetchOnFocus: false,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getHomePage: builder.query<HomePagePayload, void>({
      queryFn: async () => {
        try { return { data: await MOCK_DB.home() }; }
        catch (e) { return { error: e as FetchBaseQueryError }; }
      },
      providesTags: ["Home"],
    }),
    getRecommendations: builder.query<Recommendation[], { customerId: string | null }>({
      queryFn: async ({ customerId }) => {
        try { return { data: await MOCK_DB.recommendations(customerId) }; }
        catch (e) { return { error: e as FetchBaseQueryError }; }
      },
      providesTags: ["Recommendations"],
    }),
    getRecentlyViewed: builder.query<Product[], void>({
      queryFn: async () => {
        try { return { data: await MOCK_DB.recentlyViewed() }; }
        catch (e) { return { error: e as FetchBaseQueryError }; }
      },
      providesTags: ["RecentlyViewed"],
    }),
    getSearchSuggestions: builder.query<SearchSuggestion[], string>({
      queryFn: async (q) => {
        try { return { data: await MOCK_DB.search(q) }; }
        catch (e) { return { error: e as FetchBaseQueryError }; }
      },
      providesTags: ["Search"],
      keepUnusedDataFor: 60,
    }),
    getCart: builder.query<CartSummary, void>({
      queryFn: async () => {
        try { return { data: await MOCK_DB.cart() }; }
        catch (e) { return { error: e as FetchBaseQueryError }; }
      },
      providesTags: ["Cart"],
    }),
    getWishlist: builder.query<WishlistItem[], void>({
      queryFn: async () => {
        try { return { data: await MOCK_DB.wishlist() }; }
        catch (e) { return { error: e as FetchBaseQueryError }; }
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// STORE — root reducer + store + hooks
// ─────────────────────────────────────────────────────────────────────────────

write("store/root-reducer.ts", `
import { cartUiSlice } from "./slices/cart-ui.slice";
import { wishlistUiSlice } from "./slices/wishlist-ui.slice";
import { uiSlice } from "./slices/ui.slice";
import { preferencesSlice } from "./slices/preferences.slice";
import { searchUiSlice } from "./slices/search-ui.slice";
import { ecommerceApi } from "./api/ecommerce.api";

export const rootReducer = {
  cartUi: cartUiSlice.reducer,
  wishlistUi: wishlistUiSlice.reducer,
  ui: uiSlice.reducer,
  preferences: preferencesSlice.reducer,
  searchUi: searchUiSlice.reducer,
  [ecommerceApi.reducerPath]: ecommerceApi.reducer,
};
`);

write("store/store.ts", `
import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "./root-reducer";
import { ecommerceApi } from "./api/ecommerce.api";

export function makeStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault().concat(ecommerceApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
`);

write("store/hooks.ts", `
"use client";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import type { AppDispatch, RootState } from "./store";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
`);

// ─────────────────────────────────────────────────────────────────────────────
// DONE
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n\x1b[32m\u2705 PR 1 scaffolded (${written} files)\x1b[0m`);
console.log("\nNext: edit src/features/home/page/EcommerceHomePage.tsx to:");
console.log("  1. Delete the moved blocks (\u00a71 types, \u00a72 config, \u00a73 mocks, \u00a74\u2013\u00a76 store/api/slices, \u00a77 AuthContext, \u00a78 formatters + hooks).");
console.log("  2. Add imports from @/domain, @/config, @/lib, @/providers, @/store/*.");
console.log("  3. Keep everything else (primitives, shared, product, sections, layout, overlays, page composition) untouched.");
console.log("\nRun: node scripts/scaffold-pr1.js\n");