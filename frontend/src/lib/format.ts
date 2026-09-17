import type { Price } from "@/domain/product.types";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD",
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

const COMPACT_CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD",
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return CURRENCY_FORMATTER.format(amount);
}

export function formatCompactPrice(amount: number): string {
  return COMPACT_CURRENCY_FORMATTER.format(amount);
}

export function makePrice(amount: number): Price {
  return { currency: "USD", amount, formatted: formatPrice(amount) };
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

// ── scaffold:auto:category-format-helpers:begin ──
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
// ── scaffold:auto:category-format-helpers:end ──
