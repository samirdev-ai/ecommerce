"use client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleMobileNav } from "@/store/slices/ui.slice";
import { useGetHomePageQuery } from "@/store/api/ecommerce.api";

import { Container } from "@/components/primitives/Container";
import { ErrorState } from "@/components/shared/ErrorState";

import {
  SiteHeader,
  CategoryNavigation,
  SiteFooter,
  MobileNavigation,
} from "@/features/home/layout";

import {
  MiniCart,
  WishlistDrawer,
  QuickViewModal,
} from "@/features/home/overlays";

import {
  HeroSection,
  QuickCategorySection,
  FlashSaleSection,
  PersonalizedSection,
  StandardProductSection,
  BestSellersSection,
  FeaturedCategoriesSection,
  BrandShowcaseSection,
  DealsSection,
  PromotionalBannerSection,
  RecentlyViewedSection,
  TrustSection,
  NewsletterSection,
  AppPromotionSection,
} from "@/features/home/sections";

import { useHomeHandlers } from "@/features/home/hooks/useHomeHandlers";
import { useWishlistedIds } from "@/features/home/hooks/useWishlistedIds";

export function EcommerceHomePage() {
  const dispatch = useAppDispatch();
  const { data: home, isLoading, isError, refetch } = useGetHomePageQuery();
  const wishlistedIds = useWishlistedIds();
  const isMobileNavOpen = useAppSelector((s) => s.ui.isMobileNavOpen);

  const {
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
  } = useHomeHandlers();

  const sectionProps = {
    onQuickView: handleQuickView,
    onAddToCart: handleAddToCart,
    onToggleWishlist: handleToggleWishlist,
    wishlistedIds,
  };

  return (
    <div className="min-h-dvh bg-[var(--color-background)] text-[var(--color-foreground)]">
      <SiteHeader
        onOpenCart={handleOpenCart}
        onOpenWishlist={openWishlist}
        {...sectionProps}
      />

      <CategoryNavigation />

      <main>
        {isError && !home ? (
          <Container size="wide" className="pt-8">
            <ErrorState
              title="We couldn't load the home page"
              description="Please check your connection and try again."
              onRetry={refetch}
            />
          </Container>
        ) : (
          <>
            <HeroSection banners={home?.heroBanners ?? []} isLoading={isLoading} />

            <QuickCategorySection
              categories={home?.quickCategories ?? []}
              isLoading={isLoading}
            />

            <FlashSaleSection
              sale={home?.flashSale}
              isLoading={isLoading}
              onRetry={refetch}
              {...sectionProps}
            />

            <PersonalizedSection {...sectionProps} />

            <StandardProductSection
              id="trending"
              eyebrow="What's hot"
              title="Trending Products"
              description="The products gaining momentum across Meridian this week."
              href="/trending"
              products={home?.trending ?? []}
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
              {...sectionProps}
            />

            <BestSellersSection
              products={home?.bestSellers ?? []}
              isLoading={isLoading}
              {...sectionProps}
            />

            <FeaturedCategoriesSection
              categories={home?.featuredCategories ?? []}
              isLoading={isLoading}
            />

            <StandardProductSection
              id="new-arrivals"
              eyebrow="Just landed"
              title="New Arrivals"
              description="Fresh products from the brands you follow."
              href="/new"
              variant="featured"
              products={home?.newArrivals ?? []}
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
              {...sectionProps}
            />

            <BrandShowcaseSection
              brands={home?.featuredBrands ?? []}
              isLoading={isLoading}
            />

            <DealsSection deals={home?.deals ?? []} isLoading={isLoading} />

            <StandardProductSection
              id="top-rated"
              eyebrow="Highest rated"
              title="Top Rated"
              description="Products customers rate highest for quality and value."
              href="/top-rated"
              products={home?.topRated ?? []}
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
              {...sectionProps}
            />

            <RecentlyViewedSection {...sectionProps} />

            <PromotionalBannerSection
              promotions={home?.promotions ?? []}
              isLoading={isLoading}
            />

            <TrustSection />
            <NewsletterSection />
            <AppPromotionSection />
          </>
        )}
      </main>

      <SiteFooter />

      <MiniCart open={cartOpen} onClose={handleCloseCart} />
      <WishlistDrawer open={wishlistOpen} onClose={closeWishlist} />
      <QuickViewModal
        product={quickViewProduct}
        onClose={closeQuickView}
        onAddToCart={handleAddToCart}
      />
      <MobileNavigation
        open={isMobileNavOpen}
        onClose={() => dispatch(toggleMobileNav(false))}
      />
    </div>
  );
}
