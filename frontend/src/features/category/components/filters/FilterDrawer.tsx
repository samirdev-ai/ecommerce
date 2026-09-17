"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { uiSlice } from "@/store/slices/ui.slice";
import { filtersSlice } from "@/store/slices/filters.slice";
import { selectActiveFilterCount, selectFilters } from "@/store/selectors/filters.selectors";
import { FilterSidebarContent } from "./FilterSidebarContent";

export function FilterDrawer({ resultCount }: { resultCount: number }) {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.ui.filterDrawerOpen);
  const activeCount = useAppSelector(selectActiveFilterCount);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => dispatch(uiSlice.actions.closeFilterDrawer())} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Filters" className="fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[340px] flex-col bg-[var(--color-background)] shadow-2xl lg:hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-4">
          <h2 className="text-base font-bold text-[var(--color-foreground)]">Filters</h2>
          <button type="button" onClick={() => dispatch(uiSlice.actions.closeFilterDrawer())} aria-label="Close filters" className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          <FilterSidebarContent />
        </div>
        <div className="flex gap-3 border-t border-[var(--color-border)] px-4 py-4">
          <button
            type="button"
            onClick={() => dispatch(filtersSlice.actions.clearFilters())}
            className="flex-1 rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            Clear{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
          <button
            type="button"
            onClick={() => dispatch(uiSlice.actions.closeFilterDrawer())}
            className="flex-1 rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            Show {resultCount} results
          </button>
        </div>
      </div>
    </>
  );
}
