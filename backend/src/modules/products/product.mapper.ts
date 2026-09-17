import type { Product as PrismaProduct, Brand, Category } from "@prisma/client";

export interface ProductResponse {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  imageAlt: string;
  price: { amount: number; currency: string; formatted: string };
  originalPrice?: { amount: number; currency: string; formatted: string };
  discountPercent?: number;
  rating: { value: number; count: number };
  badge?: string;
  stock: number;
  freeShipping: boolean;
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}

export function toProductResponse(
  p: PrismaProduct & { brand: Brand | null; category: Category },
): ProductResponse {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand?.name ?? "",
    category: p.category.slug,
    image: p.image,
    imageAlt: p.imageAlt,
    price: { amount: p.priceAmount, currency: p.priceCurrency, formatted: fmt(p.priceAmount, p.priceCurrency) },
    originalPrice: p.originalPrice
      ? { amount: p.originalPrice, currency: p.priceCurrency, formatted: fmt(p.originalPrice, p.priceCurrency) }
      : undefined,
    discountPercent: p.discountPct ?? undefined,
    rating: { value: p.rating, count: p.reviewCount },
    badge: p.badge ?? undefined,
    stock: p.stock,
    freeShipping: p.freeShipping,
  };
}
