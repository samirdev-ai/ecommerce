"use client";
import { ChevronRight } from "lucide-react";
import { CATEGORY_NAVIGATION } from "@/config/category-navigation";
import { useCustomer } from "@/providers/use-customer";
import { Drawer } from "@/features/home/overlays/Drawer";

export interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  const customer = useCustomer();
  return (
    <Drawer open={open} onClose={onClose} side="left" title="Menu">
      <nav aria-label="Mobile categories" className="p-2">
        {!customer && (
          <div className="mb-3 rounded-[var(--radius-md)] bg-[var(--color-muted)] p-3">
            <p className="text-body font-medium">Welcome to Meridian</p>
            <a
              href="/signin"
              className="mt-2 inline-block text-body font-medium text-[var(--color-primary)] hover:underline"
            >
              Sign in or create an account
            </a>
          </div>
        )}
        <ul className="space-y-1">
          {CATEGORY_NAVIGATION.map((cat) => (
            <li key={cat.id}>
              <a
                href={cat.href}
                className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2.5 text-body hover:bg-[var(--color-muted)]"
              >
                {cat.label}
                <ChevronRight className="size-4 text-[var(--color-muted-foreground)]" />
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-[var(--color-border)] pt-3">
          <ul className="space-y-1">
            {[
              { label: "Your orders", href: "/orders" },
              { label: "Wishlist", href: "/wishlist" },
              { label: "Help & support", href: "/help" },
            ].map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="block rounded-[var(--radius-md)] px-3 py-2.5 text-body hover:bg-[var(--color-muted)]"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </Drawer>
  );
}
