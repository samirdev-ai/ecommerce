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
