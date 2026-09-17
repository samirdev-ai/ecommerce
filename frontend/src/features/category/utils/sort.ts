import type { Product } from "@/domain/product.types";
import { SortOption } from "@/store/slices/sort.slice";
import { getDiscountPercentage } from "./filter";

export function sortProducts(products: readonly Product[], sort: SortOption): Product[] {
  const copy = [...products];
  switch (sort) {
    case SortOption.PriceLowToHigh:  return copy.sort((a, b) => a.price - b.price);
    case SortOption.PriceHighToLow:  return copy.sort((a, b) => b.price - a.price);
    case SortOption.CustomerRating:  return copy.sort((a, b) => b.rating.value - a.rating.value);
    case SortOption.BiggestDiscount: return copy.sort((a, b) =>
      getDiscountPercentage(b.price, b.originalPrice?.amount) - getDiscountPercentage(a.price, a.originalPrice?.amount));
    case SortOption.Newest:          return copy.sort((a, b) => (b.badge === "new" ? 1 : 0) - (a.badge === "new" ? 1 : 0));
    case SortOption.BestSelling:
    case SortOption.Popularity:      return copy.sort((a, b) => b.rating.count - a.rating.count);
    case SortOption.Relevance:
    default:                         return copy;
  }
}
