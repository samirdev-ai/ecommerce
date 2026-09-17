import { ChevronRight } from "lucide-react";

const PROMOS = [
  { id: "p1", title: "Trade in & save",  desc: "Get up to $400 credit toward a new laptop", accent: "var(--color-chart-1)" },
  { id: "p2", title: "Editor’s picks", desc: "The best laptops we tested this month",       accent: "var(--color-chart-2)" },
];

export function CategoryHighlights() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-5 lg:px-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PROMOS.map((p) => (
          <a
            key={p.id}
            href="#"
            className="group flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-primary)]/50"
          >
            <div>
              <p className="text-sm font-bold text-[var(--color-foreground)]">{p.title}</p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{p.desc}</p>
            </div>
            <ChevronRight
              size={18}
              className="shrink-0 transition-transform group-hover:translate-x-0.5"
              style={{ color: p.accent }}
              aria-hidden="true"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
