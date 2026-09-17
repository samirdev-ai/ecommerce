import { formatCompactNumber } from "@/lib/format";

export function ResultSummary({ count }: { count: number }) {
  return (
    <p className="text-sm text-[var(--color-muted-foreground)]">
      <span className="font-semibold text-[var(--color-foreground)]">{formatCompactNumber(count)}</span> products
    </p>
  );
}
