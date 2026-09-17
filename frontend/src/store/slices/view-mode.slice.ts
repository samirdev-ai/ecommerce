import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export enum ViewMode { Grid = "grid", List = "list" }

export const viewModeSlice = createSlice({
  name: "viewMode",
  initialState: { value: ViewMode.Grid },
  reducers: { setViewMode(s, a: PayloadAction<ViewMode>) { s.value = a.payload; } },
});
