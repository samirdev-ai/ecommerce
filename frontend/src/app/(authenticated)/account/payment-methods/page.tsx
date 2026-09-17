import type { Metadata } from "next";
import { PaymentMethodsPage } from "@/features/account/page/PaymentMethodsPage";

export const metadata: Metadata = { title: "Payment methods — Meridian" };

export default function Page() {
  return <PaymentMethodsPage />;
}
