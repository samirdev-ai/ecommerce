import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

export function Card({ children, className, as: As = "div" }: CardProps) {
  return (
    <As
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        className,
      )}
    >
      {children}
    </As>
  );
}
