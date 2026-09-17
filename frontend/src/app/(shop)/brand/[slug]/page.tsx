import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandStorePage } from "@/features/brand/page/BrandStorePage";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — Meridian` };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();
  return <BrandStorePage slug={slug} />;
}
