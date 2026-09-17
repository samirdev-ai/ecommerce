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
