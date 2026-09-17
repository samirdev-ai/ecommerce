"use client";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function IconActionButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
        active
          ? "border-[var(--color-danger)] bg-[var(--color-danger-subtle)] text-[var(--color-danger)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
      )}
    >
      <Icon size={15} fill={active ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}
