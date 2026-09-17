import type { ProductCardVariant, ProductCardVariantConfig } from "@/domain/product.types";

export const PRODUCT_CARD_VARIANTS: Record<ProductCardVariant, ProductCardVariantConfig> = {
  default: {
    imageAspect: "aspect-square",
    showRating: true, showBrand: true, showInstallment: false,
    showQuickView: true, showStock: true,
    layout: "vertical", size: "md",
  },
  compact: {
    imageAspect: "aspect-square",
    showRating: false, showBrand: false, showInstallment: false,
    showQuickView: false, showStock: false,
    layout: "vertical", size: "sm",
  },
  horizontal: {
    imageAspect: "aspect-square",
    showRating: true, showBrand: true, showInstallment: false,
    showQuickView: false, showStock: true,
    layout: "horizontal", size: "md",
  },
  featured: {
    imageAspect: "aspect-[4/3]",
    showRating: true, showBrand: true, showInstallment: true,
    showQuickView: true, showStock: true,
    layout: "vertical", size: "lg",
  },
  sale: {
    imageAspect: "aspect-square",
    showRating: true, showBrand: true, showInstallment: false,
    showQuickView: true, showStock: true,
    layout: "vertical", size: "md",
  },
};
