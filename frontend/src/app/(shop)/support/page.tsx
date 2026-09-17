import type { Metadata } from "next";
import { SupportPage } from "@/features/notifications/page/SupportPage";

export const metadata: Metadata = { title: "Support — Meridian" };

export default function Page() {
  return <SupportPage />;
}
