import type { Product } from "./product.types";

export interface SearchSuggestion {
  id: string;
  type: "product" | "category" | "query";
  label: string;
  href: string;
  image?: string;
  meta?: string;
}

export interface Recommendation {
  id: string;
  product: Product;
  reason: string;
}
