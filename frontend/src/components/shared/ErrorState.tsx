import { AlertCircle } from "lucide-react";
import { Button } from "@/components/primitives/Button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this section. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-danger-subtle)] px-6 py-10 text-center"
    >
      <AlertCircle className="size-7 text-[var(--color-danger)]" />
      <div>
        <p className="text-body-lg font-semibold">{title}</p>
        <p className="mt-1 text-body text-[var(--color-muted-foreground)]">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
