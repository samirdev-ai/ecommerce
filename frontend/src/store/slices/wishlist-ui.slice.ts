import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface WishlistUiState {
  optimisticIds: string[];
}

const initialState: WishlistUiState = { optimisticIds: [] };

export const wishlistUiSlice = createSlice({
  name: "wishlistUi",
  initialState,
  reducers: {
    toggleOptimistic(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.optimisticIds.indexOf(id);
      if (idx >= 0) state.optimisticIds.splice(idx, 1);
      else state.optimisticIds.push(id);
    },
  },
});

export const { toggleOptimistic } = wishlistUiSlice.actions;
