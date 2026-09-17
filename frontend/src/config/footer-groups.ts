export interface FooterGroup {
  id: string;
  title: string;
  links: { label: string; href: string }[];
}

export const FOOTER_GROUPS: FooterGroup[] = [
  { id: "shop", title: "Shop", links: [
    { label: "All Categories", href: "/c" },
    { label: "Deals", href: "/deals" },
    { label: "New Arrivals", href: "/new" },
    { label: "Best Sellers", href: "/best" },
    { label: "Gift Cards", href: "/gift-cards" },
  ]},
  { id: "service", title: "Customer Service", links: [
    { label: "Help Center", href: "/help" },
    { label: "Track Order", href: "/track" },
    { label: "Returns", href: "/returns" },
    { label: "Shipping Info", href: "/shipping" },
    { label: "Contact Us", href: "/contact" },
  ]},
  { id: "about", title: "About", links: [
    { label: "Our Story", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
    { label: "Sustainability", href: "/sustainability" },
  ]},
  { id: "policies", title: "Policies", links: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Accessibility", href: "/accessibility" },
  ]},
  { id: "seller", title: "Seller", links: [
    { label: "Sell on Meridian", href: "/sell" },
    { label: "Seller Center", href: "/seller" },
    { label: "Fees", href: "/seller/fees" },
    { label: "Advertise", href: "/ads" },
  ]},
  { id: "business", title: "Business", links: [
    { label: "Meridian Business", href: "/business" },
    { label: "Wholesale", href: "/wholesale" },
    { label: "Enterprise", href: "/enterprise" },
  ]},
];
