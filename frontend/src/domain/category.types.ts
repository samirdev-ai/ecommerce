export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  productCount: number;
  image?: string;
  description?: string;
}

export interface CategoryNavItem {
  id: string;
  label: string;
  href: string;
  columns?: { title: string; links: { label: string; href: string }[] }[];
  featured?: { title: string; image: string; href: string };
}

// ── scaffold:auto:category-page-shapes:begin ──
export interface Subcategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly icon: string;
  readonly productCount: number;
}

export interface BreadcrumbItem {
  readonly label: string;
  readonly href: string;
}

export interface CategoryInfo {
  readonly name: string;
  readonly description: string;
  readonly bannerImage: string;
  readonly productCount: number;
  readonly breadcrumbs: readonly BreadcrumbItem[];
}
// ── scaffold:auto:category-page-shapes:end ──
