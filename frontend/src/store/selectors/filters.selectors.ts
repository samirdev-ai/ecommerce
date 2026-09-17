import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store/store";

export const selectFilters = (s: RootState) => s.filters;

export const selectActiveFilterCount = createSelector(selectFilters, (f) =>
  f.subcategories.length + f.brands.length + f.availability.length +
  f.discount.length + f.sellers.length + f.delivery.length +
  (f.minRating !== null ? 1 : 0) +
  (f.priceBucketId !== null || f.customMin !== null || f.customMax !== null ? 1 : 0) +
  Object.values(f.attributes).reduce((n, v) => n + v.length, 0),
);
