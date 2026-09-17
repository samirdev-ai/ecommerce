// src/
// ├── app/
// │   ├── layout.tsx                          # Root: <Providers><AuthProvider>{children}</AuthProvider></Providers>
// │   └── page.tsx                            # Server: reads customer, renders <HomePage/>
// │
// ├── features/
// │   └── home/
// │       ├── page/
// │       │   └── EcommerceHomePage.tsx       # ~120 LOC — orchestrator only (was §16)
// │       │
// │       ├── sections/                       # Each was a §14 export
// │       │   ├── HeroSection.tsx
// │       │   ├── QuickCategorySection.tsx
// │       │   ├── FlashSaleSection.tsx
// │       │   ├── PersonalizedSection.tsx
// │       │   ├── StandardProductSection.tsx
// │       │   ├── BestSellersSection.tsx
// │       │   ├── FeaturedCategoriesSection.tsx
// │       │   ├── BrandShowcaseSection.tsx
// │       │   ├── DealsSection.tsx
// │       │   ├── PromotionalBannerSection.tsx
// │       │   ├── RecentlyViewedSection.tsx
// │       │   ├── TrustSection.tsx
// │       │   ├── NewsletterSection.tsx
// │       │   └── AppPromotionSection.tsx
// │       │
// │       ├── layout/                         # Header/Footer/Nav (was §13 + parts of §15)
// │       │   ├── SiteHeader.tsx
// │       │   ├── AnnouncementBar.tsx
// │       │   ├── CategoryNavigation.tsx
// │       │   ├── MegaMenu.tsx
// │       │   ├── SiteFooter.tsx
// │       │   ├── FooterGroupBlock.tsx
// │       │   └── MobileNavigation.tsx
// │       │
// │       ├── overlays/                       # Drawers/Modals (was §15)
// │       │   ├── MiniCart.tsx
// │       │   ├── WishlistDrawer.tsx
// │       │   ├── QuickViewModal.tsx
// │       │   ├── Drawer.tsx                  # Base
// │       │   ├── Modal.tsx                   # Base
// │       │   └── Overlay.tsx
// │       │
// │       └── search/
// │           ├── SearchBar.tsx
// │           ├── LocationSelector.tsx
// │           └── AccountMenu.tsx
// │
// ├── components/
// │   ├── primitives/                         # Was §9
// │   │   ├── Button.tsx
// │   │   ├── IconButton.tsx
// │   │   ├── Badge.tsx
// │   │   ├── Card.tsx
// │   │   ├── Container.tsx
// │   │   ├── Skeleton.tsx
// │   │   ├── Divider.tsx
// │   │   └── index.ts                        # Barrel
// │   │
// │   ├── shared/                             # Was §10
// │   │   ├── SectionHeader.tsx
// │   │   ├── Price.tsx
// │   │   ├── RatingStars.tsx
// │   │   ├── EmptyState.tsx
// │   │   ├── ErrorState.tsx
// │   │   ├── TrustBar.tsx
// │   │   └── CountdownInline.tsx
// │   │
// │   └── product/                            # Was §11
// │       ├── ProductCard.tsx
// │       ├── ProductCardSkeleton.tsx
// │       ├── ProductCarousel.tsx
// │       ├── CategoryCard.tsx
// │       ├── BrandCard.tsx
// │       ├── PromoBanner.tsx
// │       └── DealCard.tsx
// │
// ├── domain/                                 # Was §1
// │   ├── product.types.ts
// │   ├── category.types.ts
// │   ├── campaign.types.ts
// │   ├── cart.types.ts
// │   ├── customer.types.ts
// │   ├── search.types.ts
// │   └── index.ts
// │
// ├── config/                                 # Was §2
// │   ├── category-navigation.ts
// │   ├── trust-items.ts
// │   ├── footer-groups.ts
// │   ├── product-card-variants.ts
// │   └── index.ts
// │
// ├── lib/                                    # Was §4 (formatters) + §8 (hooks)
// │   ├── cn.ts
// │   ├── format.ts                           # formatPrice, formatCount, makePrice
// │   ├── use-media-query.ts
// │   ├── use-reduced-motion.ts
// │   ├── use-in-view.ts
// │   ├── use-body-scroll-lock.ts
// │   ├── use-focus-trap.ts
// │   ├── use-countdown.ts
// │   └── index.ts
// │
// ├── store/                                  # Was §4–§6 (slices, API, store)
// │   ├── store.ts                            # makeStore
// │   ├── hooks.ts                            # useAppDispatch, useAppSelector
// │   ├── slices/
// │   │   ├── cart-ui.slice.ts
// │   │   ├── wishlist-ui.slice.ts
// │   │   ├── ui.slice.ts
// │   │   ├── preferences.slice.ts
// │   │   └── search-ui.slice.ts
// │   ├── api/
// │   │   └── ecommerce.api.ts                # Was §5
// │   └── root-reducer.ts
// │
// ├── mocks/                                  # Was §3 (mock DB + seed)
// │   ├── db.ts                               # MOCK_DB object
// │   ├── seed-products.ts                    # PRODUCT_SEED
// │   └── delay.ts                            # delay, maybeFail
// │
// ├── providers/                              # Was §7
// │   ├── AuthProvider.tsx
// │   ├── use-customer.ts
// │   ├── Providers.tsx                       # Composes Redux Provider + AuthProvider
// │   └── index.ts
// │
// └── styles/
//     └── globals.css                         # Tailwind v4 @theme (already separate)







// src/
// ├── domain/
// │   ├── category.types.ts              # Category, Subcategory, CategoryInfo, BreadcrumbItem
// │   ├── product.types.ts               # Product, ProductStatus, ProductAttribute, Seller, Brand
// │   ├── filter.types.ts                # FilterState, FilterOption, PriceBucket, AttributeFilterConfig, FilterChip
// │   └── index.ts
// │
// ├── config/
// │   ├── category-navigation.ts         # NAV_LINKS
// │   ├── price-buckets.ts               # PRICE_BUCKETS
// │   ├── filter-options.ts              # RATING_OPTIONS, DISCOUNT_OPTIONS, AVAILABILITY_OPTIONS, DELIVERY_OPTIONS
// │   ├── attribute-config.ts            # ATTRIBUTE_CONFIG
// │   ├── trust-signals.ts               # TRUST_SIGNALS
// │   ├── footer-columns.ts              # FOOTER_COLUMNS
// │   ├── category-page-config.ts        # CATEGORY_INFO, SUBCATEGORIES, BRANDS, SELLERS
// │   └── index.ts
// │
// ├── lib/
// │   ├── cn.ts                          # already exists
// │   ├── format.ts                      # already exists (add formatCompactNumber, getDiscountPercentage, getInstallmentPrice)
// │   └── index.ts
// │
// ├── mocks/
// │   ├── seed-products.ts               # (extend the existing one from home split)
// │   ├── seed-sellers.ts                # SELLERS
// │   └── index.ts
// │
// ├── store/
// │   ├── slices/
// │   │   ├── cart.slice.ts              # cartSlice
// │   │   ├── wishlist.slice.ts          # wishlistSlice
// │   │   ├── filters.slice.ts           # filtersSlice
// │   │   ├── sort.slice.ts              # sortSlice
// │   │   ├── view-mode.slice.ts         # viewModeSlice
// │   │   └── ui.slice.ts                # (merge with the existing ui.slice from home)
// │   ├── selectors/
// │   │   ├── cart.selectors.ts          # selectCartCount, selectIsInCart
// │   │   ├── wishlist.selectors.ts      # selectWishlistIds, selectIsWishlisted
// │   │   ├── filters.selectors.ts       # selectFilters, selectActiveFilterCount
// │   │   ├── sort.selectors.ts          # selectSort
// │   │   └── listing.selectors.ts       # selectFilteredSortedProducts, selectViewMode
// │   ├── store.ts                       # (extend existing — add new slices)
// │   ├── hooks.ts                       # already exists
// │   └── root-reducer.ts                # (extend existing)
// │
// ├── components/
// │   └── product/
// │       ├── atoms/
// │       │   ├── ProductBadge.tsx       # Badge + STATUS_BADGE_CONFIG
// │       │   ├── RatingStars.tsx        # (already exists from PR 2 — reuse)
// │       │   ├── PriceBlock.tsx         # PriceBlock
// │       │   └── IconActionButton.tsx   # IconActionButton
// │       ├── ProductCard.tsx            # grid card
// │       ├── ProductListItem.tsx        # list item
// │       ├── ProductCardSkeleton.tsx    # (extend existing from PR 3)
// │       └── ProductListItemSkeleton.tsx
// │
// └── features/
//     └── category/
//         ├── page/
//         │   └── CategoryPage.tsx       # ~80 LOC orchestrator
//         ├── components/
//         │   ├── Breadcrumbs.tsx        # (or move to features/shell — used on all pages)
//         │   ├── CategoryHero.tsx
//         │   ├── SubcategoryCard.tsx
//         │   ├── SubcategoryScroller.tsx
//         │   ├── CategoryHighlights.tsx
//         │   ├── filters/
//         │   │   ├── CheckboxFilterGroup.tsx
//         │   │   ├── PriceFilter.tsx
//         │   │   ├── RatingFilter.tsx
//         │   │   ├── FilterSidebarContent.tsx
//         │   │   ├── FilterSidebar.tsx
//         │   │   └── FilterDrawer.tsx
//         │   ├── listing/
//         │   │   ├── ResultSummary.tsx
//         │   │   ├── SortControl.tsx
//         │   │   ├── ViewModeToggle.tsx
//         │   │   ├── ActiveFilterChips.tsx
//         │   │   ├── ListingToolbar.tsx
//         │   │   ├── EmptyResultsState.tsx
//         │   │   ├── ErrorState.tsx
//         │   │   ├── ProductResults.tsx
//         │   │   └── CategoryListingLayout.tsx
//         │   └── RecommendationSection.tsx   # (or reuse home's version)
//         ├── hooks/
//         │   └── useFilteredProducts.ts
//         └── utils/
//             ├── filter.ts             # filterProducts, matchesPrice, matchesAvailability, etc.
//             └── sort.ts               # sortProducts