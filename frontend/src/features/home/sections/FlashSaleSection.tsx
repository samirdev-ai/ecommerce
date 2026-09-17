"use client";
import { Clock, Zap } from "lucide-react";
import type { FlashSale } from "@/domain/campaign.types";
import type { Product } from "@/domain";
import { useCountdown } from "@/lib/use-countdown";
import { Container } from "@/components/primitives/Container";
import { ProductCarousel } from "@/components/product/ProductCarousel";

/** Isolated countdown display for flash sale header. */
function FlashCountdown({ target }: { target: string }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(target);
  if (expired) {
    return <span className="text-body font-medium text-[var(--color-danger)]">Sale ended</span>;
  }
  const cells: { label: string; value: number }[] = [
    ...(days > 0 ? [{ label: "days", value: days }] : []),
    { label: "hrs", value: hours },
    { label: "min", value: minutes },
    { label: "sec", value: seconds },
  ];
  return (
    <div className="flex items-center gap-1.5" aria-label="Time remaining">
      <Clock className="size-4 text-[var(--color-sale)]" aria-hidden />
      {cells.map((c) => (
        <span
          key={c.label}
          className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-2 py-1 text-center tabular-nums shadow-[var(--shadow-xs)]"
        >
          <span className="block text-body font-bold leading-none">
            {String(c.value).padStart(2, "0")}
          </span>
          <span className="block text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {c.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export interface FlashSaleSectionProps {
  sale?: FlashSale;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
}

export function FlashSaleSection({
  sale,
  isLoading,
  isError,
  onRetry,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
}: FlashSaleSectionProps) {
  if (isError) return null;

  return (
    <section aria-labelledby="flash-sale-heading" className="pt-10">
      <Container>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-danger-subtle)] to-transparent p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-[var(--color-sale)] text-white">
                <Zap className="size-5" />
              </span>
              <div>
                <h2 id="flash-sale-heading" className="text-h3 font-semibold">
                  {sale?.title ?? "Flash Sale"}
                </h2>
                <p className="text-small text-[var(--color-muted-foreground)]">
                  Limited quantities · while supplies last
                </p>
              </div>
            </div>
            {sale && <FlashCountdown target={sale.endsAt} />}
          </div>

          <ProductCarousel
            products={sale?.products ?? []}
            variant="sale"
            ariaLabel="Flash sale products"
            isLoading={isLoading}
            onRetry={onRetry}
            onQuickView={onQuickView}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            wishlistedIds={wishlistedIds}
          />
        </div>
      </Container>
    </section>
  );
}
