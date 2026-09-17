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
