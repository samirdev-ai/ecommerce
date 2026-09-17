"use client";
import { useCallback, useState } from "react";
import type { Product } from "@/domain/product.types";
import { useAppDispatch } from "@/store/hooks";
import { markLastAdded, openMiniCart, closeMiniCart } from "@/store/slices/cart-ui.slice";
import { toggleOptimistic } from "@/store/slices/wishlist-ui.slice";

export interface HomeHandlers {
  cartOpen: boolean;
  wishlistOpen: boolean;
  quickViewProduct: Product | null;
  handleAddToCart: (p: Product) => void;
  handleToggleWishlist: (p: Product) => void;
  handleQuickView: (p: Product) => void;
  handleOpenCart: () => void;
  handleCloseCart: () => void;
  openWishlist: () => void;
  closeWishlist: () => void;
  closeQuickView: () => void;
}

export function useHomeHandlers(): HomeHandlers {
  const dispatch = useAppDispatch();
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const handleAddToCart = useCallback(
    (p: Product) => {
      dispatch(markLastAdded(p.id));
      dispatch(openMiniCart());
      setCartOpen(true);
    },
    [dispatch],
  );

  const handleToggleWishlist = useCallback(
    (p: Product) => {
      dispatch(toggleOptimistic(p.id));
    },
    [dispatch],
  );

  const handleQuickView = useCallback((p: Product) => setQuickViewProduct(p), []);
  const closeQuickView = useCallback(() => setQuickViewProduct(null), []);

  const handleOpenCart = useCallback(() => {
    setCartOpen(true);
    dispatch(openMiniCart());
  }, [dispatch]);

  const handleCloseCart = useCallback(() => {
    setCartOpen(false);
    dispatch(closeMiniCart());
  }, [dispatch]);

  const openWishlist = useCallback(() => setWishlistOpen(true), []);
  const closeWishlist = useCallback(() => setWishlistOpen(false), []);

  return {
    cartOpen,
    wishlistOpen,
    quickViewProduct,
    handleAddToCart,
    handleToggleWishlist,
    handleQuickView,
    handleOpenCart,
    handleCloseCart,
    openWishlist,
    closeWishlist,
    closeQuickView,
  };
}
