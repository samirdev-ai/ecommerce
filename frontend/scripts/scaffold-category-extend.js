#!/usr/bin/env node
/**
 * Category page — extend-only scaffold.
 *
 * Per file:
 *   CREATE  — file missing → write whole
 *   PATCH   — file exists, needs additions → insert between markers
 *   SKIP    — already patched → no-op
 *
 * Markers look like:
 *   // ── scaffold:auto:<id>:begin ──
 *   ...inserted content...
 *   // ── scaffold:auto:<id>:end ──
 *
 * Nothing outside the markers is ever modified.
 *
 * Run: node scripts/scaffold-category-extend.cjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const MANIFEST_PATH = path.join(ROOT, ".scaffold-manifest.json");

const manifest = fs.existsSync(MANIFEST_PATH)
  ? JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"))
  : { version: 1, patches: {} };

const counters = { created: 0, patched: 0, skipped: 0, failed: 0 };

function saveManifest() {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function log(kind, relPath, note = "") {
  const symbol = { created: "\x1b[32m+\x1b[0m", patched: "\x1b[36m~\x1b[0m", skipped: "\x1b[33m•\x1b[0m", failed: "\x1b[31m✗\x1b[0m" }[kind];
  const extra = note ? `  ${note}` : "";
  console.log(`  ${symbol} src/${relPath}${extra}`);
}

/** Create a file whole if missing. Never overwrite. */
function create(relPath, lines) {
  const full = path.join(SRC, relPath);
  if (fs.existsSync(full)) {
    counters.skipped++;
    log("skipped", relPath, "(exists)");
    return;
  }
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, lines.join("\n") + "\n");
  counters.created++;
  log("created", relPath);
}

/**
 * Insert content between markers in an existing file.
 * If markers exist, replaces only what's between them.
 * If markers are absent, appends at the end with new markers.
 * If file is missing, creates it with the markers + content.
 */
function patch(relPath, markerId, lines) {
  const full = path.join(SRC, relPath);
  const begin = `// ── scaffold:auto:${markerId}:begin ──`;
  const end = `// ── scaffold:auto:${markerId}:end ──`;
  const block = [begin, ...lines, end].join("\n");

  if (!fs.existsSync(full)) {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, block + "\n");
    counters.created++;
    manifest.patches[`${relPath}:${markerId}`] = true;
    log("created", relPath, `(new, with patch block ${markerId})`);
    return;
  }

  const original = fs.readFileSync(full, "utf8");
  const key = `${relPath}:${markerId}`;

  // Already patched — skip unless content changed.
  if (original.includes(begin) && original.includes(end)) {
    const beginIdx = original.indexOf(begin);
    const endIdx = original.indexOf(end) + end.length;
    const current = original.slice(beginIdx, endIdx);
    if (current === block) {
      counters.skipped++;
      log("skipped", relPath, `(patch ${markerId} unchanged)`);
      return;
    }
    const next = original.slice(0, beginIdx) + block + original.slice(endIdx);
    fs.writeFileSync(full, next);
    counters.patched++;
    log("patched", relPath, `(${markerId} updated)`);
    return;
  }

  // No markers yet — append at end, ensuring a newline separator.
  const sep = original.endsWith("\n") ? "\n" : "\n\n";
  fs.writeFileSync(full, original + sep + block + "\n");
  counters.patched++;
  manifest.patches[key] = true;
  log("patched", relPath, `(${markerId} appended)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY-SPECIFIC FILES — CREATE ONLY
// ─────────────────────────────────────────────────────────────────────────────

create("domain/filter.types.ts", [
  'export interface FilterOption {',
  '  readonly id: string;',
  '  readonly label: string;',
  '  readonly count: number;',
  '}',
  '',
  'export interface PriceBucket {',
  '  readonly id: string;',
  '  readonly label: string;',
  '  readonly min: number;',
  '  readonly max: number | null;',
  '}',
  '',
  'export interface AttributeFilterConfig {',
  '  readonly key: string;',
  '  readonly label: string;',
  '  readonly options: readonly string[];',
  '}',
  '',
  'export interface FilterChip {',
  '  readonly id: string;',
  '  readonly label: string;',
  '  readonly onRemove: () => void;',
  '}',
  '',
  'export interface FilterState {',
  '  readonly subcategories: readonly string[];',
  '  readonly brands: readonly string[];',
  '  readonly priceBucketId: string | null;',
  '  readonly customMin: number | null;',
  '  readonly customMax: number | null;',
  '  readonly minRating: number | null;',
  '  readonly availability: readonly string[];',
  '  readonly discount: readonly string[];',
  '  readonly delivery: readonly string[];',
  '  readonly sellers: readonly string[];',
  '  readonly attributes: Readonly<Record<string, readonly string[]>>;',
  '}',
]);

create("config/price-buckets.ts", [
  'import type { PriceBucket } from "@/domain/filter.types";',
  '',
  'export const PRICE_BUCKETS: readonly PriceBucket[] = [',
  '  { id: "under-500",   label: "Under $500",     min: 0,    max: 500 },',
  '  { id: "500-1000",    label: "$500 \u2013 $1,000",  min: 500,  max: 1000 },',
  '  { id: "1000-1500",   label: "$1,000 \u2013 $1,500", min: 1000, max: 1500 },',
  '  { id: "1500-2000",   label: "$1,500 \u2013 $2,000", min: 1500, max: 2000 },',
  '  { id: "2000-plus",   label: "$2,000+",         min: 2000, max: null },',
  '];',
]);

create("config/filter-options.ts", [
  'import type { FilterOption } from "@/domain/filter.types";',
  '',
  'export const RATING_OPTIONS: readonly number[] = [4, 3, 2];',
  'export const DISCOUNT_OPTIONS: readonly number[] = [10, 20, 30, 50];',
  '',
  'export const AVAILABILITY_OPTIONS: readonly FilterOption[] = [',
  '  { id: "inStock",         label: "In Stock",         count: 0 },',
  '  { id: "availableToday",  label: "Available Today",  count: 0 },',
  '  { id: "fastDelivery",    label: "Fast Delivery",    count: 0 },',
  '];',
  '',
  'export const DELIVERY_OPTIONS: readonly FilterOption[] = [',
  '  { id: "free",    label: "Free Delivery", count: 0 },',
  '  { id: "sameDay", label: "Same Day",      count: 0 },',
  '  { id: "nextDay", label: "Next Day",      count: 0 },',
  '];',
]);

create("config/attribute-config.ts", [
  'import type { AttributeFilterConfig } from "@/domain/filter.types";',
  '',
  'export const ATTRIBUTE_CONFIG: readonly AttributeFilterConfig[] = [',
  '  { key: "ram",       label: "RAM",             options: ["8GB", "16GB", "32GB", "64GB"] },',
  '  { key: "storage",   label: "Storage",         options: ["256GB SSD", "512GB SSD", "1TB SSD", "2TB SSD"] },',
  '  { key: "processor", label: "Processor",       options: ["Intel Core i5", "Intel Core i7", "Intel Core i9", "Apple M3", "Apple M3 Pro", "AMD Ryzen 7", "AMD Ryzen 9"] },',
  '  { key: "screenSize",label: "Screen Size",     options: ["13\\"", "14\\"", "15.6\\"", "16\\"", "17\\""] },',
  '  { key: "gpu",       label: "Graphics",        options: ["Integrated", "RTX 4050", "RTX 4060", "RTX 4070", "RTX 4080"] },',
  '  { key: "os",        label: "Operating System",options: ["Windows 11", "macOS", "ChromeOS"] },',
  '  { key: "color",     label: "Color",           options: ["Space Gray", "Silver", "Midnight Black", "Platinum"] },',
  '];',
]);

create("config/category-page-config.ts", [
  'import type { CategoryInfo } from "@/domain/category.types";',
  'import type { Subcategory } from "@/domain/category.types";',
  'import type { Brand, Seller } from "@/domain/product.types";',
  '',
  'export const CATEGORY_INFO: CategoryInfo = {',
  '  name: "Laptops",',
  '  description: "Explore laptops for work, gaming, creativity and everyday productivity.",',
  '  bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Laptops",',
  '  productCount: 12482,',
  '  breadcrumbs: [',
  '    { label: "Home", href: "/" },',
  '    { label: "Electronics", href: "/category/electronics" },',
  '    { label: "Computers", href: "/category/computers" },',
  '    { label: "Laptops", href: "/category/laptops" },',
  '  ],',
  '};',
  '',
  'export const SUBCATEGORIES: readonly Subcategory[] = [',
  '  { id: "gaming",      name: "Gaming Laptops",     slug: "gaming-laptops",     icon: "\u{1F3AE}", productCount: 1842 },',
  '  { id: "business",    name: "Business Laptops",   slug: "business-laptops",   icon: "\u{1F4BC}", productCount: 2210 },',
  '  { id: "ultrabooks",  name: "Ultrabooks",         slug: "ultrabooks",         icon: "\u26A1", productCount: 1356 },',
  '  { id: "2in1",        name: "2-in-1 Laptops",     slug: "2-in-1-laptops",     icon: "\u{1F504}", productCount: 984 },',
  '  { id: "macbooks",    name: "MacBooks",           slug: "macbooks",           icon: "\u{1F34E}", productCount: 621 },',
  '  { id: "chromebooks", name: "Chromebooks",        slug: "chromebooks",        icon: "\u{1F310}", productCount: 1103 },',
  '  { id: "accessories", name: "Laptop Accessories", slug: "laptop-accessories", icon: "\u{1F392}", productCount: 4366 },',
  '];',
  '',
  'export const BRANDS: readonly Brand[] = [',
  '  { id: "Apple",   name: "Apple",   productCount: 621 },',
  '  { id: "Dell",    name: "Dell",    productCount: 1840 },',
  '  { id: "Lenovo",  name: "Lenovo",  productCount: 2103 },',
  '  { id: "HP",      name: "HP",      productCount: 1975 },',
  '  { id: "ASUS",    name: "ASUS",    productCount: 1622 },',
  '  { id: "Acer",    name: "Acer",    productCount: 1340 },',
  '  { id: "MSI",     name: "MSI",     productCount: 812 },',
  '  { id: "Samsung", name: "Samsung", productCount: 540 },',
  '];',
  '',
  'export const SELLERS: readonly Seller[] = [',
  '  { id: "nexus-direct", name: "Nexus Direct",   rating: 4.8, isOfficial: true },',
  '  { id: "techhub",      name: "TechHub Official", rating: 4.6, isOfficial: true },',
  '  { id: "compuworld",   name: "CompuWorld",     rating: 4.3, isOfficial: false },',
  '  { id: "bytebazaar",   name: "ByteBazaar",     rating: 4.1, isOfficial: false },',
  '];',
]);

create("mocks/seed-sellers.ts", [
  'import type { Seller } from "@/domain/product.types";',
  '',
  'export const SELLERS: readonly Seller[] = [',
  '  { id: "nexus-direct", name: "Nexus Direct",     rating: 4.8, isOfficial: true },',
  '  { id: "techhub",      name: "TechHub Official", rating: 4.6, isOfficial: true },',
  '  { id: "compuworld",   name: "CompuWorld",       rating: 4.3, isOfficial: false },',
  '  { id: "bytebazaar",   name: "ByteBazaar",       rating: 4.1, isOfficial: false },',
  '];',
]);

create("store/slices/filters.slice.ts", [
  'import { createSlice, type PayloadAction } from "@reduxjs/toolkit";',
  'import type { FilterState } from "@/domain/filter.types";',
  '',
  'const INITIAL: FilterState = {',
  '  subcategories: [], brands: [], priceBucketId: null,',
  '  customMin: null, customMax: null, minRating: null,',
  '  availability: [], discount: [], delivery: [], sellers: [], attributes: {},',
  '};',
  '',
  'function toggleInArray(arr: readonly string[], value: string): string[] {',
  '  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];',
  '}',
  '',
  'export const filtersSlice = createSlice({',
  '  name: "filters",',
  '  initialState: INITIAL,',
  '  reducers: {',
  '    toggleSubcategory(s, a: PayloadAction<string>) { s.subcategories = toggleInArray(s.subcategories, a.payload); },',
  '    toggleBrand(s, a: PayloadAction<string>)       { s.brands = toggleInArray(s.brands, a.payload); },',
  '    toggleAvailability(s, a: PayloadAction<string>){ s.availability = toggleInArray(s.availability, a.payload); },',
  '    toggleDiscount(s, a: PayloadAction<string>)    { s.discount = toggleInArray(s.discount, a.payload); },',
  '    toggleDelivery(s, a: PayloadAction<string>)    { s.delivery = toggleInArray(s.delivery, a.payload); },',
  '    toggleSeller(s, a: PayloadAction<string>)      { s.sellers = toggleInArray(s.sellers, a.payload); },',
  '    toggleAttribute(s, a: PayloadAction<{ key: string; value: string }>) {',
  '      const cur = s.attributes[a.payload.key] ?? [];',
  '      s.attributes[a.payload.key] = toggleInArray(cur, a.payload.value);',
  '    },',
  '    setPriceBucket(s, a: PayloadAction<string | null>) {',
  '      s.priceBucketId = a.payload; s.customMin = null; s.customMax = null;',
  '    },',
  '    setCustomPriceRange(s, a: PayloadAction<{ min: number | null; max: number | null }>) {',
  '      s.customMin = a.payload.min; s.customMax = a.payload.max; s.priceBucketId = null;',
  '    },',
  '    setMinRating(s, a: PayloadAction<number | null>) { s.minRating = a.payload; },',
  '    clearFilters() { return INITIAL; },',
  '  },',
  '});',
]);

create("store/slices/sort.slice.ts", [
  'import { createSlice, type PayloadAction } from "@reduxjs/toolkit";',
  '',
  'export enum SortOption {',
  '  Relevance = "relevance",',
  '  Popularity = "popularity",',
  '  BestSelling = "bestSelling",',
  '  Newest = "newest",',
  '  PriceLowToHigh = "priceLowToHigh",',
  '  PriceHighToLow = "priceHighToLow",',
  '  CustomerRating = "customerRating",',
  '  BiggestDiscount = "biggestDiscount",',
  '}',
  '',
  'export const SORT_LABELS: Record<SortOption, string> = {',
  '  [SortOption.Relevance]: "Relevance",',
  '  [SortOption.Popularity]: "Popularity",',
  '  [SortOption.BestSelling]: "Best Selling",',
  '  [SortOption.Newest]: "Newest",',
  '  [SortOption.PriceLowToHigh]: "Price: Low to High",',
  '  [SortOption.PriceHighToLow]: "Price: High to Low",',
  '  [SortOption.CustomerRating]: "Customer Rating",',
  '  [SortOption.BiggestDiscount]: "Biggest Discount",',
  '};',
  '',
  'export const sortSlice = createSlice({',
  '  name: "sort",',
  '  initialState: { value: SortOption.Relevance },',
  '  reducers: { setSort(s, a: PayloadAction<SortOption>) { s.value = a.payload; } },',
  '});',
]);

create("store/slices/view-mode.slice.ts", [
  'import { createSlice, type PayloadAction } from "@reduxjs/toolkit";',
  '',
  'export enum ViewMode { Grid = "grid", List = "list" }',
  '',
  'export const viewModeSlice = createSlice({',
  '  name: "viewMode",',
  '  initialState: { value: ViewMode.Grid },',
  '  reducers: { setViewMode(s, a: PayloadAction<ViewMode>) { s.value = a.payload; } },',
  '});',
]);

create("store/slices/cart.slice.ts", [
  'import { createSlice, type PayloadAction } from "@reduxjs/toolkit";',
  '',
  'export interface CartItem { productId: string; quantity: number; }',
  '',
  'export const cartSlice = createSlice({',
  '  name: "cart",',
  '  initialState: { items: [] as CartItem[] },',
  '  reducers: {',
  '    addToCart(s, a: PayloadAction<string>) {',
  '      const ex = s.items.find((i) => i.productId === a.payload);',
  '      if (ex) ex.quantity += 1;',
  '      else s.items.push({ productId: a.payload, quantity: 1 });',
  '    },',
  '    removeFromCart(s, a: PayloadAction<string>) {',
  '      s.items = s.items.filter((i) => i.productId !== a.payload);',
  '    },',
  '  },',
  '});',
]);

create("store/slices/wishlist.slice.ts", [
  'import { createSlice, type PayloadAction } from "@reduxjs/toolkit";',
  '',
  'export const wishlistSlice = createSlice({',
  '  name: "wishlist",',
  '  initialState: { ids: [] as string[] },',
  '  reducers: {',
  '    toggleWishlist(s, a: PayloadAction<string>) {',
  '      const i = s.ids.indexOf(a.payload);',
  '      if (i === -1) s.ids.unshift(a.payload);',
  '      else s.ids.splice(i, 1);',
  '    },',
  '  },',
  '});',
]);

create("store/selectors/filters.selectors.ts", [
  'import { createSelector } from "@reduxjs/toolkit";',
  'import type { RootState } from "@/store/store";',
  '',
  'export const selectFilters = (s: RootState) => s.filters;',
  '',
  'export const selectActiveFilterCount = createSelector(selectFilters, (f) =>',
  '  f.subcategories.length + f.brands.length + f.availability.length +',
  '  f.discount.length + f.sellers.length + f.delivery.length +',
  '  (f.minRating !== null ? 1 : 0) +',
  '  (f.priceBucketId !== null || f.customMin !== null || f.customMax !== null ? 1 : 0) +',
  '  Object.values(f.attributes).reduce((n, v) => n + v.length, 0),',
  ');',
]);

create("store/selectors/sort.selectors.ts", [
  'import type { RootState } from "@/store/store";',
  '',
  'export const selectSort = (s: RootState) => s.sort.value;',
  'export const selectViewMode = (s: RootState) => s.viewMode.value;',
]);

create("store/selectors/cart.selectors.ts", [
  'import { createSelector } from "@reduxjs/toolkit";',
  'import type { RootState } from "@/store/store";',
  '',
  'export const selectCartItems = (s: RootState) => s.cart.items;',
  'export const selectCartCount = createSelector(selectCartItems, (items) => items.reduce((n, i) => n + i.quantity, 0));',
  'export const selectIsInCart = (id: string) => (s: RootState) => s.cart.items.some((i) => i.productId === id);',
]);

create("store/selectors/wishlist.selectors.ts", [
  'import type { RootState } from "@/store/store";',
  '',
  'export const selectWishlistIds = (s: RootState) => s.wishlist.ids;',
  'export const selectIsWishlisted = (id: string) => (s: RootState) => s.wishlist.ids.includes(id);',
]);

create("store/selectors/listing.selectors.ts", [
  'import { createSelector } from "@reduxjs/toolkit";',
  'import type { RootState } from "@/store/store";',
  'import type { Product } from "@/domain/product.types";',
  'import { filterProducts } from "@/features/category/utils/filter";',
  'import { sortProducts } from "@/features/category/utils/sort";',
  'import { selectSort } from "./sort.selectors";',
  '',
  'const selectAllProducts = (_: RootState): readonly Product[] => [];',
  '',
  'export const selectFilteredSortedProducts = createSelector(',
  '  [(s: RootState) => s.filters, selectSort, selectAllProducts],',
  '  (filters, sort, products) => sortProducts(filterProducts(products, filters), sort),',
  ');',
]);

create("features/category/utils/filter.ts", [
  'import type { Product } from "@/domain/product.types";',
  'import type { FilterState } from "@/domain/filter.types";',
  'import { PRICE_BUCKETS } from "@/config/price-buckets";',
  '',
  'export function getDiscountPercentage(price: number, originalPrice?: number): number {',
  '  if (!originalPrice || originalPrice <= price) return 0;',
  '  return Math.round(((originalPrice - price) / originalPrice) * 100);',
  '}',
  '',
  'function matchesPrice(p: Product, f: FilterState): boolean {',
  '  if (f.customMin !== null && p.price < f.customMin) return false;',
  '  if (f.customMax !== null && p.price > f.customMax) return false;',
  '  if (f.customMin === null && f.customMax === null && f.priceBucketId) {',
  '    const b = PRICE_BUCKETS.find((x) => x.id === f.priceBucketId);',
  '    if (b) { if (p.price < b.min) return false; if (b.max !== null && p.price > b.max) return false; }',
  '  }',
  '  return true;',
  '}',
  '',
  'function matchesAvailability(p: Product, ids: readonly string[]): boolean {',
  '  if (ids.length === 0) return true;',
  '  return ids.some((id) => {',
  '    if (id === "inStock")        return p.status !== "outOfStock";',
  '    if (id === "availableToday") return p.isSameDayEligible;',
  '    if (id === "fastDelivery")   return p.isSameDayEligible || p.isNextDayEligible;',
  '    return false;',
  '  });',
  '}',
  '',
  'function matchesDelivery(p: Product, ids: readonly string[]): boolean {',
  '  if (ids.length === 0) return true;',
  '  return ids.some((id) => {',
  '    if (id === "free")    return p.isFreeDelivery;',
  '    if (id === "sameDay") return p.isSameDayEligible;',
  '    if (id === "nextDay") return p.isNextDayEligible;',
  '    return false;',
  '  });',
  '}',
  '',
  'function matchesDiscount(p: Product, t: readonly string[]): boolean {',
  '  if (t.length === 0) return true;',
  '  const pct = getDiscountPercentage(p.price, p.originalPrice);',
  '  return t.some((x) => pct >= Number(x));',
  '}',
  '',
  'function matchesAttributes(p: Product, sel: Readonly<Record<string, readonly string[]>>): boolean {',
  '  return Object.entries(sel).every(([key, values]) => {',
  '    if (values.length === 0) return true;',
  '    const a = p.attributes?.find((x) => x.key === key);',
  '    return a ? values.includes(a.value) : false;',
  '  });',
  '}',
  '',
  'export function filterProducts(products: readonly Product[], f: FilterState): Product[] {',
  '  return products.filter((p) => {',
  '    if (f.subcategories.length > 0 && !f.subcategories.includes(p.subcategoryId ?? "")) return false;',
  '    if (f.brands.length > 0 && !f.brands.includes(p.brand)) return false;',
  '    if (f.minRating !== null && p.rating.value < f.minRating) return false;',
  '    if (f.sellers.length > 0 && !f.sellers.includes(p.seller?.id ?? "")) return false;',
  '    if (!matchesPrice(p, f)) return false;',
  '    if (!matchesAvailability(p, f.availability)) return false;',
  '    if (!matchesDelivery(p, f.delivery)) return false;',
  '    if (!matchesDiscount(p, f.discount)) return false;',
  '    if (!matchesAttributes(p, f.attributes)) return false;',
  '    return true;',
  '  });',
  '}',
]);

create("features/category/utils/sort.ts", [
  'import type { Product } from "@/domain/product.types";',
  'import { SortOption } from "@/store/slices/sort.slice";',
  'import { getDiscountPercentage } from "./filter";',
  '',
  'export function sortProducts(products: readonly Product[], sort: SortOption): Product[] {',
  '  const copy = [...products];',
  '  switch (sort) {',
  '    case SortOption.PriceLowToHigh:  return copy.sort((a, b) => a.price - b.price);',
  '    case SortOption.PriceHighToLow:  return copy.sort((a, b) => b.price - a.price);',
  '    case SortOption.CustomerRating:  return copy.sort((a, b) => b.rating.value - a.rating.value);',
  '    case SortOption.BiggestDiscount: return copy.sort((a, b) =>',
  '      getDiscountPercentage(b.price, b.originalPrice?.amount) - getDiscountPercentage(a.price, a.originalPrice?.amount));',
  '    case SortOption.Newest:          return copy.sort((a, b) => (b.badge === "new" ? 1 : 0) - (a.badge === "new" ? 1 : 0));',
  '    case SortOption.BestSelling:',
  '    case SortOption.Popularity:      return copy.sort((a, b) => b.rating.count - a.rating.count);',
  '    case SortOption.Relevance:',
  '    default:                         return copy;',
  '  }',
  '}',
]);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH EXISTING FILES — add exports between markers
// ─────────────────────────────────────────────────────────────────────────────

// Extend domain/product.types.ts with category-specific shapes
patch("domain/product.types.ts", "product-seller-attr", [
  'export interface Seller {',
  '  readonly id: string;',
  '  readonly name: string;',
  '  readonly rating: number;',
  '  readonly isOfficial: boolean;',
  '}',
  '',
  'export interface ProductAttribute {',
  '  readonly key: string;',
  '  readonly label: string;',
  '  readonly value: string;',
  '}',
  '',
  'export type ProductStatus =',
  '  | "default" | "new" | "bestSeller" | "discounted"',
  '  | "lowStock" | "outOfStock" | "sponsored";',
  '',
  'export interface Brand {',
  '  readonly id: string;',
  '  readonly name: string;',
  '  readonly productCount: number;',
  '}',
]);

// Extend domain/category.types.ts with category-page shapes
patch("domain/category.types.ts", "category-page-shapes", [
  'export interface Subcategory {',
  '  readonly id: string;',
  '  readonly name: string;',
  '  readonly slug: string;',
  '  readonly icon: string;',
  '  readonly productCount: number;',
  '}',
  '',
  'export interface BreadcrumbItem {',
  '  readonly label: string;',
  '  readonly href: string;',
  '}',
  '',
  'export interface CategoryInfo {',
  '  readonly name: string;',
  '  readonly description: string;',
  '  readonly bannerImage: string;',
  '  readonly productCount: number;',
  '  readonly breadcrumbs: readonly BreadcrumbItem[];',
  '}',
]);

// Extend domain/index.ts barrel
patch("domain/index.ts", "category-filter-types", [
  'export * from "./filter.types";',
]);

// Extend lib/format.ts with category helpers
patch("lib/format.ts", "category-format-helpers", [
  'export function formatCompactNumber(value: number): string {',
  '  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);',
  '}',
]);

// Extend store/root-reducer.ts with new slices
patch("store/root-reducer.ts", "category-slices", [
  'import { cartSlice } from "./slices/cart.slice";',
  'import { wishlistSlice } from "./slices/wishlist.slice";',
  'import { filtersSlice } from "./slices/filters.slice";',
  'import { sortSlice } from "./slices/sort.slice";',
  'import { viewModeSlice } from "./slices/view-mode.slice";',
  '',
  '// NOTE: these are added to the reducer object below.',
  '// If your root-reducer uses `combineSlices` or an object literal,',
  '// add the five keys manually:',
  '//   cart: cartSlice.reducer,',
  '//   wishlist: wishlistSlice.reducer,',
  '//   filters: filtersSlice.reducer,',
  '//   sort: sortSlice.reducer,',
  '//   viewMode: viewModeSlice.reducer,',
]);

// Extend store/slices/ui.slice.ts with filterDrawerOpen
patch("store/slices/ui.slice.ts", "filter-drawer", [
  '// Add these to the UIState interface and initialState:',
  '//   filterDrawerOpen: boolean;',
  '// Then add to reducers:',
  '//   openFilterDrawer(s) { s.filterDrawerOpen = true; },',
  '//   closeFilterDrawer(s) { s.filterDrawerOpen = false; },',
]);

// Extend config/index.ts barrel
patch("config/index.ts", "category-config", [
  'export * from "./price-buckets";',
  'export * from "./filter-options";',
  'export * from "./attribute-config";',
  'export * from "./category-page-config";',
]);

// Extend mocks/index.ts barrel
patch("mocks/index.ts", "category-mocks", [
  'export * from "./seed-sellers";',
]);

// ─────────────────────────────────────────────────────────────────────────────

saveManifest();

console.log(
  `\n\x1b[32m\u2705 Extend scaffold complete\x1b[0m\n` +
  `   created: ${counters.created}\n` +
  `   patched: ${counters.patched}\n` +
  `   skipped: ${counters.skipped}\n` +
  (counters.failed ? `   failed:  ${counters.failed}\n` : "")
);

console.log("\nManual follow-ups (the script does NOT auto-edit these):");
console.log("  1. store/root-reducer.ts — add the 5 slice reducers to the object literal.");
console.log("  2. store/slices/ui.slice.ts — add filterDrawerOpen + its two actions.");
console.log("  3. domain/product.types.ts — merge the new fields into the existing Product interface");
console.log("     (subcategoryId, seller, attributes, status, isFreeDelivery, isSameDayEligible, isNextDayEligible, installmentMonths).");
console.log("  4. features/category/components/* — not scaffolded by this script (PR E of the split).");
console.log("  5. features/category/page/CategoryPage.tsx — not scaffolded by this script (PR F of the split).");
console.log("");
console.log("Run again to verify idempotency: node scripts/scaffold-category-extend.cjs");