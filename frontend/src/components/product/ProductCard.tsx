"use client";
import { useState } from "react";
import {
  Heart, Eye, ShoppingCart, Package, Sparkles, TrendingUp, Check,
} from "lucide-react";
import type { Product, ProductCardVariant } from "@/domain/product.types";
import { PRODUCT_CARD_VARIANTS } from "@/config/product-card-variants";
import { cn } from "@/lib/cn";
import { Button } from "@/components/primitives/Button";
import { IconButton } from "@/components/primitives/IconButton";
import { Badge } from "@/components/primitives/Badge";
import { Price } from "@/components/shared/Price";
import { RatingStars } from "@/components/shared/RatingStars";

export interface ProductCardProps {
  product: Product;
  variant?: ProductCardVariant;
  priority?: boolean;
  onQuickView?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  isWishlisted?: boolean;
}

export function ProductCard({
  product,
  variant = "default",
  priority = false,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
}: ProductCardProps) {
  const cfg = PRODUCT_CARD_VARIANTS[variant];
  const [imgError, setImgError] = useState(false);
  const isHorizontal = cfg.layout === "horizontal";
  const lowStock = product.stock > 0 && product.stock <= 10;

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        "transition-[border-color,box-shadow] duration-[var(--duration-base)]",
        "hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)]",
        isHorizontal ? "flex-row" : "flex-col",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-[var(--color-muted)]",
          isHorizontal ? "w-32 sm:w-40" : "w-full",
          !isHorizontal && cfg.imageAspect,
        )}
      >
        <a
          href={`/product/${product.slug}`}
          className="block size-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)]"
          aria-label={product.name}
        >
          {imgError ? (
            <div className="flex size-full items-center justify-center text-[var(--color-muted-foreground)]">
              <Package className="size-8" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.imageAlt}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
              onError={() => setImgError(true)}
              className={cn(
                "size-full object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)]",
                "group-hover:scale-[1.03] motion-reduce:group-hover:scale-100",
              )}
            />
          )}
        </a>

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {product.badge === "sale" && product.discountPercent && (
            <Badge tone="sale">-{product.discountPercent}%</Badge>
          )}
          {product.badge === "new" && (
            <Badge tone="new"><Sparkles className="size-3" /> New</Badge>
          )}
          {product.badge === "trending" && (
            <Badge tone="info"><TrendingUp className="size-3" /> Trending</Badge>
          )}
          {product.badge === "bestseller" && <Badge tone="warning">Bestseller</Badge>}
        </div>

        {onToggleWishlist && (
          <IconButton
            label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            size="sm"
            onClick={(e) => { e.preventDefault(); onToggleWishlist(product); }}
            className={cn(
              "absolute right-2 top-2 bg-[var(--color-surface)]/85 backdrop-blur-sm",
              "shadow-[var(--shadow-xs)] hover:bg-[var(--color-surface)]",
              isWishlisted && "text-[var(--color-danger)]",
            )}
          >
            <Heart className={cn("size-4", isWishlisted && "fill-current")} />
          </IconButton>
        )}

        {cfg.showQuickView && onQuickView && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden justify-center p-2 opacity-0 transition-opacity duration-[var(--duration-base)] group-hover:pointer-events-auto group-hover:opacity-100 md:flex">
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Eye className="size-3.5" />}
              onClick={() => onQuickView(product)}
              className="shadow-[var(--shadow-md)]"
            >
              Quick view
            </Button>
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1.5",
          cfg.size === "sm" ? "p-2.5" : "p-3 sm:p-4",
        )}
      >
        {cfg.showBrand && (
          <p className="text-caption font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {product.brand}
          </p>
        )}

        <h3 className={cn("line-clamp-2 font-medium leading-snug", cfg.size === "sm" ? "text-small" : "text-body")}>
          <a
            href={`/product/${product.slug}`}
            className="after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none"
          >
            {product.name}
          </a>
        </h3>

        {cfg.showRating && <RatingStars rating={product.rating} size={cfg.size === "sm" ? 12 : 14} />}

        <div className="mt-auto flex flex-col gap-1 pt-1">
          <Price
            price={product.price}
            originalPrice={product.originalPrice}
            size={cfg.size === "sm" ? "sm" : "md"}
          />

          {cfg.showInstallment && product.installment && (
            <p className="text-caption text-[var(--color-muted-foreground)]">
              or {product.installment.perMonth}/mo for {product.installment.months} mo
            </p>
          )}

          {cfg.showStock && (
            <div className="flex items-center gap-2 text-caption">
              {product.stock === 0 ? (
                <span className="font-medium text-[var(--color-danger)]">Out of stock</span>
              ) : lowStock ? (
                <span className="font-medium text-[var(--color-warning)]">Only {product.stock} left</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[var(--color-success)]">
                  <Check className="size-3" /> In stock
                </span>
              )}
              {product.freeShipping && (
                <span className="text-[var(--color-muted-foreground)]">· Free shipping</span>
              )}
            </div>
          )}

          {onAddToCart && (
            <div className="relative z-10 pt-2">
              <Button
                size="sm"
                variant="primary"
                className="w-full"
                disabled={product.stock === 0}
                onClick={() => onAddToCart(product)}
                iconLeft={<ShoppingCart className="size-3.5" />}
              >
                {product.stock === 0 ? "Unavailable" : "Add to cart"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
