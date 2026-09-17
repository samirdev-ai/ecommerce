import type { Metadata } from "next";
import { CartPage } from "@/features/cart/page/CartPage";

export const metadata: Metadata = { title: "Cart — Meridian" };

export default function Page() {
  return <CartPage />;
}
