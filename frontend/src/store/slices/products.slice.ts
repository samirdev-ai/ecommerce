// store/slices/products.slice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Product } from "@/domain/product.types";

interface ProductsState {
  items: Product[];
}

const initialState: ProductsState = {
  items: [],
};

export const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setProducts(
      _state,
      action: PayloadAction<Product[]>,
    ): ProductsState {
      return {
        items: action.payload,
      };
    },
  },
});

export const { setProducts } = productsSlice.actions;

export default productsSlice.reducer;