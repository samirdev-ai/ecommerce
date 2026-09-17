"use client";
import { useEffect, useMemo } from "react";
import { notFound } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setProducts } from "@/store/slices/products.slice";
import { PRODUCTS } from "@/mocks/seed-products";
import { resolveCategory } from "@/config/categories";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { CategoryHero } from "../components/CategoryHero";
import { SubcategoryScroller } from "../components/SubcategoryScroller";
import { CategoryHighlights } from "../components/CategoryHighlights";
import { CategoryListingLayout } from "../components/listing/CategoryListingLayout";

export function CategoryPage({ slug }: { slug: string }) {
  const dispatch = useAppDispatch();
  const config = resolveCategory(slug);

  const scopedProducts = useMemo(
    () => PRODUCTS.filter((p) => p.category === slug),
    [slug],
  );

  useEffect(() => {
    if (!config) return;
    dispatch(setProducts(scopedProducts));
  }, [dispatch, config, scopedProducts]);

  const resultCount = useAppSelector((s) => s.products.items.length);

  if (!config) return notFound();

  return (
    <>
      <Breadcrumbs items={config.info.breadcrumbs} />
      <CategoryHero category={config.info} resultCount={resultCount} />
      <SubcategoryScroller subcategories={config.subcategories} />
      <CategoryHighlights />
      <CategoryListingLayout resultCount={resultCount} />
    </>
  );
}