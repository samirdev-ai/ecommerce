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
