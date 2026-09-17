import type { ProductCardVariant } from "@/domain/product.types";
import { PRODUCT_CARD_VARIANTS } from "@/config/product-card-variants";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/primitives/Skeleton";

export function ProductCardSkeleton({ variant = "default" }: { variant?: ProductCardVariant }) {
  const cfg = PRODUCT_CARD_VARIANTS[variant];
  return (
    <div
      aria-hidden
      className={cn(
        "flex overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        cfg.layout === "horizontal" ? "flex-row" : "flex-col",
      )}
    >
      <Skeleton
        className={cn(
          "rounded-none",
          cfg.layout === "horizontal" ? "w-32 sm:w-40 aspect-square" : cn("w-full", cfg.imageAspect),
        )}
      />
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-full" />
      </div>
    </div>
  );
}
