import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface CartItem { productId: string; quantity: number; }

export const cartSlice = createSlice({
  name: "cart",
  initialState: { items: [] as CartItem[] },
  reducers: {
    addToCart(s, a: PayloadAction<string>) {
      const ex = s.items.find((i) => i.productId === a.payload);
      if (ex) ex.quantity += 1;
      else s.items.push({ productId: a.payload, quantity: 1 });
    },
    removeFromCart(s, a: PayloadAction<string>) {
      s.items = s.items.filter((i) => i.productId !== a.payload);
    },
  },
});
