"use client";
import { Clock } from "lucide-react";
import { useCountdown } from "@/lib/use-countdown";

export function CountdownInline({ target }: { target: string }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(target);
  if (expired) {
    return <span className="text-small font-medium text-[var(--color-danger)]">Expired</span>;
  }
  return (
    <p className="text-small text-[var(--color-muted-foreground)] tabular-nums">
      <Clock className="mr-1 inline size-3.5 -translate-y-px" />
      Ends in {days > 0 && `${days}d `}
      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
      {String(seconds).padStart(2, "0")}
    </p>
  );
}
