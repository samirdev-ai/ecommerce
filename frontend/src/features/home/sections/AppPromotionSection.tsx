import { Smartphone, Apple, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { Container } from "@/components/primitives/Container";

export function AppPromotionSection() {
  return (
    <section aria-labelledby="app-heading" className="pt-12">
      <Container>
        <div className="grid items-center gap-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-secondary)] p-6 text-[var(--color-secondary-foreground)] sm:p-8 lg:grid-cols-2">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider opacity-80">
              <Smartphone className="size-3.5" /> Meridian App
            </p>
            <h2 id="app-heading" className="text-h2 font-semibold">
              Shop faster on the app
            </h2>
            <p className="mt-1 max-w-md text-body opacity-80">
              Track orders, get app-only deals, and check out in seconds.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="/app/ios"
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-4 text-body font-medium text-[var(--color-foreground)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Apple className="size-5" aria-hidden />
                <span className="flex flex-col leading-none">
                  <span className="text-[10px] uppercase tracking-wide opacity-70">Download on</span>
                  <span className="text-body font-semibold">App Store</span>
                </span>
              </a>
              <a
                href="/app/android"
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-4 text-body font-medium text-[var(--color-foreground)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="size-5" aria-hidden />
                <span className="flex flex-col leading-none">
                  <span className="text-[10px] uppercase tracking-wide opacity-70">Get it on</span>
                  <span className="text-body font-semibold">Google Play</span>
                </span>
              </a>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 lg:justify-end">
            <div
              aria-hidden
              className="flex size-32 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-3"
            >
              <div className="grid size-full grid-cols-6 grid-rows-6 gap-0.5">
                {Array.from({ length: 36 }).map((_, i) => {
                  const on =
                    i < 3 || i === 5 || i === 6 || i === 11 || i === 12 ||
                    i === 17 || i === 18 || i === 23 || i === 24 || i === 29 ||
                    i === 30 || i > 32;
                  return (
                    <span
                      key={i}
                      className={cn(
                        "rounded-[1px]",
                        on ? "bg-[var(--color-foreground)]" : "bg-transparent",
                      )}
                    />
                  );
                })}
              </div>
            </div>
            <p className="max-w-[10rem] text-small opacity-80">
              Scan to download the app and unlock app-only pricing.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}


