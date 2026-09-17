"use client";
import { useAppSelector } from "@/store/hooks";
import { FilterSidebar } from "../filters/FilterSidebar";
import { FilterDrawer } from "../filters/FilterDrawer";
import { ListingToolbar } from "./ListingToolbar";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { ProductResults } from "./ProductResults";

export function CategoryListingLayout({ resultCount }: { resultCount: number }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
      <ListingToolbar resultCount={resultCount} />
      <div className="mt-3 lg:hidden"><ActiveFilterChips /></div>
      <div className="flex gap-8 py-6">
        <FilterSidebar />
        <div className="min-w-0 flex-1"><ProductResults /></div>
      </div>
      <FilterDrawer resultCount={resultCount} />
    </div>
  );
}
