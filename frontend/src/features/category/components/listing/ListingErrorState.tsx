"use client";
import { AlertTriangle, RefreshCw } from "lucide-react";

export function ListingErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <AlertTriangle size={44} className="text-[var(--color-danger)]" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-[var(--color-foreground)]">We couldn’t load this category</p>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Please try again.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        <RefreshCw size={14} aria-hidden="true" /> Retry
      </button>
    </div>
  );
}
