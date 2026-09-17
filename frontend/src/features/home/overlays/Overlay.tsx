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
