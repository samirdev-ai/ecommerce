"use client";
import { SlidersHorizontal } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { uiSlice } from "@/store/slices/ui.slice";
import { selectActiveFilterCount } from "@/store/selectors/filters.selectors";
import { ResultSummary } from "./ResultSummary";
import { SortControl } from "./SortControl";
import { ViewModeToggle } from "./ViewModeToggle";
import { ActiveFilterChips } from "./ActiveFilterChips";

export function ListingToolbar({ resultCount }: { resultCount: number }) {
  const dispatch = useAppDispatch();
  const activeCount = useAppSelector(selectActiveFilterCount);

  return (
    <div className="sticky top-16 z-20 -mx-4 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 px-4 py-3 backdrop-blur-sm lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResultSummary count={resultCount} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dispatch(uiSlice.actions.openFilterDrawer())}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] lg:hidden"
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            Filter{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
          <SortControl />
          <ViewModeToggle />
        </div>
      </div>
      <div className="mt-3 hidden lg:block"><ActiveFilterChips /></div>
    </div>
  );
}
