"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import type { HeroBanner } from "@/domain/campaign.types";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Container } from "@/components/primitives/Container";
import { Skeleton } from "@/components/primitives/Skeleton";
import { IconButton } from "@/components/primitives/IconButton";
import { ErrorState } from "@/components/shared/ErrorState";

export interface HeroSectionProps {
  banners: HeroBanner[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function HeroSection({ banners, isLoading, isError, onRetry }: HeroSectionProps) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (paused || reduced || count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => clearInterval(id);
  }, [paused, reduced, count]);

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count),
    [count],
  );

  if (isError) {
    return (
      <Container size="wide" className="pt-5">
        <ErrorState title="Couldn't load featured promotions" onRetry={onRetry} />
      </Container>
    );
  }

  if (isLoading || count === 0) {
    return (
      <Container size="wide" className="pt-5">
        <Skeleton className="aspect-[16/7] w-full rounded-[var(--radius-xl)]" />
      </Container>
    );
  }

  const slide = banners[index];
  const toneBg: Record<HeroBanner["tone"], string> = {
    primary: "from-[var(--color-primary)]/85",
    dark: "from-black/75",
    warm: "from-[oklch(45%_0.13_45)]/80",
    cool: "from-[oklch(40%_0.12_240)]/80",
  };

  return (
    <section aria-label="Featured promotions" className="pt-5">
      <Container size="wide">
        <div
          className="group relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-muted)]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="relative aspect-[16/9] sm:aspect-[16/7] lg:aspect-[21/8]">
            {banners.map((b, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={b.id}
                src={b.image}
                alt={b.imageAlt}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-out)]",
                  i === index ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
            <div
              aria-hidden
              className={cn(
                "absolute inset-0 bg-gradient-to-r via-black/25 to-transparent",
                toneBg[slide.tone],
              )}
            />
          </div>

          <div className="absolute inset-0 flex items-center">
            <Container size="wide">
              <div className="max-w-xl text-white animate-slide-up" key={slide.id}>
                {slide.eyebrow && (
                  <p className="mb-2 text-caption font-semibold uppercase tracking-widest text-white/85">
                    {slide.eyebrow}
                  </p>
                )}
                <h1 className="text-h1 font-bold tracking-tight text-balance sm:text-display">
                  {slide.headline}
                </h1>
                <p className="mt-3 max-w-md text-body-lg text-white/85 text-pretty">
                  {slide.subheadline}
                </p>
                <a
                  href={slide.ctaHref}
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-[var(--radius-lg)] bg-white px-6 text-body-lg font-medium text-[oklch(20%_0.02_250)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {slide.ctaLabel} <ArrowRight className="size-4" />
                </a>
              </div>
            </Container>
          </div>

          {count > 1 && (
            <>
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3 sm:px-4">
                <IconButton
                  label="Previous slide"
                  onClick={() => go(-1)}
                  className="bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <ChevronLeft className="size-5" />
                </IconButton>
                <IconButton
                  label="Next slide"
                  onClick={() => go(1)}
                  className="bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <ChevronRight className="size-5" />
                </IconButton>
              </div>
              <div
                role="tablist"
                aria-label="Choose slide"
                className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5"
              >
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-[var(--duration-base)]",
                      i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80",
                    )}
                  />
                ))}
              </div>
              <span className="sr-only" aria-live="polite">
                Slide {index + 1} of {count}
              </span>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
