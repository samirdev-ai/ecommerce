// features/category/components/RecommendationSection.tsx
"use client";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import type { Product } from "@/domain/product.types";

export function RecommendationSection({
  title,
  subtitle,
  products,
}: {
  title: string;
  subtitle?: string;
  products: readonly Product[];
}) {
  if (products.length === 0) return null;
  return (
    <section
      aria-label={title}
      className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8"
    >
      <div className="mb-4">
        {subtitle && (
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            {subtitle}
          </p>
        )}
        <h2 className="text-lg font-bold text-[var(--color-foreground)]">{title}</h2>
      </div>
      <ProductCarousel
        products={products as Product[]}
        ariaLabel={title}
      />
    </section>
  );
}