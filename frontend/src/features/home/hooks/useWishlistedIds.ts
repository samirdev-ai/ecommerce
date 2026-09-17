"use client";
import { useMemo } from "react";
import { useGetWishlistQuery } from "@/store/api/ecommerce.api";
import { useCustomer } from "@/providers/use-customer";
import { useAppSelector } from "@/store/hooks";

export function useWishlistedIds(): Set<string> {
  const customer = useCustomer();
  const { data: serverWishlist } = useGetWishlistQuery(undefined, { skip: !customer });
  const optimisticIds = useAppSelector((s) => s.wishlistUi.optimisticIds);

  return useMemo(() => {
    const ids = new Set<string>(serverWishlist?.map((w) => w.productId) ?? []);
    for (const id of optimisticIds) {
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
    }
    return ids;
  }, [serverWishlist, optimisticIds]);
}
