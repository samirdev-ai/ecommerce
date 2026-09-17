import type { CategoryInfo, Subcategory } from "@/domain/category.types";
import type { Brand, Seller } from "@/domain";

export const CATEGORY_INFO: CategoryInfo = {
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
};

export const SUBCATEGORIES: readonly Subcategory[] = [
  { id: "gaming",      name: "Gaming Laptops",     slug: "gaming-laptops",     icon: "🎮", productCount: 1842 },
  { id: "business",    name: "Business Laptops",   slug: "business-laptops",   icon: "💼", productCount: 2210 },
  { id: "ultrabooks",  name: "Ultrabooks",         slug: "ultrabooks",         icon: "⚡", productCount: 1356 },
  { id: "2in1",        name: "2-in-1 Laptops",     slug: "2-in-1-laptops",     icon: "🔄", productCount: 984 },
  { id: "macbooks",    name: "MacBooks",           slug: "macbooks",           icon: "🍎", productCount: 621 },
  { id: "chromebooks", name: "Chromebooks",        slug: "chromebooks",        icon: "🌐", productCount: 1103 },
  { id: "accessories", name: "Laptop Accessories", slug: "laptop-accessories", icon: "🎒", productCount: 4366 },
];

export const BRANDS: readonly Brand[] = [
  { id: "apple",  slug: "apple", name: "Apple", logo: "/images/brands/apple.svg", category: "electronics", productCount: 621, },
  { id: "dell",   slug: "dell", name: "Dell", logo: "/images/brands/dell.svg", category: "electronics", productCount: 1840, },
  { id: "lenovo", slug: "lenovo", name: "Lenovo", logo: "/images/brands/lenovo.svg", category: "electronics", productCount: 2103, },
  { id: "hp",     slug: "hp", name: "HP", logo: "/images/brands/hp.svg", category: "electronics", productCount: 1975, },
  { id: "asus",   slug: "asus", name: "ASUS", logo: "/images/brands/asus.svg", category: "electronics", productCount: 1622, },
  { id: "acer",   slug: "acer", name: "Acer", logo: "/images/brands/acer.svg", category: "electronics", productCount: 1340, },
  { id: "msi",    slug: "msi", name: "MSI", logo: "/images/brands/msi.svg", category: "electronics", productCount: 812, },
  { id: "samsung", slug: "samsung", name: "Samsung", logo: "/images/brands/samsung.svg", category: "electronics", productCount: 540, },
];

export const SELLERS: readonly Seller[] = [
  { id: "nexus-direct", name: "Nexus Direct",   rating: 4.8, isOfficial: true },
  { id: "techhub",      name: "TechHub Official", rating: 4.6, isOfficial: true },
  { id: "compuworld",   name: "CompuWorld",     rating: 4.3, isOfficial: false },
  { id: "bytebazaar",   name: "ByteBazaar",     rating: 4.1, isOfficial: false },
];
