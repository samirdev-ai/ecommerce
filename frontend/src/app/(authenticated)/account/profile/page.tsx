import type { Metadata } from "next";
import { ProfilePage } from "@/features/account/page/ProfilePage";

export const metadata: Metadata = { title: "Profile — Meridian" };

export default function Page() {
  return <ProfilePage />;
}
