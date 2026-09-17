import type { Metadata } from "next";
import { NewReturnPage } from "@/features/returns/page/NewReturnPage";

export const metadata: Metadata = { title: "Start a return — Meridian" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  return <NewReturnPage orderId={orderId ?? null} />;
}
