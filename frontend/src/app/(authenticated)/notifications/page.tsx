import type { Metadata } from "next";
import { NotificationsPage } from "@/features/notifications/page/NotificationsPage";

export const metadata: Metadata = { title: "Notifications — Meridian" };

export default function Page() {
  return <NotificationsPage />;
}
