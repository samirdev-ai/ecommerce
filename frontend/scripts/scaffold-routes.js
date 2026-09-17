#!/usr/bin/env node
/**
 * Route scaffold — customer e-commerce app with route groups.
 * Structure:
 *   src/app/(shop)/          public browsing
 *   src/app/(checkout)/      focused chrome
 *   src/app/(authenticated)/ auth-gated
 *
 * Run: node scripts/scaffold-routes.cjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP = path.join(ROOT, "src", "app");

let written = 0;
function write(relPath, lines) {
  const full = path.join(APP, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, lines.join("\n") + "\n");
  console.log(`  \x1b[32m\u2713\x1b[0m src/app/${relPath}`);
  written++;
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE SNIPPETS
// ─────────────────────────────────────────────────────────────────────────────

function loadingFile() {
  return [
    'export default function Loading() {',
    '  return (',
    '    <div className="mx-auto max-w-7xl px-4 py-8">',
    '      <div className="h-8 w-48 animate-pulse rounded-md bg-[var(--color-muted)]" />',
    '      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">',
    '        {Array.from({ length: 8 }).map((_, i) => (',
    '          <div key={i} className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-muted)]" />',
    '        ))}',
    '      </div>',
    '    </div>',
    '  );',
    '}',
  ];
}

function errorFile(label) {
  return [
    '"use client";',
    'import { useEffect } from "react";',
    '',
    'export default function Error({',
    '  error,',
    '  reset,',
    '}: {',
    '  error: Error & { digest?: string };',
    '  reset: () => void;',
    '}) {',
    '  useEffect(() => {',
    `    console.error("[${label}] route error:", error);`,
    '  }, [error]);',
    '  return (',
    '    <div className="mx-auto max-w-xl px-4 py-16 text-center">',
    '      <h1 className="text-h3 font-semibold">Something went wrong</h1>',
    '      <p className="mt-2 text-body text-[var(--color-muted-foreground)]">',
    '        {error.message || "Please try again."}',
    '      </p>',
    '      <button',
    '        type="button"',
    '        onClick={reset}',
    '        className="mt-6 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-body font-medium text-[var(--color-primary-foreground)]"',
    '      >',
    '        Try again',
    '      </button>',
    '    </div>',
    '  );',
    '}',
  ];
}

function notFoundFile(label) {
  return [
    'import Link from "next/link";',
    '',
    'export default function NotFound() {',
    '  return (',
    '    <div className="mx-auto max-w-xl px-4 py-16 text-center">',
    `      <h1 className="text-h3 font-semibold">${label} not found</h1>`,
    '      <p className="mt-2 text-body text-[var(--color-muted-foreground)]">',
    '        The page you\u2019re looking for doesn\u2019t exist or has been removed.',
    '      </p>',
    '      <Link',
    '        href="/"',
    '        className="mt-6 inline-block rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-body font-medium text-[var(--color-primary-foreground)]"',
    '      >',
    '        Back to home',
    '      </Link>',
    '    </div>',
    '  );',
    '}',
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────

write("layout.tsx", [
  'import type { Metadata } from "next";',
  'import type { ReactNode } from "react";',
  'import "@/styles/globals.css";',
  '',
  'export const metadata: Metadata = {',
  '  title: "Meridian \u2014 Everything you love, delivered",',
  '  description: "Over 1M products from 12,000 verified sellers.",',
  '};',
  '',
  'export default function RootLayout({ children }: { children: ReactNode }) {',
  '  return (',
  '    <html lang="en" suppressHydrationWarning>',
  '      <body className="bg-[var(--color-background)] text-[var(--color-foreground)] antialiased">',
  '        {children}',
  '      </body>',
  '    </html>',
  '  );',
  '}',
]);

write("page.tsx", [
  'import type { Customer } from "@/domain/customer.types";',
  'import { Providers } from "@/providers/Providers";',
  'import { EcommerceHomePage } from "@/features/home/page/EcommerceHomePage";',
  '',
  'async function getCustomer(): Promise<Customer | null> {',
  '  return null;',
  '}',
  '',
  'export default async function Page() {',
  '  const customer = await getCustomer();',
  '  return (',
  '    <Providers customer={customer}>',
  '      <EcommerceHomePage />',
  '    </Providers>',
  '  );',
  '}',
]);

write("loading.tsx", loadingFile());
write("error.tsx", errorFile("root"));
write("not-found.tsx", notFoundFile("Page"));

// ─────────────────────────────────────────────────────────────────────────────
// (shop)
// ─────────────────────────────────────────────────────────────────────────────

write("(shop)/layout.tsx", [
  'import type { ReactNode } from "react";',
  'import Link from "next/link";',
  '',
  'export default function ShopLayout({ children }: { children: ReactNode }) {',
  '  return (',
  '    <div className="min-h-dvh bg-[var(--color-background)]">',
  '      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">',
  '        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">',
  '          <Link href="/" className="text-h3 font-semibold tracking-tight">Meridian</Link>',
  '          <nav className="ml-6 hidden items-center gap-1 text-body md:flex">',
  '            <Link href="/search" className="rounded-[var(--radius-md)] px-3 py-1.5 hover:bg-[var(--color-muted)]">Search</Link>',
  '            <Link href="/deals" className="rounded-[var(--radius-md)] px-3 py-1.5 hover:bg-[var(--color-muted)]">Deals</Link>',
  '            <Link href="/reviews" className="rounded-[var(--radius-md)] px-3 py-1.5 hover:bg-[var(--color-muted)]">Reviews</Link>',
  '            <Link href="/support" className="rounded-[var(--radius-md)] px-3 py-1.5 hover:bg-[var(--color-muted)]">Support</Link>',
  '          </nav>',
  '          <div className="ml-auto flex items-center gap-2">',
  '            <Link href="/cart" className="rounded-[var(--radius-md)] px-3 py-1.5 text-body hover:bg-[var(--color-muted)]">Cart</Link>',
  '            <Link href="/account" className="rounded-[var(--radius-md)] px-3 py-1.5 text-body hover:bg-[var(--color-muted)]">Account</Link>',
  '          </div>',
  '        </div>',
  '      </header>',
  '      <main>{children}</main>',
  '      <footer className="mt-16 border-t border-[var(--color-border)] bg-[var(--color-muted)] py-10">',
  '        <div className="mx-auto max-w-7xl px-4 text-small text-[var(--color-muted-foreground)] sm:px-6 lg:px-8">',
  '          \u00a9 {new Date().getFullYear()} Meridian Commerce, Inc.',
  '        </div>',
  '      </footer>',
  '    </div>',
  '  );',
  '}',
]);

write("(shop)/search/page.tsx", [
  'import type { Metadata } from "next";',
  'import { SearchPage } from "@/features/search/page/SearchPage";',
  '',
  'export const metadata: Metadata = { title: "Search \u2014 Meridian" };',
  '',
  'export default async function Page({',
  '  searchParams,',
  '}: {',
  '  searchParams: Promise<Record<string, string | string[] | undefined>>;',
  '}) {',
  '  const sp = await searchParams;',
  '  const q = typeof sp.q === "string" ? sp.q : "";',
  '  return <SearchPage query={q} searchParams={sp} />;',
  '}',
]);

write("(shop)/category/[slug]/page.tsx", [
  'import type { Metadata } from "next";',
  'import { notFound } from "next/navigation";',
  'import { CategoryPage } from "@/features/category/page/CategoryPage";',
  '',
  'interface Props {',
  '  params: Promise<{ slug: string }>;',
  '  searchParams: Promise<Record<string, string | string[] | undefined>>;',
  '}',
  '',
  'export async function generateMetadata({ params }: Props): Promise<Metadata> {',
  '  const { slug } = await params;',
  '  return { title: `${slug} \u2014 Meridian` };',
  '}',
  '',
  'export default async function Page({ params, searchParams }: Props) {',
  '  const { slug } = await params;',
  '  if (!slug) notFound();',
  '  const sp = await searchParams;',
  '  return <CategoryPage slug={slug} searchParams={sp} />;',
  '}',
]);

write("(shop)/product/[slug]/page.tsx", [
  'import type { Metadata } from "next";',
  'import { notFound } from "next/navigation";',
  'import { ProductDetailPage } from "@/features/product/page/ProductDetailPage";',
  '',
  'interface Props { params: Promise<{ slug: string }> }',
  '',
  'export async function generateMetadata({ params }: Props): Promise<Metadata> {',
  '  const { slug } = await params;',
  '  return { title: `${slug} \u2014 Meridian` };',
  '}',
  '',
  'export default async function Page({ params }: Props) {',
  '  const { slug } = await params;',
  '  if (!slug) notFound();',
  '  return <ProductDetailPage slug={slug} />;',
  '}',
]);

write("(shop)/brand/[slug]/page.tsx", [
  'import type { Metadata } from "next";',
  'import { notFound } from "next/navigation";',
  'import { BrandStorePage } from "@/features/brand/page/BrandStorePage";',
  '',
  'interface Props { params: Promise<{ slug: string }> }',
  '',
  'export async function generateMetadata({ params }: Props): Promise<Metadata> {',
  '  const { slug } = await params;',
  '  return { title: `${slug} \u2014 Meridian` };',
  '}',
  '',
  'export default async function Page({ params }: Props) {',
  '  const { slug } = await params;',
  '  if (!slug) notFound();',
  '  return <BrandStorePage slug={slug} />;',
  '}',
]);

write("(shop)/deals/page.tsx", [
  'import type { Metadata } from "next";',
  'import { DealsPage } from "@/features/deals/page/DealsPage";',
  '',
  'export const metadata: Metadata = { title: "Deals \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <DealsPage />;',
  '}',
]);

write("(shop)/support/page.tsx", [
  'import type { Metadata } from "next";',
  'import { SupportPage } from "@/features/notifications/page/SupportPage";',
  '',
  'export const metadata: Metadata = { title: "Support \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <SupportPage />;',
  '}',
]);

write("(shop)/reviews/page.tsx", [
  'import type { Metadata } from "next";',
  'import { ReviewsPage } from "@/features/reviews/page/ReviewsPage";',
  '',
  'export const metadata: Metadata = { title: "Reviews \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <ReviewsPage />;',
  '}',
]);

// ─────────────────────────────────────────────────────────────────────────────
// (checkout)
// ─────────────────────────────────────────────────────────────────────────────

write("(checkout)/layout.tsx", [
  'import type { ReactNode } from "react";',
  'import Link from "next/link";',
  '',
  'export default function CheckoutLayout({ children }: { children: ReactNode }) {',
  '  return (',
  '    <div className="min-h-dvh bg-[var(--color-background)]">',
  '      <header className="border-b border-[var(--color-border)]">',
  '        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">',
  '          <Link href="/" className="text-h3 font-semibold tracking-tight">Meridian</Link>',
  '          <span className="text-small text-[var(--color-muted-foreground)]">Secure checkout</span>',
  '        </div>',
  '      </header>',
  '      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>',
  '    </div>',
  '  );',
  '}',
]);

write("(checkout)/cart/page.tsx", [
  'import type { Metadata } from "next";',
  'import { CartPage } from "@/features/cart/page/CartPage";',
  '',
  'export const metadata: Metadata = { title: "Cart \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <CartPage />;',
  '}',
]);

write("(checkout)/checkout/page.tsx", [
  'import type { Metadata } from "next";',
  'import { CheckoutPage } from "@/features/checkout/page/CheckoutPage";',
  '',
  'export const metadata: Metadata = { title: "Checkout \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <CheckoutPage />;',
  '}',
]);

write("(checkout)/checkout/success/page.tsx", [
  'import type { Metadata } from "next";',
  'import { CheckoutSuccessPage } from "@/features/checkout/page/CheckoutSuccessPage";',
  '',
  'export const metadata: Metadata = { title: "Order confirmed \u2014 Meridian" };',
  '',
  'export default async function Page({',
  '  searchParams,',
  '}: {',
  '  searchParams: Promise<{ orderId?: string }>;',
  '}) {',
  '  const { orderId } = await searchParams;',
  '  return <CheckoutSuccessPage orderId={orderId ?? null} />;',
  '}',
]);

// ─────────────────────────────────────────────────────────────────────────────
// (authenticated)
// ─────────────────────────────────────────────────────────────────────────────

write("(authenticated)/layout.tsx", [
  'import { redirect } from "next/navigation";',
  'import type { ReactNode } from "react";',
  'import { getCustomer } from "@/lib/auth";',
  '',
  'export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {',
  '  const customer = await getCustomer();',
  '  if (!customer) {',
  '    redirect("/signin");',
  '  }',
  '  return (',
  '    <div className="min-h-dvh bg-[var(--color-background)]">',
  '      <header className="border-b border-[var(--color-border)]">',
  '        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">',
  '          <a href="/" className="text-h3 font-semibold tracking-tight">Meridian</a>',
  '          <span className="ml-auto text-small text-[var(--color-muted-foreground)]">',
  '            Signed in as {customer.firstName}',
  '          </span>',
  '        </div>',
  '      </header>',
  '      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>',
  '    </div>',
  '  );',
  '}',
]);

// Account
write("(authenticated)/account/page.tsx", [
  'import type { Metadata } from "next";',
  'import { AccountOverviewPage } from "@/features/account/page/AccountOverviewPage";',
  '',
  'export const metadata: Metadata = { title: "Account \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <AccountOverviewPage />;',
  '}',
]);

write("(authenticated)/account/profile/page.tsx", [
  'import type { Metadata } from "next";',
  'import { ProfilePage } from "@/features/account/page/ProfilePage";',
  '',
  'export const metadata: Metadata = { title: "Profile \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <ProfilePage />;',
  '}',
]);

write("(authenticated)/account/addresses/page.tsx", [
  'import type { Metadata } from "next";',
  'import { AddressesPage } from "@/features/account/page/AddressesPage";',
  '',
  'export const metadata: Metadata = { title: "Addresses \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <AddressesPage />;',
  '}',
]);

write("(authenticated)/account/addresses/[id]/page.tsx", [
  'import type { Metadata } from "next";',
  'import { AddressDetailPage } from "@/features/account/page/AddressDetailPage";',
  '',
  'interface Props { params: Promise<{ id: string }> }',
  '',
  'export async function generateMetadata({ params }: Props): Promise<Metadata> {',
  '  const { id } = await params;',
  '  return { title: `Address ${id} \u2014 Meridian` };',
  '}',
  '',
  'export default async function Page({ params }: Props) {',
  '  const { id } = await params;',
  '  return <AddressDetailPage addressId={id} />;',
  '}',
]);

write("(authenticated)/account/payment-methods/page.tsx", [
  'import type { Metadata } from "next";',
  'import { PaymentMethodsPage } from "@/features/account/page/PaymentMethodsPage";',
  '',
  'export const metadata: Metadata = { title: "Payment methods \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <PaymentMethodsPage />;',
  '}',
]);

write("(authenticated)/account/payment-methods/new/page.tsx", [
  'import type { Metadata } from "next";',
  'import { AddPaymentPage } from "@/features/account/page/AddPaymentPage";',
  '',
  'export const metadata: Metadata = { title: "Add payment \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <AddPaymentPage />;',
  '}',
]);

write("(authenticated)/account/wishlist/page.tsx", [
  'import type { Metadata } from "next";',
  'import { WishlistPage } from "@/features/account/page/WishlistPage";',
  '',
  'export const metadata: Metadata = { title: "Wishlist \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <WishlistPage />;',
  '}',
]);

// Orders
write("(authenticated)/orders/page.tsx", [
  'import type { Metadata } from "next";',
  'import { OrdersPage } from "@/features/orders/page/OrdersPage";',
  '',
  'export const metadata: Metadata = { title: "Orders \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <OrdersPage />;',
  '}',
]);

write("(authenticated)/orders/[id]/page.tsx", [
  'import type { Metadata } from "next";',
  'import { notFound } from "next/navigation";',
  'import { OrderDetailPage } from "@/features/orders/page/OrderDetailPage";',
  '',
  'interface Props { params: Promise<{ id: string }> }',
  '',
  'export async function generateMetadata({ params }: Props): Promise<Metadata> {',
  '  const { id } = await params;',
  '  return { title: `Order ${id} \u2014 Meridian` };',
  '}',
  '',
  'export default async function Page({ params }: Props) {',
  '  const { id } = await params;',
  '  if (!id) notFound();',
  '  return <OrderDetailPage orderId={id} />;',
  '}',
]);

// Returns
write("(authenticated)/returns/page.tsx", [
  'import type { Metadata } from "next";',
  'import { ReturnsPage } from "@/features/returns/page/ReturnsPage";',
  '',
  'export const metadata: Metadata = { title: "Returns \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <ReturnsPage />;',
  '}',
]);

write("(authenticated)/returns/new/page.tsx", [
  'import type { Metadata } from "next";',
  'import { NewReturnPage } from "@/features/returns/page/NewReturnPage";',
  '',
  'export const metadata: Metadata = { title: "Start a return \u2014 Meridian" };',
  '',
  'export default async function Page({',
  '  searchParams,',
  '}: {',
  '  searchParams: Promise<{ orderId?: string }>;',
  '}) {',
  '  const { orderId } = await searchParams;',
  '  return <NewReturnPage orderId={orderId ?? null} />;',
  '}',
]);

write("(authenticated)/returns/[id]/page.tsx", [
  'import type { Metadata } from "next";',
  'import { ReturnDetailPage } from "@/features/returns/page/ReturnDetailPage";',
  '',
  'interface Props { params: Promise<{ id: string }> }',
  '',
  'export async function generateMetadata({ params }: Props): Promise<Metadata> {',
  '  const { id } = await params;',
  '  return { title: `Return ${id} \u2014 Meridian` };',
  '}',
  '',
  'export default async function Page({ params }: Props) {',
  '  const { id } = await params;',
  '  return <ReturnDetailPage returnId={id} />;',
  '}',
]);

// Notifications
write("(authenticated)/notifications/page.tsx", [
  'import type { Metadata } from "next";',
  'import { NotificationsPage } from "@/features/notifications/page/NotificationsPage";',
  '',
  'export const metadata: Metadata = { title: "Notifications \u2014 Meridian" };',
  '',
  'export default function Page() {',
  '  return <NotificationsPage />;',
  '}',
]);

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: lib/auth.ts (needed by (authenticated)/layout.tsx)
// ─────────────────────────────────────────────────────────────────────────────

const LIB = path.join(ROOT, "src", "lib");
fs.mkdirSync(LIB, { recursive: true });
const authPath = path.join(LIB, "auth.ts");
if (!fs.existsSync(authPath)) {
  fs.writeFileSync(authPath, [
    'import type { Customer } from "@/domain/customer.types";',
    '',
    '/**',
    ' * Replace with real session lookup:',
    ' *   const session = await getServerSession(authOptions);',
    ' *   return session?.user ?? null;',
    ' */',
    'export async function getCustomer(): Promise<Customer | null> {',
    '  return {',
    '    id: "cust_demo",',
    '    firstName: "Helena",',
    '    email: "helena.park@example.com",',
    '    isAuthenticated: true,',
    '  };',
    '}',
    '',
  ].join("\n"));
  console.log('  \x1b[32m\u2713\x1b[0m src/lib/auth.ts (stub)');
  written++;
} else {
  console.log('  \x1b[33m\u2022\x1b[0m src/lib/auth.ts already exists — skipped');
}

// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n\x1b[32m\u2705 Routes scaffolded (${written} files)\x1b[0m\n`);
console.log("Next: create the feature components referenced by each route.");
console.log("Run this to see the missing imports:");
console.log("  grep -rhoE '\"@/features/[^\"]+\"' src/app | sort -u\n");