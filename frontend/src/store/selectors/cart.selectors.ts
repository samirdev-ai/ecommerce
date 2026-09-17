import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store/store";

export const selectCartItems = (s: RootState) => s.cart.items;
export const selectCartCount = createSelector(selectCartItems, (items) => items.reduce((n, i) => n + i.quantity, 0));
export const selectIsInCart = (id: string) => (s: RootState) => s.cart.items.some((i) => i.productId === id);
