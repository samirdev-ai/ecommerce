"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { ViewMode } from "@/store/slices/view-mode.slice";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCardSkeleton } from "@/components/product/ProductCardSkeleton";
import { EmptyResultsState } from "./EmptyResultsState";
import { ListingErrorState } from "./ListingErrorState";

const PAGE_SIZE = 12;
type Status = "loading" | "success" | "error";

export function ProductResults() {
  const products = useAppSelector((s) => s.products.items);
  const viewMode = useAppSelector((s) => s.viewMode.value);
  const [status, setStatus] = useState<Status>("loading");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatus("loading");
    const id = setTimeout(() => setStatus("success"), 400);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [products.length]);

  const hasMore = visibleCount < products.length;

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, products.length));
      setIsLoadingMore(false);
    }, 500);
  }, [isLoadingMore, hasMore, products.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || status !== "success") return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: "400px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loadMore, status]);

  if (status === "error") return <ListingErrorState onRetry={() => setStatus("loading")} />;

  if (status === "loading") {
    return (
      <div className={viewMode === ViewMode.Grid ? "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-4"}>
        {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    );
  }

  if (products.length === 0) return <EmptyResultsState />;

  const visible = products.slice(0, visibleCount);

  return (
    <div>
      <div className={viewMode === ViewMode.Grid ? "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-4"}>
        {visible.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
      </div>
      <div ref={sentinelRef} className="mt-8 flex items-center justify-center">
        {isLoadingMore && <p className="text-sm text-[var(--color-muted-foreground)]">Loading more products…</p>}
        {!hasMore && !isLoadingMore && <p className="text-sm text-[var(--color-muted-foreground)]">You’ve reached the end of the results.</p>}
      </div>
    </div>
  );
}
