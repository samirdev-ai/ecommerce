import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCustomer } from "@/lib/auth";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const customer = await getCustomer();
  if (!customer) {
    redirect("/signin");
  }
  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <a href="/" className="text-h3 font-semibold tracking-tight">Meridian</a>
          <span className="ml-auto text-small text-[var(--color-muted-foreground)]">
            Signed in as {customer.firstName}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
