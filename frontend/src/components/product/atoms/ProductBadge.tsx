"use client";
import type { ProductStatus } from "@/domain/product.types";
import { cn } from "@/lib/cn";

type Tone = "primary" | "success" | "destructive" | "warning" | "info" | "muted";

const STATUS_CONFIG: Partial<Record<ProductStatus, { label: string; tone: Tone }>> = {
  new:         { label: "New",         tone: "info" },
  bestSeller:  { label: "Best Seller", tone: "primary" },
  discounted:  { label: "Sale",        tone: "destructive" },
  lowStock:    { label: "Low Stock",   tone: "warning" },
  sponsored:   { label: "Sponsored",   tone: "info" },
};

const TONES: Record<Tone, string> = {
  primary:     "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
  success:     "bg-[var(--color-success)] text-white",
  destructive: "bg-[var(--color-danger)] text-white",
  warning:     "bg-[var(--color-warning)] text-white",
  info:        "bg-[var(--color-info)] text-white",
  muted:       "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
};

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none", TONES[tone])}>
      {label}
    </span>
  );
}

export function ProductBadge({ status }: { status: ProductStatus }) {
  if (status === "outOfStock") return <Badge label="Out of Stock" tone="muted" />;
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return <Badge label={cfg.label} tone={cfg.tone} />;
}
