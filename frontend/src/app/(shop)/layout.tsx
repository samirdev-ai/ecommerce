import type { ReactNode } from "react";
import Link from "next/link";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-h3 font-semibold tracking-tight">Meridian</Link>
          <nav className="ml-6 hidden items-center gap-1 text-body md:flex">
            <Link href="/search" className="rounded-[var(--radius-md)] px-3 py-1.5 hover:bg-[var(--color-muted)]">Search</Link>
            <Link href="/deals" className="rounded-[var(--radius-md)] px-3 py-1.5 hover:bg-[var(--color-muted)]">Deals</Link>
            <Link href="/reviews" className="rounded-[var(--radius-md)] px-3 py-1.5 hover:bg-[var(--color-muted)]">Reviews</Link>
            <Link href="/support" className="rounded-[var(--radius-md)] px-3 py-1.5 hover:bg-[var(--color-muted)]">Support</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/cart" className="rounded-[var(--radius-md)] px-3 py-1.5 text-body hover:bg-[var(--color-muted)]">Cart</Link>
            <Link href="/account" className="rounded-[var(--radius-md)] px-3 py-1.5 text-body hover:bg-[var(--color-muted)]">Account</Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t border-[var(--color-border)] bg-[var(--color-muted)] py-10">
        <div className="mx-auto max-w-7xl px-4 text-small text-[var(--color-muted-foreground)] sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Meridian Commerce, Inc.
        </div>
      </footer>
    </div>
  );
}
