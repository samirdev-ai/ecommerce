import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-caption font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-h2 font-semibold tracking-tight text-balance">{title}</h2>
        {description && (
          <p className="mt-1 text-body text-[var(--color-muted-foreground)] text-pretty">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
