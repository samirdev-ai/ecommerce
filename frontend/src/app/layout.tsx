import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meridian — Everything you love, delivered",
  description: "Over 1M products from 12,000 verified sellers.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[var(--color-background)] text-[var(--color-foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}
