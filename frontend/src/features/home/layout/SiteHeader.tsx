"use client";
import { Heart, Menu, ShoppingCart } from "lucide-react";
import type { Product } from "@/domain/product.types";
import { useAppDispatch } from "@/store/hooks";
import { toggleMobileNav } from "@/store/slices/ui.slice";
import { useGetCartQuery, useGetWishlistQuery } from "@/store/api/ecommerce.api";
import { useCustomer } from "@/providers/use-customer";
import { Container } from "@/components/primitives/Container";
import { IconButton } from "@/components/primitives/IconButton";
import { SearchBar } from "@/features/home/search/SearchBar";
import { LocationSelector } from "@/features/home/search/LocationSelector";
import { AccountMenu } from "@/features/home/search/AccountMenu";
import { AnnouncementBar } from "./AnnouncementBar";

export interface SiteHeaderProps {
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onQuickView: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onToggleWishlist: (p: Product) => void;
  wishlistedIds: Set<string>;
}

export function SiteHeader({
  onOpenCart,
  onOpenWishlist,
  onQuickView,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
}: SiteHeaderProps) {
  const dispatch = useAppDispatch();
  const customer = useCustomer();
  const { data: cart } = useGetCartQuery();
  const { data: wishlist } = useGetWishlistQuery(undefined, { skip: !customer });
  const cartCount = cart?.itemCount ?? 0;
  const wishlistCount = (wishlist?.length ?? 0) + wishlistedIds.size;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/80">
      <AnnouncementBar />

      <Container size="wide">
        <div className="flex h-16 items-center gap-3">
          <IconButton
            label="Open menu"
            className="lg:hidden"
            onClick={() => dispatch(toggleMobileNav(true))}
          >
            <Menu className="size-5" />
          </IconButton>

          <a href="/" className="flex shrink-0 items-center gap-2" aria-label="Meridian home">
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-body-lg font-bold text-[var(--color-primary-foreground)]"
            >
              M
            </span>
            <span className="hidden text-h3 font-semibold tracking-tight sm:block">
              Meridian
            </span>
          </a>

          <LocationSelector />

          <div className="mx-1 hidden min-w-0 flex-1 md:block">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-0.5">
            <AccountMenu />

            <IconButton label="Wishlist" onClick={onOpenWishlist} className="hidden sm:inline-flex">
              <Heart className="size-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold leading-4 text-white">
                  {wishlistCount}
                </span>
              )}
            </IconButton>

            <IconButton label="Cart" onClick={onOpenCart}>
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold leading-4 text-[var(--color-primary-foreground)]">
                  {cartCount}
                </span>
              )}
            </IconButton>
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <SearchBar />
        </div>
      </Container>
    </header>
  );
}
