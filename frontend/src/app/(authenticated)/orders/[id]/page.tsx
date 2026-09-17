import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetailPage } from "@/features/orders/page/OrderDetailPage";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${id} — Meridian` };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!id) notFound();
  return <OrderDetailPage orderId={id} />;
}
