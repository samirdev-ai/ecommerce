import type { ReactNode } from "react";
import Link from "next/link";

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link href="/" className="text-h3 font-semibold tracking-tight">Meridian</Link>
          <span className="text-small text-[var(--color-muted-foreground)]">Secure checkout</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
