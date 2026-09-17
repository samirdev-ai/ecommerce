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
