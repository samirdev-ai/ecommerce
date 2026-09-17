export interface FilterOption {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

export interface PriceBucket {
  readonly id: string;
  readonly label: string;
  readonly min: number;
  readonly max: number | null;
}

export interface AttributeFilterConfig {
  readonly key: string;
  readonly label: string;
  readonly options: readonly string[];
}

export interface FilterChip {
  readonly id: string;
  readonly label: string;
  readonly onRemove: () => void;
}

export interface FilterState {
  readonly subcategories: readonly string[];
  readonly brands: readonly string[];
  readonly priceBucketId: string | null;
  readonly customMin: number | null;
  readonly customMax: number | null;
  readonly minRating: number | null;
  readonly availability: readonly string[];
  readonly discount: readonly string[];
  readonly delivery: readonly string[];
  readonly sellers: readonly string[];
  readonly attributes: Readonly<Record<string, readonly string[]>>;
}
