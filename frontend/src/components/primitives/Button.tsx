import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:     "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]",
  secondary:   "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:opacity-90",
  ghost:     "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
  danger:     "bg-[var(--color-danger)] text-white hover:opacity-90",
  outline:     "bg-transparent border border-[var(--color-border-strong)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-small gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-10 px-4 text-body gap-2 rounded-[var(--radius-md)]",
  lg: "h-12 px-6 text-body-lg gap-2.5 rounded-[var(--radius-lg)]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  iconLeft,
  iconRight,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "transition-[background-color,opacity,transform] duration-[var(--duration-fast)]",
        "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        iconLeft
      )}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  );
}
