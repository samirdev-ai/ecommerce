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
