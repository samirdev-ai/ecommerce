import type { Metadata } from "next";
import { CheckoutSuccessPage } from "@/features/checkout/page/CheckoutSuccessPage";

export const metadata: Metadata = { title: "Order confirmed — Meridian" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  return <CheckoutSuccessPage orderId={orderId ?? null} />;
}
