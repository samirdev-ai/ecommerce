"use client";
import { X } from "lucide-react";
import { PRICE_BUCKETS } from "@/config/price-buckets";
import { AVAILABILITY_OPTIONS, DELIVERY_OPTIONS } from "@/config/filter-options";
import { SUBCATEGORIES, SELLERS } from "@/config/category-page-config";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { filtersSlice } from "@/store/slices/filters.slice";
import type { FilterChip } from "@/domain/filter.types";

export function ActiveFilterChips() {
  const dispatch = useAppDispatch();
  const f = useAppSelector((s) => s.filters);
  const chips: FilterChip[] = [];

  f.subcategories.forEach((id) => {
    const sc = SUBCATEGORIES.find((x) => x.id === id);
    if (sc) chips.push({ id: `sc-${id}`, label: sc.name, onRemove: () => dispatch(filtersSlice.actions.toggleSubcategory(id)) });
  });
  f.brands.forEach((id) => chips.push({ id: `brand-${id}`, label: id, onRemove: () => dispatch(filtersSlice.actions.toggleBrand(id)) }));
  f.availability.forEach((id) => {
    const o = AVAILABILITY_OPTIONS.find((x) => x.id === id);
    if (o) chips.push({ id: `avail-${id}`, label: o.label, onRemove: () => dispatch(filtersSlice.actions.toggleAvailability(id)) });
  });
  f.delivery.forEach((id) => {
    const o = DELIVERY_OPTIONS.find((x) => x.id === id);
    if (o) chips.push({ id: `deliv-${id}`, label: o.label, onRemove: () => dispatch(filtersSlice.actions.toggleDelivery(id)) });
  });
  f.discount.forEach((id) => chips.push({ id: `disc-${id}`, label: `${id}%+ off`, onRemove: () => dispatch(filtersSlice.actions.toggleDiscount(id)) }));
  f.sellers.forEach((id) => {
    const seller = SELLERS.find((x) => x.id === id);
    if (seller) chips.push({ id: `seller-${id}`, label: seller.name, onRemove: () => dispatch(filtersSlice.actions.toggleSeller(id)) });
  });
  if (f.minRating !== null) chips.push({ id: "rating", label: `${f.minRating}★ & above`, onRemove: () => dispatch(filtersSlice.actions.setMinRating(null)) });
  if (f.priceBucketId) {
    const b = PRICE_BUCKETS.find((x) => x.id === f.priceBucketId);
    if (b) chips.push({ id: "price", label: b.label, onRemove: () => dispatch(filtersSlice.actions.setPriceBucket(null)) });
  } else if (f.customMin !== null || f.customMax !== null) {
    chips.push({ id: "price-custom", label: `${f.customMin ?? 0} – ${f.customMax ?? "∞"}`, onRemove: () => dispatch(filtersSlice.actions.setCustomPriceRange({ min: null, max: null })) });
  }
  Object.entries(f.attributes).forEach(([key, values]) => {
    values.forEach((v) => chips.push({ id: `attr-${key}-${v}`, label: v, onRemove: () => dispatch(filtersSlice.actions.toggleAttribute({ key, value: v })) }));
  });

  if (chips.length === 0) return null;

  return (
    <div role="list" aria-label="Active filters" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span key={chip.id} role="listitem" className="flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] py-1 pl-3 pr-1.5 text-xs font-medium text-[var(--color-accent-foreground)]">
          {chip.label}
          <button type="button" onClick={chip.onRemove} aria-label={`Remove filter: ${chip.label}`} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-none">
            <X size={10} aria-hidden="true" />
          </button>
        </span>
      ))}
      <button type="button" onClick={() => dispatch(filtersSlice.actions.clearFilters())} className="text-xs font-semibold text-[var(--color-muted-foreground)] underline hover:text-[var(--color-foreground)]">
        Clear all
      </button>
    </div>
  );
}
