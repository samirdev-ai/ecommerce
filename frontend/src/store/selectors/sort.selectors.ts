import type { RootState } from "@/store/store";

export const selectSort = (s: RootState) => s.sort.value;
export const selectViewMode = (s: RootState) => s.viewMode.value;
