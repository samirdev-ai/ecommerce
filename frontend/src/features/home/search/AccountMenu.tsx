"use client";
import { useEffect, useRef, useState } from "react";
import { User } from "lucide-react";
import { useCustomer } from "@/providers/use-customer";

export function AccountMenu() {
  const customer = useCustomer();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-small hover:bg-[var(--color-muted)]"
      >
        <User className="size-5" />
        <span className="hidden text-left leading-tight xl:block">
          <span className="block text-caption text-[var(--color-muted-foreground)]">
            {customer ? "Hello," : "Sign in"}
          </span>
          <span className="block font-medium">
            {customer ? customer.firstName : "Account"}
          </span>
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-64 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1 shadow-[var(--shadow-lg)] animate-scale-in"
        >
          {!customer && (
            <div className="border-b border-[var(--color-border)] p-3">
              <a
                href="/signin"
                className="block w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-center text-body font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]"
              >
                Sign in
              </a>
              <p className="mt-2 text-center text-caption text-[var(--color-muted-foreground)]">
                New customer?{" "}
                <a href="/register" className="text-[var(--color-primary)] hover:underline">
                  Start here
                </a>
              </p>
            </div>
          )}
          <ul className="py-1">
            {[
              { label: "Your account", href: "/account" },
              { label: "Your orders", href: "/orders" },
              { label: "Your wishlist", href: "/wishlist" },
              { label: "Recommendations", href: "/recommendations" },
              { label: "Customer service", href: "/help" },
            ].map((item) => (
              <li key={item.href} role="none">
                <a
                  role="menuitem"
                  href={item.href}
                  className="block rounded-[var(--radius-sm)] px-3 py-2 text-body hover:bg-[var(--color-muted)]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
