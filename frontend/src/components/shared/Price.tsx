import type { Price as PriceModel } from "@/domain/product.types";
import { cn } from "@/lib/cn";

export interface PriceProps {
  price: PriceModel;
  originalPrice?: PriceModel;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "text-body font-semibold",
  md: "text-body-lg font-semibold",
  lg: "text-h3 font-bold",
} as const;

export function Price({ price, originalPrice, size = "md", className }: PriceProps) {
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("text-[var(--color-foreground)] tabular-nums", SIZES[size])}>
        {price.formatted}
      </span>
      {originalPrice && (
        <span className="text-small text-[var(--color-muted-foreground)] line-through tabular-nums">
          {originalPrice.formatted}
        </span>
      )}
    </div>
  );
}
