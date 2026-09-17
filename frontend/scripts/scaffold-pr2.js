#!/usr/bin/env node
/**
 * PR 2 — Extract primitives and shared components.
 * Moves §9 (primitives) and §10 (shared) out of the single-file page.
 * Zero behavior change.
 *
 * Run: node scripts/scaffold-pr2.js
 */
import fs from "node:fs";
import path from "node:path";


const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

let written = 0;
function write(relPath, content) {
  const full = path.join(SRC, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.replace(/^\n/, ""));
  console.log(`  \x1b[32m\u2713\x1b[0m src/${relPath}`);
  written++;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

write("components/primitives/Button.tsx", `
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
  primary:
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]",
  secondary:
    "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:opacity-90",
  ghost:
    "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
  danger:
    "bg-[var(--color-danger)] text-white hover:opacity-90",
  outline:
    "bg-transparent border border-[var(--color-border-strong)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
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
`);

write("components/primitives/IconButton.tsx", `
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
`);

write("components/primitives/Badge.tsx", `
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
`);

write("components/primitives/Card.tsx", `
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
`);

write("components/primitives/Container.tsx", `
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
`);

write("components/primitives/Skeleton.tsx", `
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-[var(--radius-md)]", className)} />;
}
`);

write("components/primitives/Divider.tsx", `
import { cn } from "@/lib/cn";

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-t border-[var(--color-border)]", className)} />;
}
`);

write("components/primitives/index.ts", `
export * from "./Button";
export * from "./IconButton";
export * from "./Badge";
export * from "./Card";
export * from "./Container";
export * from "./Skeleton";
export * from "./Divider";
`);

// ─────────────────────────────────────────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────────────────────────────────────────

write("components/shared/SectionHeader.tsx", `
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
`);

write("components/shared/Price.tsx", `
import type { Price as PriceModel } from "@/domain/product.types";
import { cn } from "@/lib/cn";

export interface PriceProps {
  price: PriceModel;
  originalPrice?: PriceModel;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "text-body font-semibold",
  md: "text-body-lg font-semibold",
  lg: "text-h3 font-bold",
} as const;

export function Price({ price, originalPrice, size = "md", className }: PriceProps) {
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("text-[var(--color-foreground)] tabular-nums", SIZES[size])}>
        {price.formatted}
      </span>
      {originalPrice && (
        <span className="text-small text-[var(--color-muted-foreground)] line-through tabular-nums">
          {originalPrice.formatted}
        </span>
      )}
    </div>
  );
}
`);

write("components/shared/RatingStars.tsx", `
import { Star } from "lucide-react";
import type { Rating } from "@/domain/product.types";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";

export interface RatingStarsProps {
  rating: Rating;
  size?: number;
  className?: string;
}

export function RatingStars({ rating, size = 14, className }: RatingStarsProps) {
  const full = Math.floor(rating.value);
  const hasHalf = rating.value - full >= 0.5;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < full || (i === full && hasHalf);
          return (
            <Star
              key={i}
              width={size}
              height={size}
              className={cn(
                filled
                  ? "fill-[var(--color-rating)] text-[var(--color-rating)]"
                  : "text-[var(--color-border-strong)]",
              )}
            />
          );
        })}
      </div>
      <span className="text-small text-[var(--color-muted-foreground)] tabular-nums">
        {rating.value.toFixed(1)}
      </span>
      <span className="text-small text-[var(--color-muted-foreground)]">
        ({formatCount(rating.count)})
      </span>
      <span className="sr-only">
        Rated {rating.value.toFixed(1)} out of 5 from {rating.count} reviews
      </span>
    </div>
  );
}
`);

write("components/shared/EmptyState.tsx", `
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
`);

write("components/shared/ErrorState.tsx", `
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
`);

write("components/shared/TrustBar.tsx", `
import type { TrustItem } from "@/config/trust-items";

export function TrustBar({ items }: { items: TrustItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map(({ id, icon: Icon, title, description }) => (
        <li key={id} className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-body font-semibold">{title}</p>
            <p className="text-small text-[var(--color-muted-foreground)]">{description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
`);

write("components/shared/CountdownInline.tsx", `
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
      Ends in {days > 0 && \`\${days}d \`}
      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
      {String(seconds).padStart(2, "0")}
    </p>
  );
}
`);

write("components/shared/index.ts", `
export * from "./SectionHeader";
export * from "./Price";
export * from "./RatingStars";
export * from "./EmptyState";
export * from "./ErrorState";
export * from "./TrustBar";
export * from "./CountdownInline";
`);

// ─────────────────────────────────────────────────────────────────────────────
// DONE
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n\x1b[32m\u2705 PR 2 scaffolded (${written} files)\x1b[0m`);
console.log("\nNext: edit src/features/home/page/EcommerceHomePage.tsx to:");
console.log("  1. Delete §9 (primitives) and §10 (shared components).");
console.log("  2. Import from @/components/primitives and @/components/shared.");
console.log("  3. Keep §11 (product), §12 (sections), §13 (layout), §14 (overlays), §15–16.");
console.log("\nRun: node scripts/scaffold-pr2.js\n");