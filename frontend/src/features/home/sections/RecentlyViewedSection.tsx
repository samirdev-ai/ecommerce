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
