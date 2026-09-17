export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="h-8 w-48 animate-pulse rounded-md bg-[var(--color-muted)]" />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-muted)]" />
        ))}
      </div>
    </div>
  );
}
