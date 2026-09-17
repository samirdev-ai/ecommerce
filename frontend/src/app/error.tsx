"use client";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root] route error:", error);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-h3 font-semibold">Something went wrong</h1>
      <p className="mt-2 text-body text-[var(--color-muted-foreground)]">
        {error.message || "Please try again."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-body font-medium text-[var(--color-primary-foreground)]"
      >
        Try again
      </button>
    </div>
  );
}
