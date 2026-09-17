import type { Subcategory } from "@/domain/category.types";
import { SubcategoryCard } from "./SubcategoryCard";

export function SubcategoryScroller({ subcategories }: { subcategories: readonly Subcategory[] }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-8">
      <h2 className="mb-3 text-sm font-bold text-[var(--color-foreground)]">Shop by type</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {subcategories.map((sc) => <SubcategoryCard key={sc.id} subcategory={sc} />)}
      </div>
    </div>
  );
}
