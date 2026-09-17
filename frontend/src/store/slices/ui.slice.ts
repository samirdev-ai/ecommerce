import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface UiState {
  isMobileNavOpen: boolean;
  isSearchFocused: boolean;
  activeMegaMenu: string | null;
  theme: "light" | "dark";
}

const initialState: UiState = {
  isMobileNavOpen: false,
  isSearchFocused: false,
  activeMegaMenu: null,
  theme: "light",
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleMobileNav(state, action: PayloadAction<boolean | undefined>) {
      state.isMobileNavOpen = action.payload ?? !state.isMobileNavOpen;
    },
    setSearchFocused(state, action: PayloadAction<boolean>) {
      state.isSearchFocused = action.payload;
    },
    setActiveMegaMenu(state, action: PayloadAction<string | null>) {
      state.activeMegaMenu = action.payload;
    },
    setTheme(state, action: PayloadAction<"light" | "dark">) {
      state.theme = action.payload;
    },
  },
});

export const { toggleMobileNav, setSearchFocused, setActiveMegaMenu, setTheme } = uiSlice.actions;

// ── scaffold:auto:filter-drawer:begin ──
// Add these to the UIState interface and initialState:
//   filterDrawerOpen: boolean;
// Then add to reducers:
//   openFilterDrawer(s) { s.filterDrawerOpen = true; },
//   closeFilterDrawer(s) { s.filterDrawerOpen = false; },
// ── scaffold:auto:filter-drawer:end ──
