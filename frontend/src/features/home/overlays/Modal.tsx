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
