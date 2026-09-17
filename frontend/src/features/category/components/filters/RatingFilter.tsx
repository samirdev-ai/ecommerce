"use client";
import { RATING_OPTIONS } from "@/config/filter-options";
import { RatingStars } from "@/components/shared/RatingStars";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { filtersSlice } from "@/store/slices/filters.slice";

export function RatingFilter() {
  const dispatch = useAppDispatch();
  const minRating = useAppSelector((s) => s.filters.minRating);

  return (
    <fieldset className="border-b border-[var(--color-border)] py-4">
      <legend className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">Rating</legend>
      <div className="flex flex-col gap-2.5">
        {RATING_OPTIONS.map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="min-rating"
              checked={minRating === r}
              onChange={() => dispatch(filtersSlice.actions.setMinRating(minRating === r ? null : r))}
              className="h-4 w-4 border-[var(--color-border)] text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            />
            <RatingStars rating={{ value: r, count: 0 }} size={13} />
            <span className="text-[var(--color-foreground)]">& above</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
