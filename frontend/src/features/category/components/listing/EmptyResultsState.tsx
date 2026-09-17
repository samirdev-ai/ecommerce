"use client";
import { AlertTriangle } from "lucide-react";
import { SUBCATEGORIES } from "@/config/category-page-config";
import { useAppDispatch } from "@/store/hooks";
import { filtersSlice } from "@/store/slices/filters.slice";

export function EmptyResultsState() {
  const dispatch = useAppDispatch();
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <AlertTriangle size={44} className="text-[var(--color-muted-foreground)]" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-[var(--color-foreground)]">No products match your filters</p>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Try removing a few filters or browse related categories.</p>
      </div>
      <button
        type="button"
        onClick={() => dispatch(filtersSlice.actions.clearFilters())}
        className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        Clear all filters
      </button>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {SUBCATEGORIES.slice(0, 4).map((sc) => (
          <a key={sc.id} href="#" className="rounded-full border border-[var(--color-border)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]">{sc.name}</a>
        ))}
      </div>
    </div>
  );
}
