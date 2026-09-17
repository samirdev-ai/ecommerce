import type { ComponentType, ReactNode } from "react";
import { Package } from "lucide-react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
}

export function EmptyState({ title, description, action, icon: Icon = Package }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-6 py-12 text-center">
      <Icon className="size-8 text-[var(--color-muted-foreground)]" />
      <div>
        <p className="text-body-lg font-semibold">{title}</p>
        {description && (
          <p className="mt-1 text-body text-[var(--color-muted-foreground)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
