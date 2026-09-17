import type { Product } from "@/domain/product.types";
import type { FilterState } from "@/domain/filter.types";
import { PRICE_BUCKETS } from "@/config/price-buckets";

export function getDiscountPercentage(price: number, originalPrice?: number): number {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

function matchesPrice(p: Product, f: FilterState): boolean {
  if (f.customMin !== null && p.price < f.customMin) return false;
  if (f.customMax !== null && p.price > f.customMax) return false;
  if (f.customMin === null && f.customMax === null && f.priceBucketId) {
    const b = PRICE_BUCKETS.find((x) => x.id === f.priceBucketId);
    if (b) { if (p.price < b.min) return false; if (b.max !== null && p.price > b.max) return false; }
  }
  return true;
}

function matchesAvailability(p: Product, ids: readonly string[]): boolean {
  if (ids.length === 0) return true;
  return ids.some((id) => {
    if (id === "inStock")        return p.status !== "outOfStock";
    if (id === "availableToday") return p.isSameDayEligible;
    if (id === "fastDelivery")   return p.isSameDayEligible || p.isNextDayEligible;
    return false;
  });
}

function matchesDelivery(p: Product, ids: readonly string[]): boolean {
  if (ids.length === 0) return true;
  return ids.some((id) => {
    if (id === "free")    return p.isFreeDelivery;
    if (id === "sameDay") return p.isSameDayEligible;
    if (id === "nextDay") return p.isNextDayEligible;
    return false;
  });
}

function matchesDiscount(p: Product, t: readonly string[]): boolean {
  if (t.length === 0) return true;
  const pct = getDiscountPercentage(p.price, p.originalPrice);
  return t.some((x) => pct >= Number(x));
}

function matchesAttributes(p: Product, sel: Readonly<Record<string, readonly string[]>>): boolean {
  return Object.entries(sel).every(([key, values]) => {
    if (values.length === 0) return true;
    const a = p.attributes?.find((x) => x.key === key);
    return a ? values.includes(a.value) : false;
  });
}

export function filterProducts(products: readonly Product[], f: FilterState): Product[] {
  return products.filter((p) => {
    if (f.subcategories.length > 0 && !f.subcategories.includes(p.subcategoryId ?? "")) return false;
    if (f.brands.length > 0 && !f.brands.includes(p.brand)) return false;
    if (f.minRating !== null && p.rating.value < f.minRating) return false;
    if (f.sellers.length > 0 && !f.sellers.includes(p.seller?.id ?? "")) return false;
    if (!matchesPrice(p, f)) return false;
    if (!matchesAvailability(p, f.availability)) return false;
    if (!matchesDelivery(p, f.delivery)) return false;
    if (!matchesDiscount(p, f.discount)) return false;
    if (!matchesAttributes(p, f.attributes)) return false;
    return true;
  });
}
