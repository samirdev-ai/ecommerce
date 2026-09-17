export interface Price {
  currency: "USD";
  amount: number;
  formatted: string;
}

export interface Rating {
  value: number;
  count: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  color?: string;
  inStock: boolean;
}

export interface Seller {
  readonly id: string;
  readonly name: string;
  readonly rating: number;
  readonly isOfficial: boolean;
}

export interface ProductAttribute {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

export type ProductStatus =
  | "default"
  | "new"
  | "bestSeller"
  | "discounted"
  | "lowStock"
  | "outOfStock"
  | "sponsored";

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  imageAlt: string;
  price: Price;
  originalPrice?: Price;
  discountPercent?: number;
  rating: Rating;
  badge?: "new" | "sale" | "trending" | "bestseller" | "limited";
  stock: number;
  installment?: { months: number; perMonth: string };
  variants?: ProductVariant[];
  /** Top-level category used for route matching, e.g. "laptops", "electronics". */
  category: string;
  /** Optional subcategory, e.g. "gaming", "ultrabooks". */
  subcategoryId?: string;
  /** Optional seller reference. */
  seller?: Seller;
  /** Optional product attributes for filter matching. */
  attributes?: readonly ProductAttribute[];
  /** Optional status for category listing badges. */
  status?: ProductStatus;
  freeShipping?: boolean;
  isSameDayEligible?: boolean;
  isNextDayEligible?: boolean;
  deliveryEstimate?: string;
  installmentMonths?: number;
}

export type ProductCardVariant =
  | "default"
  | "compact"
  | "horizontal"
  | "featured"
  | "sale";

export interface ProductCardVariantConfig {
  imageAspect: string;
  showRating: boolean;
  showBrand: boolean;
  showInstallment: boolean;
  showQuickView: boolean;
  showStock: boolean;
  layout: "vertical" | "horizontal";
  size: "sm" | "md" | "lg";
}
