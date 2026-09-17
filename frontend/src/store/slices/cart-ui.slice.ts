import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface CartUiState {
  isMiniCartOpen: boolean;
  lastAddedProductId: string | null;
}

const initialState: CartUiState = {
  isMiniCartOpen: false,
  lastAddedProductId: null,
};

export const cartUiSlice = createSlice({
  name: "cartUi",
  initialState,
  reducers: {
    openMiniCart(state) { state.isMiniCartOpen = true; },
    closeMiniCart(state) { state.isMiniCartOpen = false; },
    markLastAdded(state, action: PayloadAction<string | null>) {
      state.lastAddedProductId = action.payload;
    },
  },
});

export const { openMiniCart, closeMiniCart, markLastAdded } = cartUiSlice.actions;
