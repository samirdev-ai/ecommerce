import type { Metadata } from "next";
import { CheckoutPage } from "@/features/checkout/page/CheckoutPage";

export const metadata: Metadata = { title: "Checkout — Meridian" };

export default function Page() {
  return <CheckoutPage />;
}
