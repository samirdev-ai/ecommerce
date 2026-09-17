import type { Metadata } from "next";
import { ReturnDetailPage } from "@/features/returns/page/ReturnDetailPage";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Return ${id} — Meridian` };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <ReturnDetailPage returnId={id} />;
}
