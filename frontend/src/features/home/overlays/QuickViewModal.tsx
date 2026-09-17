"use client";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@/domain/product.types";
import { Button } from "@/components/primitives/Button";
import { Price } from "@/components/shared/Price";
import { RatingStars } from "@/components/shared/RatingStars";
import { Modal } from "./Modal";

export interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (p: Product) => void;
}

export function QuickViewModal({ product, onClose, onAddToCart }: QuickViewModalProps) {
  if (!product) return null;
  return (
    <Modal open={!!product} onClose={onClose} title="Quick view" size="lg">
      <div className="grid gap-6 p-5 sm:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image} alt={product.imageAlt} className="size-full object-cover" />
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {product.brand}
            </p>
            <h3 className="mt-1 text-h3 font-semibold">{product.name}</h3>
          </div>
          <RatingStars rating={product.rating} size={16} />
          <Price price={product.price} originalPrice={product.originalPrice} size="lg" />
          {product.installment && (
            <p className="text-small text-[var(--color-muted-foreground)]">
              or {product.installment.perMonth}/mo for {product.installment.months} months
            </p>
          )}
          <p className="text-body text-[var(--color-muted-foreground)] text-pretty">
            {product.freeShipping ? "Free shipping on this item. " : ""}
            In stock and ready to ship. 30-day returns.
          </p>
          <Button
            size="lg"
            iconLeft={<ShoppingCart className="size-4" />}
            onClick={() => {
              onAddToCart(product);
              onClose();
            }}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? "Out of stock" : "Add to cart"}
          </Button>
          <a
            href={`/product/${product.slug}`}
            className="text-center text-body font-medium text-[var(--color-primary)] hover:underline"
          >
            View full details
          </a>
        </div>
      </div>
    </Modal>
  );
}
