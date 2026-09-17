"use client";
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { SORT_LABELS, SortOption, sortSlice } from "@/store/slices/sort.slice";

export function SortControl() {
  const dispatch = useAppDispatch();
  const sort = useAppSelector((s) => s.sort.value);
  const [open, setOpen] = useState(false);
  const options = Object.values(SortOption);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        Sort: {SORT_LABELS[sort]}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul role="listbox" aria-label="Sort products" className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-lg">
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={sort === opt}
                  onClick={() => { dispatch(sortSlice.actions.setSort(opt)); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-[var(--color-muted)] focus-visible:outline-none",
                    sort === opt ? "font-semibold text-[var(--color-primary)]" : "text-[var(--color-foreground)]",
                  )}
                >
                  {SORT_LABELS[opt]}
                  {sort === opt && <Check size={14} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
