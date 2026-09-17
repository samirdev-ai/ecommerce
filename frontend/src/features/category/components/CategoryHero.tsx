import type { CategoryInfo } from "@/domain/category.types";
import { formatCompactNumber } from "@/lib/format";

export function CategoryHero({
  category,
  resultCount,
}: {
  category: CategoryInfo;
  resultCount: number;
}) {
  return (
    <div className="relative overflow-hidden bg-[var(--color-surface)]">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={category.bannerImage} alt="" className="h-full w-full object-cover opacity-10" />
      </div>
      <div className="relative mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-8 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">{category.name}</h1>
        <p className="max-w-2xl text-sm text-[var(--color-muted-foreground)]">{category.description}</p>
        <p className="text-sm font-medium text-[var(--color-foreground)]">{formatCompactNumber(resultCount)} products</p>
      </div>
    </div>
  );
}
