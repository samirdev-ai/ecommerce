import type { Product } from "./product.types";
import type { Category } from "./category.types";

export interface HeroBanner {
  id: string;
  headline: string;
  subheadline: string;
  eyebrow?: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
  tone: "primary" | "dark" | "warm" | "cool";
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
  variant: "large" | "medium" | "compact";
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  discountLabel: string;
  expiresAt: string;
  ctaLabel: string;
  ctaHref: string;
  productCount: number;
}

export interface FlashSale {
  id: string;
  title: string;
  endsAt: string;
  products: Product[];
}

export interface Brand {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly logo: string;
  readonly category: string;
  readonly productCount: number;
}

export interface HomePagePayload {
  heroBanners: HeroBanner[];
  quickCategories: Category[];
  flashSale: FlashSale;
  trending: Product[];
  bestSellers: Product[];
  newArrivals: Product[];
  topRated: Product[];
  featuredCategories: Category[];
  featuredBrands: Brand[];
  deals: Deal[];
  promotions: Promotion[];
}

// Re-export to avoid a separate file for Category
