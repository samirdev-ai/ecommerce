import type { Category } from "@/domain/category.types";
import { Container } from "@/components/primitives/Container";
import { Skeleton } from "@/components/primitives/Skeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { CategoryCard } from "@/components/product/CategoryCard";

export interface FeaturedCategoriesSectionProps {
  categories: Category[];
  isLoading?: boolean;
}

export function FeaturedCategoriesSection({
  categories,
  isLoading,
}: FeaturedCategoriesSectionProps) {
  if (!isLoading && categories.length === 0) return null;
  return (
    <section aria-labelledby="featured-categories-heading" className="pt-10">
      <Container>
        <SectionHeader
          eyebrow="Collections"
          title="Featured Categories"
          description="Curated collections to help you find exactly what you need."
        />
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <Skeleton className="aspect-[4/3] rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
