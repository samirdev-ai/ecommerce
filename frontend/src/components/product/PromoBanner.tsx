import { ArrowRight } from "lucide-react";
import type { Promotion } from "@/domain/campaign.types";
import { cn } from "@/lib/cn";

export function PromoBanner({ promo }: { promo: Promotion }) {
  const aspect =
    promo.variant === "large"
      ? "aspect-[16/9] sm:aspect-[21/9]"
      : promo.variant === "medium"
        ? "aspect-[16/9]"
        : "aspect-[4/3]";
  return (
    <a
      href={promo.ctaHref}
      className={cn(
        "group relative block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
      )}
    >
      <div className={cn("relative w-full bg-[var(--color-muted)]", aspect)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={promo.image}
          alt={promo.imageAlt}
          loading="lazy"
          className="size-full object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <h3 className="text-h3 font-semibold text-white text-balance">{promo.title}</h3>
        <p className="mt-1 max-w-md text-body text-white/80 text-pretty">{promo.description}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-body font-medium text-white underline-offset-4 group-hover:underline">
          {promo.ctaLabel} <ArrowRight className="size-4" />
        </span>
      </div>
    </a>
  );
}
