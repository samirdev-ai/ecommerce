import type { Category } from "@/domain/category.types";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { Container } from "@/components/primitives/Container";
import { Skeleton } from "@/components/primitives/Skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import Link from "next/link";

export interface QuickCategorySectionProps {
  categories: Category[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function QuickCategorySection({
  categories,
  isLoading,
  isError,
  onRetry,
}: QuickCategorySectionProps) {
  if (isError) {
    return (
      <Container className="pt-8">
        <ErrorState title="Couldn't load categories" onRetry={onRetry} />
      </Container>
    );
  }
  return (
    <section aria-label="Shop by category" className="pt-8">
      <Container>
        {isLoading ? (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="size-16 rounded-full" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="no-scrollbar flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-8">
            {categories.map((c) => (
              <li key={c.id} className="w-[76px] shrink-0 sm:w-auto sm:shrink">
                <Link
                  href={`/category/${c.slug}`}
                  className="group flex flex-col items-center gap-2 text-center focus-visible:outline-none"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-16 items-center justify-center rounded-full bg-[var(--color-muted)] text-2xl",
                      "transition-[background-color,transform] duration-[var(--duration-base)]",
                      "group-hover:bg-[var(--color-primary-subtle)] group-hover:scale-105 motion-reduce:group-hover:scale-100",
                    )}
                  >
                    {c.icon}
                  </span>
                  <span className="text-small font-medium leading-tight group-hover:text-[var(--color-primary)]">
                    {c.name}
                  </span>
                  <span className="text-caption text-[var(--color-muted-foreground)]">
                    {formatCount(c.productCount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
