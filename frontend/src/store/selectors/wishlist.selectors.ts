import type { RootState } from "@/store/store";

export const selectWishlistIds = (s: RootState) => s.wishlist.ids;
export const selectIsWishlisted = (id: string) => (s: RootState) => s.wishlist.ids.includes(id);
