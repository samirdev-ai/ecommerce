"use client";
import { AVAILABILITY_OPTIONS, DELIVERY_OPTIONS, DISCOUNT_OPTIONS } from "@/config/filter-options";
import { ATTRIBUTE_CONFIG } from "@/config/attribute-config";
import { SUBCATEGORIES, BRANDS, SELLERS } from "@/config/category-page-config";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { filtersSlice } from "@/store/slices/filters.slice";
import { CheckboxFilterGroup } from "./CheckboxFilterGroup";
import { PriceFilter } from "./PriceFilter";
import { RatingFilter } from "./RatingFilter";

export function FilterSidebarContent() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.filters);

  const subOpts = SUBCATEGORIES.map((s) => ({ id: s.id, label: s.name, count: s.productCount }));
  const brandOpts = BRANDS.map((b) => ({ id: b.id, label: b.name, count: b.productCount }));
  const sellerOpts = SELLERS.map((s) => ({ id: s.id, label: s.name, count: 0 }));
  const discOpts = DISCOUNT_OPTIONS.map((d) => ({ id: String(d), label: `${d}% or more`, count: 0 }));

  return (
    <div>
      <CheckboxFilterGroup title="Category" options={subOpts} selectedIds={filters.subcategories} onToggle={(id) => dispatch(filtersSlice.actions.toggleSubcategory(id))} />
      <CheckboxFilterGroup title="Brand" options={brandOpts} selectedIds={filters.brands} onToggle={(id) => dispatch(filtersSlice.actions.toggleBrand(id))} searchable />
      <PriceFilter />
      <RatingFilter />
      <CheckboxFilterGroup title="Availability" options={AVAILABILITY_OPTIONS} selectedIds={filters.availability} onToggle={(id) => dispatch(filtersSlice.actions.toggleAvailability(id))} />
      <CheckboxFilterGroup title="Discount" options={discOpts} selectedIds={filters.discount} onToggle={(id) => dispatch(filtersSlice.actions.toggleDiscount(id))} />
      <CheckboxFilterGroup title="Delivery" options={DELIVERY_OPTIONS} selectedIds={filters.delivery} onToggle={(id) => dispatch(filtersSlice.actions.toggleDelivery(id))} />
      <CheckboxFilterGroup title="Seller" options={sellerOpts} selectedIds={filters.sellers} onToggle={(id) => dispatch(filtersSlice.actions.toggleSeller(id))} defaultOpen={false} />
      {ATTRIBUTE_CONFIG.map((attr) => (
        <CheckboxFilterGroup
          key={attr.key}
          title={attr.label}
          options={attr.options.map((v) => ({ id: v, label: v, count: 0 }))}
          selectedIds={filters.attributes[attr.key] ?? []}
          onToggle={(value) => dispatch(filtersSlice.actions.toggleAttribute({ key: attr.key, value }))}
          defaultOpen={false}
        />
      ))}
    </div>
  );
}
