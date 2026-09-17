import type { Metadata } from "next";
import { AddPaymentPage } from "@/features/account/page/AddPaymentPage";

export const metadata: Metadata = { title: "Add payment — Meridian" };

export default function Page() {
  return <AddPaymentPage />;
}
