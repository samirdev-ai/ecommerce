"use client";
import type { Subcategory } from "@/domain/category.types";
import { cn } from "@/lib/cn";
import { formatCompactNumber } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { filtersSlice } from "@/store/slices/filters.slice";

export function SubcategoryCard({ subcategory }: { subcategory: Subcategory }) {
  const dispatch = useAppDispatch();
  const isActive = useAppSelector((s) => s.filters.subcategories.includes(subcategory.id));

  return (
    <button
      type="button"
      onClick={() => dispatch(filtersSlice.actions.toggleSubcategory(subcategory.id))}
      aria-pressed={isActive}
      className={cn(
        "flex w-[132px] shrink-0 flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
        isActive ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50",
      )}
    >
      <span className="text-2xl" aria-hidden="true">{subcategory.icon}</span>
      <span className="text-xs font-semibold text-[var(--color-foreground)] leading-tight">{subcategory.name}</span>
      <span className="text-[11px] text-[var(--color-muted-foreground)]">{formatCompactNumber(subcategory.productCount)}</span>
    </button>
  );
}
