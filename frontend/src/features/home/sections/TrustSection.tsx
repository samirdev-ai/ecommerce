import { TRUST_ITEMS } from "@/config/trust-items";
import { Container } from "@/components/primitives/Container";
import { TrustBar } from "@/components/shared/TrustBar";

export function TrustSection() {
  return (
    <section aria-label="Why shop with Meridian" className="pt-12">
      <Container>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-muted)] p-6">
          <TrustBar items={TRUST_ITEMS} />
        </div>
      </Container>
    </section>
  );
}
