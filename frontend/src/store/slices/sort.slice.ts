import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export enum SortOption {
  Relevance = "relevance",
  Popularity = "popularity",
  BestSelling = "bestSelling",
  Newest = "newest",
  PriceLowToHigh = "priceLowToHigh",
  PriceHighToLow = "priceHighToLow",
  CustomerRating = "customerRating",
  BiggestDiscount = "biggestDiscount",
}

export const SORT_LABELS: Record<SortOption, string> = {
  [SortOption.Relevance]: "Relevance",
  [SortOption.Popularity]: "Popularity",
  [SortOption.BestSelling]: "Best Selling",
  [SortOption.Newest]: "Newest",
  [SortOption.PriceLowToHigh]: "Price: Low to High",
  [SortOption.PriceHighToLow]: "Price: High to Low",
  [SortOption.CustomerRating]: "Customer Rating",
  [SortOption.BiggestDiscount]: "Biggest Discount",
};

export const sortSlice = createSlice({
  name: "sort",
  initialState: { value: SortOption.Relevance },
  reducers: { setSort(s, a: PayloadAction<SortOption>) { s.value = a.payload; } },
});
