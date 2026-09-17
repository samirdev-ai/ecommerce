import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface SearchUiState {
  recentQueries: string[];
}

const initialState: SearchUiState = {
  recentQueries: ["headphones", "laptop", "running shoes"],
};

export const searchUiSlice = createSlice({
  name: "searchUi",
  initialState,
  reducers: {
    addRecentQuery(state, action: PayloadAction<string>) {
      const q = action.payload.trim();
      if (!q) return;
      state.recentQueries = [q, ...state.recentQueries.filter((x) => x !== q)].slice(0, 6);
    },
    clearRecentQueries(state) { state.recentQueries = []; },
  },
});

export const { addRecentQuery, clearRecentQueries } = searchUiSlice.actions;
