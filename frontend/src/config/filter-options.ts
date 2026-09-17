import type { FilterOption } from "@/domain/filter.types";

export const RATING_OPTIONS: readonly number[] = [4, 3, 2];
export const DISCOUNT_OPTIONS: readonly number[] = [10, 20, 30, 50];

export const AVAILABILITY_OPTIONS: readonly FilterOption[] = [
  { id: "inStock",         label: "In Stock",         count: 0 },
  { id: "availableToday",  label: "Available Today",  count: 0 },
  { id: "fastDelivery",    label: "Fast Delivery",    count: 0 },
];

export const DELIVERY_OPTIONS: readonly FilterOption[] = [
  { id: "free",    label: "Free Delivery", count: 0 },
  { id: "sameDay", label: "Same Day",      count: 0 },
  { id: "nextDay", label: "Next Day",      count: 0 },
];
