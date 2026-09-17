import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { FilterState } from "@/domain/filter.types";

const INITIAL: FilterState = {
  subcategories: [], brands: [], priceBucketId: null,
  customMin: null, customMax: null, minRating: null,
  availability: [], discount: [], delivery: [], sellers: [], attributes: {},
};

function toggleInArray(arr: readonly string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export const filtersSlice = createSlice({
  name: "filters",
  initialState: INITIAL,
  reducers: {
    toggleSubcategory(s, a: PayloadAction<string>) { s.subcategories = toggleInArray(s.subcategories, a.payload); },
    toggleBrand(s, a: PayloadAction<string>)       { s.brands = toggleInArray(s.brands, a.payload); },
    toggleAvailability(s, a: PayloadAction<string>){ s.availability = toggleInArray(s.availability, a.payload); },
    toggleDiscount(s, a: PayloadAction<string>)    { s.discount = toggleInArray(s.discount, a.payload); },
    toggleDelivery(s, a: PayloadAction<string>)    { s.delivery = toggleInArray(s.delivery, a.payload); },
    toggleSeller(s, a: PayloadAction<string>)      { s.sellers = toggleInArray(s.sellers, a.payload); },
    toggleAttribute(s, a: PayloadAction<{ key: string; value: string }>) {
      const cur = s.attributes[a.payload.key] ?? [];
      s.attributes[a.payload.key] = toggleInArray(cur, a.payload.value);
    },
    setPriceBucket(s, a: PayloadAction<string | null>) {
      s.priceBucketId = a.payload; s.customMin = null; s.customMax = null;
    },
    setCustomPriceRange(s, a: PayloadAction<{ min: number | null; max: number | null }>) {
      s.customMin = a.payload.min; s.customMax = a.payload.max; s.priceBucketId = null;
    },
    setMinRating(s, a: PayloadAction<number | null>) { s.minRating = a.payload; },
    clearFilters() { return INITIAL; },
  },
});
