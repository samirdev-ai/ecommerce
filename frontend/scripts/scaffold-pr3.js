#!/usr/bin/env node
/**
 * PR 3 — Extract product components.
 * Moves §11 (ProductCard, ProductCardSkeleton, ProductCarousel,
 * CategoryCard, BrandCard, PromoBanner, DealCard) out of the main file.
 * Zero behavior change.
 *
 * Run: node scripts/scaffold-pr3.js
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
// PRODUCT CARD + SKELETON
// ─────────────────────────────────────────────────────────────────────────────

write("components/product/ProductCard.tsx", `
"use client";
import { useState } from "react";
import {
  Heart, Eye, ShoppingCart, Package, Sparkles, TrendingUp, Check,
} from "lucide-react";
import type { Product, ProductCardVariant } from "@/domain/product.types";
import { PRODUCT_CARD_VARIANTS } from "@/config/product-card-variants";
import { cn } from "@/lib/cn";
import { Button } from "@/components/primitives/Button";
import { IconButton } from "@/components/primitives/IconButton";
import { Badge } from "@/components/primitives/Badge";
import { Price } from "@/components/shared/Price";
import { RatingStars } from "@/components/shared/RatingStars";

export interface ProductCardProps {
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
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-[var(--color-muted)]",
          isHorizontal ? "w-32 sm:w-40" : "w-full",
          !isHorizontal && cfg.imageAspect,
        )}
      >
        <a
          href={\`/p/\${product.slug}\`}
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

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {product.badge === "sale" && product.discountPercent && (
            <Badge tone="sale">-{product.discountPercent}%</Badge>
          )}
          {product.badge === "new" && (
            <Badge tone="new"><Sparkles className="size-3" /> New</Badge>
          )}
          {product.badge === "trending" && (
            <Badge tone="info"><TrendingUp className="size-3" /> Trending</Badge>
          )}
          {product.badge === "bestseller" && <Badge tone="warning">Bestseller</Badge>}
        </div>

        {onToggleWishlist && (
          <IconButton
            label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            size="sm"
            onClick={(e) => { e.preventDefault(); onToggleWishlist(product); }}
            className={cn(
              "absolute right-2 top-2 bg-[var(--color-surface)]/85 backdrop-blur-sm",
              "shadow-[var(--shadow-xs)] hover:bg-[var(--color-surface)]",
              isWishlisted && "text-[var(--color-danger)]",
            )}
          >
            <Heart className={cn("size-4", isWishlisted && "fill-current")} />
          </IconButton>
        )}

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

        <h3 className={cn("line-clamp-2 font-medium leading-snug", cfg.size === "sm" ? "text-small" : "text-body")}>
          <a
            href={\`/p/\${product.slug}\`}
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
                <span className="font-medium text-[var(--color-warning)]">Only {product.stock} left</span>
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
`);

write("components/product/ProductCardSkeleton.tsx", `
import type { ProductCardVariant } from "@/domain/product.types";
import { PRODUCT_CARD_VARIANTS } from "@/config/product-card-variants";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/primitives/Skeleton";

export function ProductCardSkeleton({ variant = "default" }: { variant?: ProductCardVariant }) {
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CAROUSEL
// ─────────────────────────────────────────────────────────────────────────────

write("components/product/ProductCarousel.tsx", `
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product, ProductCardVariant } from "@/domain/product.types";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/primitives/IconButton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductCard } from "./ProductCard";
import { ProductCardSkeleton } from "./ProductCardSkeleton";

export interface ProductCarouselProps {
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
      <div className="pointer-events-none absolute -top-12 right-0 hidden items-center gap-1 md:flex">
        <IconButton
          label={\`Scroll \${ariaLabel} left\`}
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
          label={\`Scroll \${ariaLabel} right\`}
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
`);

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN CARDS
// ─────────────────────────────────────────────────────────────────────────────

write("components/product/CategoryCard.tsx", `
import type { Category } from "@/domain/category.types";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <a
      href={\`/c/\${category.slug}\`}
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
`);

write("components/product/BrandCard.tsx", `
import type { Brand } from "@/domain/campaign.types";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";

export function BrandCard({ brand }: { brand: Brand }) {
  return (
    <a
      href={\`/b/\${brand.slug}\`}
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
`);

write("components/product/PromoBanner.tsx", `
import { ArrowRight } from "lucide-react";
import type { Promotion } from "@/domain/campaign.types";
import { cn } from "@/lib/cn";

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
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <h3 className="text-h3 font-semibold text-white text-balance">{promo.title}</h3>
        <p className="mt-1 max-w-md text-body text-white/80 text-pretty">{promo.description}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-body font-medium text-white underline-offset-4 group-hover:underline">
          {promo.ctaLabel} <ArrowRight className="size-4" />
        </span>
      </div>
    </a>
  );
}
`);

write("components/product/DealCard.tsx", `
import { ArrowRight } from "lucide-react";
import type { Deal } from "@/domain/campaign.types";
import { Badge } from "@/components/primitives/Badge";
import { CountdownInline } from "@/components/shared/CountdownInline";

export function DealCard({ deal }: { deal: Deal }) {
  return (
    <a
      href={deal.ctaHref}
      className="group flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-[border-color,box-shadow] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)]"
    >
      <Badge tone="sale">{deal.discountLabel}</Badge>
      <h3 className="text-body-lg font-semibold">{deal.title}</h3>
      <p className="text-small text-[var(--color-muted-foreground)] text-pretty">{deal.description}</p>
      <CountdownInline target={deal.expiresAt} />
      <span className="mt-auto pt-2 inline-flex items-center gap-1.5 text-body font-medium text-[var(--color-primary)]">
        {deal.ctaLabel} <ArrowRight className="size-4" />
      </span>
    </a>
  );
}
`);

write("components/product/index.ts", `
export * from "./ProductCard";
export * from "./ProductCardSkeleton";
export * from "./ProductCarousel";
export * from "./CategoryCard";
export * from "./BrandCard";
export * from "./PromoBanner";
export * from "./DealCard";
`);

// ─────────────────────────────────────────────────────────────────────────────
// DONE
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n\x1b[32m\u2705 PR 3 scaffolded (${written} files)\x1b[0m`);
console.log("\nNext: edit src/features/home/page/EcommerceHomePage.tsx to:");
console.log("  1. Delete §11 (product components: ProductCard, ProductCardSkeleton,");
console.log("     ProductCarousel, CategoryCard, BrandCard, PromoBanner, DealCard).");
console.log("  2. Import from @/components/product.");
console.log("  3. Keep §12 (sections), §13 (layout), §14 (overlays), §15–16.");
console.log("\nRun: node scripts/scaffold-pr3.js\n");