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
