"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { PRICE_BUCKETS } from "@/config/price-buckets";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { filtersSlice } from "@/store/slices/filters.slice";

export function PriceFilter() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.filters);
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");
  const [open, setOpen] = useState(true);

  const applyCustom = () => {
    const min = minInput ? Number(minInput) : null;
    const max = maxInput ? Number(maxInput) : null;
    dispatch(filtersSlice.actions.setCustomPriceRange({ min, max }));
  };

  return (
    <fieldset className="border-b border-[var(--color-border)] py-4">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between text-left focus-visible:outline-none">
        <legend className="text-sm font-semibold text-[var(--color-foreground)]">Price</legend>
        <ChevronDown size={15} className={cn("text-[var(--color-muted-foreground)] transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2.5">
          {PRICE_BUCKETS.map((bucket) => (
            <label key={bucket.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="price-bucket"
                checked={filters.priceBucketId === bucket.id}
                onChange={() => { setMinInput(""); setMaxInput(""); dispatch(filtersSlice.actions.setPriceBucket(bucket.id)); }}
                className="h-4 w-4 border-[var(--color-border)] text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              />
              <span className="text-[var(--color-foreground)]">{bucket.label}</span>
            </label>
          ))}
          <div className="mt-1 flex items-center gap-2">
            <input type="number" value={minInput} onChange={(e) => setMinInput(e.target.value)} placeholder="Min" aria-label="Minimum price" className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]" />
            <span className="text-[var(--color-muted-foreground)]">–</span>
            <input type="number" value={maxInput} onChange={(e) => setMaxInput(e.target.value)} placeholder="Max" aria-label="Maximum price" className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]" />
            <button type="button" onClick={applyCustom} className="shrink-0 rounded-md bg-[var(--color-secondary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-secondary-foreground)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]">Go</button>
          </div>
        </div>
      )}
    </fieldset>
  );
}
