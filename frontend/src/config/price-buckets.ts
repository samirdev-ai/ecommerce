import type { PriceBucket } from "@/domain/filter.types";

export const PRICE_BUCKETS: readonly PriceBucket[] = [
  { id: "under-500",   label: "Under $500",     min: 0,    max: 500 },
  { id: "500-1000",    label: "$500 – $1,000",  min: 500,  max: 1000 },
  { id: "1000-1500",   label: "$1,000 – $1,500", min: 1000, max: 1500 },
  { id: "1500-2000",   label: "$1,500 – $2,000", min: 1500, max: 2000 },
  { id: "2000-plus",   label: "$2,000+",         min: 2000, max: null },
];
