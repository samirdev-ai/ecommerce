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
