import type { Metadata } from "next";
import { AddressDetailPage } from "@/features/account/page/AddressDetailPage";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Address ${id} — Meridian` };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <AddressDetailPage addressId={id} />;
}
