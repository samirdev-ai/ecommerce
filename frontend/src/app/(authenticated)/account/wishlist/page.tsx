import type { Metadata } from "next";
import { WishlistPage } from "@/features/account/page/WishlistPage";

export const metadata: Metadata = { title: "Wishlist — Meridian" };

export default function Page() {
  return <WishlistPage />;
}
