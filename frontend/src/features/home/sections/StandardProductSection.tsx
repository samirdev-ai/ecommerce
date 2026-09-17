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
