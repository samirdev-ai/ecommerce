import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailPage } from "@/features/product/page/ProductDetailPage";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — Meridian` };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();
  return <ProductDetailPage slug={slug} />;
}
