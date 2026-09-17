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
