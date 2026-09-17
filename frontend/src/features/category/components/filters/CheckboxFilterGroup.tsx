"use client";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FilterOption } from "@/domain/filter.types";
import { cn } from "@/lib/cn";

export function CheckboxFilterGroup({
  title,
  options,
  selectedIds,
  onToggle,
  searchable,
  defaultOpen = true,
}: {
  title: string;
  options: readonly FilterOption[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
  searchable?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () => (searchable && query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options),
    [options, query, searchable],
  );

  return (
    <fieldset className="border-b border-[var(--color-border)] py-4 first:pt-0 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left focus-visible:outline-none"
      >
        <legend className="text-sm font-semibold text-[var(--color-foreground)]">
          {title} {selectedIds.length > 0 && <span className="ml-1 text-xs font-normal text-[var(--color-primary)]">({selectedIds.length})</span>}
        </legend>
        <ChevronDown size={15} className={cn("text-[var(--color-muted-foreground)] transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2.5">
          {searchable && (
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}`}
              aria-label={`Search ${title.toLowerCase()}`}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            />
          )}
          {visible.map((opt) => (
            <label key={opt.id} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(opt.id)}
                  onChange={() => onToggle(opt.id)}
                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                />
                <span className="text-[var(--color-foreground)]">{opt.label}</span>
              </span>
              {opt.count > 0 && <span className="text-xs text-[var(--color-muted-foreground)]">({opt.count})</span>}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
