import type { CategoryInfo, Subcategory } from "@/domain/category.types";

export interface CategoryConfig {
  readonly info: CategoryInfo;
  readonly subcategories: readonly Subcategory[];
}

export const CATEGORIES: Readonly<Record<string, CategoryConfig>> = {
  electronics: {
    info: {
      name: "Electronics",
      description: "Phones, laptops, audio, cameras and everything in between.",
      bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Electronics",
      productCount: 48120,
      breadcrumbs: [
        { label: "Home", href: "/" },
        { label: "Electronics", href: "/category/electronics" },
      ],
    },
    subcategories: [
      { id: "laptops", name: "Laptops",     slug: "laptops",     icon: "💻", productCount: 12482 },
      { id: "phones",  name: "Smartphones", slug: "smartphones", icon: "📱", productCount: 18400 },
      { id: "audio",   name: "Audio",       slug: "audio",       icon: "🎧", productCount: 6210 },
      { id: "tablets", name: "Tablets",     slug: "tablets",     icon: "📟", productCount: 3400 },
    ],
  },
  laptops: {
    info: {
      name: "Laptops",
      description: "Explore laptops for work, gaming, creativity and everyday productivity.",
      bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Laptops",
      productCount: 12482,
      breadcrumbs: [
        { label: "Home", href: "/" },
        { label: "Electronics", href: "/category/electronics" },
        { label: "Computers", href: "/category/computers" },
        { label: "Laptops", href: "/category/laptops" },
      ],
    },
    subcategories: [
      { id: "gaming",      name: "Gaming Laptops",     slug: "gaming-laptops",     icon: "🎮", productCount: 1842 },
      { id: "business",    name: "Business Laptops",   slug: "business-laptops",   icon: "💼", productCount: 2210 },
      { id: "ultrabooks",  name: "Ultrabooks",         slug: "ultrabooks",         icon: "⚡", productCount: 1356 },
      { id: "2in1",        name: "2-in-1 Laptops",     slug: "2-in-1-laptops",     icon: "🔄", productCount: 984 },
      { id: "macbooks",    name: "MacBooks",           slug: "macbooks",           icon: "🍎", productCount: 621 },
      { id: "chromebooks", name: "Chromebooks",        slug: "chromebooks",        icon: "🌐", productCount: 1103 },
      { id: "accessories", name: "Laptop Accessories", slug: "laptop-accessories", icon: "🎒", productCount: 4366 },
    ],
  },
  fashion: {
    info: {
      name: "Fashion",
      description: "Everyday essentials and statement pieces, honestly priced.",
      bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Fashion",
      productCount: 24500,
      breadcrumbs: [
        { label: "Home", href: "/" },
        { label: "Fashion", href: "/category/fashion" },
      ],
    },
    subcategories: [
      { id: "shoes",       name: "Shoes",       slug: "shoes",       icon: "👟", productCount: 6200 },
      { id: "shirts",      name: "Shirts",      slug: "shirts",      icon: "👔", productCount: 4800 },
      { id: "accessories", name: "Accessories", slug: "accessories", icon: "🕶️", productCount: 3900 },
    ],
  },
  home: {
    info: {
      name: "Home & Kitchen",
      description: "Cookware, decor, and storage that lasts.",
      bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Home",
      productCount: 18700,
      breadcrumbs: [
        { label: "Home", href: "/" },
        { label: "Home & Kitchen", href: "/category/home" },
      ],
    },
    subcategories: [
      { id: "cookware",   name: "Cookware",   slug: "cookware",   icon: "🍳", productCount: 4200 },
      { id: "decor",      name: "Decor",      slug: "decor",      icon: "🖼️", productCount: 5100 },
      { id: "appliances", name: "Appliances", slug: "appliances", icon: "🔌", productCount: 3400 },
    ],
  },
  beauty: {
    info: {
      name: "Beauty",
      description: "Skincare, haircare, and everyday essentials.",
      bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Beauty",
      productCount: 9800,
      breadcrumbs: [
        { label: "Home", href: "/" },
        { label: "Beauty", href: "/category/beauty" },
      ],
    },
    subcategories: [
      { id: "skincare", name: "Skincare", slug: "skincare", icon: "🧴", productCount: 3800 },
      { id: "hair",     name: "Haircare", slug: "haircare", icon: "💇", productCount: 2900 },
    ],
  },
  sports: {
    info: {
      name: "Sports & Outdoors",
      description: "Gear for training, hiking, cycling, and everything outdoors.",
      bannerImage: "https://placehold.co/1200x400/111827/e5e7eb?text=Sports",
      productCount: 7600,
      breadcrumbs: [
        { label: "Home", href: "/" },
        { label: "Sports", href: "/category/sports" },
      ],
    },
    subcategories: [
      { id: "fitness", name: "Fitness", slug: "fitness", icon: "🏋️", productCount: 2100 },
      { id: "outdoor", name: "Outdoor", slug: "outdoor", icon: "⛺", productCount: 1800 },
    ],
  },
};

export function resolveCategory(slug: string): CategoryConfig | null {
  return CATEGORIES[slug] ?? null;
}