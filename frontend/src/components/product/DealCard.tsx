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
