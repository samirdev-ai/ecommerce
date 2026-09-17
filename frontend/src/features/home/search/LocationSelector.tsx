"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLocation } from "@/store/slices/preferences.slice";

export function LocationSelector() {
  const dispatch = useAppDispatch();
  const location = useAppSelector((s) => s.preferences.location);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const options = ["New York, NY", "San Francisco, CA", "Austin, TX", "Seattle, WA"];

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-small hover:bg-[var(--color-muted)]"
      >
        <MapPin className="size-4 text-[var(--color-muted-foreground)]" />
        <span className="max-w-[10rem] truncate">
          <span className="text-[var(--color-muted-foreground)]">Deliver to </span>
          <span className="font-medium">{location}</span>
        </span>
        <ChevronDown className="size-3.5 text-[var(--color-muted-foreground)]" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-40 min-w-[14rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-[var(--shadow-lg)] animate-scale-in"
        >
          {options.map((o) => (
            <li key={o} role="option" aria-selected={o === location}>
              <button
                type="button"
                onClick={() => {
                  dispatch(setLocation(o));
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2 text-left text-body hover:bg-[var(--color-muted)]",
                  o === location && "font-medium text-[var(--color-primary)]",
                )}
              >
                {o}
                {o === location && <Check className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
