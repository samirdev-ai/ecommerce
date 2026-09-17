import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "sale" | "new" | "success" | "warning" | "info";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-[var(--color-muted)] text-[var(--color-foreground)]",
  sale: "bg-[var(--color-sale)] text-white",
  new: "bg-[var(--color-success)] text-white",
  success: "bg-[var(--color-success-subtle)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]",
  info: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
