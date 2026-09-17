// #!/usr/bin/env node
/**
 * Final category scaffold. Extend-only, idempotent.
 *
 * Actions:
 *   CREATE: products slice, categories config, RecommendationSection, CategoryPage
 *   PATCH:  product.types.ts (categorySlug), seed-products.ts (add field), root-reducer.ts
 *   DELETE NOTE: removes nothing; category-page-config.ts is superseded
*
* Run: node scripts/scaffold-category-final.cjs
*/

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const counters = { created: 0, patched: 0, skipped: 0, manual: 0 };

function log(kind, rel, note = "") {
  const sym = {
    created: "\x1b[32m+\x1b[0m",
    patched: "\x1b[36m~\x1b[0m",
    skipped: "\x1b[33m•\x1b[0m",
    manual: "\x1b[35m!\x1b[0m",
  }[kind];
  console.log(`  ${sym} src/${rel}${note ? `  ${note}` : ""}`);
}

function create(rel, lines) {
  const full = path.join(SRC, rel);
  if (fs.existsSync(full)) { counters.skipped++; log("skipped", rel, "(exists)"); return; }
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, lines.join("\n") + "\n");
  counters.created++;
  log("created", rel);
}

function patch(rel, markerId, lines) {
  const full = path.join(SRC, rel);
  const begin = `// ── scaffold:auto:${markerId}:begin ──`;
  const end = `// ── scaffold:auto:${markerId}:end ──`;
  const block = [begin, ...lines, end].join("\n");

  if (!fs.existsSync(full)) {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, block + "\n");
    counters.created++;
    log("created", rel, `(with ${markerId})`);
    return;
  }
  const original = fs.readFileSync(full, "utf8");
  if (original.includes(begin) && original.includes(end)) {
    const i = original.indexOf(begin);
    const j = original.indexOf(end) + end.length;
    if (original.slice(i, j) === block) { counters.skipped++; log("skipped", rel, `(${markerId} unchanged)`); return; }
    fs.writeFileSync(full, original.slice(0, i) + block + original.slice(j));
    counters.patched++;
    log("patched", rel, `(${markerId} updated)`);
    return;
  }
  const sep = original.endsWith("\n") ? "\n" : "\n\n";
  fs.writeFileSync(full, original + sep + block + "\n");
  counters.patched++;
  log("patched", rel, `(${markerId} appended)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRODUCTS SLICE
// ─────────────────────────────────────────────────────────────────────────────

create("store/slices/products.slice.ts", [
  'import { createSlice, type PayloadAction } from "@reduxjs/toolkit";',
  'import type { Product } from "@/domain/product.types";',
  '',
  'export interface ProductsState {',
  '  items: readonly Product[];',
  '  status: "idle" | "loading" | "success" | "error";',
  '}',
  '',
  'const initialState: ProductsState = { items: [], status: "idle" };',
  '',
  'export const productsSlice = createSlice({',
  '  name: "products",',
  '  initialState,',
  '  reducers: {',
  '    setProducts(s, a: PayloadAction<readonly Product[]>) {',
  '      s.items = a.payload;',
  '      s.status = "success";',
  '    },',
  '    setProductsStatus(s, a: PayloadAction<ProductsState["status"]>) {',
  '      s.status = a.payload;',
  '    },',
  '    clearProducts(s) {',
  '      s.items = [];',
  '      s.status = "idle";',
  '    },',
  '  },',
  '});',
  '',
  'export const { setProducts, setProductsStatus, clearProducts } = productsSlice.actions;',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 2. MULTI-CATEGORY CONFIG
// ─────────────────────────────────────────────────────────────────────────────

create("config/categories.ts", [
  'import type { CategoryInfo, Subcategory } from "@/domain/category.types";',
  '',
  'export interface CategoryConfig {',
  '  readonly info: CategoryInfo;',
  '  readonly subcategories: readonly Subcategory[];',
  '}',
  '',
  'export const CATEGORIES: Readonly<Record<string, CategoryConfig>> = {',
  '  electronics: {',
  '    info: {',
  '      name: "Electronics",',
  '      description: "Phones, laptops, audio, cameras and everything in between.",',
  '      bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Electronics",',
  '      productCount: 48120,',
  '      breadcrumbs: [',
  '        { label: "Home", href: "/" },',
  '        { label: "Electronics", href: "/category/electronics" },',
  '      ],',
  '    },',
  '    subcategories: [',
  '      { id: "laptops", name: "Laptops",     slug: "laptops",     icon: "💻", productCount: 12482 },',
  '      { id: "phones",  name: "Smartphones", slug: "smartphones", icon: "📱", productCount: 18400 },',
  '      { id: "audio",   name: "Audio",       slug: "audio",       icon: "🎧", productCount: 6210 },',
  '      { id: "tablets", name: "Tablets",     slug: "tablets",     icon: "📟", productCount: 3400 },',
  '    ],',
  '  },',
  '  laptops: {',
  '    info: {',
  '      name: "Laptops",',
  '      description: "Explore laptops for work, gaming, creativity and everyday productivity.",',
  '      bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Laptops",',
  '      productCount: 12482,',
  '      breadcrumbs: [',
  '        { label: "Home", href: "/" },',
  '        { label: "Electronics", href: "/category/electronics" },',
  '        { label: "Computers", href: "/category/computers" },',
  '        { label: "Laptops", href: "/category/laptops" },',
  '      ],',
  '    },',
  '    subcategories: [',
  '      { id: "gaming",      name: "Gaming Laptops",     slug: "gaming-laptops",     icon: "🎮", productCount: 1842 },',
  '      { id: "business",    name: "Business Laptops",   slug: "business-laptops",   icon: "💼", productCount: 2210 },',
  '      { id: "ultrabooks",  name: "Ultrabooks",         slug: "ultrabooks",         icon: "⚡", productCount: 1356 },',
  '      { id: "2in1",        name: "2-in-1 Laptops",     slug: "2-in-1-laptops",     icon: "🔄", productCount: 984 },',
  '      { id: "macbooks",    name: "MacBooks",           slug: "macbooks",           icon: "🍎", productCount: 621 },',
  '      { id: "chromebooks", name: "Chromebooks",        slug: "chromebooks",        icon: "🌐", productCount: 1103 },',
  '      { id: "accessories", name: "Laptop Accessories", slug: "laptop-accessories", icon: "🎒", productCount: 4366 },',
  '    ],',
  '  },',
  '  fashion: {',
  '    info: {',
  '      name: "Fashion",',
  '      description: "Everyday essentials and statement pieces, honestly priced.",',
  '      bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Fashion",',
  '      productCount: 24500,',
  '      breadcrumbs: [',
  '        { label: "Home", href: "/" },',
  '        { label: "Fashion", href: "/category/fashion" },',
  '      ],',
  '    },',
  '    subcategories: [',
  '      { id: "shoes",       name: "Shoes",       slug: "shoes",       icon: "👟", productCount: 6200 },',
  '      { id: "shirts",      name: "Shirts",      slug: "shirts",      icon: "👔", productCount: 4800 },',
  '      { id: "accessories", name: "Accessories", slug: "accessories", icon: "🕶️", productCount: 3900 },',
  '    ],',
  '  },',
  '  home: {',
  '    info: {',
  '      name: "Home & Kitchen",',
  '      description: "Cookware, decor, and storage that lasts.",',
  '      bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Home",',
  '      productCount: 18700,',
  '      breadcrumbs: [',
  '        { label: "Home", href: "/" },',
  '        { label: "Home & Kitchen", href: "/category/home" },',
  '      ],',
  '    },',
  '    subcategories: [',
  '      { id: "cookware",    name: "Cookware",    slug: "cookware",    icon: "🍳", productCount: 4200 },',
  '      { id: "decor",       name: "Decor",       slug: "decor",       icon: "🖼️", productCount: 5100 },',
  '      { id: "appliances",  name: "Appliances",  slug: "appliances",  icon: "🔌", productCount: 3400 },',
  '    ],',
  '  },',
  '  beauty: {',
  '    info: {',
  '      name: "Beauty",',
  '      description: "Skincare, haircare, and everyday essentials.",',
  '      bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Beauty",',
  '      productCount: 9800,',
  '      breadcrumbs: [',
  '        { label: "Home", href: "/" },',
  '        { label: "Beauty", href: "/category/beauty" },',
  '      ],',
  '    },',
  '    subcategories: [',
  '      { id: "skincare", name: "Skincare", slug: "skincare", icon: "🧴", productCount: 3800 },',
  '      { id: "hair",     name: "Haircare", slug: "haircare", icon: "💇", productCount: 2900 },',
  '    ],',
  '  },',
  '  sports: {',
  '    info: {',
  '      name: "Sports & Outdoors",',
  '      description: "Gear for training, hiking, cycling, and everything outdoors.",',
  '      bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Sports",',
  '      productCount: 7600,',
  '      breadcrumbs: [',
  '        { label: "Home", href: "/" },',
  '        { label: "Sports", href: "/category/sports" },',
  '      ],',
  '    },',
  '    subcategories: [',
  '      { id: "fitness", name: "Fitness", slug: "fitness", icon: "🏋️", productCount: 2100 },',
  '      { id: "outdoor", name: "Outdoor", slug: "outdoor", icon: "⛺", productCount: 1800 },',
  '    ],',
  '  },',
  '};',
  '',
  'export function resolveCategory(slug: string): CategoryConfig | null {',
  '  return CATEGORIES[slug] ?? null;',
  '}',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 3. RECOMMENDATION SECTION (reuses ProductCarousel)
// ─────────────────────────────────────────────────────────────────────────────

create("features/category/components/RecommendationSection.tsx", [
  '"use client";',
  'import type { Product } from "@/domain/product.types";',
  'import { ProductCarousel } from "@/components/product/ProductCarousel";',
  '',
  'export interface RecommendationSectionProps {',
  '  title: string;',
  '  subtitle?: string;',
  '  products: readonly Product[];',
  '  onQuickView?: (p: Product) => void;',
  '  onAddToCart?: (p: Product) => void;',
  '  onToggleWishlist?: (p: Product) => void;',
  '  wishlistedIds?: Set<string>;',
  '}',
  '',
  'export function RecommendationSection({',
  '  title,',
  '  subtitle,',
  '  products,',
  '  onQuickView,',
  '  onAddToCart,',
  '  onToggleWishlist,',
  '  wishlistedIds,',
  '}: RecommendationSectionProps) {',
  '  if (products.length === 0) return null;',
  '',
  '  return (',
  '    <section',
  '      aria-label={title}',
  '      className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8"',
  '    >',
  '      <div className="mb-4">',
  '        {subtitle && (',
  '          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">',
  '            {subtitle}',
  '          </p>',
  '        )}',
  '        <h2 className="text-lg font-bold text-[var(--color-foreground)]">{title}</h2>',
  '      </div>',
  '      <ProductCarousel',
  '        products={products as Product[]}',
  '        ariaLabel={title}',
  '        onQuickView={onQuickView}',
  '        onAddToCart={onAddToCart}',
  '        onToggleWishlist={onToggleWishlist}',
  '        wishlistedIds={wishlistedIds}',
  '      />',
  '    </section>',
  '  );',
  '}',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 4. CATEGORY PAGE ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

create("features/category/page/CategoryPage.tsx", [
  '"use client";',
  'import { useEffect, useMemo } from "react";',
  'import { notFound } from "next/navigation";',
  'import { useAppDispatch, useAppSelector } from "@/store/hooks";',
  'import { setProducts } from "@/store/slices/products.slice";',
  'import { PRODUCTS } from "@/mocks/seed-products";',
  'import { resolveCategory } from "@/config/categories";',
  'import { Breadcrumbs } from "@/components/shared/Breadcrumbs";',
  'import { CategoryHero } from "../components/CategoryHero";',
  'import { SubcategoryScroller } from "../components/SubcategoryScroller";',
  'import { CategoryHighlights } from "../components/CategoryHighlights";',
  'import { CategoryListingLayout } from "../components/listing/CategoryListingLayout";',
  'import { RecommendationSection } from "../components/RecommendationSection";',
  '',
  'export function CategoryPage({ slug }: { slug: string }) {',
  '  const dispatch = useAppDispatch();',
  '  const config = resolveCategory(slug);',
  '',
  '  const scopedProducts = useMemo(',
  '    () => PRODUCTS.filter((p) => p.categorySlug === slug),',
  '    [slug],',
  '  );',
  '',
  '  useEffect(() => {',
  '    dispatch(setProducts(scopedProducts));',
  '  }, [dispatch, scopedProducts]);',
  '',
  '  const resultCount = useAppSelector((s) => s.products.items.length);',
  '',
  '  const recommended = useMemo(',
  '    () => PRODUCTS.filter((p) => p.categorySlug !== slug && p.badge === "bestseller").slice(0, 8),',
  '    [slug],',
  '  );',
  '  const trending = useMemo(',
  '    () => PRODUCTS.filter((p) => p.categorySlug === slug).slice(0, 8),',
  '    [slug],',
  '  );',
  '  const recentlyViewed = useMemo(() => PRODUCTS.slice(4, 12), []);',
  '',
  '  if (!config) return notFound();',
  '',
  '  return (',
  '    <>',
  '      <Breadcrumbs items={config.info.breadcrumbs} />',
  '      <CategoryHero category={config.info} resultCount={resultCount} />',
  '      <SubcategoryScroller subcategories={config.subcategories} />',
  '      <CategoryHighlights />',
  '      <CategoryListingLayout resultCount={resultCount} />',
  '      <RecommendationSection title="Recommended for You" subtitle="Picks" products={recommended} />',
  '      <RecommendationSection title={`Trending in ${config.info.name}`} subtitle="Popular now" products={trending} />',
  '      <RecommendationSection title="Recently Viewed" products={recentlyViewed} />',
  '    </>',
  '  );',
  '}',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 5. PATCH: domain/product.types.ts — add categorySlug
// ─────────────────────────────────────────────────────────────────────────────

patch("domain/product.types.ts", "product-category-slug", [
  '// Merge into the existing Product interface:',
  '//   readonly categorySlug: string;',
  '//',
  '// Merge into the existing Category type (if not already present):',
  '//   readonly subcategories?: readonly string[];',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 6. PATCH: store/root-reducer.ts — add products slice
// ─────────────────────────────────────────────────────────────────────────────

patch("store/root-reducer.ts", "products-slice", [
  'import { productsSlice } from "./slices/products.slice";',
  '',
  '// Add to the reducer map:',
  '//   products: productsSlice.reducer,',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 7. PATCH: mocks/seed-products.ts — add categorySlug to each product
// ─────────────────────────────────────────────────────────────────────────────

patch("mocks/seed-products.ts", "category-slug-mapping", [
  '// Add `categorySlug` to each product object in PRODUCT_SEED.',
  '// Mapping by product id:',
  '//   p1  aurora-x1-wireless-headphones  → categorySlug: "electronics"',
  '//   p2  nova-pro-15-laptop             → categorySlug: "laptops"',
  '//   p3  lumen-smartwatch-s4            → categorySlug: "electronics"',
  '//   p4  cloudstep-running-shoes        → categorySlug: "fashion"',
  '//   p5  terra-ceramic-cookware-set     → categorySlug: "home"',
  '//   p6  pulse-buds-pro                 → categorySlug: "electronics"',
  '//   p7  linen-relaxed-shirt            → categorySlug: "fashion"',
  '//   p8  everglow-skincare-set          → categorySlug: "beauty"',
  '//   p9  atlas-yoga-mat                 → categorySlug: "sports"',
  '//   p10 hearth-cast-iron-skillet       → categorySlug: "home"',
  '//   p11 orbit-mechanical-keyboard      → categorySlug: "electronics"',
  '//   p12 solstice-polarized-sunglasses  → categorySlug: "fashion"',
  '//',
  '// The existing `category` field can stay; `categorySlug` is the routing key.',
]);

// ─────────────────────────────────────────────────────────────────────────────
// 8. PATCH: app/(shop)/category/[slug]/page.tsx — pass slug to CategoryPage
// ─────────────────────────────────────────────────────────────────────────────

patch("app/(shop)/category/[slug]/page.tsx", "pass-slug", [
  '// Ensure the page passes `slug` to CategoryPage:',
  '//',
  '//   export default async function Page({ params }: Props) {',
  '//     const { slug } = await params;',
  '//     if (!slug) notFound();',
  '//     return <CategoryPage slug={slug} />;',
  '//   }',
]);

// ─────────────────────────────────────────────────────────────────────────────

console.log(
  `\n\x1b[32m\u2705 Final category scaffold\x1b[0m\n` +
  `   created: ${counters.created}\n` +
  `   patched: ${counters.patched}\n` +
  `   skipped: ${counters.skipped}\n`
);

console.log("\n\u26A0\uFE0F  Manual follow-ups (script writes instructions, not code):\n");
console.log("  1. src/domain/product.types.ts");
console.log("     Add `readonly categorySlug: string;` to the Product interface.");
console.log("     Add `readonly subcategories?: readonly string[];` to Category (if missing).\n");

console.log("  2. src/store/root-reducer.ts");
console.log("     Import productsSlice and add `products: productsSlice.reducer`.\n");

console.log("  3. src/mocks/seed-products.ts");
console.log("     Add `categorySlug` to each of the 12 products (mapping in the marker block).\n");

console.log("  4. src/app/(shop)/category/[slug]/page.tsx");
console.log("     Pass `slug` prop to <CategoryPage slug={slug} />.\n");

console.log("  5. Delete src/config/category-page-config.ts");
console.log("     Superseded by src/config/categories.ts. Update any imports.\n");

console.log("  6. src/components/shared/Breadcrumbs.tsx (if not yet created)");
console.log("     Run the previous components scaffold first if you haven't.\n");

console.log("After these six edits, /category/laptops, /category/electronics,");
console.log("/category/fashion, /category/home, /category/beauty, /category/sports");
console.log("all render distinct content from a single CategoryPage component.\n");



