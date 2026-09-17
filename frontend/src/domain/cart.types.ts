import type { Price } from "./product.types";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  unitPrice: Price;
  quantity: number;
  maxQuantity: number;
}

export interface CartSummary {
  items: CartItem[];
  itemCount: number;
  subtotal: Price;
  estimatedTotal: Price;
}

export interface WishlistItem {
  id: string;
  productId: string;
  addedAt: string;
}
