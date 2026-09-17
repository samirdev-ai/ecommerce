'use client';

// ============================================================================
// SAVED ITEMS / WISHLIST WORKSPACE
// Next.js App Router · TypeScript · Tailwind v4 · Redux Toolkit
// Single-file, internally modular application. See globals.css for tokens.
// ============================================================================

// ============================================================================
// IMPORTS
// ============================================================================
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  configureStore,
  createSlice,
  createSelector,
  createAsyncThunk,
  createEntityAdapter,
  combineReducers,
  type PayloadAction,
  type EntityState,
} from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import {
  Search,
  Heart,
  ShoppingCart,
  Bell,
  User,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Star,
  Share2,
  Copy,
  Link2,
  Trash2,
  FolderPlus,
  FolderInput,
  MoreHorizontal,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PackageX,
  PackageCheck,
  PackageSearch,
  TrendingDown,
  Truck,
  LayoutGrid,
  List as ListIcon,
  SlidersHorizontal,
  ArrowUpDown,
  Plus,
  Pencil,
  Loader2,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Lock,
  Globe2,
  Users2,
  Boxes,
  Info,
} from 'lucide-react';

// ============================================================================
// TYPES — DOMAIN MODELS
// ============================================================================

/** All money is represented in integer minor units to avoid floating point
 *  currency bugs (e.g. $249.00 -> { amountMinor: 24900, currency: 'USD' }). */
export interface Money {
  amountMinor: number;
  currency: 'USD' | 'EUR' | 'GBP';
}

export type AvailabilityStatus =
  | 'in-stock'
  | 'low-stock'
  | 'out-of-stock'
  | 'back-in-stock'
  | 'pre-order'
  | 'coming-soon'
  | 'discontinued'
  | 'unavailable';

export type CollectionVisibility = 'private' | 'link' | 'shared';

export type SavedItemSort =
  | 'recently-added'
  | 'recently-updated'
  | 'price-asc'
  | 'price-desc'
  | 'discount-desc'
  | 'rating-desc'
  | 'price-drops'
  | 'availability';

export type SavedItemViewMode = 'grid' | 'list';

export interface VariantOption {
  attribute: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  label: string;
  options: VariantOption[];
  availability: AvailabilityStatus;
  priceOverride?: Money;
}

export interface PriceAlert {
  status: 'enabled' | 'disabled';
  targetPrice?: Money;
  channel: 'email' | 'push' | 'sms';
}

export interface StockAlert {
  status: 'enabled' | 'disabled';
  notifyOn: 'back-in-stock' | 'low-stock';
}

export interface PriceSnapshot {
  price: Money;
  observedAt: string;
}

/** A change to the underlying catalog product since it was saved. The saved
 *  item must remain understandable even when this occurs. */
export type ProductStateChange =
  | { type: 'price-changed'; previous: Money; current: Money }
  | { type: 'discontinued' }
  | { type: 'seller-changed'; previousSeller: string }
  | { type: 'variant-unavailable'; variantLabel: string }
  | { type: 'promotion-ended' };

export interface SavedProduct {
  id: string;
  productId: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  sellerId: string;
  sellerName: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  price: Money;
  previousPrice?: Money;
  lowestObservedPrice?: Money;
  priceHistory: PriceSnapshot[];
  discountPercent?: number;
  availability: AvailabilityStatus;
  deliveryEstimate: string;
  requiresVariantSelection: boolean;
  variants?: ProductVariant[];
  selectedVariantId?: string;
  savedAt: string;
  updatedAt: string;
  collectionIds: string[];
  priceAlert?: PriceAlert;
  stockAlert?: StockAlert;
  stateChange?: ProductStateChange;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  visibility: CollectionVisibility;
  itemIds: string[];
  coverProductId?: string;
  shareLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedItemFilter {
  categories: string[];
  brands: string[];
  sellers: string[];
  minRating: number | null;
  discountOnly: boolean;
  availability: AvailabilityStatus[];
  priceDropOnly: boolean;
  stockAlertOnly: boolean;
  maxPriceMinor: number | null;
}

export type SmartView = 'all' | 'wishlist' | 'price-drops' | 'back-in-stock' | 'low-stock' | 'recent';

/** Coherent operation state — never combine separate loading/error/success
 *  booleans that could contradict one another. */
export type SavedOperationState<T = undefined> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

// ============================================================================
// CONSTANTS / CONFIG-DRIVEN LABELS
// ============================================================================

interface AvailabilityVisual {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  purchasable: boolean;
  alertable: boolean;
}

export const AVAILABILITY_CONFIG: Record<AvailabilityStatus, AvailabilityVisual> = {
  'in-stock': { label: 'In stock', tone: 'success', purchasable: true, alertable: false },
  'low-stock': { label: 'Low stock', tone: 'warning', purchasable: true, alertable: true },
  'out-of-stock': { label: 'Out of stock', tone: 'danger', purchasable: false, alertable: true },
  'back-in-stock': { label: 'Back in stock', tone: 'success', purchasable: true, alertable: false },
  'pre-order': { label: 'Pre-order', tone: 'info', purchasable: true, alertable: false },
  'coming-soon': { label: 'Coming soon', tone: 'info', purchasable: false, alertable: true },
  discontinued: { label: 'Discontinued', tone: 'neutral', purchasable: false, alertable: false },
  unavailable: { label: 'No longer available', tone: 'neutral', purchasable: false, alertable: false },
};

export const SORT_OPTIONS: { value: SavedItemSort; label: string }[] = [
  { value: 'recently-added', label: 'Recently added' },
  { value: 'recently-updated', label: 'Recently updated' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'discount-desc', label: 'Biggest discount' },
  { value: 'rating-desc', label: 'Highest rated' },
  { value: 'price-drops', label: 'Price drops' },
  { value: 'availability', label: 'Availability' },
];

export const SMART_VIEW_CONFIG: { id: SmartView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All Saved Items', icon: Heart },
  { id: 'wishlist', label: 'Wishlist', icon: Sparkles },
  { id: 'price-drops', label: 'Price Drops', icon: TrendingDown },
  { id: 'back-in-stock', label: 'Back in Stock', icon: PackageCheck },
  { id: 'low-stock', label: 'Low Stock', icon: PackageSearch },
  { id: 'recent', label: 'Recently Saved', icon: Clock },
];

export const CATEGORY_NAV = ['Electronics', 'Home & Kitchen', 'Fashion', 'Fitness', 'Gaming', 'Travel', 'Beauty', 'Deals'];

const CURRENCY_SYMBOL: Record<Money['currency'], string> = { USD: '$', EUR: '\u20ac', GBP: '\u00a3' };

// ============================================================================
// MOCK DATA
// Realistic catalog snapshot. In production this ships from the saved-items
// and catalog APIs; here it stands in so the UI is fully demonstrable.
// ============================================================================

function usd(amountMinor: number): Money {
  return { amountMinor, currency: 'USD' };
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const now = new Date().toISOString();

export const MOCK_COLLECTIONS: Collection[] = [
  {
    id: 'col-wishlist',
    name: 'Wishlist',
    description: 'Everything I want to buy eventually',
    visibility: 'private',
    itemIds: ['sp-1001', 'sp-1004', 'sp-1006', 'sp-1009'],
    coverProductId: 'sp-1001',
    createdAt: isoDaysAgo(120),
    updatedAt: isoDaysAgo(2),
  },
  {
    id: 'col-home-office',
    name: 'Home Office Upgrade',
    description: 'Desk setup for the spare room',
    visibility: 'private',
    itemIds: ['sp-1002', 'sp-1003', 'sp-1010'],
    coverProductId: 'sp-1002',
    createdAt: isoDaysAgo(65),
    updatedAt: isoDaysAgo(5),
  },
  {
    id: 'col-gift-ideas',
    name: 'Gift Ideas',
    description: 'For birthdays and holidays',
    visibility: 'link',
    itemIds: ['sp-1005', 'sp-1007', 'sp-1012'],
    coverProductId: 'sp-1007',
    shareLink: 'https://shop.example.com/s/gifts-4f8a2c',
    createdAt: isoDaysAgo(40),
    updatedAt: isoDaysAgo(1),
  },
  {
    id: 'col-travel',
    name: 'Travel Essentials',
    description: 'Packing for the next trip',
    visibility: 'shared',
    itemIds: ['sp-1008', 'sp-1011'],
    coverProductId: 'sp-1008',
    createdAt: isoDaysAgo(20),
    updatedAt: isoDaysAgo(3),
  },
];

export const MOCK_PRODUCTS: SavedProduct[] = [
  {
    id: 'sp-1001',
    productId: 'cat-77213',
    sku: 'SNY-WH1000XM5-BLK',
    name: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
    brand: 'Sony',
    category: 'Electronics',
    sellerId: 'sel-01',
    sellerName: 'Sold by Sony Direct',
    imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&q=80',
    rating: 4.7,
    reviewCount: 18420,
    price: usd(32999),
    previousPrice: usd(39999),
    lowestObservedPrice: usd(31499),
    priceHistory: [
      { price: usd(39999), observedAt: isoDaysAgo(60) },
      { price: usd(34999), observedAt: isoDaysAgo(20) },
      { price: usd(32999), observedAt: isoDaysAgo(2) },
    ],
    discountPercent: 18,
    availability: 'in-stock',
    deliveryEstimate: 'Free delivery by Thu, Sep 18',
    requiresVariantSelection: true,
    variants: [
      { id: 'var-1001-black', sku: 'SNY-WH1000XM5-BLK', label: 'Midnight Black', options: [{ attribute: 'Color', value: 'Black' }], availability: 'in-stock' },
      { id: 'var-1001-silver', sku: 'SNY-WH1000XM5-SLV', label: 'Platinum Silver', options: [{ attribute: 'Color', value: 'Silver' }], availability: 'low-stock' },
    ],
    selectedVariantId: 'var-1001-black',
    savedAt: isoDaysAgo(14),
    updatedAt: isoDaysAgo(2),
    collectionIds: ['col-wishlist'],
    priceAlert: { status: 'enabled', targetPrice: usd(29999), channel: 'email' },
    stockAlert: { status: 'disabled', notifyOn: 'back-in-stock' },
  },
  {
    id: 'sp-1002',
    productId: 'cat-44120',
    sku: 'HM-AERON-B-GRPH',
    name: 'Herman Miller Aeron Ergonomic Office Chair, Size B',
    brand: 'Herman Miller',
    category: 'Home & Kitchen',
    sellerId: 'sel-02',
    sellerName: 'Sold by Herman Miller',
    imageUrl: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600&q=80',
    rating: 4.8,
    reviewCount: 6210,
    price: usd(159500),
    priceHistory: [{ price: usd(159500), observedAt: isoDaysAgo(30) }],
    availability: 'pre-order',
    deliveryEstimate: 'Ships in 3-4 weeks',
    requiresVariantSelection: true,
    variants: [
      { id: 'var-1002-graphite', sku: 'HM-AERON-B-GRPH', label: 'Graphite', options: [{ attribute: 'Finish', value: 'Graphite' }], availability: 'pre-order' },
      { id: 'var-1002-mineral', sku: 'HM-AERON-B-MNRL', label: 'Mineral', options: [{ attribute: 'Finish', value: 'Mineral' }], availability: 'pre-order' },
    ],
    savedAt: isoDaysAgo(40),
    updatedAt: isoDaysAgo(30),
    collectionIds: ['col-home-office'],
    stockAlert: { status: 'enabled', notifyOn: 'back-in-stock' },
  },
  {
    id: 'sp-1003',
    productId: 'cat-90188',
    sku: 'LOG-MXMASTER3S-GRY',
    name: 'Logitech MX Master 3S Wireless Mouse',
    brand: 'Logitech',
    category: 'Electronics',
    sellerId: 'sel-03',
    sellerName: 'Sold by Logitech Store',
    imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&q=80',
    rating: 4.6,
    reviewCount: 24980,
    price: usd(8999),
    previousPrice: usd(9999),
    lowestObservedPrice: usd(7999),
    priceHistory: [
      { price: usd(9999), observedAt: isoDaysAgo(45) },
      { price: usd(8999), observedAt: isoDaysAgo(3) },
    ],
    discountPercent: 10,
    availability: 'in-stock',
    deliveryEstimate: 'Free delivery by Wed, Sep 16',
    requiresVariantSelection: false,
    savedAt: isoDaysAgo(9),
    updatedAt: isoDaysAgo(3),
    collectionIds: ['col-home-office'],
    priceAlert: { status: 'enabled', targetPrice: usd(7999), channel: 'push' },
  },
  {
    id: 'sp-1004',
    productId: 'cat-33087',
    sku: 'PAT-R1TECH-BLK-M',
    name: "Patagonia Men's R1 TechFace Jacket",
    brand: 'Patagonia',
    category: 'Fashion',
    sellerId: 'sel-04',
    sellerName: 'Sold by Patagonia',
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',
    rating: 4.5,
    reviewCount: 1830,
    price: usd(24900),
    priceHistory: [{ price: usd(24900), observedAt: isoDaysAgo(15) }],
    availability: 'out-of-stock',
    deliveryEstimate: 'Currently unavailable',
    requiresVariantSelection: true,
    variants: [
      { id: 'var-1004-m', sku: 'PAT-R1TECH-BLK-M', label: 'Medium', options: [{ attribute: 'Size', value: 'M' }], availability: 'out-of-stock' },
      { id: 'var-1004-l', sku: 'PAT-R1TECH-BLK-L', label: 'Large', options: [{ attribute: 'Size', value: 'L' }], availability: 'in-stock' },
    ],
    savedAt: isoDaysAgo(22),
    updatedAt: isoDaysAgo(4),
    collectionIds: ['col-wishlist'],
    stockAlert: { status: 'enabled', notifyOn: 'back-in-stock' },
    stateChange: { type: 'variant-unavailable', variantLabel: 'Medium' },
  },
  {
    id: 'sp-1005',
    productId: 'cat-55291',
    sku: 'LEC-DUTCHOVEN-5.5-FLM',
    name: 'Le Creuset 5.5 Qt Round Dutch Oven, Flame',
    brand: 'Le Creuset',
    category: 'Home & Kitchen',
    sellerId: 'sel-05',
    sellerName: 'Sold by Williams Sonoma',
    imageUrl: 'https://images.unsplash.com/photo-1585659722983-3a681d4b2b64?w=600&q=80',
    rating: 4.9,
    reviewCount: 9120,
    price: usd(36995),
    previousPrice: usd(43000),
    lowestObservedPrice: usd(35000),
    priceHistory: [
      { price: usd(43000), observedAt: isoDaysAgo(50) },
      { price: usd(36995), observedAt: isoDaysAgo(1) },
    ],
    discountPercent: 14,
    availability: 'in-stock',
    deliveryEstimate: 'Free delivery by Fri, Sep 19',
    requiresVariantSelection: false,
    savedAt: isoDaysAgo(6),
    updatedAt: isoDaysAgo(1),
    collectionIds: ['col-gift-ideas'],
    priceAlert: { status: 'disabled', channel: 'email' },
  },
  {
    id: 'sp-1006',
    productId: 'cat-61230',
    sku: 'ANK-737PWR-BLK',
    name: 'Anker 737 PowerCore 24K Portable Charger',
    brand: 'Anker',
    category: 'Electronics',
    sellerId: 'sel-06',
    sellerName: 'Sold by Anker Official',
    imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80',
    rating: 4.4,
    reviewCount: 5340,
    price: usd(14999),
    priceHistory: [{ price: usd(14999), observedAt: isoDaysAgo(10) }],
    availability: 'low-stock',
    deliveryEstimate: 'Only 3 left — order soon',
    requiresVariantSelection: false,
    savedAt: isoDaysAgo(11),
    updatedAt: isoDaysAgo(2),
    collectionIds: ['col-wishlist'],
  },
  {
    id: 'sp-1007',
    productId: 'cat-70044',
    sku: 'APL-WATCHU2-46-BLK',
    name: 'Apple Watch Ultra 2 (46mm, GPS + Cellular)',
    brand: 'Apple',
    category: 'Electronics',
    sellerId: 'sel-07',
    sellerName: 'Sold by Apple',
    imageUrl: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=600&q=80',
    rating: 4.8,
    reviewCount: 4110,
    price: usd(79900),
    priceHistory: [{ price: usd(79900), observedAt: isoDaysAgo(5) }],
    availability: 'back-in-stock',
    deliveryEstimate: 'Free delivery by Tue, Sep 15',
    requiresVariantSelection: true,
    variants: [
      { id: 'var-1007-black', sku: 'APL-WATCHU2-46-BLK', label: 'Black Titanium', options: [{ attribute: 'Finish', value: 'Black Titanium' }], availability: 'in-stock' },
      { id: 'var-1007-natural', sku: 'APL-WATCHU2-46-NAT', label: 'Natural Titanium', options: [{ attribute: 'Finish', value: 'Natural Titanium' }], availability: 'in-stock' },
    ],
    savedAt: isoDaysAgo(3),
    updatedAt: isoDaysAgo(1),
    collectionIds: ['col-gift-ideas'],
    stockAlert: { status: 'enabled', notifyOn: 'back-in-stock' },
  },
  {
    id: 'sp-1008',
    productId: 'cat-88213',
    sku: 'AWY-CARRYON-CAR',
    name: 'Away The Carry-On Hardside Suitcase',
    brand: 'Away',
    category: 'Travel',
    sellerId: 'sel-08',
    sellerName: 'Sold by Away',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
    rating: 4.6,
    reviewCount: 7660,
    price: usd(27500),
    previousPrice: usd(29500),
    lowestObservedPrice: usd(27500),
    priceHistory: [
      { price: usd(29500), observedAt: isoDaysAgo(25) },
      { price: usd(27500), observedAt: isoDaysAgo(4) },
    ],
    discountPercent: 7,
    availability: 'in-stock',
    deliveryEstimate: 'Free delivery by Thu, Sep 18',
    requiresVariantSelection: true,
    variants: [
      { id: 'var-1008-caramel', sku: 'AWY-CARRYON-CAR', label: 'Caramel', options: [{ attribute: 'Color', value: 'Caramel' }], availability: 'in-stock' },
      { id: 'var-1008-black', sku: 'AWY-CARRYON-BLK', label: 'Black', options: [{ attribute: 'Color', value: 'Black' }], availability: 'in-stock' },
    ],
    selectedVariantId: 'var-1008-caramel',
    savedAt: isoDaysAgo(8),
    updatedAt: isoDaysAgo(4),
    collectionIds: ['col-travel'],
  },
  {
    id: 'sp-1009',
    productId: 'cat-92110',
    sku: 'NIN-SWOLED-WHT',
    name: 'Nintendo Switch OLED Model, White',
    brand: 'Nintendo',
    category: 'Gaming',
    sellerId: 'sel-09',
    sellerName: 'Sold by GameStop',
    imageUrl: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600&q=80',
    rating: 4.8,
    reviewCount: 15230,
    price: usd(34999),
    priceHistory: [{ price: usd(34999), observedAt: isoDaysAgo(90) }],
    availability: 'discontinued',
    deliveryEstimate: 'No longer sold by this seller',
    requiresVariantSelection: false,
    savedAt: isoDaysAgo(70),
    updatedAt: isoDaysAgo(6),
    collectionIds: ['col-wishlist'],
    stateChange: { type: 'discontinued' },
  },
  {
    id: 'sp-1010',
    productId: 'cat-40021',
    sku: 'BNQ-PD3225U-27',
    name: 'BenQ PD3225U 32" 4K Design Monitor',
    brand: 'BenQ',
    category: 'Electronics',
    sellerId: 'sel-10',
    sellerName: 'Sold by BenQ America',
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80',
    rating: 4.5,
    reviewCount: 980,
    price: usd(89900),
    previousPrice: usd(99900),
    lowestObservedPrice: usd(84900),
    priceHistory: [
      { price: usd(99900), observedAt: isoDaysAgo(35) },
      { price: usd(89900), observedAt: isoDaysAgo(5) },
    ],
    discountPercent: 10,
    availability: 'in-stock',
    deliveryEstimate: 'Free delivery by Mon, Sep 21',
    requiresVariantSelection: false,
    savedAt: isoDaysAgo(17),
    updatedAt: isoDaysAgo(5),
    collectionIds: ['col-home-office'],
    priceAlert: { status: 'enabled', targetPrice: usd(79900), channel: 'email' },
  },
  {
    id: 'sp-1011',
    productId: 'cat-51166',
    sku: 'BOSE-QC-EARBUDS-II',
    name: 'Bose QuietComfort Ultra Earbuds',
    brand: 'Bose',
    category: 'Electronics',
    sellerId: 'sel-11',
    sellerName: 'Sold by Bose',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
    rating: 4.3,
    reviewCount: 3320,
    price: usd(29900),
    priceHistory: [{ price: usd(29900), observedAt: isoDaysAgo(12) }],
    availability: 'unavailable',
    deliveryEstimate: 'Listing removed by seller',
    requiresVariantSelection: false,
    savedAt: isoDaysAgo(28),
    updatedAt: isoDaysAgo(7),
    collectionIds: ['col-travel'],
    stateChange: { type: 'seller-changed', previousSeller: 'Sold by Bose' },
  },
  {
    id: 'sp-1012',
    productId: 'cat-63340',
    sku: 'THE-YETI-RAMBLER-30',
    name: 'YETI Rambler 30oz Tumbler',
    brand: 'YETI',
    category: 'Home & Kitchen',
    sellerId: 'sel-12',
    sellerName: 'Sold by YETI',
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80',
    rating: 4.7,
    reviewCount: 21040,
    price: usd(3800),
    previousPrice: usd(4500),
    lowestObservedPrice: usd(3800),
    priceHistory: [
      { price: usd(4500), observedAt: isoDaysAgo(18) },
      { price: usd(3800), observedAt: isoDaysAgo(2) },
    ],
    discountPercent: 16,
    availability: 'in-stock',
    deliveryEstimate: 'Free delivery by Wed, Sep 16',
    requiresVariantSelection: true,
    variants: [
      { id: 'var-1012-granite', sku: 'THE-YETI-RAMBLER-30-GRN', label: 'Granite Gray', options: [{ attribute: 'Color', value: 'Granite Gray' }], availability: 'in-stock' },
      { id: 'var-1012-navy', sku: 'THE-YETI-RAMBLER-30-NVY', label: 'Navy', options: [{ attribute: 'Color', value: 'Navy' }], availability: 'in-stock' },
    ],
    selectedVariantId: 'var-1012-granite',
    savedAt: isoDaysAgo(4),
    updatedAt: isoDaysAgo(2),
    collectionIds: ['col-gift-ideas'],
  },
];

export const MOCK_RECOMMENDATIONS = [
  { id: 'rec-1', name: 'Sony WF-1000XM5 Earbuds', brand: 'Sony', imageUrl: 'https://images.unsplash.com/photo-1606400082777-ef05f3c5cde2?w=400&q=80', price: usd(27999), rating: 4.6 },
  { id: 'rec-2', name: 'Herman Miller Sayl Chair', brand: 'Herman Miller', imageUrl: 'https://images.unsplash.com/photo-1505843490578-a04a0d75be76?w=400&q=80', price: usd(69500), rating: 4.6 },
  { id: 'rec-3', name: 'Logitech Litra Glow Light', brand: 'Logitech', imageUrl: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&q=80', price: usd(6999), rating: 4.5 },
  { id: 'rec-4', name: 'Peak Design Travel Backpack', brand: 'Peak Design', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80', price: usd(28000), rating: 4.7 },
];

// ============================================================================
// FORMATTING / UTILITY FUNCTIONS
// ============================================================================

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function formatMoney(money: Money): string {
  const symbol = CURRENCY_SYMBOL[money.currency];
  const major = money.amountMinor / 100;
  const formatted = major.toLocaleString('en-US', { minimumFractionDigits: major % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
  return `${symbol}${formatted}`;
}

export function subtractMoney(a: Money, b: Money): Money {
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

export function percentDrop(previous: Money, current: Money): number {
  if (previous.amountMinor === 0) return 0;
  return Math.round(((previous.amountMinor - current.amountMinor) / previous.amountMinor) * 100);
}

export function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getEffectivePrice(product: SavedProduct): Money {
  const variant = product.variants?.find((v) => v.id === product.selectedVariantId);
  return variant?.priceOverride ?? product.price;
}

export function getSelectedVariant(product: SavedProduct): ProductVariant | undefined {
  return product.variants?.find((v) => v.id === product.selectedVariantId);
}

export function hasActivePriceDrop(product: SavedProduct): boolean {
  return !!product.previousPrice && product.previousPrice.amountMinor > product.price.amountMinor;
}

export function isNewlyBackInStock(product: SavedProduct): boolean {
  return product.availability === 'back-in-stock';
}

export function isLowStock(product: SavedProduct): boolean {
  return product.availability === 'low-stock';
}

export function opKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}

// ============================================================================
// REDUX TOOLKIT — NORMALIZED STATE
// ============================================================================

const productsAdapter = createEntityAdapter<SavedProduct>();
const collectionsAdapter = createEntityAdapter<Collection>();

interface SavedSliceState {
  products: EntityState<SavedProduct, string>;
  collections: EntityState<Collection, string>;
  selectedProductIds: string[];
  activeCollectionId: string | null;
  smartView: SmartView;
  search: string;
  filters: SavedItemFilter;
  sort: SavedItemSort;
  viewMode: SavedItemViewMode;
  operations: Record<string, SavedOperationState<unknown>>;
}

const EMPTY_FILTERS: SavedItemFilter = {
  categories: [],
  brands: [],
  sellers: [],
  minRating: null,
  discountOnly: false,
  availability: [],
  priceDropOnly: false,
  stockAlertOnly: false,
  maxPriceMinor: null,
};

const initialSavedState: SavedSliceState = {
  products: productsAdapter.setAll(productsAdapter.getInitialState(), MOCK_PRODUCTS),
  collections: collectionsAdapter.setAll(collectionsAdapter.getInitialState(), MOCK_COLLECTIONS),
  selectedProductIds: [],
  activeCollectionId: null,
  smartView: 'all',
  search: '',
  filters: EMPTY_FILTERS,
  sort: 'recently-added',
  viewMode: 'grid',
  operations: {},
};

/** Simulated backend latency for demonstrable async flows. Deterministic
 *  success paths; a small set of ids are wired to fail so error UI is real. */
function simulate<T>(data: T, opts?: { failIds?: string[]; targetId?: string }): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (opts?.failIds && opts.targetId && opts.failIds.includes(opts.targetId)) {
        reject(new Error('The request could not be completed. Please try again.'));
      } else {
        resolve(data);
      }
    }, 500);
  });
}

// A deliberately unreliable product id, used to demonstrate real error UI.
const FLAKY_PRODUCT_ID = 'sp-1009';

export const addSelectedToCart = createAsyncThunk<
  { productIds: string[] },
  { productIds: string[] },
  { rejectValue: string }
>('saved/addToCart', async ({ productIds }, { rejectWithValue }) => {
  try {
    return await simulate({ productIds }, { failIds: [FLAKY_PRODUCT_ID], targetId: productIds[0] });
  } catch (e) {
    return rejectWithValue((e as Error).message);
  }
});

export const removeSavedProducts = createAsyncThunk<
  { productIds: string[] },
  { productIds: string[] },
  { rejectValue: string }
>('saved/removeProducts', async ({ productIds }) => simulate({ productIds }));

export const moveProductsToCollection = createAsyncThunk<
  { productIds: string[]; targetCollectionId: string },
  { productIds: string[]; targetCollectionId: string },
  { rejectValue: string }
>('saved/moveProducts', async (payload) => simulate(payload));

export const createCollectionThunk = createAsyncThunk<
  Collection,
  { name: string; description: string; visibility: CollectionVisibility },
  { rejectValue: string }
>('saved/createCollection', async ({ name, description, visibility }) => {
  const collection: Collection = {
    id: `col-${Math.random().toString(36).slice(2, 9)}`,
    name,
    description,
    visibility,
    itemIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return simulate(collection);
});

export const renameCollectionThunk = createAsyncThunk<
  { id: string; name: string; description: string },
  { id: string; name: string; description: string },
  { rejectValue: string }
>('saved/renameCollection', async (payload) => simulate(payload));

export const deleteCollectionThunk = createAsyncThunk<
  { id: string },
  { id: string },
  { rejectValue: string }
>('saved/deleteCollection', async (payload) => simulate(payload));

export const toggleShareThunk = createAsyncThunk<
  { id: string; visibility: CollectionVisibility; shareLink?: string },
  { id: string; enable: boolean },
  { rejectValue: string }
>('saved/toggleShare', async ({ id, enable }) => {
  const shareLink = enable ? `https://shop.example.com/s/${id}-${Math.random().toString(36).slice(2, 8)}` : undefined;
  return simulate({ id, visibility: enable ? 'link' : 'private', shareLink } as const);
});

export const setPriceAlertThunk = createAsyncThunk<
  { productId: string; alert: PriceAlert },
  { productId: string; alert: PriceAlert },
  { rejectValue: string }
>('saved/setPriceAlert', async (payload) => simulate(payload));

export const setStockAlertThunk = createAsyncThunk<
  { productId: string; alert: StockAlert },
  { productId: string; alert: StockAlert },
  { rejectValue: string }
>('saved/setStockAlert', async (payload) => simulate(payload));

const savedSlice = createSlice({
  name: 'saved',
  initialState: initialSavedState,
  reducers: {
    setSmartView(state, action: PayloadAction<SmartView>) {
      state.smartView = action.payload;
      state.activeCollectionId = null;
      state.selectedProductIds = [];
    },
    setActiveCollection(state, action: PayloadAction<string | null>) {
      state.activeCollectionId = action.payload;
      state.smartView = 'all';
      state.selectedProductIds = [];
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setSort(state, action: PayloadAction<SavedItemSort>) {
      state.sort = action.payload;
    },
    setViewMode(state, action: PayloadAction<SavedItemViewMode>) {
      state.viewMode = action.payload;
    },
    setFilters(state, action: PayloadAction<Partial<SavedItemFilter>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters(state) {
      state.filters = EMPTY_FILTERS;
    },
    toggleProductSelected(state, action: PayloadAction<string>) {
      const idx = state.selectedProductIds.indexOf(action.payload);
      if (idx === -1) state.selectedProductIds.push(action.payload);
      else state.selectedProductIds.splice(idx, 1);
    },
    setSelectedIds(state, action: PayloadAction<string[]>) {
      state.selectedProductIds = action.payload;
    },
    clearSelection(state) {
      state.selectedProductIds = [];
    },
    selectVariant(state, action: PayloadAction<{ productId: string; variantId: string }>) {
      const product = state.products.entities[action.payload.productId];
      if (product) product.selectedVariantId = action.payload.variantId;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addSelectedToCart.pending, (state, action) => {
        action.meta.arg.productIds.forEach((id) => {
          state.operations[opKey('add-to-cart', id)] = { status: 'loading' };
        });
      })
      .addCase(addSelectedToCart.fulfilled, (state, action) => {
        action.payload.productIds.forEach((id) => {
          state.operations[opKey('add-to-cart', id)] = { status: 'success', data: undefined };
        });
      })
      .addCase(addSelectedToCart.rejected, (state, action) => {
        action.meta.arg.productIds.forEach((id) => {
          state.operations[opKey('add-to-cart', id)] = { status: 'error', message: action.payload ?? 'Could not add item to cart.' };
        });
      })
      .addCase(removeSavedProducts.pending, (state, action) => {
        action.meta.arg.productIds.forEach((id) => { state.operations[opKey('remove', id)] = { status: 'loading' }; });
      })
      .addCase(removeSavedProducts.fulfilled, (state, action) => {
        productsAdapter.removeMany(state.products, action.payload.productIds);
        collectionsAdapter.getSelectors().selectAll(state.collections).forEach((c) => {
          c.itemIds = c.itemIds.filter((id) => !action.payload.productIds.includes(id));
        });
        state.selectedProductIds = state.selectedProductIds.filter((id) => !action.payload.productIds.includes(id));
        action.payload.productIds.forEach((id) => { delete state.operations[opKey('remove', id)]; });
      })
      .addCase(removeSavedProducts.rejected, (state, action) => {
        action.meta.arg.productIds.forEach((id) => {
          state.operations[opKey('remove', id)] = { status: 'error', message: action.payload ?? 'Could not remove item.' };
        });
      })
      .addCase(moveProductsToCollection.pending, (state, action) => {
        state.operations[opKey('move', action.meta.arg.targetCollectionId)] = { status: 'loading' };
      })
      .addCase(moveProductsToCollection.fulfilled, (state, action) => {
        const { productIds, targetCollectionId } = action.payload;
        const target = state.collections.entities[targetCollectionId];
        if (target) {
          productIds.forEach((id) => {
            if (!target.itemIds.includes(id)) target.itemIds.push(id);
            const product = state.products.entities[id];
            if (product && !product.collectionIds.includes(targetCollectionId)) product.collectionIds.push(targetCollectionId);
          });
          target.updatedAt = new Date().toISOString();
        }
        state.selectedProductIds = [];
        state.operations[opKey('move', targetCollectionId)] = { status: 'success', data: undefined };
      })
      .addCase(moveProductsToCollection.rejected, (state, action) => {
        state.operations[opKey('move', action.meta.arg.targetCollectionId)] = { status: 'error', message: action.payload ?? 'Could not move items.' };
      })
      .addCase(createCollectionThunk.pending, (state) => {
        state.operations[opKey('create-collection', 'new')] = { status: 'loading' };
      })
      .addCase(createCollectionThunk.fulfilled, (state, action) => {
        collectionsAdapter.addOne(state.collections, action.payload);
        state.operations[opKey('create-collection', 'new')] = { status: 'success', data: action.payload };
      })
      .addCase(createCollectionThunk.rejected, (state, action) => {
        state.operations[opKey('create-collection', 'new')] = { status: 'error', message: action.payload ?? 'Could not create collection.' };
      })
      .addCase(renameCollectionThunk.fulfilled, (state, action) => {
        collectionsAdapter.updateOne(state.collections, {
          id: action.payload.id,
          changes: { name: action.payload.name, description: action.payload.description, updatedAt: new Date().toISOString() },
        });
      })
      .addCase(deleteCollectionThunk.fulfilled, (state, action) => {
        collectionsAdapter.removeOne(state.collections, action.payload.id);
        if (state.activeCollectionId === action.payload.id) state.activeCollectionId = null;
      })
      .addCase(toggleShareThunk.pending, (state, action) => {
        state.operations[opKey('share', action.meta.arg.id)] = { status: 'loading' };
      })
      .addCase(toggleShareThunk.fulfilled, (state, action) => {
        collectionsAdapter.updateOne(state.collections, {
          id: action.payload.id,
          changes: { visibility: action.payload.visibility, shareLink: action.payload.shareLink, updatedAt: new Date().toISOString() },
        });
        state.operations[opKey('share', action.payload.id)] = { status: 'success', data: undefined };
      })
      .addCase(toggleShareThunk.rejected, (state, action) => {
        state.operations[opKey('share', action.meta.arg.id)] = { status: 'error', message: action.payload ?? 'Could not update sharing.' };
      })
      .addCase(setPriceAlertThunk.fulfilled, (state, action) => {
        const product = state.products.entities[action.payload.productId];
        if (product) product.priceAlert = action.payload.alert;
      })
      .addCase(setStockAlertThunk.fulfilled, (state, action) => {
        const product = state.products.entities[action.payload.productId];
        if (product) product.stockAlert = action.payload.alert;
      });
  },
});

export const {
  setSmartView,
  setActiveCollection,
  setSearch,
  setSort,
  setViewMode,
  setFilters,
  clearFilters,
  toggleProductSelected,
  setSelectedIds,
  clearSelection,
  selectVariant,
} = savedSlice.actions;

// ============================================================================
// SELECTORS
// ============================================================================

interface RootState {
  saved: SavedSliceState;
}

const productSelectors = productsAdapter.getSelectors<RootState>((state) => state.saved.products);
const collectionSelectors = collectionsAdapter.getSelectors<RootState>((state) => state.saved.collections);

export const selectAllProducts = productSelectors.selectAll;
export const selectAllCollections = collectionSelectors.selectAll;
export const selectProductById = (id: string) => (state: RootState) => productSelectors.selectById(state, id);
export const selectCollectionById = (id: string) => (state: RootState) => collectionSelectors.selectById(state, id);

export const selectSmartView = (state: RootState) => state.saved.smartView;
export const selectActiveCollectionId = (state: RootState) => state.saved.activeCollectionId;
export const selectSearch = (state: RootState) => state.saved.search;
export const selectFilters = (state: RootState) => state.saved.filters;
export const selectSort = (state: RootState) => state.saved.sort;
export const selectViewMode = (state: RootState) => state.saved.viewMode;
export const selectSelectedProductIds = (state: RootState) => state.saved.selectedProductIds;
export const selectOperations = (state: RootState) => state.saved.operations;

export const selectOperation = (kind: string, id: string) =>
  (state: RootState): SavedOperationState<unknown> => state.saved.operations[opKey(kind, id)] ?? { status: 'idle' };

export const selectPriceDropProducts = createSelector(selectAllProducts, (products) => products.filter(hasActivePriceDrop));
export const selectBackInStockProducts = createSelector(selectAllProducts, (products) => products.filter(isNewlyBackInStock));
export const selectLowStockProducts = createSelector(selectAllProducts, (products) => products.filter(isLowStock));
export const selectRecentlySavedProducts = createSelector(selectAllProducts, (products) =>
  [...products].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 6),
);

export const selectDistinctBrands = createSelector(selectAllProducts, (products) => Array.from(new Set(products.map((p) => p.brand))).sort());
export const selectDistinctCategories = createSelector(selectAllProducts, (products) => Array.from(new Set(products.map((p) => p.category))).sort());
export const selectDistinctSellers = createSelector(selectAllProducts, (products) => Array.from(new Set(products.map((p) => p.sellerName))).sort());

/** The single source of truth for "what should currently render" — combines
 *  smart view / active collection with search, filters, and sort. */
export const selectVisibleProducts = createSelector(
  selectAllProducts,
  selectSmartView,
  selectActiveCollectionId,
  selectSearch,
  selectFilters,
  selectSort,
  (state: RootState) => state.saved.collections,
  (products, smartView, activeCollectionId, search, filters, sort, collectionsState) => {
    let list = products;

    if (activeCollectionId) {
      const collection = collectionsState.entities[activeCollectionId];
      const itemSet = new Set(collection?.itemIds ?? []);
      list = list.filter((p) => itemSet.has(p.id));
    } else {
      switch (smartView) {
        case 'wishlist':
          list = list.filter((p) => p.collectionIds.includes('col-wishlist'));
          break;
        case 'price-drops':
          list = list.filter(hasActivePriceDrop);
          break;
        case 'back-in-stock':
          list = list.filter(isNewlyBackInStock);
          break;
        case 'low-stock':
          list = list.filter(isLowStock);
          break;
        case 'recent':
          list = [...list].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 8);
          break;
        default:
          break;
      }
    }

    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(needle) ||
        p.brand.toLowerCase().includes(needle) ||
        p.sellerName.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle),
      );
    }

    if (filters.categories.length) list = list.filter((p) => filters.categories.includes(p.category));
    if (filters.brands.length) list = list.filter((p) => filters.brands.includes(p.brand));
    if (filters.sellers.length) list = list.filter((p) => filters.sellers.includes(p.sellerName));
    if (filters.minRating !== null) list = list.filter((p) => p.rating >= (filters.minRating as number));
    if (filters.discountOnly) list = list.filter((p) => !!p.discountPercent);
    if (filters.availability.length) list = list.filter((p) => filters.availability.includes(p.availability));
    if (filters.priceDropOnly) list = list.filter(hasActivePriceDrop);
    if (filters.stockAlertOnly) list = list.filter((p) => p.stockAlert?.status === 'enabled');
    if (filters.maxPriceMinor !== null) list = list.filter((p) => getEffectivePrice(p).amountMinor <= (filters.maxPriceMinor as number));

    const sorted = [...list];
    switch (sort) {
      case 'recently-added':
        sorted.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        break;
      case 'recently-updated':
        sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'price-asc':
        sorted.sort((a, b) => getEffectivePrice(a).amountMinor - getEffectivePrice(b).amountMinor);
        break;
      case 'price-desc':
        sorted.sort((a, b) => getEffectivePrice(b).amountMinor - getEffectivePrice(a).amountMinor);
        break;
      case 'discount-desc':
        sorted.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
        break;
      case 'rating-desc':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'price-drops':
        sorted.sort((a, b) => Number(hasActivePriceDrop(b)) - Number(hasActivePriceDrop(a)));
        break;
      case 'availability':
        sorted.sort((a, b) => Number(AVAILABILITY_CONFIG[b.availability].purchasable) - Number(AVAILABILITY_CONFIG[a.availability].purchasable));
        break;
    }
    return sorted;
  },
);

export const selectSavedSummary = createSelector(selectAllProducts, selectPriceDropProducts, selectBackInStockProducts, selectLowStockProducts,
  (all, drops, backInStock, lowStock) => ({
    total: all.length,
    priceDrops: drops.length,
    backInStock: backInStock.length,
    lowStock: lowStock.length,
  }),
);

// ============================================================================
// STORE
// ============================================================================

const rootReducer = combineReducers({ saved: savedSlice.reducer });

export const makeStore = () => configureStore({ reducer: rootReducer });
type AppStore = ReturnType<typeof makeStore>;
type AppDispatch = AppStore['dispatch'];

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ============================================================================
// LOCAL HOOKS (non-Redux, ephemeral UI concerns)
// ============================================================================

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [query]);
  return matches;
}

function useOutsideClick<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);
  return ref;
}

function useEscapeKey(onEscape: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onEscape();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape, active]);
}

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: 'success' | 'danger' | 'info';
}

/** Lightweight ephemeral toast queue. Purely local — feedback is transient
 *  UI, not shared application state. */
function useToastQueue() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);
  const dismiss = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, push, dismiss };
}

interface ToastContextValue {
  push: (toast: Omit<ToastItem, 'id'>) => void;
}
const ToastContext = React.createContext<ToastContextValue>({ push: () => undefined });
function useToast() {
  return React.useContext(ToastContext).push;
}

// ============================================================================
// PURPOSEFUL UI PRIMITIVES
// ============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-[--color-primary] text-[--color-primary-foreground] hover:opacity-90',
  secondary: 'bg-[--color-secondary] text-[--color-secondary-foreground] hover:bg-[--color-muted]',
  outline: 'border border-[--color-border] text-[--color-foreground] hover:bg-[--color-muted]',
  ghost: 'text-[--color-foreground] hover:bg-[--color-muted]',
  danger: 'bg-[--color-destructive] text-white hover:opacity-90',
};

function Button({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-[--radius-md] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring] disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
        BUTTON_VARIANT_CLASSES[variant],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

function IconButton({ label, active, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-[--radius-md] text-[--color-muted-foreground] transition-colors hover:bg-[--color-muted] hover:text-[--color-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]',
        active && 'bg-[--color-muted] text-[--color-foreground]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

const TONE_CLASSES: Record<AvailabilityVisual['tone'], string> = {
  success: 'bg-[--color-success-bg] text-[--color-success] border-[--color-success-border]',
  warning: 'bg-[--color-warning-bg] text-[--color-warning] border-[--color-warning-border]',
  danger: 'bg-[--color-destructive-bg] text-[--color-destructive] border-[--color-destructive-border]',
  neutral: 'bg-[--color-muted] text-[--color-muted-foreground] border-[--color-border]',
  info: 'bg-[--color-info-bg] text-[--color-info] border-[--color-info-border]',
};

function StatusPill({ tone, label, icon: Icon }: { tone: AvailabilityVisual['tone']; label: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap', TONE_CLASSES[tone])}>
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {label}
    </span>
  );
}

function AvailabilityBadge({ availability }: { availability: AvailabilityStatus }) {
  const config = AVAILABILITY_CONFIG[availability];
  const Icon = config.purchasable ? PackageCheck : config.alertable ? PackageSearch : PackageX;
  return <StatusPill tone={config.tone} label={config.label} icon={Icon} />;
}

function RatingStars({ rating, reviewCount, size = 'sm' }: { rating: number; reviewCount?: number; size?: 'sm' | 'md' }) {
  const starSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5 stars${reviewCount ? ` from ${reviewCount.toLocaleString()} reviews` : ''}`}>
      <div className="flex" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={cn(starSize, i < Math.round(rating) ? 'fill-[--color-warning] text-[--color-warning]' : 'text-[--color-border]')} />
        ))}
      </div>
      <span className="text-xs font-medium text-[--color-foreground]">{rating.toFixed(1)}</span>
      {reviewCount !== undefined && <span className="text-xs text-[--color-muted-foreground]">({reviewCount.toLocaleString()})</span>}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-[--radius-sm] bg-[--color-muted]', className)} aria-hidden="true" />;
}

function EmptyState({ icon: Icon, title, description, action }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[--radius-lg] border border-dashed border-[--color-border] px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[--color-muted]">
        <Icon className="h-5 w-5 text-[--color-muted-foreground]" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[--color-foreground]">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-[--color-muted-foreground]">{description}</p>
      </div>
      {action}
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-2 rounded-[--radius-md] border border-[--color-destructive-border] bg-[--color-destructive-bg] px-3 py-2 text-sm text-[--color-destructive]">
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry && <button onClick={onRetry} className="font-medium underline underline-offset-2">Retry</button>}
    </div>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
      {toasts.map((t) => (
        <div key={t.id} role="status" className="pointer-events-auto flex items-start gap-3 rounded-[--radius-md] border border-[--color-border] bg-[--color-popover] px-4 py-3 shadow-[var(--shadow-md)]">
          {t.tone === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[--color-success]" aria-hidden="true" />}
          {t.tone === 'danger' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[--color-destructive]" aria-hidden="true" />}
          {t.tone === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0 text-[--color-info]" aria-hidden="true" />}
          <div className="flex-1">
            <p className="text-sm font-medium text-[--color-popover-foreground]">{t.title}</p>
            {t.description && <p className="mt-0.5 text-xs text-[--color-muted-foreground]">{t.description}</p>}
          </div>
          <IconButton label="Dismiss notification" onClick={() => onDismiss(t.id)}><X className="h-3.5 w-3.5" /></IconButton>
        </div>
      ))}
    </div>
  );
}

function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  useEscapeKey(onClose, open);
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-[--color-backdrop]" onClick={onClose} />
      <div className={cn(
        'relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-[--radius-lg] border border-[--color-border] bg-[--color-popover] shadow-[var(--shadow-lg)] sm:rounded-[--radius-lg]',
        size === 'sm' && 'sm:max-w-sm',
        size === 'md' && 'sm:max-w-lg',
        size === 'lg' && 'sm:max-w-2xl',
      )}>
        <div className="flex items-center justify-between border-b border-[--color-border] px-5 py-4">
          <h2 id={titleId} className="text-sm font-semibold text-[--color-popover-foreground]">{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-[--color-border] px-5 py-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', destructive, loading, error }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; confirmLabel?: string; destructive?: boolean; loading?: boolean; error?: string | null;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={<>
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant={destructive ? 'danger' : 'primary'} size="sm" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}
    >
      <p className="text-sm text-[--color-muted-foreground]">{description}</p>
      {error && <div className="mt-3"><InlineError message={error} /></div>}
    </Modal>
  );
}

/** Bottom sheet used for mobile filter/sort/collection-switch surfaces so the
 *  mobile experience is recomposed rather than a shrunk desktop panel. */
function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEscapeKey(onClose, open);
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-[--color-backdrop]" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-[--radius-lg] border border-[--color-border] bg-[--color-popover] shadow-[var(--shadow-lg)]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[--color-border]" />
        <div className="flex items-center justify-between px-5 py-3">
          <h2 id={titleId} className="text-sm font-semibold text-[--color-popover-foreground]">{title}</h2>
          <IconButton label="Close" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// PRODUCT COMPONENTS
// ============================================================================

function ProductMedia({ product }: { product: SavedProduct }) {
  const config = AVAILABILITY_CONFIG[product.availability];
  return (
    <div className="relative aspect-square shrink-0 overflow-hidden rounded-[--radius-md] bg-[--color-muted]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.imageUrl}
        alt={`${product.brand} ${product.name}`}
        className={cn('h-full w-full object-cover', !config.purchasable && 'opacity-60 grayscale-[0.3]')}
        loading="lazy"
      />
      {product.discountPercent && (
        <span className="absolute left-2 top-2 rounded-[--radius-sm] bg-[--color-destructive] px-1.5 py-0.5 text-[11px] font-semibold text-white">
          -{product.discountPercent}%
        </span>
      )}
      {!config.purchasable && (
        <span className="absolute inset-x-0 bottom-0 bg-[--color-backdrop] px-2 py-1 text-center text-[11px] font-medium text-white">
          {config.label}
        </span>
      )}
    </div>
  );
}

function ProductPricing({ product }: { product: SavedProduct }) {
  const price = getEffectivePrice(product);
  const dropped = hasActivePriceDrop(product);
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-base font-semibold text-[--color-foreground]">{formatMoney(price)}</span>
        {product.previousPrice && (
          <span className="text-xs text-[--color-muted-foreground] line-through">{formatMoney(product.previousPrice)}</span>
        )}
      </div>
      {dropped && product.previousPrice && (
        <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[--color-success]">
          <TrendingDown className="h-3 w-3" aria-hidden="true" />
          Price dropped — save {formatMoney(subtractMoney(product.previousPrice, product.price))}
        </p>
      )}
      {product.lowestObservedPrice && product.lowestObservedPrice.amountMinor < price.amountMinor && (
        <p className="mt-0.5 text-[11px] text-[--color-muted-foreground]">Lowest seen: {formatMoney(product.lowestObservedPrice)}</p>
      )}
    </div>
  );
}

function ProductStateNotice({ stateChange }: { stateChange: ProductStateChange }) {
  const text = (() => {
    switch (stateChange.type) {
      case 'price-changed':
        return `Price changed from ${formatMoney(stateChange.previous)} to ${formatMoney(stateChange.current)}`;
      case 'discontinued':
        return 'This product has been discontinued by the manufacturer.';
      case 'seller-changed':
        return `No longer sold by ${stateChange.previousSeller}.`;
      case 'variant-unavailable':
        return `The ${stateChange.variantLabel} option you saved is no longer available.`;
      case 'promotion-ended':
        return 'The promotion on this item has ended.';
    }
  })();
  return (
    <p className="flex items-start gap-1.5 text-xs text-[--color-muted-foreground]">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}

/** Contextual action bar: exactly one primary action driven by availability,
 *  with secondary actions in an overflow menu so the card never shows six
 *  competing buttons. */
function ProductActions({
  product,
  onAddToCart,
  onRemove,
  onMove,
  onShare,
  onPriceAlert,
  onStockAlert,
  addToCartState,
}: {
  product: SavedProduct;
  onAddToCart: () => void;
  onRemove: () => void;
  onMove: () => void;
  onShare: () => void;
  onPriceAlert: () => void;
  onStockAlert: () => void;
  addToCartState: SavedOperationState<unknown>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useOutsideClick<HTMLDivElement>(() => setMenuOpen(false));
  const config = AVAILABILITY_CONFIG[product.availability];

  return (
    <div className="flex items-center gap-2">
      {config.purchasable ? (
        <Button variant="primary" size="sm" className="flex-1" onClick={onAddToCart} loading={addToCartState.status === 'loading'}>
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
          {product.requiresVariantSelection ? 'Select options' : 'Add to Cart'}
        </Button>
      ) : config.alertable ? (
        <Button variant="outline" size="sm" className="flex-1" onClick={onStockAlert} aria-pressed={product.stockAlert?.status === 'enabled'}>
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          {product.stockAlert?.status === 'enabled' ? 'Notifying you' : 'Notify me'}
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="flex-1" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
        </Button>
      )}
      <div className="relative" ref={menuRef}>
        <IconButton label={`More actions for ${product.name}`} active={menuOpen} aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen((o) => !o)}>
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>
        {menuOpen && (
          <div role="menu" className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-[--radius-md] border border-[--color-border] bg-[--color-popover] py-1 shadow-[var(--shadow-md)]">
            <button role="menuitem" onClick={() => { setMenuOpen(false); onMove(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[--color-popover-foreground] hover:bg-[--color-muted]"><FolderInput className="h-3.5 w-3.5" /> Move to collection</button>
            <button role="menuitem" onClick={() => { setMenuOpen(false); onShare(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[--color-popover-foreground] hover:bg-[--color-muted]"><Share2 className="h-3.5 w-3.5" /> Share</button>
            {config.purchasable && (
              <button role="menuitem" onClick={() => { setMenuOpen(false); onPriceAlert(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[--color-popover-foreground] hover:bg-[--color-muted]">
                <Bell className="h-3.5 w-3.5" /> {product.priceAlert?.status === 'enabled' ? 'Edit price alert' : 'Set price alert'}
              </button>
            )}
            {config.alertable && (
              <button role="menuitem" onClick={() => { setMenuOpen(false); onStockAlert(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[--color-popover-foreground] hover:bg-[--color-muted]">
                <PackageSearch className="h-3.5 w-3.5" /> {product.stockAlert?.status === 'enabled' ? 'Edit stock alert' : 'Set stock alert'}
              </button>
            )}
            <button role="menuitem" onClick={() => { setMenuOpen(false); onRemove(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[--color-destructive] hover:bg-[--color-destructive-bg]"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProductCardHandlers {
  onAddToCart: (product: SavedProduct) => void;
  onRemove: (product: SavedProduct) => void;
  onMove: (product: SavedProduct) => void;
  onShare: (product: SavedProduct) => void;
  onPriceAlert: (product: SavedProduct) => void;
  onStockAlert: (product: SavedProduct) => void;
}

function SavedProductCard({ product, selected, onToggleSelect, handlers }: {
  product: SavedProduct; selected: boolean; onToggleSelect: (id: string) => void; handlers: ProductCardHandlers;
}) {
  const addToCartState = useAppSelector(selectOperation('add-to-cart', product.id));
  const collections = useAppSelector(selectAllCollections);
  const membershipNames = product.collectionIds.map((id) => collections.find((c) => c.id === id)?.name).filter(Boolean) as string[];

  return (
    <li className="group relative flex flex-col gap-3 rounded-[--radius-lg] border border-[--color-border] bg-[--color-card] p-3 shadow-[var(--shadow-xs)] transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="absolute left-4 top-4 z-10">
        <input
          type="checkbox"
          aria-label={`Select ${product.name}`}
          checked={selected}
          onChange={() => onToggleSelect(product.id)}
          className="h-4 w-4 rounded-[--radius-sm] border-[--color-border] text-[--color-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]"
        />
      </div>
      <ProductMedia product={product} />
      <div className="flex flex-1 flex-col gap-1.5">
        <p className="text-xs font-medium text-[--color-muted-foreground]">{product.brand}</p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-[--color-foreground]">{product.name}</h3>
        <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
        <ProductPricing product={product} />
        <div className="flex flex-wrap items-center gap-1.5">
          <AvailabilityBadge availability={product.availability} />
          {product.priceAlert?.status === 'enabled' && <StatusPill tone="info" label="Price alert on" icon={Bell} />}
        </div>
        {product.stateChange && <ProductStateNotice stateChange={product.stateChange} />}
        <p className="text-xs text-[--color-muted-foreground]">{product.sellerName}</p>
        {AVAILABILITY_CONFIG[product.availability].purchasable && <p className="text-xs text-[--color-muted-foreground]">{product.deliveryEstimate}</p>}
        {membershipNames.length > 0 && (
          <p className="truncate text-[11px] text-[--color-muted-foreground]">In: {membershipNames.join(', ')}</p>
        )}
        <p className="text-[11px] text-[--color-muted-foreground]">Saved {formatRelativeDate(product.savedAt)}</p>
      </div>
      {addToCartState.status === 'error' && <InlineError message={addToCartState.message} onRetry={() => handlers.onAddToCart(product)} />}
      <ProductActions
        product={product}
        addToCartState={addToCartState}
        onAddToCart={() => handlers.onAddToCart(product)}
        onRemove={() => handlers.onRemove(product)}
        onMove={() => handlers.onMove(product)}
        onShare={() => handlers.onShare(product)}
        onPriceAlert={() => handlers.onPriceAlert(product)}
        onStockAlert={() => handlers.onStockAlert(product)}
      />
    </li>
  );
}

function SavedProductRow({ product, selected, onToggleSelect, handlers }: {
  product: SavedProduct; selected: boolean; onToggleSelect: (id: string) => void; handlers: ProductCardHandlers;
}) {
  const addToCartState = useAppSelector(selectOperation('add-to-cart', product.id));
  return (
    <li className="flex flex-col gap-3 border-b border-[--color-border] py-4 last:border-0 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3 sm:flex-1 sm:items-center">
        <input
          type="checkbox"
          aria-label={`Select ${product.name}`}
          checked={selected}
          onChange={() => onToggleSelect(product.id)}
          className="mt-1 h-4 w-4 shrink-0 rounded-[--radius-sm] border-[--color-border] text-[--color-primary] sm:mt-0"
        />
        <div className="h-16 w-16 shrink-0"><ProductMedia product={product} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[--color-muted-foreground]">{product.brand}</p>
          <h3 className="truncate text-sm font-medium text-[--color-foreground]">{product.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <RatingStars rating={product.rating} />
            <AvailabilityBadge availability={product.availability} />
          </div>
          {product.stateChange && <div className="mt-1"><ProductStateNotice stateChange={product.stateChange} /></div>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:w-56 sm:flex-col sm:items-end sm:gap-1.5">
        <ProductPricing product={product} />
      </div>
      <div className="sm:w-64">
        {addToCartState.status === 'error' && <div className="mb-2"><InlineError message={addToCartState.message} onRetry={() => handlers.onAddToCart(product)} /></div>}
        <ProductActions
          product={product}
          addToCartState={addToCartState}
          onAddToCart={() => handlers.onAddToCart(product)}
          onRemove={() => handlers.onRemove(product)}
          onMove={() => handlers.onMove(product)}
          onShare={() => handlers.onShare(product)}
          onPriceAlert={() => handlers.onPriceAlert(product)}
          onStockAlert={() => handlers.onStockAlert(product)}
        />
      </div>
    </li>
  );
}

// ============================================================================
// PRODUCT GRID / LIST CONTAINER
// ============================================================================

function ProductGridSkeleton({ viewMode }: { viewMode: SavedItemViewMode }) {
  if (viewMode === 'list') {
    return (
      <ul>
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 border-b border-[--color-border] py-4 last:border-0">
            <Skeleton className="h-16 w-16" />
            <div className="flex-1 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-56" /></div>
            <Skeleton className="h-8 w-28" />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-[--radius-lg] border border-[--color-border] p-3">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

function SavedProductGrid({ products, viewMode, isLoading, handlers, emptyState }: {
  products: SavedProduct[];
  viewMode: SavedItemViewMode;
  isLoading: boolean;
  handlers: ProductCardHandlers;
  emptyState: React.ReactNode;
}) {
  const selectedIds = useAppSelector(selectSelectedProductIds);
  const dispatch = useAppDispatch();
  const toggleSelect = useCallback((id: string) => dispatch(toggleProductSelected(id)), [dispatch]);

  if (isLoading) return <ProductGridSkeleton viewMode={viewMode} />;
  if (products.length === 0) return <>{emptyState}</>;

  if (viewMode === 'list') {
    return (
      <ul className="divide-y-0">
        {products.map((p) => (
          <SavedProductRow key={p.id} product={p} selected={selectedIds.includes(p.id)} onToggleSelect={toggleSelect} handlers={handlers} />
        ))}
      </ul>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <SavedProductCard key={p.id} product={p} selected={selectedIds.includes(p.id)} onToggleSelect={toggleSelect} handlers={handlers} />
      ))}
    </ul>
  );
}

// ============================================================================
// COLLECTION COMPONENTS
// ============================================================================

function CollectionCard({ collection, onOpen, onRename, onDelete, onShare }: {
  collection: Collection; onOpen: () => void; onRename: () => void; onDelete: () => void; onShare: () => void;
}) {
  const cover = useAppSelector(selectProductById(collection.coverProductId ?? ''));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useOutsideClick<HTMLDivElement>(() => setMenuOpen(false));
  return (
    <li className="group relative overflow-hidden rounded-[--radius-lg] border border-[--color-border] bg-[--color-card] shadow-[var(--shadow-xs)]">
      <button onClick={onOpen} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]">
        <div className="aspect-[4/3] w-full bg-[--color-muted]">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-[--color-foreground]">{collection.name}</p>
            {collection.visibility !== 'private' && (collection.visibility === 'link' ? <Link2 className="h-3.5 w-3.5 shrink-0 text-[--color-muted-foreground]" aria-label="Link sharing on" /> : <Users2 className="h-3.5 w-3.5 shrink-0 text-[--color-muted-foreground]" aria-label="Shared collection" />)}
          </div>
          <p className="mt-0.5 text-xs text-[--color-muted-foreground]">{collection.itemIds.length} {collection.itemIds.length === 1 ? 'item' : 'items'}</p>
        </div>
      </button>
      <div className="absolute right-2 top-2" ref={menuRef}>
        <IconButton label={`More actions for ${collection.name}`} active={menuOpen} onClick={() => setMenuOpen((o) => !o)} className="bg-[--color-card]/80 backdrop-blur">
          <MoreHorizontal className="h-4 w-4" />
        </IconButton>
        {menuOpen && (
          <div role="menu" className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-[--radius-md] border border-[--color-border] bg-[--color-popover] py-1 shadow-[var(--shadow-md)]">
            <button role="menuitem" onClick={() => { setMenuOpen(false); onRename(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[--color-popover-foreground] hover:bg-[--color-muted]"><Pencil className="h-3.5 w-3.5" /> Rename</button>
            <button role="menuitem" onClick={() => { setMenuOpen(false); onShare(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[--color-popover-foreground] hover:bg-[--color-muted]"><Share2 className="h-3.5 w-3.5" /> Share</button>
            <button role="menuitem" onClick={() => { setMenuOpen(false); onDelete(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[--color-destructive] hover:bg-[--color-destructive-bg]"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </div>
        )}
      </div>
    </li>
  );
}

function CollectionSection({ onOpenCollection, onRename, onDelete, onShare, onCreate }: {
  onOpenCollection: (id: string) => void; onRename: (c: Collection) => void; onDelete: (c: Collection) => void; onShare: (c: Collection) => void; onCreate: () => void;
}) {
  const collections = useAppSelector(selectAllCollections);
  return (
    <section aria-labelledby="collections-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="collections-heading" className="text-base font-semibold text-[--color-foreground]">Collections</h2>
        <Button variant="outline" size="sm" onClick={onCreate}><FolderPlus className="h-3.5 w-3.5" /> New collection</Button>
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {collections.map((c) => (
          <CollectionCard key={c.id} collection={c} onOpen={() => onOpenCollection(c.id)} onRename={() => onRename(c)} onDelete={() => onDelete(c)} onShare={() => onShare(c)} />
        ))}
      </ul>
    </section>
  );
}

// ============================================================================
// FOCUSED SECTIONS (Recently Saved / Price Drops / Back in Stock / Low Stock)
// ============================================================================

function CompactProductRow({ product, onAddToCart, addToCartState }: { product: SavedProduct; onAddToCart: () => void; addToCartState: SavedOperationState<unknown> }) {
  const config = AVAILABILITY_CONFIG[product.availability];
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="h-14 w-14 shrink-0"><ProductMedia product={product} /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[--color-foreground]">{product.name}</p>
        <ProductPricing product={product} />
      </div>
      {config.purchasable ? (
        <Button variant="outline" size="sm" onClick={onAddToCart} loading={addToCartState.status === 'loading'}>
          <ShoppingCart className="h-3.5 w-3.5" /> Add
        </Button>
      ) : (
        <AvailabilityBadge availability={product.availability} />
      )}
    </li>
  );
}

function RecentlySavedSection({ onAddToCart }: { onAddToCart: (p: SavedProduct) => void }) {
  const products = useAppSelector(selectRecentlySavedProducts);
  const operations = useAppSelector(selectOperations);
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="recent-heading" className="rounded-[--radius-lg] border border-[--color-border] bg-[--color-card] p-4">
      <h2 id="recent-heading" className="mb-1 flex items-center gap-2 text-base font-semibold text-[--color-foreground]"><Clock className="h-4 w-4 text-[--color-muted-foreground]" /> Recently Saved</h2>
      <ul className="divide-y divide-[--color-border]">
        {products.map((p) => (
          <CompactProductRow key={p.id} product={p} onAddToCart={() => onAddToCart(p)} addToCartState={operations[opKey('add-to-cart', p.id)] ?? { status: 'idle' }} />
        ))}
      </ul>
    </section>
  );
}

function PriceDropSection({ onAddToCart }: { onAddToCart: (p: SavedProduct) => void }) {
  const products = useAppSelector(selectPriceDropProducts);
  const operations = useAppSelector(selectOperations);
  return (
    <section aria-labelledby="pricedrop-heading" className="rounded-[--radius-lg] border border-[--color-border] bg-[--color-card] p-4">
      <h2 id="pricedrop-heading" className="mb-1 flex items-center gap-2 text-base font-semibold text-[--color-foreground]"><TrendingDown className="h-4 w-4 text-[--color-success]" /> Price Drops</h2>
      {products.length === 0 ? (
        <p className="py-6 text-center text-sm text-[--color-muted-foreground]">No saved products have dropped in price.</p>
      ) : (
        <ul className="divide-y divide-[--color-border]">
          {products.map((p) => (
            <CompactProductRow key={p.id} product={p} onAddToCart={() => onAddToCart(p)} addToCartState={operations[opKey('add-to-cart', p.id)] ?? { status: 'idle' }} />
          ))}
        </ul>
      )}
    </section>
  );
}

function BackInStockSection({ onAddToCart }: { onAddToCart: (p: SavedProduct) => void }) {
  const products = useAppSelector(selectBackInStockProducts);
  const operations = useAppSelector(selectOperations);
  return (
    <section aria-labelledby="backinstock-heading" className="rounded-[--radius-lg] border border-[--color-border] bg-[--color-card] p-4">
      <h2 id="backinstock-heading" className="mb-1 flex items-center gap-2 text-base font-semibold text-[--color-foreground]"><PackageCheck className="h-4 w-4 text-[--color-success]" /> Back in Stock</h2>
      {products.length === 0 ? (
        <p className="py-6 text-center text-sm text-[--color-muted-foreground]">Nothing is back in stock right now.</p>
      ) : (
        <ul className="divide-y divide-[--color-border]">
          {products.map((p) => (
            <CompactProductRow key={p.id} product={p} onAddToCart={() => onAddToCart(p)} addToCartState={operations[opKey('add-to-cart', p.id)] ?? { status: 'idle' }} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LowStockSection({ onAddToCart }: { onAddToCart: (p: SavedProduct) => void }) {
  const products = useAppSelector(selectLowStockProducts);
  const operations = useAppSelector(selectOperations);
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="lowstock-heading" className="rounded-[--radius-lg] border border-[--color-border] bg-[--color-card] p-4">
      <h2 id="lowstock-heading" className="mb-1 flex items-center gap-2 text-base font-semibold text-[--color-foreground]"><PackageSearch className="h-4 w-4 text-[--color-warning]" /> Low Stock</h2>
      <ul className="divide-y divide-[--color-border]">
        {products.map((p) => (
          <CompactProductRow key={p.id} product={p} onAddToCart={() => onAddToCart(p)} addToCartState={operations[opKey('add-to-cart', p.id)] ?? { status: 'idle' }} />
        ))}
      </ul>
    </section>
  );
}

function RecommendationSection() {
  return (
    <section aria-labelledby="recs-heading" className="space-y-3">
      <h2 id="recs-heading" className="flex items-center gap-2 text-base font-semibold text-[--color-foreground]"><Sparkles className="h-4 w-4 text-[--color-muted-foreground]" /> You might also like</h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {MOCK_RECOMMENDATIONS.map((r) => (
          <li key={r.id} className="rounded-[--radius-lg] border border-[--color-border] bg-[--color-card] p-3">
            <div className="aspect-square overflow-hidden rounded-[--radius-md] bg-[--color-muted]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.imageUrl} alt={`${r.brand} ${r.name}`} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <p className="mt-2 truncate text-xs font-medium text-[--color-muted-foreground]">{r.brand}</p>
            <p className="line-clamp-2 text-sm text-[--color-foreground]">{r.name}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-[--color-foreground]">{formatMoney(r.price)}</span>
              <RatingStars rating={r.rating} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TrustSection() {
  const items = [
    { icon: ShieldCheck, title: 'Buyer protection', body: 'Every order is covered by our purchase guarantee.' },
    { icon: RotateCcw, title: 'Free 30-day returns', body: 'Change your mind within 30 days of delivery.' },
    { icon: Truck, title: 'Reliable delivery', body: 'Real-time tracking on every shipment.' },
  ];
  return (
    <section aria-label="Why shop with us" className="grid grid-cols-1 gap-4 rounded-[--radius-lg] border border-[--color-border] bg-[--color-card] p-5 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="flex items-start gap-3">
          <item.icon className="h-5 w-5 shrink-0 text-[--color-primary]" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-[--color-foreground]">{item.title}</p>
            <p className="text-xs text-[--color-muted-foreground]">{item.body}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

// ============================================================================
// FILTER SIDEBAR
// ============================================================================

function CheckboxFilterGroup({ title, options, selected, onChange }: { title: string; options: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };
  return (
    <fieldset className="border-b border-[--color-border] py-4 first:pt-0 last:border-0">
      <legend className="mb-2 text-sm font-semibold text-[--color-foreground]">{title}</legend>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-[--color-foreground]">
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="h-3.5 w-3.5 rounded-[--radius-sm] border-[--color-border] text-[--color-primary]" />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RatingFilter({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <fieldset className="border-b border-[--color-border] py-4">
      <legend className="mb-2 text-sm font-semibold text-[--color-foreground]">Customer rating</legend>
      <div className="space-y-1.5">
        {[4, 3, 2].map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-2 text-sm text-[--color-foreground]">
            <input type="radio" name="min-rating" checked={value === r} onChange={() => onChange(value === r ? null : r)} className="h-3.5 w-3.5 border-[--color-border] text-[--color-primary]" />
            <RatingStars rating={r} />
            <span>& up</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PriceFilter({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const options: { label: string; maxMinor: number | null }[] = [
    { label: 'Under $50', maxMinor: 5000 },
    { label: 'Under $150', maxMinor: 15000 },
    { label: 'Under $500', maxMinor: 50000 },
    { label: 'Any price', maxMinor: null },
  ];
  return (
    <fieldset className="border-b border-[--color-border] py-4">
      <legend className="mb-2 text-sm font-semibold text-[--color-foreground]">Price</legend>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <label key={opt.label} className="flex cursor-pointer items-center gap-2 text-sm text-[--color-foreground]">
            <input type="radio" name="max-price" checked={value === opt.maxMinor} onChange={() => onChange(opt.maxMinor)} className="h-3.5 w-3.5 border-[--color-border] text-[--color-primary]" />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FilterPanelContent() {
  const filters = useAppSelector(selectFilters);
  const brands = useAppSelector(selectDistinctBrands);
  const categories = useAppSelector(selectDistinctCategories);
  const sellers = useAppSelector(selectDistinctSellers);
  const dispatch = useAppDispatch();

  return (
    <div>
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[--color-muted-foreground]">Filters</h2>
        <button onClick={() => dispatch(clearFilters())} className="text-xs font-medium text-[--color-primary] hover:underline">Clear all</button>
      </div>
      <fieldset className="border-b border-[--color-border] py-4 first:pt-0">
        <legend className="mb-2 text-sm font-semibold text-[--color-foreground]">Availability</legend>
        <div className="space-y-1.5">
          {(['in-stock', 'low-stock', 'back-in-stock', 'pre-order', 'out-of-stock'] as AvailabilityStatus[]).map((status) => (
            <label key={status} className="flex cursor-pointer items-center gap-2 text-sm text-[--color-foreground]">
              <input
                type="checkbox"
                checked={filters.availability.includes(status)}
                onChange={() => dispatch(setFilters({ availability: filters.availability.includes(status) ? filters.availability.filter((s) => s !== status) : [...filters.availability, status] }))}
                className="h-3.5 w-3.5 rounded-[--radius-sm] border-[--color-border] text-[--color-primary]"
              />
              {AVAILABILITY_CONFIG[status].label}
            </label>
          ))}
        </div>
      </fieldset>
      <PriceFilter value={filters.maxPriceMinor} onChange={(v) => dispatch(setFilters({ maxPriceMinor: v }))} />
      <RatingFilter value={filters.minRating} onChange={(v) => dispatch(setFilters({ minRating: v }))} />
      <fieldset className="border-b border-[--color-border] py-4">
        <legend className="mb-2 text-sm font-semibold text-[--color-foreground]">Discount</legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[--color-foreground]">
          <input type="checkbox" checked={filters.discountOnly} onChange={() => dispatch(setFilters({ discountOnly: !filters.discountOnly }))} className="h-3.5 w-3.5 rounded-[--radius-sm] border-[--color-border] text-[--color-primary]" />
          On sale only
        </label>
      </fieldset>
      <CheckboxFilterGroup title="Brand" options={brands} selected={filters.brands} onChange={(v) => dispatch(setFilters({ brands: v }))} />
      <CheckboxFilterGroup title="Category" options={categories} selected={filters.categories} onChange={(v) => dispatch(setFilters({ categories: v }))} />
      <CheckboxFilterGroup title="Seller" options={sellers} selected={filters.sellers} onChange={(v) => dispatch(setFilters({ sellers: v }))} />
    </div>
  );
}

function FilterSidebar() {
  return <aside aria-label="Filter saved items" className="hidden w-60 shrink-0 lg:block">{<FilterPanelContent />}</aside>;
}

// ============================================================================
// SAVED TOOLBAR (search / filter / sort / view mode / selection actions)
// ============================================================================

function SelectionActionsBar({ count, onAddToCart, onMove, onShare, onRemove, onClear, addToCartLoading }: {
  count: number; onAddToCart: () => void; onMove: () => void; onShare: () => void; onRemove: () => void; onClear: () => void; addToCartLoading: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[--radius-md] border border-[--color-border] bg-[--color-primary-soft] px-3 py-2">
      <span className="text-sm font-medium text-[--color-foreground]">{count} selected</span>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Button variant="secondary" size="sm" onClick={onAddToCart} loading={addToCartLoading}><ShoppingCart className="h-3.5 w-3.5" /> Add to cart</Button>
        <Button variant="secondary" size="sm" onClick={onMove}><FolderInput className="h-3.5 w-3.5" /> Move</Button>
        <Button variant="secondary" size="sm" onClick={onShare}><Share2 className="h-3.5 w-3.5" /> Share</Button>
        <Button variant="outline" size="sm" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
        <IconButton label="Clear selection" onClick={onClear}><X className="h-4 w-4" /></IconButton>
      </div>
    </div>
  );
}

function SavedToolbar({ onOpenMobileFilters, onOpenBulk }: { onOpenMobileFilters: () => void; onOpenBulk: (action: 'move' | 'share' | 'remove') => void }) {
  const dispatch = useAppDispatch();
  const search = useAppSelector(selectSearch);
  const sort = useAppSelector(selectSort);
  const viewMode = useAppSelector(selectViewMode);
  const selectedIds = useAppSelector(selectSelectedProductIds);
  const visibleProducts = useAppSelector(selectVisibleProducts);
  const bulkAddState = useAppSelector((s) => selectedIds.map((id) => selectOperation('add-to-cart', id)(s)));
  const bulkLoading = bulkAddState.some((op) => op.status === 'loading');

  const allVisibleSelected = visibleProducts.length > 0 && visibleProducts.every((p) => selectedIds.includes(p.id));

  const handleAddSelectedToCart = useCallback(() => {
    dispatch(addSelectedToCart({ productIds: selectedIds }));
  }, [dispatch, selectedIds]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-muted-foreground]" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => dispatch(setSearch(e.target.value))}
            placeholder="Search saved items by name, brand, or seller"
            aria-label="Search saved items"
            className="h-10 w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-background] pl-9 pr-9 text-sm text-[--color-foreground] placeholder:text-[--color-muted-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]"
          />
          {search && (
            <button onClick={() => dispatch(setSearch(''))} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-muted-foreground] hover:text-[--color-foreground]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={onOpenMobileFilters}><SlidersHorizontal className="h-3.5 w-3.5" /> Filters</Button>
          <div className="relative">
            <label className="sr-only" htmlFor="sort-select">Sort saved items</label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => dispatch(setSort(e.target.value as SavedItemSort))}
              className="h-9 appearance-none rounded-[--radius-md] border border-[--color-border] bg-[--color-background] py-0 pl-8 pr-8 text-sm text-[--color-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]"
            >
              {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--color-muted-foreground]" aria-hidden="true" />
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--color-muted-foreground]" aria-hidden="true" />
          </div>
          <div role="group" aria-label="View mode" className="flex overflow-hidden rounded-[--radius-md] border border-[--color-border]">
            <button
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
              onClick={() => dispatch(setViewMode('grid'))}
              className={cn('flex h-9 w-9 items-center justify-center', viewMode === 'grid' ? 'bg-[--color-primary] text-[--color-primary-foreground]' : 'text-[--color-muted-foreground] hover:bg-[--color-muted]')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
              onClick={() => dispatch(setViewMode('list'))}
              className={cn('flex h-9 w-9 items-center justify-center border-l border-[--color-border]', viewMode === 'list' ? 'bg-[--color-primary] text-[--color-primary-foreground]' : 'text-[--color-muted-foreground] hover:bg-[--color-muted]')}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[--color-muted-foreground]">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={() => dispatch(allVisibleSelected ? clearSelection() : setSelectedIds(visibleProducts.map((p) => p.id)))}
            className="h-3.5 w-3.5 rounded-[--radius-sm] border-[--color-border] text-[--color-primary]"
          />
          Select all visible ({visibleProducts.length})
        </label>
      </div>
      {selectedIds.length > 0 && (
        <SelectionActionsBar
          count={selectedIds.length}
          onAddToCart={handleAddSelectedToCart}
          onMove={() => onOpenBulk('move')}
          onShare={() => onOpenBulk('share')}
          onRemove={() => onOpenBulk('remove')}
          onClear={() => dispatch(clearSelection())}
          addToCartLoading={bulkLoading}
        />
      )}
    </div>
  );
}

// ============================================================================
// SAVED SIDEBAR / MOBILE COLLECTION SWITCHER
// ============================================================================

function SavedOverview() {
  const summary = useAppSelector(selectSavedSummary);
  return (
    <dl className="grid grid-cols-2 gap-2 rounded-[--radius-md] bg-[--color-muted] p-3 text-center">
      <div><dt className="text-[11px] text-[--color-muted-foreground]">Saved</dt><dd className="text-lg font-semibold text-[--color-foreground]">{summary.total}</dd></div>
      <div><dt className="text-[11px] text-[--color-muted-foreground]">Price drops</dt><dd className="text-lg font-semibold text-[--color-success]">{summary.priceDrops}</dd></div>
    </dl>
  );
}

function SidebarNavItem({ active, icon: Icon, label, count, onClick }: { active: boolean; icon: React.ComponentType<{ className?: string }>; label: string; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-[--radius-md] px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]',
        active ? 'bg-[--color-primary-soft] text-[--color-primary]' : 'text-[--color-foreground] hover:bg-[--color-muted]',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-[--color-muted-foreground]">{count}</span>}
    </button>
  );
}

function SavedSidebarNavigation({ onCreateCollection }: { onCreateCollection: () => void }) {
  const smartView = useAppSelector(selectSmartView);
  const activeCollectionId = useAppSelector(selectActiveCollectionId);
  const collections = useAppSelector(selectAllCollections);
  const summary = useAppSelector(selectSavedSummary);
  const dispatch = useAppDispatch();

  const smartCounts: Partial<Record<SmartView, number>> = {
    all: summary.total,
    'price-drops': summary.priceDrops,
    'back-in-stock': summary.backInStock,
    'low-stock': summary.lowStock,
  };

  return (
    <nav aria-label="Saved item navigation" className="space-y-4">
      <div className="space-y-0.5">
        {SMART_VIEW_CONFIG.map((item) => (
          <SidebarNavItem
            key={item.id}
            active={!activeCollectionId && smartView === item.id}
            icon={item.icon}
            label={item.label}
            count={smartCounts[item.id]}
            onClick={() => dispatch(setSmartView(item.id))}
          />
        ))}
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between px-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[--color-muted-foreground]">Collections</h3>
          <IconButton label="Create collection" onClick={onCreateCollection}><Plus className="h-3.5 w-3.5" /></IconButton>
        </div>
        <div className="space-y-0.5">
          {collections.map((c) => (
            <SidebarNavItem key={c.id} active={activeCollectionId === c.id} icon={Boxes} label={c.name} count={c.itemIds.length} onClick={() => dispatch(setActiveCollection(c.id))} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function SavedSidebar({ onCreateCollection }: { onCreateCollection: () => void }) {
  return (
    <aside aria-label="Saved items sidebar" className="hidden w-64 shrink-0 space-y-4 lg:block">
      <SavedOverview />
      <SavedSidebarNavigation onCreateCollection={onCreateCollection} />
    </aside>
  );
}

function MobileCollectionSwitcher({ open, onClose, onCreateCollection }: { open: boolean; onClose: () => void; onCreateCollection: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Browse saved items">
      <SavedSidebarNavigation onCreateCollection={onCreateCollection} />
    </BottomSheet>
  );
}

// ============================================================================
// ECOMMERCE HEADER
// ============================================================================

function AnnouncementBar() {
  return (
    <div className="hidden bg-[--color-primary] px-4 py-1.5 text-center text-xs font-medium text-[--color-primary-foreground] sm:block">
      Free shipping on orders over $35 · Extended returns through Jan 31
    </div>
  );
}

function SearchBar({ className }: { className?: string }) {
  return (
    <div className={cn('relative flex-1', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-muted-foreground]" aria-hidden="true" />
      <input
        type="search"
        placeholder="Search products, brands, and categories"
        aria-label="Search the catalog"
        className="h-10 w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-background] pl-9 pr-3 text-sm text-[--color-foreground] placeholder:text-[--color-muted-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]"
      />
    </div>
  );
}

function HeaderActions({ savedCount }: { savedCount: number }) {
  return (
    <div className="flex items-center gap-1">
      <IconButton label="Notifications"><Bell className="h-5 w-5" /></IconButton>
      <IconButton label={`Wishlist, ${savedCount} items`} active className="relative">
        <Heart className="h-5 w-5 fill-[--color-primary] text-[--color-primary]" />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[--color-primary] px-1 text-[10px] font-semibold text-[--color-primary-foreground]">{savedCount}</span>
      </IconButton>
      <IconButton label="Account"><User className="h-5 w-5" /></IconButton>
      <IconButton label="Cart, 2 items" className="relative">
        <ShoppingCart className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[--color-destructive] px-1 text-[10px] font-semibold text-white">2</span>
      </IconButton>
    </div>
  );
}

function CategoryNavigation() {
  return (
    <nav aria-label="Product categories" className="hidden border-t border-[--color-border] bg-[--color-background] px-4 lg:block">
      <ul className="mx-auto flex max-w-[1400px] items-center gap-6 py-2.5 text-sm font-medium text-[--color-foreground]">
        {CATEGORY_NAV.map((cat) => (
          <li key={cat}><a href="#" className="rounded-[--radius-sm] hover:text-[--color-primary] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]">{cat}</a></li>
        ))}
      </ul>
    </nav>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Browse">
      <SearchBar className="mb-4" />
      <ul className="space-y-1">
        {CATEGORY_NAV.map((cat) => (
          <li key={cat}><a href="#" className="block rounded-[--radius-md] px-3 py-2 text-sm font-medium text-[--color-foreground] hover:bg-[--color-muted]">{cat}</a></li>
        ))}
      </ul>
    </BottomSheet>
  );
}

function EcommerceHeader() {
  const summary = useAppSelector(selectSavedSummary);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[--color-border] bg-[--color-background]">
      <AnnouncementBar />
      <div className="flex items-center gap-3 px-4 py-3">
        <IconButton label="Open menu" className="lg:hidden" onClick={() => setMobileNavOpen(true)}><Menu className="h-5 w-5" /></IconButton>
        <a href="#" className="flex shrink-0 items-center gap-2 rounded-[--radius-sm] text-lg font-bold tracking-tight text-[--color-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]">
          <span className="flex h-8 w-8 items-center justify-center rounded-[--radius-md] bg-[--color-primary] text-sm text-[--color-primary-foreground]">M</span>
          <span className="hidden sm:inline">Meridian</span>
        </a>
        <SearchBar className="hidden sm:flex" />
        <HeaderActions savedCount={summary.total} />
      </div>
      <div className="px-4 pb-3 sm:hidden"><SearchBar /></div>
      <CategoryNavigation />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </header>
  );
}

function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="px-4 py-3 text-sm text-[--color-muted-foreground] sm:px-6">
      <ol className="flex items-center gap-1.5">
        <li><a href="#" className="hover:text-[--color-foreground]">Home</a></li>
        <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
        <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
        <li aria-current="page" className="font-medium text-[--color-foreground]">Saved Items</li>
      </ol>
    </nav>
  );
}

function EcommerceFooter() {
  return (
    <footer className="border-t border-[--color-border] bg-[--color-card]">
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
        {[
          { title: 'Shop', links: ['New arrivals', 'Best sellers', 'Deals', 'Gift cards'] },
          { title: 'Customer service', links: ['Track an order', 'Returns', 'Shipping info', 'Contact us'] },
          { title: 'About', links: ['Our story', 'Sustainability', 'Careers', 'Press'] },
          { title: 'Policies', links: ['Privacy policy', 'Terms of service', 'Accessibility'] },
        ].map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-[--color-foreground]">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => <li key={l}><a href="#" className="text-sm text-[--color-muted-foreground] hover:text-[--color-foreground]">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[--color-border] px-4 py-4 text-center text-xs text-[--color-muted-foreground] sm:px-6">
        © {new Date().getFullYear()} Meridian, Inc. All rights reserved.
      </div>
    </footer>
  );
}

// ============================================================================
// SAVED HEADER / SUMMARY
// ============================================================================

function SavedHeader({ title, onCreateList, onShare, onAddItems }: { title: string; onCreateList: () => void; onShare: () => void; onAddItems: () => void }) {
  const summary = useAppSelector(selectSavedSummary);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[--color-foreground]">{title}</h1>
        <p className="mt-0.5 text-sm text-[--color-muted-foreground]">{summary.total} saved {summary.total === 1 ? 'item' : 'items'}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAddItems}><Plus className="h-3.5 w-3.5" /> Add items</Button>
        <Button variant="outline" size="sm" onClick={onShare}><Share2 className="h-3.5 w-3.5" /> Share</Button>
        <Button variant="primary" size="sm" onClick={onCreateList}><FolderPlus className="h-3.5 w-3.5" /> Create list</Button>
      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: 'default' | 'success' | 'warning' }) {
  return (
    <div className="flex items-center gap-3 rounded-[--radius-lg] border border-[--color-border] bg-[--color-card] p-4">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-full',
        tone === 'success' && 'bg-[--color-success-bg] text-[--color-success]',
        tone === 'warning' && 'bg-[--color-warning-bg] text-[--color-warning]',
        tone === 'default' && 'bg-[--color-muted] text-[--color-muted-foreground]')}>
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-lg font-semibold leading-tight text-[--color-foreground]">{value}</p>
        <p className="text-xs text-[--color-muted-foreground]">{label}</p>
      </div>
    </div>
  );
}

function SavedSummary() {
  const summary = useAppSelector(selectSavedSummary);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryStat icon={Heart} label="Total saved" value={summary.total} tone="default" />
      <SummaryStat icon={TrendingDown} label="Price drops" value={summary.priceDrops} tone="success" />
      <SummaryStat icon={PackageCheck} label="Back in stock" value={summary.backInStock} tone="success" />
      <SummaryStat icon={PackageSearch} label="Low stock" value={summary.lowStock} tone="warning" />
    </div>
  );
}

// ============================================================================
// DIALOGS
// ============================================================================

function CreateCollectionDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<CollectionVisibility>('private');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => { setName(''); setDescription(''); setVisibility('private'); setError(null); onClose(); };

  const handleCreate = async () => {
    if (name.trim().length < 2) { setError('Give your collection a name with at least 2 characters.'); return; }
    setSubmitting(true);
    setError(null);
    const result = await dispatch(createCollectionThunk({ name: name.trim(), description: description.trim(), visibility }));
    setSubmitting(false);
    if (createCollectionThunk.fulfilled.match(result)) {
      onCreated(result.payload.id);
      handleClose();
    } else {
      setError(result.payload ?? 'Could not create the collection. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create a new list" footer={<>
      <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" size="sm" onClick={handleCreate} loading={submitting}>Create list</Button>
    </>}>
      <div className="space-y-3">
        <div>
          <label htmlFor="collection-name" className="mb-1 block text-xs font-medium text-[--color-foreground]">List name</label>
          <input id="collection-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gaming Setup" className="h-9 w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 text-sm text-[--color-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]" />
        </div>
        <div>
          <label htmlFor="collection-desc" className="mb-1 block text-xs font-medium text-[--color-foreground]">Description (optional)</label>
          <input id="collection-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this list for?" className="h-9 w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 text-sm text-[--color-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]" />
        </div>
        <fieldset>
          <legend className="mb-1 block text-xs font-medium text-[--color-foreground]">Visibility</legend>
          <div className="flex gap-2">
            {(['private', 'link'] as CollectionVisibility[]).map((v) => (
              <button key={v} type="button" onClick={() => setVisibility(v)} aria-pressed={visibility === v} className={cn('flex-1 rounded-[--radius-md] border px-3 py-2 text-sm', visibility === v ? 'border-[--color-primary] bg-[--color-primary-soft] text-[--color-primary]' : 'border-[--color-border] text-[--color-foreground]')}>
                {v === 'private' ? <Lock className="mr-1.5 inline h-3.5 w-3.5" /> : <Link2 className="mr-1.5 inline h-3.5 w-3.5" />}
                {v === 'private' ? 'Private' : 'Anyone with link'}
              </button>
            ))}
          </div>
        </fieldset>
        {error && <InlineError message={error} />}
      </div>
    </Modal>
  );
}

function RenameCollectionDialog({ collection, onClose }: { collection: Collection | null; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState(collection?.name ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(collection?.name ?? '');
    setDescription(collection?.description ?? '');
  }, [collection]);

  const handleSave = async () => {
    if (!collection) return;
    setSubmitting(true);
    await dispatch(renameCollectionThunk({ id: collection.id, name: name.trim() || collection.name, description }));
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal open={!!collection} onClose={onClose} title="Rename list" footer={<>
      <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
      <Button variant="primary" size="sm" onClick={handleSave} loading={submitting}>Save</Button>
    </>}>
      <div className="space-y-3">
        <div>
          <label htmlFor="rename-name" className="mb-1 block text-xs font-medium text-[--color-foreground]">List name</label>
          <input id="rename-name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 text-sm text-[--color-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]" />
        </div>
        <div>
          <label htmlFor="rename-desc" className="mb-1 block text-xs font-medium text-[--color-foreground]">Description</label>
          <input id="rename-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 text-sm text-[--color-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]" />
        </div>
      </div>
    </Modal>
  );
}

function DeleteCollectionDialog({ collection, onClose }: { collection: Collection | null; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [submitting, setSubmitting] = useState(false);
  const handleDelete = async () => {
    if (!collection) return;
    setSubmitting(true);
    await dispatch(deleteCollectionThunk({ id: collection.id }));
    setSubmitting(false);
    onClose();
  };
  return (
    <ConfirmDialog
      open={!!collection}
      onClose={onClose}
      onConfirm={handleDelete}
      title="Delete list"
      description={`"${collection?.name}" will be deleted. Saved products inside it will remain in your other lists and in All Saved Items.`}
      confirmLabel="Delete list"
      destructive
      loading={submitting}
    />
  );
}

function MoveItemsDialog({ open, onClose, productIds }: { open: boolean; onClose: () => void; productIds: string[] }) {
  const dispatch = useAppDispatch();
  const collections = useAppSelector(selectAllCollections);
  const [targetId, setTargetId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open && collections.length > 0 && !targetId) setTargetId(collections[0].id); }, [open, collections, targetId]);

  const handleMove = async () => {
    if (!targetId) return;
    setSubmitting(true);
    setError(null);
    const result = await dispatch(moveProductsToCollection({ productIds, targetCollectionId: targetId }));
    setSubmitting(false);
    if (moveProductsToCollection.fulfilled.match(result)) {
      onClose();
    } else {
      setError(result.payload ?? 'Some items could not be moved. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Move ${productIds.length} ${productIds.length === 1 ? 'item' : 'items'}`} footer={<>
      <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
      <Button variant="primary" size="sm" onClick={handleMove} loading={submitting} disabled={!targetId}>Move</Button>
    </>}>
      {collections.length === 0 ? (
        <p className="text-sm text-[--color-muted-foreground]">You don't have any lists yet. Create one first from the sidebar.</p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-medium text-[--color-foreground]">Choose a destination list</legend>
          {collections.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center justify-between rounded-[--radius-md] border border-[--color-border] px-3 py-2 text-sm has-[:checked]:border-[--color-primary] has-[:checked]:bg-[--color-primary-soft]">
              <span className="flex items-center gap-2 text-[--color-foreground]"><Boxes className="h-3.5 w-3.5 text-[--color-muted-foreground]" />{c.name}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-[--color-muted-foreground]">{c.itemIds.length} items</span>
                <input type="radio" name="move-target" checked={targetId === c.id} onChange={() => setTargetId(c.id)} className="h-3.5 w-3.5 text-[--color-primary]" />
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {error && <div className="mt-3"><InlineError message={error} onRetry={handleMove} /></div>}
    </Modal>
  );
}

function ShareListDialog({ collection, onClose }: { collection: Collection | null; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [copied, setCopied] = useState(false);
  const shareState = useAppSelector((s) => (collection ? selectOperation('share', collection.id)(s) : { status: 'idle' as const }));

  const handleToggle = async (enable: boolean) => {
    if (!collection) return;
    await dispatch(toggleShareThunk({ id: collection.id, enable }));
  };

  const handleCopy = async () => {
    if (!collection?.shareLink) return;
    try {
      await navigator.clipboard.writeText(collection.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — link remains selectable in the input */
    }
  };

  return (
    <Modal open={!!collection} onClose={onClose} title={`Share "${collection?.name}"`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[--color-foreground]">Link sharing</p>
            <p className="text-xs text-[--color-muted-foreground]">Anyone with the link can view this list.</p>
          </div>
          <button
            role="switch"
            aria-checked={collection?.visibility !== 'private'}
            onClick={() => handleToggle(collection?.visibility === 'private')}
            className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', collection?.visibility !== 'private' ? 'bg-[--color-primary]' : 'bg-[--color-border]')}
          >
            <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', collection?.visibility !== 'private' ? 'translate-x-[19px]' : 'translate-x-[3px]')} />
          </button>
        </div>
        {shareState.status === 'loading' && <p className="text-xs text-[--color-muted-foreground]">Updating sharing settings…</p>}
        {shareState.status === 'error' && <InlineError message={shareState.message} />}
        {collection?.shareLink && (
          <div className="flex items-center gap-2">
            <input readOnly value={collection.shareLink} aria-label="Share link" className="h-9 flex-1 rounded-[--radius-md] border border-[--color-border] bg-[--color-muted] px-3 text-xs text-[--color-foreground]" />
            <Button variant="outline" size="sm" onClick={handleCopy}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}</Button>
          </div>
        )}
        <p className="flex items-start gap-1.5 text-xs text-[--color-muted-foreground]"><Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Shared lists show product names, prices, and images. Personal notes and price alerts stay private.</p>
      </div>
    </Modal>
  );
}

function RemoveItemsDialog({ open, onClose, onConfirm, count, error, loading }: { open: boolean; onClose: () => void; onConfirm: () => void; count: number; error?: string | null; loading?: boolean }) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={count === 1 ? 'Remove item' : `Remove ${count} items`}
      description="This will remove the selected item(s) from all your lists. This can't be undone."
      confirmLabel="Remove"
      destructive
      loading={loading}
      error={error}
    />
  );
}

function VariantSelectionDialog({ product, onClose, onConfirm }: { product: SavedProduct | null; onClose: () => void; onConfirm: (variantId: string) => void }) {
  const [selected, setSelected] = useState<string | undefined>(product?.selectedVariantId ?? product?.variants?.[0]?.id);
  useEffect(() => setSelected(product?.selectedVariantId ?? product?.variants?.[0]?.id), [product]);
  const selectedVariant = product?.variants?.find((v) => v.id === selected);

  return (
    <Modal open={!!product} onClose={onClose} title="Select options" footer={<>
      <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
      <Button variant="primary" size="sm" disabled={!selected || selectedVariant?.availability === 'out-of-stock'} onClick={() => selected && onConfirm(selected)}>Add to Cart</Button>
    </>}>
      {product && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[--color-foreground]">{product.name}</p>
          <div className="grid grid-cols-2 gap-2">
            {product.variants?.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.availability === 'out-of-stock'}
                onClick={() => setSelected(v.id)}
                aria-pressed={selected === v.id}
                className={cn(
                  'rounded-[--radius-md] border px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50',
                  selected === v.id ? 'border-[--color-primary] bg-[--color-primary-soft] text-[--color-primary]' : 'border-[--color-border] text-[--color-foreground]',
                )}
              >
                {v.label}
                {v.availability !== 'in-stock' && <span className="mt-0.5 block text-[11px] text-[--color-muted-foreground]">{AVAILABILITY_CONFIG[v.availability].label}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function PriceAlertDialog({ product, onClose }: { product: SavedProduct | null; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [targetDollars, setTargetDollars] = useState('');
  const [channel, setChannel] = useState<PriceAlert['channel']>('email');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (product?.priceAlert?.targetPrice) setTargetDollars(String(product.priceAlert.targetPrice.amountMinor / 100));
    else setTargetDollars('');
    setChannel(product?.priceAlert?.channel ?? 'email');
  }, [product]);

  const handleSave = async (enable: boolean) => {
    if (!product) return;
    setSubmitting(true);
    const target = Number(targetDollars);
    await dispatch(setPriceAlertThunk({
      productId: product.id,
      alert: { status: enable ? 'enabled' : 'disabled', channel, targetPrice: enable && !Number.isNaN(target) && target > 0 ? usd(Math.round(target * 100)) : undefined },
    }));
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal open={!!product} onClose={onClose} title="Price alert" footer={<>
      <Button variant="outline" size="sm" onClick={() => handleSave(false)} loading={submitting}>Turn off</Button>
      <Button variant="primary" size="sm" onClick={() => handleSave(true)} loading={submitting}>Save alert</Button>
    </>}>
      {product && (
        <div className="space-y-3">
          <p className="text-sm text-[--color-muted-foreground]">Current price: <span className="font-medium text-[--color-foreground]">{formatMoney(getEffectivePrice(product))}</span></p>
          <div>
            <label htmlFor="target-price" className="mb-1 block text-xs font-medium text-[--color-foreground]">Notify me when price drops to</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[--color-muted-foreground]">$</span>
              <input id="target-price" type="number" min={0} value={targetDollars} onChange={(e) => setTargetDollars(e.target.value)} placeholder="e.g. 299" className="h-9 w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-background] pl-6 pr-3 text-sm text-[--color-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring]" />
            </div>
          </div>
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-[--color-foreground]">Notify me by</legend>
            <div className="flex gap-2">
              {(['email', 'push', 'sms'] as const).map((c) => (
                <button key={c} type="button" onClick={() => setChannel(c)} aria-pressed={channel === c} className={cn('flex-1 rounded-[--radius-md] border px-2 py-1.5 text-xs capitalize', channel === c ? 'border-[--color-primary] bg-[--color-primary-soft] text-[--color-primary]' : 'border-[--color-border] text-[--color-foreground]')}>{c}</button>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </Modal>
  );
}

function StockAlertDialog({ product, onClose }: { product: SavedProduct | null; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [submitting, setSubmitting] = useState(false);
  const notifyOn: StockAlert['notifyOn'] = product?.availability === 'low-stock' ? 'low-stock' : 'back-in-stock';

  const handleSave = async (enable: boolean) => {
    if (!product) return;
    setSubmitting(true);
    await dispatch(setStockAlertThunk({ productId: product.id, alert: { status: enable ? 'enabled' : 'disabled', notifyOn } }));
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal open={!!product} onClose={onClose} title="Stock alert" size="sm" footer={<>
      <Button variant="outline" size="sm" onClick={() => handleSave(false)} loading={submitting}>Turn off</Button>
      <Button variant="primary" size="sm" onClick={() => handleSave(true)} loading={submitting}>Notify me</Button>
    </>}>
      {product && (
        <p className="text-sm text-[--color-muted-foreground]">
          We'll email you as soon as <span className="font-medium text-[--color-foreground]">{product.name}</span> is {notifyOn === 'low-stock' ? 'confirmed in stock' : 'back in stock'}.
        </p>
      )}
    </Modal>
  );
}

// ============================================================================
// SAVED WORKSPACE / MAIN CONTENT ORCHESTRATION
// ============================================================================

type DialogState =
  | { kind: 'none' }
  | { kind: 'create-collection' }
  | { kind: 'rename-collection'; collection: Collection }
  | { kind: 'delete-collection'; collection: Collection }
  | { kind: 'share-collection'; collection: Collection }
  | { kind: 'move-items'; productIds: string[] }
  | { kind: 'remove-items'; productIds: string[] }
  | { kind: 'share-product'; product: SavedProduct }
  | { kind: 'select-variant'; product: SavedProduct }
  | { kind: 'price-alert'; product: SavedProduct }
  | { kind: 'stock-alert'; product: SavedProduct };

function SavedMain() {
  const dispatch = useAppDispatch();
  const notify = useToast();
  const smartView = useAppSelector(selectSmartView);
  const activeCollectionId = useAppSelector(selectActiveCollectionId);
  const activeCollection = useAppSelector((s) => (activeCollectionId ? selectCollectionById(activeCollectionId)(s) : undefined));
  const visibleProducts = useAppSelector(selectVisibleProducts);
  const viewMode = useAppSelector(selectViewMode);
  const search = useAppSelector(selectSearch);
  const filters = useAppSelector(selectFilters);
  const selectedIds = useAppSelector(selectSelectedProductIds);

  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const closeDialog = useCallback(() => setDialog({ kind: 'none' }), []);

  const performAddToCart = useCallback(async (product: SavedProduct) => {
    const result = await dispatch(addSelectedToCart({ productIds: [product.id] }));
    if (addSelectedToCart.fulfilled.match(result)) {
      notify({ title: 'Added to cart', description: product.name, tone: 'success' });
    } else {
      notify({ title: 'Could not add to cart', description: result.payload ?? 'Please try again.', tone: 'danger' });
    }
  }, [dispatch, notify]);

  const handleAddToCart = useCallback((product: SavedProduct) => {
    if (product.requiresVariantSelection && !product.selectedVariantId) {
      setDialog({ kind: 'select-variant', product });
      return;
    }
    performAddToCart(product);
  }, [performAddToCart]);

  const handleConfirmVariant = useCallback((variantId: string) => {
    if (dialog.kind !== 'select-variant') return;
    const product = dialog.product;
    dispatch(selectVariant({ productId: product.id, variantId }));
    closeDialog();
    performAddToCart({ ...product, selectedVariantId: variantId });
  }, [dialog, dispatch, closeDialog, performAddToCart]);

  const handleRemove = useCallback((productIds: string[]) => setDialog({ kind: 'remove-items', productIds }), []);

  const confirmRemove = useCallback(async () => {
    if (dialog.kind !== 'remove-items') return;
    setRemoveLoading(true);
    setRemoveError(null);
    const result = await dispatch(removeSavedProducts({ productIds: dialog.productIds }));
    setRemoveLoading(false);
    if (removeSavedProducts.fulfilled.match(result)) {
      notify({ title: dialog.productIds.length === 1 ? 'Item removed' : `${dialog.productIds.length} items removed`, tone: 'success' });
      closeDialog();
    } else {
      setRemoveError(result.payload ?? 'Could not remove item(s). Please try again.');
    }
  }, [dialog, dispatch, notify, closeDialog]);

  const activeTitle = activeCollection?.name ?? SMART_VIEW_CONFIG.find((v) => v.id === smartView)?.label ?? 'Saved Items';

  const emptyState = useMemo(() => {
    if (search.trim()) {
      return <EmptyState icon={Search} title="No matches found" description="No saved items match your search. Try a different keyword or clear your search." action={<Button variant="outline" size="sm" onClick={() => dispatch(setSearch(''))}>Clear search</Button>} />;
    }
    const hasActiveFilters = filters.categories.length || filters.brands.length || filters.sellers.length || filters.minRating || filters.discountOnly || filters.availability.length || filters.priceDropOnly || filters.stockAlertOnly || filters.maxPriceMinor;
    if (hasActiveFilters) {
      return <EmptyState icon={SlidersHorizontal} title="No items match these filters" description="Try removing a filter to see more of your saved items." action={<Button variant="outline" size="sm" onClick={() => dispatch(clearFilters())}>Clear filters</Button>} />;
    }
    if (activeCollectionId) {
      return <EmptyState icon={Boxes} title="This collection is empty" description="Add saved products to this collection from any product card's Move menu." />;
    }
    if (smartView === 'price-drops') return <EmptyState icon={TrendingDown} title="No price drops" description="No saved products have dropped in price." />;
    if (smartView === 'back-in-stock') return <EmptyState icon={PackageCheck} title="Nothing back in stock" description="Nothing is back in stock right now." />;
    if (smartView === 'low-stock') return <EmptyState icon={PackageSearch} title="No low-stock items" description="None of your saved products are currently low on stock." />;
    return <EmptyState icon={Heart} title="No saved items yet" description="Save products you want to revisit later — they'll show up here." action={<Button variant="primary" size="sm">Start browsing</Button>} />;
  }, [search, filters, activeCollectionId, smartView, dispatch]);

  const handlers: ProductCardHandlers = {
    onAddToCart: handleAddToCart,
    onRemove: (p) => handleRemove([p.id]),
    onMove: (p) => setDialog({ kind: 'move-items', productIds: [p.id] }),
    onShare: (p) => setDialog({ kind: 'share-product', product: p }),
    onPriceAlert: (p) => setDialog({ kind: 'price-alert', product: p }),
    onStockAlert: (p) => setDialog({ kind: 'stock-alert', product: p }),
  };

  const showOverviewSections = !activeCollectionId && smartView === 'all' && !search.trim();

  return (
    <div className="min-w-0 flex-1 space-y-6">
      <SavedHeader
        title={activeTitle}
        onCreateList={() => setDialog({ kind: 'create-collection' })}
        onShare={() => activeCollection ? setDialog({ kind: 'share-collection', collection: activeCollection }) : notify({ title: 'Select a collection to share', tone: 'info' })}
        onAddItems={() => notify({ title: 'Browse the catalog to save more items', tone: 'info' })}
      />
      <SavedSummary />
      <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileNavOpen(true)}>
        <Boxes className="h-3.5 w-3.5" /> {activeTitle}
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>

      {showOverviewSections && (
        <CollectionSection
          onOpenCollection={(id) => dispatch(setActiveCollection(id))}
          onRename={(c) => setDialog({ kind: 'rename-collection', collection: c })}
          onDelete={(c) => setDialog({ kind: 'delete-collection', collection: c })}
          onShare={(c) => setDialog({ kind: 'share-collection', collection: c })}
          onCreate={() => setDialog({ kind: 'create-collection' })}
        />
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <FilterSidebar />
        <div className="min-w-0 flex-1 space-y-4">
          <SavedToolbar
            onOpenMobileFilters={() => setMobileFiltersOpen(true)}
            onOpenBulk={(action) => {
              if (action === 'move') setDialog({ kind: 'move-items', productIds: selectedIds });
              if (action === 'share') { const first = visibleProducts.find((p) => p.id === selectedIds[0]); if (first) setDialog({ kind: 'share-product', product: first }); }
              if (action === 'remove') setDialog({ kind: 'remove-items', productIds: selectedIds });
            }}
          />
          <SavedProductGrid products={visibleProducts} viewMode={viewMode} isLoading={false} handlers={handlers} emptyState={emptyState} />
        </div>
      </div>

      {showOverviewSections && (
        <>
          <RecentlySavedSection onAddToCart={handleAddToCart} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PriceDropSection onAddToCart={handleAddToCart} />
            <BackInStockSection onAddToCart={handleAddToCart} />
          </div>
          <LowStockSection onAddToCart={handleAddToCart} />
        </>
      )}

      <RecommendationSection />
      <TrustSection />

      <BottomSheet open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} title="Filter saved items">
        <FilterPanelContent />
      </BottomSheet>
      <MobileCollectionSwitcher open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} onCreateCollection={() => { setMobileNavOpen(false); setDialog({ kind: 'create-collection' }); }} />

      <CreateCollectionDialog open={dialog.kind === 'create-collection'} onClose={closeDialog} onCreated={(id) => { dispatch(setActiveCollection(id)); notify({ title: 'List created', tone: 'success' }); }} />
      <RenameCollectionDialog collection={dialog.kind === 'rename-collection' ? dialog.collection : null} onClose={closeDialog} />
      <DeleteCollectionDialog collection={dialog.kind === 'delete-collection' ? dialog.collection : null} onClose={closeDialog} />
      <ShareListDialog collection={dialog.kind === 'share-collection' ? dialog.collection : null} onClose={closeDialog} />
      <MoveItemsDialog open={dialog.kind === 'move-items'} onClose={closeDialog} productIds={dialog.kind === 'move-items' ? dialog.productIds : []} />
      <RemoveItemsDialog
        open={dialog.kind === 'remove-items'}
        onClose={() => { setRemoveError(null); closeDialog(); }}
        onConfirm={confirmRemove}
        count={dialog.kind === 'remove-items' ? dialog.productIds.length : 0}
        error={removeError}
        loading={removeLoading}
      />
      <VariantSelectionDialog product={dialog.kind === 'select-variant' ? dialog.product : null} onClose={closeDialog} onConfirm={handleConfirmVariant} />
      <PriceAlertDialog product={dialog.kind === 'price-alert' ? dialog.product : null} onClose={closeDialog} />
      <StockAlertDialog product={dialog.kind === 'stock-alert' ? dialog.product : null} onClose={closeDialog} />
      <Modal open={dialog.kind === 'share-product'} onClose={closeDialog} title="Share product">
        {dialog.kind === 'share-product' && (
          <div className="space-y-3">
            <p className="text-sm text-[--color-foreground]">{dialog.product.name}</p>
            <div className="flex items-center gap-2">
              <input readOnly value={`https://shop.example.com/p/${dialog.product.productId}`} aria-label="Product share link" className="h-9 flex-1 rounded-[--radius-md] border border-[--color-border] bg-[--color-muted] px-3 text-xs text-[--color-foreground]" />
              <Button variant="outline" size="sm"><Copy className="h-3.5 w-3.5" /> Copy</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SavedWorkspace() {
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
      <SavedSidebar onCreateCollection={() => setCreateOpen(true)} />
      <SavedMain />
      <CreateCollectionDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => setCreateOpen(false)} />
    </div>
  );
}

// ============================================================================
// SAVEDPAGE ROOT
// ============================================================================

function SavedPageShell() {
  const { toasts, push, dismiss } = useToastQueue();
  return (
    <ToastContext.Provider value={{ push }}>
      <div className="min-h-screen bg-[--color-background] text-[--color-foreground]">
        <a href="#saved-main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[--radius-md] focus:bg-[--color-primary] focus:px-3 focus:py-2 focus:text-sm focus:text-[--color-primary-foreground]">
          Skip to content
        </a>
        <EcommerceHeader />
        <Breadcrumbs />
        <main id="saved-main-content" tabIndex={-1}>
          <SavedWorkspace />
        </main>
        <EcommerceFooter />
        <ToastViewport toasts={toasts} onDismiss={dismiss} />
      </div>
    </ToastContext.Provider>
  );
}

export default function SavedPage() {
  const [store] = useState(() => makeStore());
  return (
    <Provider store={store}>
      <SavedPageShell />
    </Provider>
  );
}