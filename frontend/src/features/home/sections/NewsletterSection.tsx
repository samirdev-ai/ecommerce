"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowRight, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { delay } from "@/mocks/delay";
import { Container } from "@/components/primitives/Container";
import { Button } from "@/components/primitives/Button";

const newsletterSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(254, "Email is too long"),
});

type NewsletterValues = z.infer<typeof newsletterSchema>;

export function NewsletterSection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate">("idle");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewsletterValues>({
    resolver: zodResolver(newsletterSchema),
    mode: "onBlur",
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus("loading");
    try {
      await delay(null, 650);
      if (values.email.toLowerCase().startsWith("dup")) {
        setStatus("duplicate");
        return;
      }
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  });

  return (
    <section aria-labelledby="newsletter-heading" className="pt-12">
      <Container>
        <div className="grid gap-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              <Mail className="size-3.5" /> Newsletter
            </p>
            <h2 id="newsletter-heading" className="text-h2 font-semibold">
              Get early access to deals
            </h2>
            <p className="mt-1 max-w-md text-body text-[var(--color-muted-foreground)]">
              Sign up for weekly offers, new arrivals, and product drops. Unsubscribe anytime.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="newsletter-email">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "newsletter-error" : undefined}
                {...register("email")}
                disabled={status === "loading" || status === "success"}
                className={cn(
                  "h-11 min-w-0 flex-1 rounded-[var(--radius-lg)] border bg-[var(--color-surface)] px-4 text-body outline-none",
                  "placeholder:text-[var(--color-muted-foreground)]",
                  "focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-focus)]",
                  errors.email ? "border-[var(--color-danger)]" : "border-[var(--color-border-strong)]",
                )}
              />
              <Button
                type="submit"
                size="lg"
                loading={status === "loading"}
                iconRight={<ArrowRight className="size-4" />}
                className="sm:w-auto"
              >
                Subscribe
              </Button>
            </div>

            {errors.email && (
              <p id="newsletter-error" role="alert" className="text-small text-[var(--color-danger)]">
                {errors.email.message}
              </p>
            )}
            {status === "success" && (
              <p role="status" className="inline-flex items-center gap-1.5 text-small text-[var(--color-success)]">
                <Check className="size-4" /> You're subscribed. Check your inbox for a welcome offer.
              </p>
            )}
            {status === "duplicate" && (
              <p role="status" className="inline-flex items-center gap-1.5 text-small text-[var(--color-warning)]">
                <AlertCircle className="size-4" /> This email is already subscribed.
              </p>
            )}
            {status === "error" && (
              <p role="alert" className="inline-flex items-center gap-1.5 text-small text-[var(--color-danger)]">
                <AlertCircle className="size-4" /> Something went wrong. Please try again.
              </p>
            )}
            <p className="text-caption text-[var(--color-muted-foreground)]">
              By subscribing you agree to our{" "}
              <a href="/privacy" className="underline underline-offset-2 hover:text-[var(--color-foreground)]">
                Privacy Policy
              </a>.
            </p>
          </form>
        </div>
      </Container>
    </section>
  );
}
