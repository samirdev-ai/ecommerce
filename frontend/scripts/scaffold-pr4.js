#!/usr/bin/env node
/**
 * PR 4 — Extract home page sections.
 * Moves §14 (14 sections) out of the single-file page into
 * features/home/sections/*.  Zero behavior change.
 *
 * Run: node scripts/scaffold-pr4.js
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
// HERO
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/HeroSection.tsx", `
"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import type { HeroBanner } from "@/domain/campaign.types";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Container } from "@/components/primitives/Container";
import { Skeleton } from "@/components/primitives/Skeleton";
import { IconButton } from "@/components/primitives/IconButton";
import { ErrorState } from "@/components/shared/ErrorState";

export interface HeroSectionProps {
  banners: HeroBanner[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function HeroSection({ banners, isLoading, isError, onRetry }: HeroSectionProps) {
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
                    aria-label={\`Go to slide \${i + 1}\`}
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// QUICK CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/QuickCategorySection.tsx", `
import type { Category } from "@/domain/category.types";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { Container } from "@/components/primitives/Container";
import { Skeleton } from "@/components/primitives/Skeleton";
import { ErrorState } from "@/components/shared/ErrorState";

export interface QuickCategorySectionProps {
  categories: Category[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function QuickCategorySection({
  categories,
  isLoading,
  isError,
  onRetry,
}: QuickCategorySectionProps) {
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
                  href={\`/c/\${c.slug}\`}
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// FLASH SALE (with its isolated countdown)
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/FlashSaleSection.tsx", `
"use client";
import { Clock, Zap } from "lucide-react";
import type { FlashSale, Product } from "@/domain/campaign.types";
import { useCountdown } from "@/lib/use-countdown";
import { Container } from "@/components/primitives/Container";
import { ProductCarousel } from "@/components/product/ProductCarousel";

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

export interface FlashSaleSectionProps {
  sale?: FlashSale;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
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
}: FlashSaleSectionProps) {
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALIZED
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/PersonalizedSection.tsx", `
"use client";
import { useInView } from "@/lib/use-in-view";
import { useGetRecommendationsQuery } from "@/store/api/ecommerce.api";
import type { Customer } from "@/domain/customer.types";
import type { Product } from "@/domain/product.types";
import { Container } from "@/components/primitives/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ProductCarousel } from "@/components/product/ProductCarousel";

export interface PersonalizedSectionProps {
  customer: Customer | null;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
}

export function PersonalizedSection({
  customer,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
}: PersonalizedSectionProps) {
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
          title={customer ? \`Recommended for you, \${customer.firstName}\` : "Top picks for you"}
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD PRODUCT SECTION (reusable generic)
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/StandardProductSection.tsx", `
"use client";
import type { Product, ProductCardVariant } from "@/domain/product.types";
import { Container } from "@/components/primitives/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ProductCarousel } from "@/components/product/ProductCarousel";

export interface StandardProductSectionProps {
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
}: StandardProductSectionProps) {
  if (isError && !isLoading) return null;
  if (!isLoading && products.length === 0) return null;

  return (
    <section aria-labelledby={\`\${id}-heading\`} className="pt-10">
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// BEST SELLERS
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/BestSellersSection.tsx", `
"use client";
import type { Product } from "@/domain/product.types";
import { Container } from "@/components/primitives/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCardSkeleton } from "@/components/product/ProductCardSkeleton";

export interface BestSellersSectionProps {
  products: Product[];
  isLoading?: boolean;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
}

export function BestSellersSection({
  products,
  isLoading,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
}: BestSellersSectionProps) {
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// FEATURED CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/FeaturedCategoriesSection.tsx", `
import type { Category } from "@/domain/category.types";
import { Container } from "@/components/primitives/Container";
import { Skeleton } from "@/components/primitives/Skeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { CategoryCard } from "@/components/product/CategoryCard";

export interface FeaturedCategoriesSectionProps {
  categories: Category[];
  isLoading?: boolean;
}

export function FeaturedCategoriesSection({
  categories,
  isLoading,
}: FeaturedCategoriesSectionProps) {
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// BRAND SHOWCASE
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/BrandShowcaseSection.tsx", `
import type { Brand } from "@/domain/campaign.types";
import { Container } from "@/components/primitives/Container";
import { Skeleton } from "@/components/primitives/Skeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { BrandCard } from "@/components/product/BrandCard";

export interface BrandShowcaseSectionProps {
  brands: Brand[];
  isLoading?: boolean;
}

export function BrandShowcaseSection({ brands, isLoading }: BrandShowcaseSectionProps) {
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// DEALS
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/DealsSection.tsx", `
import type { Deal } from "@/domain/campaign.types";
import { Container } from "@/components/primitives/Container";
import { Skeleton } from "@/components/primitives/Skeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { DealCard } from "@/components/product/DealCard";

export interface DealsSectionProps {
  deals: Deal[];
  isLoading?: boolean;
}

export function DealsSection({ deals, isLoading }: DealsSectionProps) {
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// PROMOTIONAL BANNERS
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/PromotionalBannerSection.tsx", `
import type { Promotion } from "@/domain/campaign.types";
import { Container } from "@/components/primitives/Container";
import { Skeleton } from "@/components/primitives/Skeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PromoBanner } from "@/components/product/PromoBanner";

export interface PromotionalBannerSectionProps {
  promotions: Promotion[];
  isLoading?: boolean;
}

export function PromotionalBannerSection({
  promotions,
  isLoading,
}: PromotionalBannerSectionProps) {
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// RECENTLY VIEWED
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/RecentlyViewedSection.tsx", `
"use client";
import { useInView } from "@/lib/use-in-view";
import { useGetRecentlyViewedQuery } from "@/store/api/ecommerce.api";
import type { Product } from "@/domain/product.types";
import { Container } from "@/components/primitives/Container";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ProductCarousel } from "@/components/product/ProductCarousel";

export interface RecentlyViewedSectionProps {
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
}

export function RecentlyViewedSection({
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
}: RecentlyViewedSectionProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const { data, isLoading } = useGetRecentlyViewedQuery(undefined, { skip: !inView });

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
`);

// ─────────────────────────────────────────────────────────────────────────────
// TRUST
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/TrustSection.tsx", `
import { TRUST_ITEMS } from "@/config/trust-items";
import { Container } from "@/components/primitives/Container";
import { TrustBar } from "@/components/shared/TrustBar";

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
`);

// ─────────────────────────────────────────────────────────────────────────────
// NEWSLETTER
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/NewsletterSection.tsx", `
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowRight, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { delay } from "@/mocks/delay";
import { Container } from "@/components/primitives/Container";
import { Button } from "@/components/primitives/Button";

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
              <label className="sr-only" htmlFor="newsletter-email">Email address</label>
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
              </a>.
            </p>
          </form>
        </div>
      </Container>
    </section>
  );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// APP PROMOTION
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/AppPromotionSection.tsx", `
import { Smartphone, Apple, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { Container } from "@/components/primitives/Container";

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
              <div className="grid size-full grid-cols-6 grid-rows-6 gap-0.5">
                {Array.from({ length: 36 }).map((_, i) => {
                  const on =
                    i < 3 || i === 5 || i === 6 || i === 11 || i === 12 ||
                    i === 17 || i === 18 || i === 23 || i === 24 || i === 29 ||
                    i === 30 || i > 32;
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// BARREL
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/sections/index.ts", `
export * from "./HeroSection";
export * from "./QuickCategorySection";
export * from "./FlashSaleSection";
export * from "./PersonalizedSection";
export * from "./StandardProductSection";
export * from "./BestSellersSection";
export * from "./FeaturedCategoriesSection";
export * from "./BrandShowcaseSection";
export * from "./DealsSection";
export * from "./PromotionalBannerSection";
export * from "./RecentlyViewedSection";
export * from "./TrustSection";
export * from "./NewsletterSection";
export * from "./AppPromotionSection";
`);

// ─────────────────────────────────────────────────────────────────────────────
// DONE
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n\x1b[32m\u2705 PR 4 scaffolded (${written} files)\x1b[0m`);
console.log("\nNext: edit src/features/home/page/EcommerceHomePage.tsx to:");
console.log("  1. Delete §14 (all 14 section components).");
console.log("  2. Import from @/features/home/sections.");
console.log("  3. Keep §13 (layout), §15 (overlays), §16 (page composition).");
console.log("\nAfter this PR merges, you can start lazy-loading individual sections");
console.log("with next/dynamic — one at a time, verifying bundle + LCP after each.");
console.log("\nRun: node scripts/scaffold-pr4.js\n");