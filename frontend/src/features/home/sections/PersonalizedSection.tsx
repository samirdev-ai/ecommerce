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
          title={customer ? `Recommended for you, ${customer.firstName}` : "Top picks for you"}
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
