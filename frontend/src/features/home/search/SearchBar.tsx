"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Search, Clock, X } from "lucide-react";
import type { SearchSuggestion } from "@/domain/search.types";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addRecentQuery, clearRecentQueries } from "@/store/slices/search-ui.slice";
import { useGetSearchSuggestionsQuery } from "@/store/api/ecommerce.api";
import { Skeleton } from "@/components/primitives/Skeleton";

export interface SearchBarProps {
  onSelectSuggestion?: (s: SearchSuggestion) => void;
}

export function SearchBar({ onSelectSuggestion }: SearchBarProps) {
  const dispatch = useAppDispatch();
  const recentQueries = useAppSelector((s) => s.searchUi.recentQueries);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const { data: suggestions = [], isFetching, isError } = useGetSearchSuggestionsQuery(query, {
    skip: query.trim().length < 2,
  });

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showRecent = query.length < 2 && recentQueries.length > 0;
  const items: SearchSuggestion[] = showRecent
    ? recentQueries.map<SearchSuggestion>((q) => ({
        id: `recent-${q}`,
        type: "query",
        label: q,
        href: `/search?q=${encodeURIComponent(q)}`,
      }))
    : suggestions;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        commit(items[activeIndex]);
      } else if (query.trim()) {
        commit({
          id: "submit",
          type: "query",
          label: query,
          href: `/search?q=${encodeURIComponent(query)}`,
        });
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const commit = (s: SearchSuggestion) => {
    dispatch(addRecentQuery(s.label));
    onSelectSuggestion?.(s);
    setOpen(false);
    if (typeof window !== "undefined") window.location.assign(s.href);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          "flex h-11 items-center gap-2 rounded-[var(--radius-lg)] border bg-[var(--color-surface)] px-3",
          "transition-[border-color,box-shadow]",
          open
            ? "border-[var(--color-primary)] shadow-[var(--shadow-focus)]"
            : "border-[var(--color-border-strong)]",
        )}
      >
        <Search className="size-4 shrink-0 text-[var(--color-muted-foreground)]" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products, brands, and categories"
          className="h-full min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-[var(--color-muted-foreground)]"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="rounded-full p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && (items.length > 0 || isFetching || showRecent) && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-lg)] animate-scale-in">
          {showRecent && (
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
              <p className="text-caption font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Recent searches
              </p>
              <button
                type="button"
                className="text-caption text-[var(--color-primary)] hover:underline"
                onClick={() => dispatch(clearRecentQueries())}
              >
                Clear
              </button>
            </div>
          )}
          {isFetching && (
            <div className="space-y-2 p-4" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-[var(--radius-sm)]" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {isError && (
            <p className="p-4 text-small text-[var(--color-muted-foreground)]">
              Suggestions unavailable. Press Enter to search.
            </p>
          )}
          {!isFetching && items.length > 0 && (
            <ul id={listboxId} role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
              {items.map((s, i) => (
                <li
                  key={s.id}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commit(s)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left",
                      i === activeIndex
                        ? "bg-[var(--color-muted)]"
                        : "hover:bg-[var(--color-muted)]",
                    )}
                  >
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image} alt="" className="size-9 rounded-[var(--radius-sm)] object-cover" />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                        {s.type === "query" ? <Clock className="size-4" /> : <Search className="size-4" />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body">{s.label}</span>
                      {s.meta && (
                        <span className="block truncate text-caption text-[var(--color-muted-foreground)]">
                          {s.meta}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
