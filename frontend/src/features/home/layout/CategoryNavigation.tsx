"use client";
import { ChevronDown, Menu } from "lucide-react";
import { CATEGORY_NAVIGATION } from "@/config/category-navigation";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setActiveMegaMenu } from "@/store/slices/ui.slice";
import { Container } from "@/components/primitives/Container";
import { MegaMenu } from "./MegaMenu";

export function CategoryNavigation() {
  const dispatch = useAppDispatch();
  const active = useAppSelector((s) => s.ui.activeMegaMenu);

  return (
    <nav
      aria-label="Primary categories"
      className="border-b border-[var(--color-border)] bg-[var(--color-surface)]"
      onMouseLeave={() => dispatch(setActiveMegaMenu(null))}
    >
      <Container size="wide">
        <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto py-1">
          <li className="shrink-0">
            <a
              href="/category"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-body font-medium hover:bg-[var(--color-muted)]"
            >
              <Menu className="size-4" /> All
            </a>
          </li>
          {CATEGORY_NAVIGATION.map((cat) => (
            <li
              key={cat.id}
              className="shrink-0"
              onMouseEnter={() => cat.columns && dispatch(setActiveMegaMenu(cat.id))}
            >
              <a
                href={cat.href}
                aria-haspopup={cat.columns ? "true" : undefined}
                aria-expanded={cat.columns ? active === cat.id : undefined}
                className={cn(
                  "inline-flex items-center gap-1 rounded-[var(--radius-md)] px-3 py-2 text-body",
                  "transition-colors hover:bg-[var(--color-muted)]",
                  active === cat.id && "bg-[var(--color-muted)]",
                )}
              >
                {cat.label}
                {cat.columns && <ChevronDown className="size-3.5 opacity-60" />}
              </a>
            </li>
          ))}
        </ul>
      </Container>

      {active && <MegaMenu item={CATEGORY_NAVIGATION.find((c) => c.id === active) ?? null} />}
    </nav>
  );
}
