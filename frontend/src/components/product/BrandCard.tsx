import type { Brand } from "@/domain/campaign.types";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import Link from "next/link";

export function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Link
      href={`/brand/${brand.slug}`}
      className={cn(
        "flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center",
        "transition-[border-color,box-shadow] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)]",
      )}
    >
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-full bg-[var(--color-primary-subtle)] text-h3 font-bold text-[var(--color-primary)]"
      >
        {brand.logo}
      </span>
      <div>
        <p className="text-body font-semibold">{brand.name}</p>
        <p className="text-caption text-[var(--color-muted-foreground)]">
          {brand.category} · {formatCount(brand.productCount)} items
        </p>
      </div>
    </Link>
  );
}
