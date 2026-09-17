"use client";

import { useEffect, useMemo, useRef, useState, memo, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  configureStore,
  createSlice,
  createSelector,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import { Provider, useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  X,
  Heart,
  ShoppingCart,
  User,
  MapPin,
  Menu,
  ChevronLeft,
  ChevronRight,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headset,
  Clock,
  TrendingUp,
  Sparkles,
  ImageOff,
} from "lucide-react";

type Money = { amount: number; currency: "USD" | "EUR" | "GBP" | "INR" };

type Rating = { average: number; count: number };

type ReviewSummary = { rating: Rating; verifiedPct: number };

type Brand = { id: string; name: string; logoUrl: string; category: string };

type Category = { id: string; slug: string; name: string; imageUrl: string; productCount: number };

type ProductVariant = { id: string; label: string; inStock: boolean };

type ProductBadge = "new" | "sale" | "trending" | "bestseller" | "low-stock";

type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: Money;
  originalPrice: Money | null;
  rating: Rating;
  badges: ProductBadge[];
  inStock: boolean;
  variants: ProductVariant[];
};

type HeroBanner = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  theme: "light" | "dark";
};

type Promotion = { id: string; title: string; subtitle: string; imageUrl: string; href: string; variant: "large" | "medium" | "compact" };

type Deal = { id: string; title: string; discountPct: number; expiresAt: string; productIds: string[]; href: string };

type CartItem = { id: string; productId: string; name: string; imageUrl: string; price: Money; quantity: number };

type CartSummary = { items: CartItem[]; itemCount: number; subtotal: Money };

type WishlistItem = { productId: string; addedAt: string };

type Customer = { id: string; firstName: string; isAuthenticated: boolean };

type SearchSuggestion = { type: "product" | "category" | "recent"; label: string; href: string };

type ProductCardVariant = "default" | "compact" | "horizontal" | "featured" | "sale";

type NavItem = { id: string; label: string; href: string; children?: { label: string; href: string }[] };

type FooterGroup = { id: string; title: string; links: { label: string; href: string }[] };

type TrustItem = { id: string; label: string; description: string; icon: typeof Truck };

const CURRENT_CUSTOMER: Customer = { id: "guest", firstName: "", isAuthenticated: false };

const CATEGORY_NAVIGATION: NavItem[] = [
  { id: "electronics", label: "Electronics", href: "/category/electronics", children: [
    { label: "Phones", href: "/category/electronics/phones" },
    { label: "Laptops", href: "/category/electronics/laptops" },
    { label: "Audio", href: "/category/electronics/audio" },
  ] },
  { id: "fashion", label: "Fashion", href: "/category/fashion", children: [
    { label: "Men", href: "/category/fashion/men" },
    { label: "Women", href: "/category/fashion/women" },
  ] },
  { id: "home", label: "Home & Living", href: "/category/home" },
  { id: "beauty", label: "Beauty", href: "/category/beauty" },
  { id: "sports", label: "Sports", href: "/category/sports" },
  { id: "deals", label: "Deals", href: "/category/deals" },
];

const TRUST_ITEMS: TrustItem[] = [
  { id: "secure", label: "Secure payments", description: "256-bit encrypted checkout", icon: ShieldCheck },
  { id: "delivery", label: "Fast delivery", description: "2-day shipping available", icon: Truck },
  { id: "returns", label: "Easy returns", description: "30-day return window", icon: RotateCcw },
  { id: "support", label: "Customer support", description: "Live help every day", icon: Headset },
];

const FOOTER_GROUPS: FooterGroup[] = [
  { id: "shop", title: "Shop", links: [
    { label: "New arrivals", href: "/category/new" },
    { label: "Best sellers", href: "/category/best-sellers" },
    { label: "Deals", href: "/category/deals" },
  ] },
  { id: "service", title: "Customer service", links: [
    { label: "Help center", href: "/help" },
    { label: "Track order", href: "/orders/track" },
    { label: "Returns", href: "/returns" },
  ] },
  { id: "about", title: "About", links: [
    { label: "Our story", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
  ] },
  { id: "seller", title: "Sell with us", links: [
    { label: "Become a seller", href: "/sell" },
    { label: "Seller center", href: "/seller-center" },
  ] },
  { id: "legal", title: "Legal", links: [
    { label: "Terms of service", href: "/legal/terms" },
    { label: "Privacy policy", href: "/legal/privacy" },
    { label: "Accessibility", href: "/legal/accessibility" },
  ] },
];

const PRODUCT_CARD_VARIANT_CLASSES: Record<ProductCardVariant, string> = {
  default: "flex flex-col",
  compact: "flex flex-col",
  horizontal: "flex flex-row items-center gap-3",
  featured: "flex flex-col border-primary/30",
  sale: "flex flex-col border-danger/30",
};

function formatMoney(money: Money): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: money.currency }).format(money.amount);
}

function formatDiscountPct(price: Money, originalPrice: Money | null): number | null {
  if (!originalPrice || originalPrice.amount <= price.amount) return null;
  return Math.round(((originalPrice.amount - price.amount) / originalPrice.amount) * 100);
}

function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(query.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return prefersReduced;
}

function seedCategories(): Category[] {
  const raw = [
    ["Electronics", "electronics"],
    ["Fashion", "fashion"],
    ["Home & Living", "home"],
    ["Beauty", "beauty"],
    ["Sports", "sports"],
    ["Toys", "toys"],
  ];
  return raw.map(([name, slug], i) => ({
    id: `cat-${i}`,
    slug,
    name,
    imageUrl: `https://picsum.photos/seed/cat-${slug}/200/200`,
    productCount: 1200 + i * 340,
  }));
}

function seedProducts(seedKey: string, count: number, opts?: { onSale?: boolean; badge?: ProductBadge }): Product[] {
  return Array.from({ length: count }).map((_, i) => {
    const base = 40 + ((i * 37) % 260);
    const hasDiscount = opts?.onSale ?? i % 3 === 0;
    const original = hasDiscount ? base + Math.round(base * 0.3) : null;
    const badges: ProductBadge[] = [];
    if (opts?.badge) badges.push(opts.badge);
    if (hasDiscount) badges.push("sale");
    if (base < 60) badges.push("low-stock");
    return {
      id: `${seedKey}-${i}`,
      slug: `${seedKey}-product-${i}`,
      name: `${seedKey.replace(/-/g, " ")} Item ${i + 1}`,
      brand: ["Nova", "Fieldcraft", "Urbanist", "Lumen"][i % 4],
      imageUrl: `https://picsum.photos/seed/${seedKey}-${i}/480/480`,
      price: { amount: base, currency: "USD" },
      originalPrice: original ? { amount: original, currency: "USD" } : null,
      rating: { average: Math.round((3.5 + (i % 15) * 0.1) * 10) / 10, count: 20 + i * 13 },
      badges,
      inStock: i % 11 !== 0,
      variants: [{ id: `${seedKey}-${i}-v1`, label: "Standard", inStock: true }],
    };
  });
}

function seedBrands(): Brand[] {
  return ["Nova", "Fieldcraft", "Urbanist", "Lumen", "Kindred", "Solace"].map((name, i) => ({
    id: `brand-${i}`,
    name,
    logoUrl: `https://picsum.photos/seed/brand-${name}/160/80`,
    category: ["Electronics", "Fashion", "Home", "Beauty", "Sports", "Fashion"][i],
  }));
}

function seedHeroBanners(): HeroBanner[] {
  return [
    { id: "h1", title: "Season refresh, up to 40% off", subtitle: "Curated picks across every category", ctaLabel: "Shop the sale", ctaHref: "/category/deals", imageUrl: "https://picsum.photos/seed/hero-1/1600/700", theme: "dark" },
    { id: "h2", title: "New arrivals just landed", subtitle: "The latest from brands you follow", ctaLabel: "Explore new in", ctaHref: "/category/new", imageUrl: "https://picsum.photos/seed/hero-2/1600/700", theme: "light" },
    { id: "h3", title: "Free delivery this weekend", subtitle: "No minimum order, every category", ctaLabel: "Start shopping", ctaHref: "/", imageUrl: "https://picsum.photos/seed/hero-3/1600/700", theme: "dark" },
  ];
}

function seedDeals(): Deal[] {
  return Array.from({ length: 4 }).map((_, i) => ({
    id: `deal-${i}`,
    title: ["Weekend electronics", "Home refresh", "Fitness essentials", "Beauty edit"][i],
    discountPct: [30, 25, 40, 20][i],
    expiresAt: new Date(Date.now() + (i + 1) * 6 * 3600000).toISOString(),
    productIds: [],
    href: `/category/deals/${i}`,
  }));
}

const mockBaseQuery: BaseQueryFn<{ url: string; params?: Record<string, unknown> }, unknown, unknown> =
  async ({ url, params }) => {
    await new Promise((resolve) => setTimeout(resolve, 240));
    if (url === "/categories") return { data: seedCategories() };
    if (url === "/hero-banners") return { data: seedHeroBanners() };
    if (url === "/flash-sale") return { data: { endsAt: new Date(Date.now() + 3 * 3600000 + 22 * 60000).toISOString(), products: seedProducts("flash", 8, { onSale: true }) } };
    if (url === "/trending") return { data: seedProducts("trending", 8, { badge: "trending" }) };
    if (url === "/best-sellers") return { data: seedProducts("best", 8, { badge: "bestseller" }) };
    if (url === "/new-arrivals") return { data: seedProducts("new", 8, { badge: "new" }) };
    if (url === "/top-rated") return { data: seedProducts("top-rated", 8) };
    if (url === "/recommendations") return { data: seedProducts("for-you", 8) };
    if (url === "/recently-viewed") return { data: [] as Product[] };
    if (url === "/brands") return { data: seedBrands() };
    if (url === "/deals") return { data: seedDeals() };
    if (url === "/search-suggestions") {
      const q = String(params?.q ?? "").toLowerCase();
      if (!q) return { data: [] as SearchSuggestion[] };
      return {
        data: [
          { type: "category" as const, label: `${q} in Electronics`, href: `/category/electronics?q=${q}` },
          { type: "product" as const, label: `${q} wireless headphones`, href: `/search?q=${q}+headphones` },
          { type: "recent" as const, label: q, href: `/search?q=${q}` },
        ],
      };
    }
    if (url === "/cart") return { data: { items: [], itemCount: 0, subtotal: { amount: 0, currency: "USD" } } as CartSummary };
    if (url === "/wishlist") return { data: [] as WishlistItem[] };
    if (url === "/cart/add") return { data: { items: [], itemCount: 1, subtotal: { amount: 0, currency: "USD" } } as CartSummary };
    if (url === "/wishlist/toggle") return { data: { productId: params?.productId, added: true } };
    return { data: null };
  };

const api = createApi({
  reducerPath: "api",
  baseQuery: mockBaseQuery,
  tagTypes: ["Categories", "Hero", "FlashSale", "Trending", "BestSellers", "NewArrivals", "TopRated", "Recommendations", "RecentlyViewed", "Brands", "Deals", "Cart", "Wishlist"],
  endpoints: (builder) => ({
    getCategories: builder.query<Category[], void>({ query: () => ({ url: "/categories" }), providesTags: ["Categories"], keepUnusedDataFor: 300 }),
    getHeroBanners: builder.query<HeroBanner[], void>({ query: () => ({ url: "/hero-banners" }), providesTags: ["Hero"], keepUnusedDataFor: 300 }),
    getFlashSale: builder.query<{ endsAt: string; products: Product[] }, void>({ query: () => ({ url: "/flash-sale" }), providesTags: ["FlashSale"], keepUnusedDataFor: 30 }),
    getTrendingProducts: builder.query<Product[], void>({ query: () => ({ url: "/trending" }), providesTags: ["Trending"], keepUnusedDataFor: 120 }),
    getBestSellers: builder.query<Product[], void>({ query: () => ({ url: "/best-sellers" }), providesTags: ["BestSellers"], keepUnusedDataFor: 120 }),
    getNewArrivals: builder.query<Product[], void>({ query: () => ({ url: "/new-arrivals" }), providesTags: ["NewArrivals"], keepUnusedDataFor: 120 }),
    getTopRated: builder.query<Product[], void>({ query: () => ({ url: "/top-rated" }), providesTags: ["TopRated"], keepUnusedDataFor: 120 }),
    getRecommendations: builder.query<Product[], void>({ query: () => ({ url: "/recommendations" }), providesTags: ["Recommendations"], keepUnusedDataFor: 60 }),
    getRecentlyViewed: builder.query<Product[], void>({ query: () => ({ url: "/recently-viewed" }), providesTags: ["RecentlyViewed"], keepUnusedDataFor: 60 }),
    getFeaturedBrands: builder.query<Brand[], void>({ query: () => ({ url: "/brands" }), providesTags: ["Brands"], keepUnusedDataFor: 300 }),
    getDeals: builder.query<Deal[], void>({ query: () => ({ url: "/deals" }), providesTags: ["Deals"], keepUnusedDataFor: 60 }),
    getSearchSuggestions: builder.query<SearchSuggestion[], { q: string }>({ query: (args) => ({ url: "/search-suggestions", params: args }), keepUnusedDataFor: 10 }),
    getCart: builder.query<CartSummary, void>({ query: () => ({ url: "/cart" }), providesTags: ["Cart"] }),
    getWishlist: builder.query<WishlistItem[], void>({ query: () => ({ url: "/wishlist" }), providesTags: ["Wishlist"] }),
    addToCart: builder.mutation<CartSummary, { productId: string }>({
      query: (body) => ({ url: "/cart/add", params: body }),
      invalidatesTags: ["Cart"],
    }),
    toggleWishlist: builder.mutation<{ productId: string; added: boolean }, { productId: string }>({
      query: (body) => ({ url: "/wishlist/toggle", params: body }),
      async onQueryStarted({ productId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          api.util.updateQueryData("getWishlist", undefined, (draft) => {
            const exists = draft.some((w) => w.productId === productId);
            if (exists) {
              return draft.filter((w) => w.productId !== productId);
            }
            draft.push({ productId, addedAt: new Date().toISOString() });
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

const {
  useGetCategoriesQuery,
  useGetHeroBannersQuery,
  useGetFlashSaleQuery,
  useGetTrendingProductsQuery,
  useGetBestSellersQuery,
  useGetNewArrivalsQuery,
  useGetTopRatedQuery,
  useGetRecommendationsQuery,
  useGetRecentlyViewedQuery,
  useGetFeaturedBrandsQuery,
  useGetDealsQuery,
  useGetSearchSuggestionsQuery,
  useGetCartQuery,
  useGetWishlistQuery,
  useAddToCartMutation,
  useToggleWishlistMutation,
} = api;

interface UiState {
  mobileNavOpen: boolean;
  cartDrawerOpen: boolean;
  activeCategoryId: string | null;
  currency: Money["currency"];
}

const uiSlice = createSlice({
  name: "ui",
  initialState: { mobileNavOpen: false, cartDrawerOpen: false, activeCategoryId: null, currency: "USD" } as UiState,
  reducers: {
    setMobileNavOpen(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
    setCartDrawerOpen(state, action: PayloadAction<boolean>) {
      state.cartDrawerOpen = action.payload;
    },
    setActiveCategory(state, action: PayloadAction<string | null>) {
      state.activeCategoryId = action.payload;
    },
    setCurrency(state, action: PayloadAction<Money["currency"]>) {
      state.currency = action.payload;
    },
  },
});

const { setMobileNavOpen, setCartDrawerOpen, setActiveCategory, setCurrency } = uiSlice.actions;

function makeStore() {
  return configureStore({
    reducer: { ui: uiSlice.reducer, [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
    devTools: process.env.NODE_ENV !== "production",
  });
}

type AppStore = ReturnType<typeof makeStore>;
type RootState = ReturnType<AppStore["getState"]>;
type AppDispatch = AppStore["dispatch"];

const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

const selectMobileNavOpen = (s: RootState) => s.ui.mobileNavOpen;
const selectCartDrawerOpen = (s: RootState) => s.ui.cartDrawerOpen;
const selectActiveCategoryId = (s: RootState) => s.ui.activeCategoryId;
const selectCurrency = (s: RootState) => s.ui.currency;

const selectWishlistIdSet = createSelector(
  (state: RootState) => api.endpoints.getWishlist.select()(state).data,
  (wishlist): ReadonlySet<string> => new Set((wishlist ?? []).map((w) => w.productId))
);

function Button({ children, variant = "primary", size = "md", className = "", ...rest }: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<string, string> = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    secondary: "bg-surface-elevated text-foreground border border-border hover:bg-muted",
    ghost: "text-foreground hover:bg-muted",
  };
  const sizes: Record<string, string> = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

function IconButton({ label, children, active = false, className = "", ...rest }: {
  label: string;
  children: ReactNode;
  active?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "text-primary" : "text-foreground hover:bg-muted"} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "sale" | "new" | "trending" | "danger" }) {
  const tones: Record<string, string> = {
    neutral: "bg-muted text-foreground/70",
    sale: "bg-sale text-white",
    new: "bg-info text-white",
    trending: "bg-warning text-white",
    danger: "bg-danger text-white",
  };
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function Price({ price, originalPrice }: { price: Money; originalPrice: Money | null }) {
  const discount = formatDiscountPct(price, originalPrice);
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-base font-semibold text-foreground">{formatMoney(price)}</span>
      {originalPrice && (
        <span className="text-xs text-foreground/40 line-through">{formatMoney(originalPrice)}</span>
      )}
      {discount !== null && <span className="text-xs font-semibold text-danger">-{discount}%</span>}
    </div>
  );
}

function RatingStars({ rating }: { rating: Rating }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Rated ${rating.average} out of 5 from ${rating.count} reviews`}>
      <Star className="h-3.5 w-3.5 fill-rating text-rating" aria-hidden="true" />
      <span className="text-xs font-medium text-foreground/80">{rating.average.toFixed(1)}</span>
      <span className="text-xs text-foreground/40">({rating.count})</span>
    </div>
  );
}

function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

function SectionHeader({ title, actionLabel, actionHref }: { title: string; actionLabel?: string; actionHref?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="text-sm font-medium text-primary hover:underline">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} aria-hidden="true" />;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="mb-1 text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-foreground/50">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6 text-center">
      <p className="mb-3 text-sm text-foreground/70">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function ProductImage({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-md bg-muted">
        <ImageOff className="h-6 w-6 text-foreground/30" aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 220px"
        className="object-cover"
        priority={priority}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function ProductCardSkeleton({ variant = "default" }: { variant?: ProductCardVariant }) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-3 ${PRODUCT_CARD_VARIANT_CLASSES[variant]}`}>
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-2.5 h-3 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
    </div>
  );
}

const ProductCard = memo(function ProductCard({ product, variant = "default", priority = false }: {
  product: Product;
  variant?: ProductCardVariant;
  priority?: boolean;
}) {
  const dispatch = useAppDispatch();
  const wishlistIds = useAppSelector(selectWishlistIdSet);
  const [toggleWishlist, { isLoading: isTogglingWishlist }] = useToggleWishlistMutation();
  const [addToCart, { isLoading: isAdding }] = useAddToCartMutation();
  const isWished = wishlistIds.has(product.id);

  return (
    <div className={`group rounded-lg border border-border bg-surface p-3 transition-shadow hover:shadow-card-hover ${PRODUCT_CARD_VARIANT_CLASSES[variant]}`}>
      <div className="relative">
        <Link href={`/product/${product.slug}`} aria-label={product.name}>
          <ProductImage src={product.imageUrl} alt={product.name} priority={priority} />
        </Link>
        {product.badges.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {product.badges.includes("sale") && <Badge tone="sale">Sale</Badge>}
            {product.badges.includes("new") && <Badge tone="new">New</Badge>}
            {product.badges.includes("trending") && <Badge tone="trending">Trending</Badge>}
            {product.badges.includes("low-stock") && <Badge tone="danger">Low stock</Badge>}
          </div>
        )}
        <button
          onClick={() => toggleWishlist({ productId: product.id })}
          disabled={isTogglingWishlist}
          aria-label={isWished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isWished}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated/90 text-foreground/60 backdrop-blur transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Heart className={isWished ? "h-4 w-4 fill-danger text-danger" : "h-4 w-4"} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2.5 flex flex-1 flex-col">
        <span className="text-2xs font-medium uppercase tracking-wide text-foreground/40">{product.brand}</span>
        <Link href={`/product/${product.slug}`} className="mt-0.5 line-clamp-2 text-sm font-medium text-foreground hover:text-primary">
          {product.name}
        </Link>
        <div className="mt-1.5">
          <RatingStars rating={product.rating} />
        </div>
        <div className="mt-1.5">
          <Price price={product.price} originalPrice={product.originalPrice} />
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-2.5 w-full"
          disabled={!product.inStock || isAdding}
          onClick={() => addToCart({ productId: product.id })}
        >
          {product.inStock ? (isAdding ? "Adding…" : "Add to cart") : "Out of stock"}
        </Button>
      </div>
    </div>
  );
});

function ProductCarousel({ products, variant = "default" }: { products: Product[]; variant?: ProductCardVariant }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollBy(direction: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label="Product carousel"
        tabIndex={0}
      >
        {products.map((product, i) => (
          <div key={product.id} className="w-40 flex-shrink-0 snap-start sm:w-48">
            <ProductCard product={product} variant={variant} priority={i < 2} />
          </div>
        ))}
      </div>
      <button
        onClick={() => scrollBy(-1)}
        aria-label="Scroll to previous products"
        className="absolute -left-3 top-1/3 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-elevated shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        onClick={() => scrollBy(1)}
        aria-label="Scroll to next products"
        className="absolute -right-3 top-1/3 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-elevated shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ProductRail({ title, actionHref, query, variant }: {
  title: string;
  actionHref: string;
  query: { data: Product[] | undefined; isLoading: boolean; isError: boolean; refetch: () => void };
  variant?: ProductCardVariant;
}) {
  const { data, isLoading, isError, refetch } = query;

  if (isLoading) {
    return (
      <section aria-label={title}>
        <SectionHeader title={title} />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-40 flex-shrink-0 sm:w-48">
              <ProductCardSkeleton variant={variant} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-label={title}>
        <SectionHeader title={title} />
        <ErrorState message={`We couldn't load ${title.toLowerCase()} right now.`} onRetry={refetch} />
      </section>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <section aria-label={title}>
      <SectionHeader title={title} actionLabel="View all" actionHref={actionHref} />
      <ProductCarousel products={data} variant={variant} />
    </section>
  );
}

function TrendingProductsSection() {
  const query = useGetTrendingProductsQuery();
  return <ProductRail title="Trending now" actionHref="/category/trending" query={query} />;
}

function BestSellingSection() {
  const query = useGetBestSellersQuery();
  return <ProductRail title="Best sellers" actionHref="/category/best-sellers" query={query} />;
}

function NewArrivalsSection() {
  const query = useGetNewArrivalsQuery();
  return <ProductRail title="New arrivals" actionHref="/category/new" query={query} />;
}

function TopRatedSection() {
  const query = useGetTopRatedQuery();
  return <ProductRail title="Top rated" actionHref="/category/top-rated" query={query} />;
}

function PersonalizedSection() {
  const query = useGetRecommendationsQuery();
  const title = CURRENT_CUSTOMER.isAuthenticated ? "Recommended for you" : "Popular picks";
  return <ProductRail title={title} actionHref="/for-you" query={query} variant="featured" />;
}

function RecentlyViewedSection() {
  const query = useGetRecentlyViewedQuery();
  if (!query.isLoading && !query.isError && (!query.data || query.data.length === 0)) return null;
  return <ProductRail title="Recently viewed" actionHref="/recently-viewed" query={query} variant="compact" />;
}

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(endsAt).getTime() - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-danger/10 px-2.5 py-1 text-danger" role="timer" aria-live="off">
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="text-xs font-semibold tabular-nums" aria-label={`${hours} hours ${minutes} minutes ${seconds} seconds remaining`}>
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}

function FlashSaleSection() {
  const { data, isLoading, isError, refetch } = useGetFlashSaleQuery();

  if (isLoading) {
    return (
      <section aria-label="Flash sale">
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={i} variant="sale" />)}
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return null;
  }

  return (
    <section className="rounded-xl border border-danger/20 bg-danger/5 p-4 sm:p-5" aria-label="Flash sale">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-danger" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground sm:text-xl">Flash sale</h2>
        </div>
        <CountdownTimer endsAt={data.endsAt} />
      </div>
      <ProductCarousel products={data.products} variant="sale" />
    </section>
  );
}

function HeroControls({ index, total, onSelect, onPrev, onNext }: {
  index: number;
  total: number;
  onSelect: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <button
        onClick={onPrev}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface-elevated/80 text-foreground backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        onClick={onNext}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface-elevated/80 text-foreground backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5" role="tablist" aria-label="Slide selector">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => onSelect(i)}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
          />
        ))}
      </div>
    </>
  );
}

function HeroSection() {
  const { data, isLoading, isError } = useGetHeroBannersQuery();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const slides = data ?? [];

  useEffect(() => {
    if (paused || prefersReducedMotion || slides.length <= 1) return;
    const interval = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(interval);
  }, [paused, prefersReducedMotion, slides.length]);

  if (isLoading) {
    return <Skeleton className="aspect-[16/7] w-full rounded-xl" />;
  }

  if (isError || slides.length === 0) {
    return (
      <div className="flex aspect-[16/7] w-full items-center justify-center rounded-xl bg-surface-elevated">
        <p className="text-sm text-foreground/50">Featured promotions unavailable right now.</p>
      </div>
    );
  }

  const slide = slides[index];

  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden rounded-xl sm:aspect-[16/6]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotional banners"
    >
      <Image src={slide.imageUrl} alt={slide.title} fill priority className="object-cover" sizes="100vw" />
      <div className={`absolute inset-0 flex flex-col justify-center gap-3 p-6 sm:p-12 ${slide.theme === "dark" ? "bg-black/35 text-white" : "bg-white/60 text-foreground"}`}>
        <h1 className="max-w-md text-2xl font-bold sm:text-4xl">{slide.title}</h1>
        <p className="max-w-sm text-sm sm:text-base">{slide.subtitle}</p>
        <Link href={slide.ctaHref} className="w-fit">
          <Button variant="primary" size="lg">{slide.ctaLabel}</Button>
        </Link>
      </div>
      <HeroControls
        index={index}
        total={slides.length}
        onSelect={setIndex}
        onPrev={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
        onNext={() => setIndex((i) => (i + 1) % slides.length)}
      />
    </div>
  );
}

function QuickCategorySection() {
  const { data, isLoading, isError, refetch } = useGetCategoriesQuery();

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-24 flex-shrink-0 rounded-full" />)}
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Couldn't load categories." onRetry={refetch} />;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-1 sm:grid sm:grid-cols-6 sm:overflow-visible" role="list" aria-label="Shop by category">
      {(data ?? []).map((category) => (
        <Link
          key={category.id}
          href={`/category/${category.slug}`}
          role="listitem"
          className="flex flex-shrink-0 flex-col items-center gap-2 text-center"
        >
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border sm:h-20 sm:w-20">
            <Image src={category.imageUrl} alt="" fill sizes="80px" className="object-cover" />
          </div>
          <span className="text-xs font-medium text-foreground">{category.name}</span>
        </Link>
      ))}
    </div>
  );
}

function FeaturedCategoriesSection() {
  const { data, isLoading, isError, refetch } = useGetCategoriesQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-lg" />)}
      </div>
    );
  }

  if (isError) return <ErrorState message="Couldn't load featured categories." onRetry={refetch} />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {(data ?? []).map((category) => (
        <Link
          key={category.id}
          href={`/category/${category.slug}`}
          className="group relative flex h-36 flex-col justify-end overflow-hidden rounded-lg border border-border"
        >
          <Image src={category.imageUrl} alt="" fill sizes="33vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="relative z-10 bg-gradient-to-t from-black/70 to-transparent p-3">
            <p className="text-sm font-semibold text-white">{category.name}</p>
            <p className="text-2xs text-white/80">{category.productCount.toLocaleString()} products</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function BrandShowcaseSection() {
  const { data, isLoading, isError, refetch } = useGetFeaturedBrandsQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  if (isError) return <ErrorState message="Couldn't load brands." onRetry={refetch} />;
  if (!data || data.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {data.map((brand) => (
        <Link
          key={brand.id}
          href={`/brand/${brand.id}`}
          className="flex h-16 items-center justify-center rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary"
        >
          <Image src={brand.logoUrl} alt={brand.name} width={90} height={40} className="max-h-8 w-auto object-contain" />
        </Link>
      ))}
    </div>
  );
}

function DealsSection() {
  const { data, isLoading, isError, refetch } = useGetDealsQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
      </div>
    );
  }

  if (isError) return <ErrorState message="Couldn't load deals." onRetry={refetch} />;
  if (!data || data.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {data.map((deal) => (
        <Link key={deal.id} href={deal.href} className="flex flex-col justify-between rounded-lg border border-border bg-surface p-4">
          <div>
            <Badge tone="sale">Up to {deal.discountPct}% off</Badge>
            <p className="mt-2 text-sm font-medium text-foreground">{deal.title}</p>
          </div>
          <p className="mt-3 text-2xs text-foreground/50">Ends {new Date(deal.expiresAt).toLocaleDateString(undefined, { weekday: "short", hour: "numeric" })}</p>
        </Link>
      ))}
    </div>
  );
}

function PromoBanner({ promotion }: { promotion: Promotion }) {
  const heights: Record<Promotion["variant"], string> = {
    large: "aspect-[16/6]",
    medium: "aspect-[16/8]",
    compact: "aspect-[16/9]",
  };
  return (
    <Link href={promotion.href} className={`group relative block w-full overflow-hidden rounded-xl ${heights[promotion.variant]}`}>
      <Image src={promotion.imageUrl} alt={promotion.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 flex flex-col justify-center bg-black/30 p-5 text-white">
        <p className="text-lg font-semibold sm:text-xl">{promotion.title}</p>
        <p className="text-sm text-white/80">{promotion.subtitle}</p>
      </div>
    </Link>
  );
}

function PromotionalBannerSection() {
  const promotions: Promotion[] = [
    { id: "p1", title: "Home essentials", subtitle: "Everything for a fresh space", imageUrl: "https://picsum.photos/seed/promo-1/1200/500", href: "/category/home", variant: "medium" },
    { id: "p2", title: "Gear up for fitness", subtitle: "Shop activewear and equipment", imageUrl: "https://picsum.photos/seed/promo-2/1200/500", href: "/category/sports", variant: "medium" },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {promotions.map((promo) => <PromoBanner key={promo.id} promotion={promo} />)}
    </div>
  );
}

function TrustSection() {
  return (
    <div className="grid grid-cols-2 gap-4 border-y border-border py-6 sm:grid-cols-4">
      {TRUST_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="flex items-center gap-3">
            <Icon className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="text-2xs text-foreground/50">{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const newsletterSchema = z.object({ email: z.string().min(1, "Email is required").email("Enter a valid email address") });

type NewsletterFormValues = z.infer<typeof newsletterSchema>;

function NewsletterSection() {
  const [status, setStatus] = useState<"idle" | "success" | "duplicate">("idle");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterSchema),
  });

  async function onSubmit(values: NewsletterFormValues) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (values.email.endsWith("@already-subscribed.com")) {
      setStatus("duplicate");
      return;
    }
    setStatus("success");
    reset();
  }

  return (
    <div className="rounded-xl bg-surface-elevated p-6 text-center sm:p-8">
      <h2 className="text-lg font-semibold text-foreground">Get 10% off your first order</h2>
      <p className="mt-1 text-sm text-foreground/60">Sign up for restocks, deals, and new arrivals.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row" noValidate>
        <div className="flex-1 text-left">
          <label htmlFor="newsletter-email" className="sr-only">Email address</label>
          <input
            id="newsletter-email"
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "newsletter-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="newsletter-email-error" className="mt-1 text-xs text-danger">{errors.email.message}</p>
          )}
        </div>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Subscribing…" : "Subscribe"}
        </Button>
      </form>
      {status === "success" && <p className="mt-3 text-xs font-medium text-success">You're subscribed. Check your inbox for your code.</p>}
      {status === "duplicate" && <p className="mt-3 text-xs font-medium text-warning">This email is already subscribed.</p>}
    </div>
  );
}

function AppPromotionSection() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-6 sm:flex-row sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Shop faster with our app</h2>
        <p className="mt-1 text-sm text-foreground/60">Exclusive app-only deals and order tracking on the go.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-md border border-border bg-surface-elevated text-2xs text-foreground/40">
          QR
        </div>
        <div className="flex flex-col gap-2">
          <div role="img" aria-label="Available on the App Store" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground/70">
            App Store
          </div>
          <div role="img" aria-label="Available on Google Play" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground/70">
            Google Play
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnouncementBar() {
  return (
    <div className="bg-foreground py-2 text-center text-xs font-medium text-background">
      Free shipping on orders over $50 — ends Sunday
    </div>
  );
}

function SearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { data: suggestions, isFetching } = useGetSearchSuggestionsQuery({ q: query }, { skip: query.length < 2 });
  const recentSearches = useMemo(() => ["wireless earbuds", "running shoes"], []);

  return (
    <div className="relative flex-1">
      <label htmlFor="site-search" className="sr-only">Search products</label>
      <div className="flex items-center rounded-md border border-border bg-surface px-3">
        <Search className="h-4 w-4 text-foreground/40" aria-hidden="true" />
        <input
          id="site-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 120)}
          placeholder="Search products, brands, categories"
          className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
        />
        {query.length > 0 && (
          <button onClick={() => setQuery("")} aria-label="Clear search" className="text-foreground/40 hover:text-foreground">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 rounded-md border border-border bg-surface-elevated p-3 shadow-dropdown">
          {query.length < 2 && (
            <div>
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-foreground/40">Recent searches</p>
              <ul className="flex flex-col gap-1">
                {recentSearches.map((term) => (
                  <li key={term}>
                    <Link href={`/search?q=${term}`} className="text-sm text-foreground/80 hover:text-primary">{term}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {query.length >= 2 && isFetching && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          )}
          {query.length >= 2 && !isFetching && suggestions && suggestions.length === 0 && (
            <p className="text-xs text-foreground/50">No matches for &quot;{query}&quot;.</p>
          )}
          {query.length >= 2 && !isFetching && suggestions && suggestions.length > 0 && (
            <ul className="flex flex-col gap-1">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <Link href={s.href} className="flex items-center gap-2 text-sm text-foreground/80 hover:text-primary">
                    {s.type === "category" && <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  return (
    <Link href={CURRENT_CUSTOMER.isAuthenticated ? "/account" : "/login"} className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary">
      <User className="h-5 w-5" aria-hidden="true" />
      <span className="hidden lg:inline">{CURRENT_CUSTOMER.isAuthenticated ? CURRENT_CUSTOMER.firstName : "Sign in"}</span>
    </Link>
  );
}

function WishlistButton() {
  const { data } = useGetWishlistQuery();
  return (
    <Link href="/wishlist" aria-label={`Wishlist, ${data?.length ?? 0} items`} className="relative flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted">
      <Heart className="h-5 w-5" aria-hidden="true" />
      {data && data.length > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-2xs font-semibold text-white">
          {data.length}
        </span>
      )}
    </Link>
  );
}

function CartButton() {
  const dispatch = useAppDispatch();
  const cartDrawerOpen = useAppSelector(selectCartDrawerOpen);
  const { data } = useGetCartQuery();

  return (
    <div className="relative">
      <button
        onClick={() => dispatch(setCartDrawerOpen(!cartDrawerOpen))}
        aria-label={`Cart, ${data?.itemCount ?? 0} items`}
        aria-expanded={cartDrawerOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
      >
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        {data && data.itemCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-2xs font-semibold text-white">
            {data.itemCount}
          </span>
        )}
      </button>
      {cartDrawerOpen && <MiniCart onClose={() => dispatch(setCartDrawerOpen(false))} />}
    </div>
  );
}

function MiniCart({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useGetCartQuery();

  return (
    <div role="dialog" aria-label="Shopping cart" className="absolute right-0 top-full z-30 mt-2 w-80 rounded-md border border-border bg-surface-elevated p-4 shadow-dropdown">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Your cart</h2>
        <button onClick={onClose} aria-label="Close cart" className="text-foreground/40 hover:text-foreground">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {isLoading && <Skeleton className="h-20 w-full" />}
      {!isLoading && (!data || data.items.length === 0) && (
        <EmptyState title="Your cart is empty" description="Add items to see them here." />
      )}
      {!isLoading && data && data.items.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {data.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{item.name}</span>
                <span className="text-foreground/50">×{item.quantity}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
            <span>Subtotal</span>
            <span>{formatMoney(data.subtotal)}</span>
          </div>
          <Link href="/checkout">
            <Button variant="primary" className="mt-3 w-full">Checkout</Button>
          </Link>
        </>
      )}
    </div>
  );
}

function LocationSelector() {
  return (
    <button className="hidden items-center gap-1 text-xs text-foreground/70 hover:text-foreground lg:flex" aria-label="Deliver to New York, 10001">
      <MapPin className="h-4 w-4" aria-hidden="true" />
      Deliver to New York
    </button>
  );
}

function CurrencySelector() {
  const dispatch = useAppDispatch();
  const currency = useAppSelector(selectCurrency);
  const currencies: Money["currency"][] = ["USD", "EUR", "GBP", "INR"];

  return (
    <select
      value={currency}
      onChange={(e) => dispatch(setCurrency(e.target.value as Money["currency"]))}
      aria-label="Select currency"
      className="hidden rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground/70 lg:block"
    >
      {currencies.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

function SiteHeader() {
  const dispatch = useAppDispatch();
  const mobileNavOpen = useAppSelector(selectMobileNavOpen);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-elevated">
      <Container className="flex items-center gap-4 py-3">
        <button
          onClick={() => dispatch(setMobileNavOpen(!mobileNavOpen))}
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <Link href="/" className="text-lg font-bold text-foreground">Northstar</Link>
        <LocationSelector />
        <div className="hidden flex-1 sm:block">
          <SearchBar />
        </div>
        <div className="flex items-center gap-1">
          <CurrencySelector />
          <AccountMenu />
          <WishlistButton />
          <CartButton />
        </div>
      </Container>
      <div className="border-t border-border px-4 py-2 sm:hidden">
        <SearchBar />
      </div>
    </header>
  );
}

function CategoryNavigation() {
  const dispatch = useAppDispatch();
  const activeCategoryId = useAppSelector(selectActiveCategoryId);

  return (
    <nav aria-label="Product categories" className="hidden border-b border-border bg-surface lg:block">
      <Container>
        <ul className="flex gap-6">
          {CATEGORY_NAVIGATION.map((item) => (
            <li
              key={item.id}
              className="relative"
              onMouseEnter={() => dispatch(setActiveCategory(item.id))}
              onMouseLeave={() => dispatch(setActiveCategory(null))}
            >
              <Link href={item.href} className="flex items-center py-3 text-sm font-medium text-foreground hover:text-primary">
                {item.label}
              </Link>
              {item.children && activeCategoryId === item.id && (
                <div className="absolute left-0 top-full z-20 min-w-48 rounded-md border border-border bg-surface-elevated p-3 shadow-dropdown">
                  <ul className="flex flex-col gap-1.5">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link href={child.href} className="text-sm text-foreground/70 hover:text-primary">{child.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  );
}

function MobileCategoryRail() {
  return (
    <nav aria-label="Product categories" className="border-b border-border bg-surface px-4 py-2 lg:hidden">
      <ul className="flex gap-4 overflow-x-auto">
        {CATEGORY_NAVIGATION.map((item) => (
          <li key={item.id} className="flex-shrink-0">
            <Link href={item.href} className="text-xs font-medium text-foreground/70 hover:text-primary">{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-elevated">
      <Container className="py-10">
        <div className="hidden grid-cols-5 gap-8 sm:grid">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.id}>
              <h2 className="mb-3 text-sm font-semibold text-foreground">{group.title}</h2>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-xs text-foreground/60 hover:text-foreground">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col divide-y divide-border sm:hidden">
          {FOOTER_GROUPS.map((group) => (
            <details key={group.id} className="py-3">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">{group.title}</summary>
              <ul className="mt-2 flex flex-col gap-2 pl-1">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-xs text-foreground/60 hover:text-foreground">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-2xs text-foreground/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Northstar Commerce. All rights reserved.</p>
          <p>Visa · Mastercard · PayPal · Apple Pay</p>
        </div>
      </Container>
    </footer>
  );
}

function HomePageContent() {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <SiteHeader />
      <CategoryNavigation />
      <MobileCategoryRail />
      <main>
        <Container className="flex flex-col gap-10 py-6 sm:gap-14">
          <HeroSection />
          <QuickCategorySection />
          <FlashSaleSection />
          <PersonalizedSection />
          <TrendingProductsSection />
          <FeaturedCategoriesSection />
          <BestSellingSection />
          <DealsSection />
          <BrandShowcaseSection />
          <NewArrivalsSection />
          <RecentlyViewedSection />
          <TopRatedSection />
          <PromotionalBannerSection />
          <TrustSection />
          <NewsletterSection />
          <AppPromotionSection />
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}

// export default function EcommerceHomePage() {
//   const storeRef = useRef<AppStore | null>(null);

//   if (storeRef.current == null) {
//     storeRef.current = makeStore();
//   }

//   return (
//     <Provider store={storeRef.current}>
//       <HomePageContent />
//     </Provider>
//   );
// }

export default function EcommerceHomePage() {
  const store = makeStore();

  return (
    <Provider store={store}>
      <HomePageContent />
    </Provider>
  );
}