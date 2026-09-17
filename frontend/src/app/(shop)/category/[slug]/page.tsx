import { CategoryPage } from "@/features/category/page/CategoryPage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — Meridian` };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!slug) notFound();
  const sp = await searchParams;
  return <CategoryPage slug={slug} />;
}
