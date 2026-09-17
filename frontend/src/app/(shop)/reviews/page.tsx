import type { Metadata } from "next";
import { ReviewsPage } from "@/features/reviews/page/ReviewsPage";

export const metadata: Metadata = { title: "Reviews — Meridian" };

export default function Page() {
  return <ReviewsPage />;
}
