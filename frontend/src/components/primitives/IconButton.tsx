import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "solid";
}

export function IconButton({
  label,
  size = "md",
  variant = "ghost",
  className,
  children,
  ...rest
}: IconButtonProps) {
  const sz = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex items-center justify-center rounded-[var(--radius-md)]",
        "transition-colors duration-[var(--duration-fast)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
        variant === "solid"
          ? "bg-[var(--color-muted)] hover:bg-[var(--color-border)]"
          : "hover:bg-[var(--color-muted)]",
        sz,
        className,
      )}
    >
      {children}
    </button>
  );
}
