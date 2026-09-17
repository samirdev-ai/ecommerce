import type { CategoryNavItem } from "@/domain/category.types";

export const CATEGORY_NAVIGATION: CategoryNavItem[] = [
  {
    id: "electronics",
    label: "Electronics",
    href: "/c/electronics",
    columns: [
      { title: "Computers", links: [
        { label: "Laptops", href: "/c/laptops" },
        { label: "Desktops", href: "/c/desktops" },
        { label: "Monitors", href: "/c/monitors" },
        { label: "Tablets", href: "/c/tablets" },
      ]},
      { title: "Audio", links: [
        { label: "Headphones", href: "/c/headphones" },
        { label: "Earbuds", href: "/c/earbuds" },
        { label: "Speakers", href: "/c/speakers" },
        { label: "Soundbars", href: "/c/soundbars" },
      ]},
      { title: "Mobile", links: [
        { label: "Smartphones", href: "/c/smartphones" },
        { label: "Cases", href: "/c/cases" },
        { label: "Chargers", href: "/c/chargers" },
        { label: "Power Banks", href: "/c/power-banks" },
      ]},
    ],
    featured: {
      title: "New Flagship Phones",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=70",
      href: "/c/smartphones",
    },
  },
  {
    id: "fashion",
    label: "Fashion",
    href: "/c/fashion",
    columns: [
      { title: "Women", links: [
        { label: "Dresses", href: "/c/dresses" },
        { label: "Tops", href: "/c/tops" },
        { label: "Shoes", href: "/c/womens-shoes" },
        { label: "Bags", href: "/c/bags" },
      ]},
      { title: "Men", links: [
        { label: "Shirts", href: "/c/shirts" },
        { label: "Jackets", href: "/c/jackets" },
        { label: "Sneakers", href: "/c/sneakers" },
        { label: "Watches", href: "/c/watches" },
      ]},
    ],
  },
  {
    id: "home",
    label: "Home & Kitchen",
    href: "/c/home",
    columns: [
      { title: "Kitchen", links: [
        { label: "Cookware", href: "/c/cookware" },
        { label: "Appliances", href: "/c/appliances" },
        { label: "Dining", href: "/c/dining" },
      ]},
      { title: "Living", links: [
        { label: "Furniture", href: "/c/furniture" },
        { label: "Decor", href: "/c/decor" },
        { label: "Bedding", href: "/c/bedding" },
      ]},
    ],
  },
  { id: "beauty", label: "Beauty", href: "/c/beauty" },
  { id: "sports", label: "Sports", href: "/c/sports" },
  { id: "toys", label: "Toys", href: "/c/toys" },
  { id: "grocery", label: "Grocery", href: "/c/grocery" },
  { id: "auto", label: "Automotive", href: "/c/auto" },
  { id: "books", label: "Books", href: "/c/books" },
];
