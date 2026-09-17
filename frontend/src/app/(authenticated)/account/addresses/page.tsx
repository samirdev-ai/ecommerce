import type { Metadata } from "next";
import { AddressesPage } from "@/features/account/page/AddressesPage";

export const metadata: Metadata = { title: "Addresses — Meridian" };

export default function Page() {
  return <AddressesPage />;
}
