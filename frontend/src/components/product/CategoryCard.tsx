import type { Category } from "@/domain/category.types";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <a
      href={`/category/${category.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        "transition-[border-color,box-shadow] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)]",
      )}
    >
      {category.image && (
        <div className="aspect-[4/3] overflow-hidden bg-[var(--color-muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={category.image}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)] group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
          />
        </div>
      )}
      <div className="flex flex-col gap-1 p-4">
        <h3 className="text-body-lg font-semibold">{category.name}</h3>
        {category.description && (
          <p className="line-clamp-2 text-small text-[var(--color-muted-foreground)]">
            {category.description}
          </p>
        )}
        <span className="mt-1 text-caption text-[var(--color-muted-foreground)]">
          {formatCount(category.productCount)} products
        </span>
      </div>
    </a>
  );
}
