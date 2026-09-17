import type { Metadata } from "next";
import { ReturnsPage } from "@/features/returns/page/ReturnsPage";

export const metadata: Metadata = { title: "Returns — Meridian" };

export default function Page() {
  return <ReturnsPage />;
}
