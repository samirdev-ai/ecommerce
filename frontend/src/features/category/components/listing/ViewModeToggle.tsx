"use client";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ViewMode, viewModeSlice } from "@/store/slices/view-mode.slice";

export function ViewModeToggle() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.viewMode.value);

  return (
    <div role="group" aria-label="View mode" className="flex items-center rounded-lg border border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => dispatch(viewModeSlice.actions.setViewMode(ViewMode.Grid))}
        aria-pressed={mode === ViewMode.Grid}
        aria-label="Grid view"
        className={cn("flex h-9 w-9 items-center justify-center rounded-l-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]", mode === ViewMode.Grid ? "bg-[var(--color-muted)] text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/50")}
      >
        <LayoutGrid size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => dispatch(viewModeSlice.actions.setViewMode(ViewMode.List))}
        aria-pressed={mode === ViewMode.List}
        aria-label="List view"
        className={cn("flex h-9 w-9 items-center justify-center rounded-r-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]", mode === ViewMode.List ? "bg-[var(--color-muted)] text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/50")}
      >
        <List size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
