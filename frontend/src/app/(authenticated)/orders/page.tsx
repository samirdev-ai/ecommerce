import type { Metadata } from "next";
import { OrdersPage } from "@/features/orders/page/OrdersPage";

export const metadata: Metadata = { title: "Orders — Meridian" };

export default function Page() {
  return <OrdersPage />;
}
