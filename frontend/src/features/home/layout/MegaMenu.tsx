import type { CategoryNavItem } from "@/domain/category.types";
import { Container } from "@/components/primitives/Container";

export function MegaMenu({ item }: { item: CategoryNavItem | null }) {
  if (!item?.columns) return null;
  return (
    <div
      className="absolute left-0 right-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-lg)] animate-fade-in"
      role="region"
      aria-label={`${item.label} menu`}
    >
      <Container size="wide">
        <div className="grid grid-cols-4 gap-8 py-6">
          {item.columns.map((col) => (
            <div key={col.title}>
              <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {col.title}
              </p>
              <ul className="space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="block rounded-[var(--radius-sm)] px-1 py-1 text-body hover:text-[var(--color-primary)]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {item.featured && (
            <a href={item.featured.href} className="group block">
              <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-muted)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.featured.image}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                />
              </div>
              <p className="mt-2 text-body font-medium">{item.featured.title}</p>
            </a>
          )}
        </div>
      </Container>
    </div>
  );
}
