import type { HomePagePayload, HeroBanner, FlashSale, Brand, Deal, Promotion } from "@/domain/campaign.types";
import type { Category } from "@/domain/category.types";
import type { Product } from "@/domain/product.types";
import type { SearchSuggestion, Recommendation } from "@/domain/search.types";
import type { CartSummary, WishlistItem } from "@/domain/cart.types";
import { PRODUCT_SEED } from "./seed-products";
import { delay, maybeFail } from "./delay";
import { makePrice, formatPrice } from "@/lib/format";

const IMG = (id: string, w = 600) =>
  `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;

export const MOCK_DB = {
  home: async (): Promise<HomePagePayload> => {
    await delay(null, 180);
    maybeFail();
    const heroBanners: HeroBanner[] = [
      {
        id: "h1", eyebrow: "Spring Drop",
        headline: "Sound that moves with you",
        subheadline: "Premium audio gear engineered for everyday life. Up to 40% off this week.",
        ctaLabel: "Shop Audio", ctaHref: "/c/audio",
        image: IMG("photo-1546435770-a3e426bf472b", 1600),
        imageAlt: "Person wearing premium over-ear headphones",
        tone: "dark",
      },
      {
        id: "h2", eyebrow: "New Arrivals",
        headline: "Built for the work ahead",
        subheadline: "Laptops, monitors, and desk essentials trusted by professionals.",
        ctaLabel: "Explore Computing", ctaHref: "/c/computers",
        image: IMG("photo-1498050108023-c5249f4df085", 1600),
        imageAlt: "Modern workspace with laptop and monitor",
        tone: "cool",
      },
      {
        id: "h3", eyebrow: "Home Refresh",
        headline: "Everyday upgrades, honest prices",
        subheadline: "Cookware, decor, and storage that last. Free shipping over $35.",
        ctaLabel: "Shop Home", ctaHref: "/c/home",
        image: IMG("photo-1556909114-f6e7ad7d3136", 1600),
        imageAlt: "Bright modern kitchen with cookware",
        tone: "warm",
      },
    ];

    const quickCategories: Category[] = [
      { id: "c-electronics", slug: "electronics", name: "Electronics", icon: "\u{1F4BB}", productCount: 12480 },
      { id: "c-fashion",     slug: "fashion",     name: "Fashion",     icon: "\u{1F455}", productCount: 24500 },
      { id: "c-home",        slug: "home",        name: "Home",        icon: "\u{1F3E0}", productCount: 18700 },
      { id: "c-beauty",      slug: "beauty",      name: "Beauty",      icon: "\u{1F484}", productCount: 9800 },
      { id: "c-sports",      slug: "sports",      name: "Sports",      icon: "\u{1F3C0}", productCount: 7600 },
      { id: "c-toys",        slug: "toys",        name: "Toys",        icon: "\u{1F9F8}", productCount: 5400 },
      { id: "c-grocery",     slug: "grocery",     name: "Grocery",     icon: "\u{1F6D2}", productCount: 15800 },
      { id: "c-books",       slug: "books",       name: "Books",       icon: "\u{1F4DA}", productCount: 42000 },
    ];

    const flashSale: FlashSale = {
      id: "fs1",
      title: "Flash Sale \u2014 Electronics",
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 6 + 1000 * 60 * 42).toISOString(),
      products: PRODUCT_SEED.filter((p) => p.category === "electronics").slice(0, 8),
    };

    const trending = PRODUCT_SEED.filter((p) => p.badge === "trending" || p.rating.value >= 4.6).slice(0, 10);
    const bestSellers = [...PRODUCT_SEED].sort((a, b) => b.rating.count - a.rating.count).slice(0, 10);
    const newArrivals = PRODUCT_SEED.filter((p) => p.badge === "new").concat(PRODUCT_SEED.slice(0, 4)).slice(0, 10);
    const topRated = [...PRODUCT_SEED].sort((a, b) => b.rating.value - a.rating.value).slice(0, 10);

    const featuredCategories: Category[] = [
      { id: "fc1", slug: "audio",     name: "Audio & Headphones", icon: "\u{1F3A7}", productCount: 3200,  image: IMG("photo-1505740420928-5e560c06d30e"), description: "Studio-grade sound for work, travel, and everything between." },
      { id: "fc2", slug: "computers", name: "Computers & Laptops",icon: "\u{1F4BB}", productCount: 2100,  image: IMG("photo-1517336714731-489689fd1ca8"), description: "Machines built for creators, coders, and everyday pros." },
      { id: "fc3", slug: "home",      name: "Home & Kitchen",     icon: "\u{1F3E0}", productCount: 8700,  image: IMG("photo-1556909114-f6e7ad7d3136"),   description: "Tools and touches that make everyday living better." },
      { id: "fc4", slug: "fashion",   name: "Fashion Essentials", icon: "\u{1F45F}", productCount: 12400, image: IMG("photo-1445205170230-053b83016050"), description: "Wardrobe staples with an honest price tag." },
    ];

    const featuredBrands: Brand[] = [
      { id: "b1", slug: "sonic-labs", name: "Sonic Labs", logo: "SL", category: "Audio",     productCount: 240 },
      { id: "b2", slug: "nova",       name: "Nova",       logo: "NV", category: "Computing", productCount: 180 },
      { id: "b3", slug: "stride",     name: "Stride",     logo: "ST", category: "Footwear",  productCount: 410 },
      { id: "b4", slug: "terra",      name: "Terra",      logo: "TR", category: "Kitchen",   productCount: 320 },
      { id: "b5", slug: "lumen",      name: "Lumen",      logo: "LM", category: "Wearables", productCount: 150 },
      { id: "b6", slug: "everglow",   name: "Everglow",   logo: "EG", category: "Beauty",    productCount: 280 },
    ];

    const deals: Deal[] = [
      { id: "d1", title: "Audio Week", description: "Up to 40% off headphones, earbuds, and speakers.", discountLabel: "40% OFF", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), ctaLabel: "Shop Audio", ctaHref: "/c/audio", productCount: 1240 },
      { id: "d2", title: "Home Refresh", description: "Cookware, decor, and storage from $19.", discountLabel: "FROM $19", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 96).toISOString(), ctaLabel: "Shop Home", ctaHref: "/c/home", productCount: 860 },
      { id: "d3", title: "New Customer Offer", description: "Extra 15% off your first order over $50.", discountLabel: "15% OFF", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), ctaLabel: "Claim Offer", ctaHref: "/signup", productCount: 999 },
    ];

    const promotions: Promotion[] = [
      { id: "pr1", title: "Trade in. Trade up.", description: "Get instant credit toward your next device when you trade in your old one.", ctaLabel: "See trade-in value", ctaHref: "/trade-in", image: IMG("photo-1517336714731-489689fd1ca8", 900), imageAlt: "Laptop and phone trade-in", variant: "large" },
      { id: "pr2", title: "Free 2-day shipping", description: "On thousands of eligible items with Meridian Plus.", ctaLabel: "Learn more", ctaHref: "/plus", image: IMG("photo-1586528116311-ad8dd3c8310d", 600), imageAlt: "Delivery boxes", variant: "medium" },
      { id: "pr3", title: "Student discount", description: "Save 10% with verified student status.", ctaLabel: "Verify", ctaHref: "/student", image: IMG("photo-1523240795612-9a054b0db644", 600), imageAlt: "Student with laptop", variant: "medium" },
    ];

    return { heroBanners, quickCategories, flashSale, trending, bestSellers, newArrivals, topRated, featuredCategories, featuredBrands, deals, promotions };
  },

  search: async (query: string): Promise<SearchSuggestion[]> => {
    await delay(null, 140);
    maybeFail(0.03);
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const products = PRODUCT_SEED
      .filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.includes(q))
      .slice(0, 5)
      .map<SearchSuggestion>((p) => ({ id: `sp-${p.id}`, type: "product", label: p.name, href: `/p/${p.slug}`, image: p.image, meta: p.price.formatted }));
    const categories = CATEGORY_NAVIGATION
      .filter((c) => c.label.toLowerCase().includes(q))
      .slice(0, 3)
      .map<SearchSuggestion>((c) => ({ id: `sc-${c.id}`, type: "category", label: c.label, href: c.href, meta: "Category" }));
    return [...products, ...categories];
  },

  recentlyViewed: async (): Promise<Product[]> => {
    await delay(null, 120);
    maybeFail(0.05);
    return [];
  },

  recommendations: async (customerId: string | null): Promise<Recommendation[]> => {
    await delay(null, 220);
    maybeFail();
    const pool = customerId ? PRODUCT_SEED.slice(0, 10) : PRODUCT_SEED.slice(4, 10);
    return pool.slice(0, 8).map((p, i) => ({
      id: `r-${p.id}`,
      product: p,
      reason: i % 3 === 0 ? "Based on your browsing" : i % 3 === 1 ? "Because you viewed similar items" : "Top picks for you",
    }));
  },

  cart: async (): Promise<CartSummary> => {
    await delay(null, 90);
    maybeFail(0.02);
    return { items: [], itemCount: 0, subtotal: makePrice(0), estimatedTotal: makePrice(0) };
  },

  wishlist: async (): Promise<WishlistItem[]> => {
    await delay(null, 80);
    maybeFail(0.02);
    return [];
  },
};

// Avoid circular — import at end
import { CATEGORY_NAVIGATION } from "@/config/category-navigation";
