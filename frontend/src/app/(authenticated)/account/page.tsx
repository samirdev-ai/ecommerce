import type { Metadata } from "next";
import { AccountOverviewPage } from "@/features/account/page/AccountOverviewPage";

export const metadata: Metadata = { title: "Account — Meridian" };

export default function Page() {
  return <AccountOverviewPage />;
}
