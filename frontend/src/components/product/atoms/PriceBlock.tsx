import type { Product } from "@/domain/product.types";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

function discountPercent(price: number, original?: number): number {
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}

function installment(price: number, months?: number): number | null {
  if (!months) return null;
  return Math.round((price / months) * 100) / 100;
}

export function PriceBlock({
  product,
  size = "md",
}: {
  product: Product;
  size?: "sm" | "md" | "lg";
}) {
  const priceAmount = product.price.amount;
  const originalAmount = product.originalPrice?.amount;
  const d = discountPercent(priceAmount, originalAmount);
  const inst = installment(priceAmount, product.installmentMonths);
  const sizeCls = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={cn(sizeCls, "font-bold", d > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]")}>
          {formatPrice(priceAmount)}
        </span>
        {product.originalPrice && d > 0 && (
          <>
            <span className="text-xs text-[var(--color-muted-foreground)] line-through">{formatPrice(originalAmount!)}</span>
            <span className="text-xs font-semibold text-[var(--color-danger)]">-{d}%</span>
          </>
        )}
      </div>
      {inst && (
        <p className="text-[11px] text-[var(--color-muted-foreground)]">
          or {formatPrice(inst)}/mo for {product.installmentMonths} mo
        </p>
      )}
    </div>
  );
}
