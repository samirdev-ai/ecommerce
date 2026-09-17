import type { Metadata } from "next";
import { DealsPage } from "@/features/deals/page/DealsPage";

export const metadata: Metadata = { title: "Deals — Meridian" };

export default function Page() {
  return <DealsPage />;
}
