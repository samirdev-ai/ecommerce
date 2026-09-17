import type { Metadata } from "next";
import { SearchPage } from "@/features/search/page/SearchPage";

export const metadata: Metadata = { title: "Search — Meridian" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return <SearchPage query={q} searchParams={sp} />;
}
