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
