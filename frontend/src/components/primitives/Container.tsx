import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "default" | "wide" | "narrow";
}

export function Container({ children, className, size = "default" }: ContainerProps) {
  const max =
    size === "wide"
      ? "max-w-[1440px]"
      : size === "narrow"
        ? "max-w-[960px]"
        : "max-w-[1280px]";
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", max, className)}>
      {children}
    </div>
  );
}
