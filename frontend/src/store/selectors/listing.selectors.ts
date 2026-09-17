import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store/store";
import type { Product } from "@/domain/product.types";
import { filterProducts } from "@/features/category/utils/filter";
import { sortProducts } from "@/features/category/utils/sort";
import { selectSort } from "./sort.selectors";

const selectAllProducts = (_: RootState): readonly Product[] => [];

export const selectFilteredSortedProducts = createSelector(
  [(s: RootState) => s.filters, selectSort, selectAllProducts],
  (filters, sort, products) => sortProducts(filterProducts(products, filters), sort),
);
