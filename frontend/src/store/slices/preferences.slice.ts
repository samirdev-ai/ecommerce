import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface PreferencesState {
  currency: "USD";
  locale: "en-US";
  location: string;
}

const initialState: PreferencesState = {
  currency: "USD",
  locale: "en-US",
  location: "New York, NY",
};

export const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    setLocation(state, action: PayloadAction<string>) {
      state.location = action.payload;
    },
  },
});

export const { setLocation } = preferencesSlice.actions;
