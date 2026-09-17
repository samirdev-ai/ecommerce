import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-h3 font-semibold">Page not found</h1>
      <p className="mt-2 text-body text-[var(--color-muted-foreground)]">
        The page you’re looking for doesn’t exist or has been removed.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-body font-medium text-[var(--color-primary-foreground)]"
      >
        Back to home
      </Link>
    </div>
  );
}
