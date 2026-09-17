#!/usr/bin/env node
/**
 * PR 5 — Extract layout, search, and overlays.
 * Moves §13 (header/nav/footer), the search-related dropdown components,
 * and §15 (drawers/modals) out of the main file.
 * Zero behavior change.
 *
 * Run: node scripts/scaffold-pr5.js
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

let written = 0;
function write(relPath, content) {
  const full = path.join(SRC, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.replace(/^\n/, ""));
  console.log(`  \x1b[32m\u2713\x1b[0m src/${relPath}`);
  written++;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/layout/AnnouncementBar.tsx", `
import { Truck } from "lucide-react";
import { Container } from "@/components/primitives/Container";

export function AnnouncementBar() {
  return (
    <div className="bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]">
      <Container size="wide">
        <p className="flex items-center justify-center gap-2 py-2 text-center text-small">
          <Truck className="size-3.5" aria-hidden />
          <span>
            Free shipping on orders over $35 ·{" "}
            <a href="/plus" className="underline underline-offset-2 hover:opacity-90">
              Join Meridian Plus for free 2-day delivery
            </a>
          </span>
        </p>
      </Container>
    </div>
  );
}
`);

write("features/home/layout/SiteHeader.tsx", `
"use client";
import { Heart, Menu, ShoppingCart } from "lucide-react";
import type { Product } from "@/domain/product.types";
import { useAppDispatch } from "@/store/hooks";
import { toggleMobileNav } from "@/store/slices/ui.slice";
import { useGetCartQuery, useGetWishlistQuery } from "@/store/api/ecommerce.api";
import { useCustomer } from "@/providers/use-customer";
import { Container } from "@/components/primitives/Container";
import { IconButton } from "@/components/primitives/IconButton";
import { SearchBar } from "@/features/home/search/SearchBar";
import { LocationSelector } from "@/features/home/search/LocationSelector";
import { AccountMenu } from "@/features/home/search/AccountMenu";
import { AnnouncementBar } from "./AnnouncementBar";

export interface SiteHeaderProps {
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
}

export function SiteHeader({
  onOpenCart,
  onOpenWishlist,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
}: SiteHeaderProps) {
  const dispatch = useAppDispatch();
  const customer = useCustomer();
  const { data: cart } = useGetCartQuery();
  const { data: wishlist } = useGetWishlistQuery(undefined, { skip: !customer });
  const cartCount = cart?.itemCount ?? 0;
  const wishlistCount = (wishlist?.length ?? 0) + wishlistedIds.size;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/80">
      <AnnouncementBar />

      <Container size="wide">
        <div className="flex h-16 items-center gap-3">
          <IconButton
            label="Open menu"
            className="lg:hidden"
            onClick={() => dispatch(toggleMobileNav(true))}
          >
            <Menu className="size-5" />
          </IconButton>

          <a href="/" className="flex shrink-0 items-center gap-2" aria-label="Meridian home">
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-body-lg font-bold text-[var(--color-primary-foreground)]"
            >
              M
            </span>
            <span className="hidden text-h3 font-semibold tracking-tight sm:block">
              Meridian
            </span>
          </a>

          <LocationSelector />

          <div className="mx-1 hidden min-w-0 flex-1 md:block">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-0.5">
            <AccountMenu />

            <IconButton label="Wishlist" onClick={onOpenWishlist} className="hidden sm:inline-flex">
              <Heart className="size-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold leading-4 text-white">
                  {wishlistCount}
                </span>
              )}
            </IconButton>

            <IconButton label="Cart" onClick={onOpenCart}>
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold leading-4 text-[var(--color-primary-foreground)]">
                  {cartCount}
                </span>
              )}
            </IconButton>
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <SearchBar />
        </div>
      </Container>
    </header>
  );
}
`);

write("features/home/layout/CategoryNavigation.tsx", `
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
              href="/c"
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
`);

write("features/home/layout/MegaMenu.tsx", `
import type { CategoryNavItem } from "@/domain/category.types";
import { Container } from "@/components/primitives/Container";

export function MegaMenu({ item }: { item: CategoryNavItem | null }) {
  if (!item?.columns) return null;
  return (
    <div
      className="absolute left-0 right-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-lg)] animate-fade-in"
      role="region"
      aria-label={\`\${item.label} menu\`}
    >
      <Container size="wide">
        <div className="grid grid-cols-4 gap-8 py-6">
          {item.columns.map((col) => (
            <div key={col.title}>
              <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {col.title}
              </p>
              <ul className="space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="block rounded-[var(--radius-sm)] px-1 py-1 text-body hover:text-[var(--color-primary)]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {item.featured && (
            <a href={item.featured.href} className="group block">
              <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-muted)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.featured.image}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                />
              </div>
              <p className="mt-2 text-body font-medium">{item.featured.title}</p>
            </a>
          )}
        </div>
      </Container>
    </div>
  );
}
`);

write("features/home/layout/FooterGroupBlock.tsx", `
"use client";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FooterGroup } from "@/config/footer-groups";
import { cn } from "@/lib/cn";

export function FooterGroupBlock({ group }: { group: FooterGroup }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between text-left lg:cursor-default lg:pointer-events-none"
      >
        <span className="text-caption font-semibold uppercase tracking-wide text-[var(--color-foreground)]">
          {group.title}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 text-[var(--color-muted-foreground)] transition-transform duration-[var(--duration-base)] lg:hidden",
            open && "rotate-180",
          )}
        />
      </button>
      <ul
        id={id}
        className={cn(
          "mt-2 space-y-1.5 overflow-hidden",
          "lg:mt-3 lg:max-h-none lg:opacity-100",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0 lg:opacity-100",
          "transition-[max-height,opacity] duration-[var(--duration-base)] ease-[var(--ease-out)]",
        )}
      >
        {group.links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="text-small text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
`);

write("features/home/layout/SiteFooter.tsx", `
import { FOOTER_GROUPS } from "@/config/footer-groups";
import { Container } from "@/components/primitives/Container";
import { FooterGroupBlock } from "./FooterGroupBlock";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--color-border)] bg-[var(--color-muted)]">
      <Container>
        <div className="grid gap-8 py-10 lg:grid-cols-6">
          {FOOTER_GROUPS.map((group) => (
            <FooterGroupBlock key={group.id} group={group} />
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-[var(--color-border)] py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-small text-[var(--color-muted-foreground)]">
            <span>© {new Date().getFullYear()} Meridian Commerce, Inc.</span>
            <a href="/legal" className="hover:text-[var(--color-foreground)]">Legal</a>
            <a href="/privacy" className="hover:text-[var(--color-foreground)]">Privacy</a>
            <a href="/terms" className="hover:text-[var(--color-foreground)]">Terms</a>
          </div>
          <ul className="flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
            {["Visa", "MC", "Amex", "PayPal", "Apple Pay", "Google Pay"].map((m) => (
              <li
                key={m}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-caption font-medium"
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
`);

write("features/home/layout/MobileNavigation.tsx", `
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
`);

write("features/home/layout/index.ts", `
export * from "./AnnouncementBar";
export * from "./SiteHeader";
export * from "./CategoryNavigation";
export * from "./MegaMenu";
export * from "./FooterGroupBlock";
export * from "./SiteFooter";
export * from "./MobileNavigation";
`);

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/search/SearchBar.tsx", `
"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Search, Clock, X } from "lucide-react";
import type { SearchSuggestion } from "@/domain/search.types";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addRecentQuery, clearRecentQueries } from "@/store/slices/search-ui.slice";
import { useGetSearchSuggestionsQuery } from "@/store/api/ecommerce.api";
import { Skeleton } from "@/components/primitives/Skeleton";

export interface SearchBarProps {
  onSelectSuggestion?: (s: SearchSuggestion) => void;
}

export function SearchBar({ onSelectSuggestion }: SearchBarProps) {
  const dispatch = useAppDispatch();
  const recentQueries = useAppSelector((s) => s.searchUi.recentQueries);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const { data: suggestions = [], isFetching, isError } = useGetSearchSuggestionsQuery(query, {
    skip: query.trim().length < 2,
  });

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showRecent = query.length < 2 && recentQueries.length > 0;
  const items: SearchSuggestion[] = showRecent
    ? recentQueries.map<SearchSuggestion>((q) => ({
        id: \`recent-\${q}\`,
        type: "query",
        label: q,
        href: \`/search?q=\${encodeURIComponent(q)}\`,
      }))
    : suggestions;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        commit(items[activeIndex]);
      } else if (query.trim()) {
        commit({
          id: "submit",
          type: "query",
          label: query,
          href: \`/search?q=\${encodeURIComponent(query)}\`,
        });
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const commit = (s: SearchSuggestion) => {
    dispatch(addRecentQuery(s.label));
    onSelectSuggestion?.(s);
    setOpen(false);
    if (typeof window !== "undefined") window.location.assign(s.href);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          "flex h-11 items-center gap-2 rounded-[var(--radius-lg)] border bg-[var(--color-surface)] px-3",
          "transition-[border-color,box-shadow]",
          open
            ? "border-[var(--color-primary)] shadow-[var(--shadow-focus)]"
            : "border-[var(--color-border-strong)]",
        )}
      >
        <Search className="size-4 shrink-0 text-[var(--color-muted-foreground)]" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? \`\${listboxId}-opt-\${activeIndex}\` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products, brands, and categories"
          className="h-full min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-[var(--color-muted-foreground)]"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="rounded-full p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && (items.length > 0 || isFetching || showRecent) && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-lg)] animate-scale-in">
          {showRecent && (
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
              <p className="text-caption font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Recent searches
              </p>
              <button
                type="button"
                className="text-caption text-[var(--color-primary)] hover:underline"
                onClick={() => dispatch(clearRecentQueries())}
              >
                Clear
              </button>
            </div>
          )}
          {isFetching && (
            <div className="space-y-2 p-4" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-[var(--radius-sm)]" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {isError && (
            <p className="p-4 text-small text-[var(--color-muted-foreground)]">
              Suggestions unavailable. Press Enter to search.
            </p>
          )}
          {!isFetching && items.length > 0 && (
            <ul id={listboxId} role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
              {items.map((s, i) => (
                <li
                  key={s.id}
                  id={\`\${listboxId}-opt-\${i}\`}
                  role="option"
                  aria-selected={i === activeIndex}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commit(s)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left",
                      i === activeIndex
                        ? "bg-[var(--color-muted)]"
                        : "hover:bg-[var(--color-muted)]",
                    )}
                  >
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image} alt="" className="size-9 rounded-[var(--radius-sm)] object-cover" />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                        {s.type === "query" ? <Clock className="size-4" /> : <Search className="size-4" />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body">{s.label}</span>
                      {s.meta && (
                        <span className="block truncate text-caption text-[var(--color-muted-foreground)]">
                          {s.meta}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
`);

write("features/home/search/LocationSelector.tsx", `
"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLocation } from "@/store/slices/preferences.slice";

export function LocationSelector() {
  const dispatch = useAppDispatch();
  const location = useAppSelector((s) => s.preferences.location);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const options = ["New York, NY", "San Francisco, CA", "Austin, TX", "Seattle, WA"];

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-small hover:bg-[var(--color-muted)]"
      >
        <MapPin className="size-4 text-[var(--color-muted-foreground)]" />
        <span className="max-w-[10rem] truncate">
          <span className="text-[var(--color-muted-foreground)]">Deliver to </span>
          <span className="font-medium">{location}</span>
        </span>
        <ChevronDown className="size-3.5 text-[var(--color-muted-foreground)]" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-40 min-w-[14rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-[var(--shadow-lg)] animate-scale-in"
        >
          {options.map((o) => (
            <li key={o} role="option" aria-selected={o === location}>
              <button
                type="button"
                onClick={() => {
                  dispatch(setLocation(o));
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2 text-left text-body hover:bg-[var(--color-muted)]",
                  o === location && "font-medium text-[var(--color-primary)]",
                )}
              >
                {o}
                {o === location && <Check className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
`);

write("features/home/search/AccountMenu.tsx", `
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
`);

write("features/home/search/index.ts", `
export * from "./SearchBar";
export * from "./LocationSelector";
export * from "./AccountMenu";
`);

// ─────────────────────────────────────────────────────────────────────────────
// OVERLAYS — base
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/overlays/Overlay.tsx", `
export function Overlay({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close dialog"
      onClick={onClose}
      className="absolute inset-0 bg-[var(--color-overlay)] animate-fade-in"
    />
  );
}
`);

write("features/home/overlays/Drawer.tsx", `
"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { IconButton } from "@/components/primitives/IconButton";
import { Overlay } from "./Overlay";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title: string;
  children: ReactNode;
}

export function Drawer({ open, onClose, side = "right", title, children }: DrawerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useBodyScrollLock(open);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <Overlay onClose={onClose} />
      <div
        ref={ref}
        className={cn(
          "absolute top-0 flex h-full w-full max-w-md flex-col bg-[var(--color-surface-elevated)] shadow-[var(--shadow-lg)]",
          side === "right" ? "right-0 animate-slide-in-right" : "left-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-h3 font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
`);

write("features/home/overlays/Modal.tsx", `
"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { IconButton } from "@/components/primitives/IconButton";
import { Overlay } from "./Overlay";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, children, size = "lg" }: ModalProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useBodyScrollLock(open);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const max = size === "sm" ? "max-w-md" : size === "md" ? "max-w-xl" : "max-w-3xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <Overlay onClose={onClose} />
      <div
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-lg)] animate-scale-in",
          max,
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <h2 className="text-h3 font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// OVERLAYS — concrete
// ─────────────────────────────────────────────────────────────────────────────

write("features/home/overlays/MiniCart.tsx", `
"use client";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useGetCartQuery } from "@/store/api/ecommerce.api";
import { Button } from "@/components/primitives/Button";
import { IconButton } from "@/components/primitives/IconButton";
import { Skeleton } from "@/components/primitives/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Drawer } from "./Drawer";

export interface MiniCartProps {
  open: boolean;
  onClose: () => void;
}

export function MiniCart({ open, onClose }: MiniCartProps) {
  const { data, isLoading, isError, refetch } = useGetCartQuery();

  return (
    <Drawer open={open} onClose={onClose} title="Your Cart">
      {isLoading && (
        <div className="space-y-4 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-20 rounded-[var(--radius-md)]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}
      {isError && (
        <div className="p-4">
          <ErrorState title="Couldn't load your cart" onRetry={refetch} />
        </div>
      )}
      {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
        <div className="p-4">
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Browse our best sellers and start filling it up."
            action={<Button onClick={onClose}>Continue shopping</Button>}
          />
        </div>
      )}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <ul className="divide-y divide-[var(--color-border)]">
            {data.items.map((item) => (
              <li key={item.id} className="flex gap-3 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" className="size-20 rounded-[var(--radius-md)] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-body font-medium">{item.name}</p>
                  <p className="mt-1 text-body font-semibold">{item.unitPrice.formatted}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)]">
                      <IconButton label="Decrease quantity" size="sm">
                        <Minus className="size-3" />
                      </IconButton>
                      <span className="min-w-6 text-center text-small tabular-nums">{item.quantity}</span>
                      <IconButton label="Increase quantity" size="sm">
                        <Plus className="size-3" />
                      </IconButton>
                    </div>
                    <IconButton label={\`Remove \${item.name}\`} size="sm">
                      <Trash2 className="size-3.5" />
                    </IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--color-border)] p-4">
            <div className="flex justify-between text-body">
              <span>Subtotal</span>
              <span className="font-semibold tabular-nums">{data.subtotal.formatted}</span>
            </div>
            <p className="mt-1 text-caption text-[var(--color-muted-foreground)]">
              Shipping and taxes calculated at checkout.
            </p>
            <Button size="lg" className="mt-3 w-full">
              Checkout · {data.estimatedTotal.formatted}
            </Button>
          </div>
        </>
      )}
    </Drawer>
  );
}
`);

write("features/home/overlays/WishlistDrawer.tsx", `
"use client";
import { Heart } from "lucide-react";
import { useGetWishlistQuery } from "@/store/api/ecommerce.api";
import { useCustomer } from "@/providers/use-customer";
import { Button } from "@/components/primitives/Button";
import { Skeleton } from "@/components/primitives/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Drawer } from "./Drawer";

export interface WishlistDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function WishlistDrawer({ open, onClose }: WishlistDrawerProps) {
  const customer = useCustomer();
  const { data, isLoading } = useGetWishlistQuery(undefined, { skip: !customer });

  return (
    <Drawer open={open} onClose={onClose} title="Your Wishlist">
      {!customer && (
        <div className="p-4">
          <EmptyState
            icon={Heart}
            title="Sign in to save items"
            description="Your wishlist is synced across devices when you're signed in."
            action={<Button onClick={onClose}>Sign in</Button>}
          />
        </div>
      )}
      {customer && isLoading && (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}
      {customer && !isLoading && (data?.length ?? 0) === 0 && (
        <div className="p-4">
          <EmptyState
            icon={Heart}
            title="No saved items yet"
            description="Tap the heart on any product to save it here."
          />
        </div>
      )}
    </Drawer>
  );
}
`);

write("features/home/overlays/QuickViewModal.tsx", `
"use client";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@/domain/product.types";
import { Button } from "@/components/primitives/Button";
import { Price } from "@/components/shared/Price";
import { RatingStars } from "@/components/shared/RatingStars";
import { Modal } from "./Modal";

export interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (p: Product) => void;
}

export function QuickViewModal({ product, onClose, onAddToCart }: QuickViewModalProps) {
  if (!product) return null;
  return (
    <Modal open={!!product} onClose={onClose} title="Quick view" size="lg">
      <div className="grid gap-6 p-5 sm:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image} alt={product.imageAlt} className="size-full object-cover" />
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {product.brand}
            </p>
            <h3 className="mt-1 text-h3 font-semibold">{product.name}</h3>
          </div>
          <RatingStars rating={product.rating} size={16} />
          <Price price={product.price} originalPrice={product.originalPrice} size="lg" />
          {product.installment && (
            <p className="text-small text-[var(--color-muted-foreground)]">
              or {product.installment.perMonth}/mo for {product.installment.months} months
            </p>
          )}
          <p className="text-body text-[var(--color-muted-foreground)] text-pretty">
            {product.freeShipping ? "Free shipping on this item. " : ""}
            In stock and ready to ship. 30-day returns.
          </p>
          <Button
            size="lg"
            iconLeft={<ShoppingCart className="size-4" />}
            onClick={() => {
              onAddToCart(product);
              onClose();
            }}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? "Out of stock" : "Add to cart"}
          </Button>
          <a
            href={\`/p/\${product.slug}\`}
            className="text-center text-body font-medium text-[var(--color-primary)] hover:underline"
          >
            View full details
          </a>
        </div>
      </div>
    </Modal>
  );
}
`);

write("features/home/overlays/index.ts", `
export * from "./Overlay";
export * from "./Drawer";
export * from "./Modal";
export * from "./MiniCart";
export * from "./WishlistDrawer";
export * from "./QuickViewModal";
`);

// ─────────────────────────────────────────────────────────────────────────────
// DONE
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n\x1b[32m\u2705 PR 5 scaffolded (${written} files)\x1b[0m`);
console.log("\nNext: edit src/features/home/page/EcommerceHomePage.tsx to:");
console.log("  1. Delete §13 (SiteHeader, AnnouncementBar, CategoryNavigation, MegaMenu,");
console.log("     SiteFooter, FooterGroupBlock, MobileNavigation).");
console.log("  2. Delete SearchBar, LocationSelector, AccountMenu.");
console.log("  3. Delete §15 overlays (Overlay, Drawer, Modal, MiniCart, WishlistDrawer,");
console.log("     QuickViewModal).");
console.log("  4. Import from @/features/home/layout, @/features/home/search,");
console.log("     @/features/home/overlays.");
console.log("  5. Keep §16 (page composition).");
console.log("\nRun: node scripts/scaffold-pr5.js\n");