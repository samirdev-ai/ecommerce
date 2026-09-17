import { Star } from "lucide-react";
import type { Rating } from "@/domain/product.types";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";

export interface RatingStarsProps {
  rating: Rating;
  size?: number;
  className?: string;
}

export function RatingStars({ rating, size = 14, className }: RatingStarsProps) {
  const full = Math.floor(rating.value);
  const hasHalf = rating.value - full >= 0.5;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < full || (i === full && hasHalf);
          return (
            <Star
              key={i}
              width={size}
              height={size}
              className={cn(
                filled
                  ? "fill-[var(--color-rating)] text-[var(--color-rating)]"
                  : "text-[var(--color-border-strong)]",
              )}
            />
          );
        })}
      </div>
      <span className="text-small text-[var(--color-muted-foreground)] tabular-nums">
        {rating.value.toFixed(1)}
      </span>
      <span className="text-small text-[var(--color-muted-foreground)]">
        ({formatCount(rating.count)})
      </span>
      <span className="sr-only">
        Rated {rating.value.toFixed(1)} out of 5 from {rating.count} reviews
      </span>
    </div>
  );
}
