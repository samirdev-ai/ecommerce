import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "@/domain/category.types";

export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-[1400px] px-4 py-3 lg:px-8">
      <ol className="flex items-center gap-1.5 overflow-x-auto text-xs">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.href} className="flex shrink-0 items-center gap-1.5">
              {i > 0 && <ChevronRight size={12} className="text-[var(--color-muted-foreground)]" aria-hidden="true" />}
              {isLast ? (
                <span aria-current="page" className="font-medium text-[var(--color-foreground)]">{item.label}</span>
              ) : (
                <a href={item.href} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:underline">{item.label}</a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
