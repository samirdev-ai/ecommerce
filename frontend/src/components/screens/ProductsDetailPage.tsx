'use client'

/* ============================================================================
 * ProductDetailsPage.tsx
 * ----------------------------------------------------------------------------
 * Enterprise-grade Product Details Page (PDP) — single-file delivery.
 * Logical layering (kept in one file, extractable into the structure below):
 *
 *   product-details/
 *   ├── types/        → section 2
 *   ├── constants/     → sections 3-5
 *   ├── utils/         → section 6
 *   ├── store/         → section 7  (Redux Toolkit: 9 focused slices)
 *   ├── components/    → sections 8-16
 *   └── page/          → section 17 (composition) + section 18 (export)
 * ==========================================================================*/

/* ============================================================================
 * 1. IMPORTS
 * ==========================================================================*/

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  configureStore,
  createSlice,
  createSelector,
  type PayloadAction,
} from '@reduxjs/toolkit'
import {
  Provider,
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from 'react-redux'
import {
  Search,
  Heart,
  ShoppingCart,
  ShoppingBag,
  Menu,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Star,
  Plus,
  Minus,
  X,
  Check,
  ZoomIn,
  Play,
  Maximize2,
  MapPin,
  Truck,
  PackageCheck,
  ShieldCheck,
  RotateCcw,
  BadgeCheck,
  Share2,
  Scale,
  Info,
  Store,
  Landmark,
  Tag,
  Percent,
  Gift,
  CreditCard,
  ThumbsUp,
  Flag,
  ImageOff,
  MessageCircle,
  Lock,
  Headphones,
  Award,
} from 'lucide-react'


/* ============================================================================
 * 2. TYPES / INTERFACES
 * ==========================================================================*/

export type MediaType = 'image' | 'video'

export interface ProductMedia {
  readonly id: string
  readonly type: MediaType
  readonly src: string
  readonly thumbnail: string
  readonly alt: string
  readonly durationSeconds?: number
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'pre_order' | 'coming_soon'

export type ProductBadge = 'best_seller' | 'limited_deal' | 'new' | 'exclusive' | 'top_rated'

/** A single selectable option within one variant dimension (e.g. Color → "Midnight Blue"). */
export interface VariantOption {
  readonly value: string
  readonly label: string
  readonly swatchHex?: string
  readonly available: boolean
  readonly lowStock?: boolean
}

/** One purchasable dimension of configuration, e.g. Color or Bundle. */
export interface VariantDimension {
  readonly key: string
  readonly label: string
  readonly presentation: 'swatch' | 'button' | 'card'
  readonly options: readonly VariantOption[]
}

/** A fully resolved, purchasable combination across every variant dimension. */
export interface VariantCombination {
  readonly sku: string
  readonly optionValues: Readonly<Record<string, string>>
  readonly price: number
  readonly compareAtPrice?: number
  readonly stockStatus: StockStatus
  readonly stockCount?: number
  readonly deliveryEtaDays: number
}

export interface ProductSpecificationItem {
  readonly label: string
  readonly value: string
}

export interface ProductSpecificationGroup {
  readonly id: string
  readonly title: string
  readonly items: readonly ProductSpecificationItem[]
}

export type OfferType = 'bank' | 'coupon' | 'deal' | 'membership' | 'bundle' | 'payment'

export interface Offer {
  readonly id: string
  readonly type: OfferType
  readonly title: string
  readonly description: string
  readonly eligibility?: string
  readonly ctaLabel: string
  readonly expiresAt?: string
}

export type ShippingMethodId = 'standard' | 'express' | 'pickup'

export interface ShippingMethodOption {
  readonly id: ShippingMethodId
  readonly label: string
  readonly price: number
  readonly etaLabel: string
}

export interface Seller {
  readonly id: string
  readonly name: string
  readonly positiveRatingPct: number
  readonly ratingCount: number
  readonly fulfilledBy: string
  readonly location: string
  readonly isOfficialStore: boolean
}

export interface ReviewImagePlaceholder {
  readonly id: string
  readonly alt: string
}

export interface Review {
  readonly id: string
  readonly author: string
  readonly rating: number
  readonly date: string
  readonly verifiedPurchase: boolean
  readonly title: string
  readonly body: string
  readonly helpfulCount: number
  readonly images?: readonly ReviewImagePlaceholder[]
  readonly variantPurchased?: string
}

export interface Question {
  readonly id: string
  readonly askedBy: string
  readonly date: string
  readonly question: string
  readonly answer: string
  readonly answeredBy: string
  readonly helpfulCount: number
}

export interface BundleAccessory {
  readonly id: string
  readonly name: string
  readonly thumbnail: string
  readonly price: number
}

export interface RelatedProductSummary {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly brand: string
  readonly thumbnail: string
  readonly price: number
  readonly compareAtPrice?: number
  readonly rating: number
  readonly reviewCount: number
}

export interface Product {
  readonly id: string
  readonly slug: string
  readonly brand: string
  readonly name: string
  readonly modelNumber: string
  readonly badges: readonly ProductBadge[]
  readonly rating: number
  readonly reviewCount: number
  readonly media: readonly ProductMedia[]
  readonly highlights: readonly string[]
  readonly descriptionOverview: string
  readonly descriptionFeatures: readonly string[]
  readonly descriptionUseCases: readonly string[]
  readonly inTheBox: readonly string[]
  readonly importantNotes: readonly string[]
  readonly specificationGroups: readonly ProductSpecificationGroup[]
  readonly variantDimensions: readonly VariantDimension[]
  readonly variantCombinations: readonly VariantCombination[]
  readonly offers: readonly Offer[]
  readonly shippingMethods: readonly ShippingMethodOption[]
  readonly seller: Seller
  readonly warrantyText: string
  readonly returnsPolicyText: string
  readonly bundleAccessories: readonly BundleAccessory[]
  readonly relatedProducts: readonly RelatedProductSummary[]
  readonly recentlyViewed: readonly RelatedProductSummary[]
}

/** Discriminated key used across variant dimensions — keeps option lookups type-safe. */
export type VariantSelection = Readonly<Record<string, string>>

export interface CartItem {
  readonly lineId: string
  readonly productId: string
  readonly sku: string
  readonly name: string
  readonly thumbnail: string
  readonly optionValues: VariantSelection
  readonly unitPrice: number
  readonly quantity: number
}

export type ProductInfoTab = 'description' | 'specifications' | 'shipping' | 'returns' | 'warranty'

export type ReviewFilter =
  | 'most_relevant'
  | 'most_recent'
  | 'highest_rated'
  | 'lowest_rated'
  | 'with_photos'
  | 'verified_purchase'


/* ============================================================================
 * 3. ENUM-LIKE LABEL MAPS
 * (const objects instead of TS enums — tree-shakeable, no reverse-mapping cost)
 * ==========================================================================*/

const STOCK_STATUS_META: Record<StockStatus, { label: string; tone: 'success' | 'warning' | 'destructive' | 'info' }> = {
  in_stock: { label: 'In Stock', tone: 'success' },
  low_stock: { label: 'Low Stock', tone: 'warning' },
  out_of_stock: { label: 'Out of Stock', tone: 'destructive' },
  pre_order: { label: 'Pre-order', tone: 'info' },
  coming_soon: { label: 'Coming Soon', tone: 'info' },
}

const BADGE_META: Record<ProductBadge, { label: string; tone: 'accent' | 'destructive' | 'success' | 'info' }> = {
  best_seller: { label: 'Best Seller', tone: 'accent' },
  limited_deal: { label: 'Limited Deal', tone: 'destructive' },
  new: { label: 'New', tone: 'success' },
  exclusive: { label: 'Exclusive', tone: 'info' },
  top_rated: { label: 'Top Rated', tone: 'accent' },
}

const OFFER_META: Record<OfferType, { label: string }> = {
  bank: { label: 'Bank Offer' },
  coupon: { label: 'Coupon' },
  deal: { label: 'Limited-Time Deal' },
  membership: { label: 'Membership Offer' },
  bundle: { label: 'Bundle Offer' },
  payment: { label: 'Payment Offer' },
}

const INFO_TABS: readonly { id: ProductInfoTab; label: string }[] = [
  { id: 'description', label: 'Description' },
  { id: 'specifications', label: 'Specifications' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'returns', label: 'Returns' },
  { id: 'warranty', label: 'Warranty' },
]

const REVIEW_FILTERS: readonly { id: ReviewFilter; label: string }[] = [
  { id: 'most_relevant', label: 'Most Relevant' },
  { id: 'most_recent', label: 'Most Recent' },
  { id: 'highest_rated', label: 'Highest Rated' },
  { id: 'lowest_rated', label: 'Lowest Rated' },
  { id: 'with_photos', label: 'With Photos' },
  { id: 'verified_purchase', label: 'Verified Purchase' },
]

/* ============================================================================
 * 4. CONSTANTS
 * ==========================================================================*/

const CURRENCY = 'USD'
const MIN_QUANTITY = 1
const MAX_QUANTITY = 8
const FREE_SHIPPING_THRESHOLD = 50
const DEFAULT_DELIVERY_LOCATION = 'Kathmandu'

const CATEGORY_LINKS: readonly string[] = ['Electronics', 'Audio', 'Wearables', 'Smart Home', 'Deals', 'Gift Cards']

const TRUST_ITEMS: readonly { icon: typeof ShieldCheck; label: string; description: string }[] = [
  { icon: Lock, label: 'Secure Payments', description: '256-bit SSL encryption on every order' },
  { icon: ShieldCheck, label: 'Buyer Protection', description: 'Full refund if item is not as described' },
  { icon: RotateCcw, label: 'Easy Returns', description: '30-day hassle-free return window' },
  { icon: BadgeCheck, label: 'Authentic Products', description: 'Sourced directly from authorized brands' },
  { icon: Headphones, label: '24/7 Support', description: 'Real humans, every day of the year' },
]


/* ============================================================================
 * 5. MOCK PRODUCT DATA
 * (module-scope constant — computed once, never recreated on render)
 * ==========================================================================*/

const PRODUCT: Product = {
  id: 'prod-sny-wh1000xm5',
  slug: 'sony-wh-1000xm5-wireless-noise-canceling-headphones',
  brand: 'Sony',
  name: 'Sony WH-1000XM5 Wireless Industry-Leading Noise Canceling Headphones with Auto Noise Canceling Optimizer',
  modelNumber: 'WH-1000XM5',
  badges: ['best_seller', 'top_rated'],
  rating: 4.7,
  reviewCount: 18432,
  media: [
    { id: 'media-1', type: 'image', src: 'https://picsum.photos/seed/xm5-front/1200/1200', thumbnail: 'https://picsum.photos/seed/xm5-front/160/160', alt: 'Sony WH-1000XM5 headphones, front view in black' },
    { id: 'media-2', type: 'image', src: 'https://picsum.photos/seed/xm5-side/1200/1200', thumbnail: 'https://picsum.photos/seed/xm5-side/160/160', alt: 'Sony WH-1000XM5 headphones, side profile showing ear cushion' },
    { id: 'media-3', type: 'image', src: 'https://picsum.photos/seed/xm5-worn/1200/1200', thumbnail: 'https://picsum.photos/seed/xm5-worn/160/160', alt: 'Person wearing Sony WH-1000XM5 headphones outdoors' },
    { id: 'media-4', type: 'image', src: 'https://picsum.photos/seed/xm5-case/1200/1200', thumbnail: 'https://picsum.photos/seed/xm5-case/160/160', alt: 'Sony WH-1000XM5 folded inside included carrying case' },
    { id: 'media-5', type: 'video', src: 'https://picsum.photos/seed/xm5-video/1200/1200', thumbnail: 'https://picsum.photos/seed/xm5-video/160/160', alt: 'Product overview video for Sony WH-1000XM5', durationSeconds: 96 },
  ],
  highlights: [
    'Industry-leading Active Noise Cancellation with Auto NC Optimizer',
    'Up to 30-hour battery life with quick charge (3 min = 3 hours)',
    'Crystal-clear hands-free calling with 4 beamforming microphones',
    'Bluetooth 5.3 with Multipoint — connect to two devices at once',
    'Lightweight, foldable design with soft-fit leather-like cushions',
  ],
  descriptionOverview:
    'The WH-1000XM5 headphones set a new standard for premium noise canceling, refined over a decade ' +
    'of acoustic engineering. Two processors control eight microphones for unprecedented noise ' +
    'canceling, while Sony\u2019s new integrated processor and DSEE Extreme upscale compressed digital ' +
    'music files in real time for exceptional sound clarity, so every note comes through in stunning detail.',
  descriptionFeatures: [
    'Auto NC Optimizer continuously tunes noise canceling to your surroundings',
    'DSEE Extreme upscales compressed audio using AI-based sound processing',
    'Speak-to-Chat automatically pauses playback when you start talking',
    'Adaptive Sound Control adjusts ambient sound based on your activity',
    '360 Reality Audio and Sony 360 Spatial Sound Personalizer support',
  ],
  descriptionUseCases: [
    'Long-haul flights and daily commuting where cabin and traffic noise dominate',
    'Focused work-from-home sessions in shared or noisy households',
    'Hands-free calls on the move with reliable voice pickup',
    'All-day listening for podcasts, audiobooks, and music library upscaling',
  ],
  inTheBox: [
    'WH-1000XM5 wireless headphones',
    'Carrying case',
    'USB-C charging cable (1.2m)',
    'Audio cable (1.2m) for wired listening',
    'Quick start guide and warranty card',
  ],
  importantNotes: [
    'Compatible with Sony | Headphones Connect app for iOS and Android.',
    'Battery is not user-replaceable; service is available through Sony support.',
    'Multipoint connection may slightly increase power consumption.',
  ],
  specificationGroups: [
    {
      id: 'general',
      title: 'General',
      items: [
        { label: 'Brand', value: 'Sony' },
        { label: 'Model', value: 'WH-1000XM5' },
        { label: 'Product Type', value: 'Over-ear wireless headphones' },
        { label: 'Release Year', value: '2024' },
      ],
    },
    {
      id: 'audio',
      title: 'Audio',
      items: [
        { label: 'Driver Unit', value: '30mm, dome type (CCAW voice coil)' },
        { label: 'Frequency Response', value: '4 Hz – 40,000 Hz' },
        { label: 'Noise Canceling', value: 'Dual Noise Sensor, Integrated Processor V1' },
        { label: 'Microphones', value: '8 total, 4 beamforming for calls' },
      ],
    },
    {
      id: 'connectivity',
      title: 'Connectivity',
      items: [
        { label: 'Bluetooth Version', value: '5.3' },
        { label: 'Supported Codecs', value: 'SBC, AAC, LDAC' },
        { label: 'Multipoint Connection', value: 'Yes, up to 2 devices' },
        { label: 'NFC', value: 'Supported (one-touch pairing)' },
      ],
    },
    {
      id: 'battery',
      title: 'Battery',
      items: [
        { label: 'Battery Life (NC on)', value: 'Up to 30 hours' },
        { label: 'Charging Time', value: '3.5 hours (full charge)' },
        { label: 'Quick Charge', value: '3 min charge ≈ 3 hours playback' },
        { label: 'Charging Port', value: 'USB-C' },
      ],
    },
    {
      id: 'physical',
      title: 'Physical',
      items: [
        { label: 'Weight', value: '250 g' },
        { label: 'Foldable', value: 'Yes, flat-folding hinge' },
        { label: 'Ear Cushion Material', value: 'Soft-fit synthetic leather' },
        { label: 'Controls', value: 'Touch sensor + physical power/NC buttons' },
      ],
    },
  ],
  variantDimensions: [
    {
      key: 'color',
      label: 'Color',
      presentation: 'swatch',
      options: [
        { value: 'black', label: 'Black', swatchHex: '#1a1a1a', available: true },
        { value: 'silver', label: 'Platinum Silver', swatchHex: '#c7c9cc', available: true },
        { value: 'midnight-blue', label: 'Midnight Blue', swatchHex: '#2a3a5c', available: true, lowStock: true },
      ],
    },
    {
      key: 'bundle',
      label: 'Configuration',
      presentation: 'card',
      options: [
        { value: 'standard', label: 'Headphones Only', available: true },
        { value: 'with-case', label: 'Headphones + Travel Case', available: true },
      ],
    },
  ],
  variantCombinations: [
    { sku: 'SNY-WH1000XM5-BLK-STD', optionValues: { color: 'black', bundle: 'standard' }, price: 299.99, compareAtPrice: 399.99, stockStatus: 'in_stock', stockCount: 42, deliveryEtaDays: 2 },
    { sku: 'SNY-WH1000XM5-BLK-CASE', optionValues: { color: 'black', bundle: 'with-case' }, price: 329.99, compareAtPrice: 429.99, stockStatus: 'in_stock', stockCount: 18, deliveryEtaDays: 2 },
    { sku: 'SNY-WH1000XM5-SLV-STD', optionValues: { color: 'silver', bundle: 'standard' }, price: 299.99, compareAtPrice: 399.99, stockStatus: 'in_stock', stockCount: 27, deliveryEtaDays: 2 },
    { sku: 'SNY-WH1000XM5-SLV-CASE', optionValues: { color: 'silver', bundle: 'with-case' }, price: 329.99, compareAtPrice: 429.99, stockStatus: 'low_stock', stockCount: 4, deliveryEtaDays: 3 },
    { sku: 'SNY-WH1000XM5-MNB-STD', optionValues: { color: 'midnight-blue', bundle: 'standard' }, price: 319.99, compareAtPrice: 419.99, stockStatus: 'low_stock', stockCount: 5, deliveryEtaDays: 4 },
    { sku: 'SNY-WH1000XM5-MNB-CASE', optionValues: { color: 'midnight-blue', bundle: 'with-case' }, price: 349.99, compareAtPrice: 449.99, stockStatus: 'out_of_stock', stockCount: 0, deliveryEtaDays: 7 },
  ],
  offers: [
    { id: 'offer-bank', type: 'bank', title: '10% instant discount up to $30', description: 'On Chase Sapphire and Chase Freedom credit cards.', eligibility: 'Minimum purchase of $150', ctaLabel: 'View terms' },
    { id: 'offer-coupon', type: 'coupon', title: 'Extra $20 off with code AUDIO20', description: 'Applied automatically at checkout, no minimum spend.', ctaLabel: 'Apply coupon' },
    { id: 'offer-deal', type: 'deal', title: 'Limited-time deal — ends in 2 days', description: 'Price drops to $299.99 for a limited time only.', ctaLabel: 'Shop the deal' },
    { id: 'offer-membership', type: 'membership', title: 'Free 1-year Novamart+ trial', description: 'Unlock free 2-day shipping and member-only pricing.', eligibility: 'New members only', ctaLabel: 'Start free trial' },
    { id: 'offer-bundle', type: 'bundle', title: 'Save 15% with the travel case bundle', description: 'Add the official carrying case and save automatically.', ctaLabel: 'View bundle' },
    { id: 'offer-payment', type: 'payment', title: 'No-cost EMI available', description: 'Pay in 4 interest-free installments of $75.00.', eligibility: 'Subject to eligibility check', ctaLabel: 'See payment plans' },
  ],
  shippingMethods: [
    { id: 'standard', label: 'Standard Delivery', price: 0, etaLabel: 'Arrives Sep 17 – Sep 19' },
    { id: 'express', label: 'Express Delivery', price: 12.99, etaLabel: 'Arrives Sep 15' },
    { id: 'pickup', label: 'Store Pickup', price: 0, etaLabel: 'Ready today at Novamart Kathmandu' },
  ],
  seller: {
    id: 'seller-sony-official',
    name: 'Sony Official Store',
    positiveRatingPct: 98.7,
    ratingCount: 12847,
    fulfilledBy: 'Novamart',
    location: 'Ships from Bhaktapur Fulfillment Center',
    isOfficialStore: true,
  },
  warrantyText:
    'Covered by a 1-year limited manufacturer warranty against defects in materials and workmanship. ' +
    'Extended 2-year protection plans are available at checkout.',
  returnsPolicyText:
    '30-day free returns on unopened and opened items in original condition. Refunds are issued to the ' +
    'original payment method within 5–7 business days of the return being received.',
  bundleAccessories: [
    { id: 'acc-case', name: 'Sony Hardshell Carrying Case', thumbnail: 'https://picsum.photos/seed/xm5-acc-case/300/300', price: 34.99 },
    { id: 'acc-cable', name: 'Sony USB-C Fast Charging Cable (2m)', thumbnail: 'https://picsum.photos/seed/xm5-acc-cable/300/300', price: 14.99 },
  ],
  relatedProducts: [
    { id: 'rel-1', slug: 'sony-wf-1000xm5', name: 'Sony WF-1000XM5 Wireless Earbuds', brand: 'Sony', thumbnail: 'https://picsum.photos/seed/rel-earbuds/400/400', price: 249.99, compareAtPrice: 299.99, rating: 4.6, reviewCount: 9231 },
    { id: 'rel-2', slug: 'bose-qc-ultra', name: 'Bose QuietComfort Ultra Headphones', brand: 'Bose', thumbnail: 'https://picsum.photos/seed/rel-bose/400/400', price: 379.00, rating: 4.5, reviewCount: 5122 },
    { id: 'rel-3', slug: 'sony-srs-xb13', name: 'Sony SRS-XB13 Portable Speaker', brand: 'Sony', thumbnail: 'https://picsum.photos/seed/rel-speaker/400/400', price: 49.99, compareAtPrice: 59.99, rating: 4.4, reviewCount: 3087 },
    { id: 'rel-4', slug: 'anker-soundcore-q45', name: 'Anker Soundcore Q45 ANC Headphones', brand: 'Anker', thumbnail: 'https://picsum.photos/seed/rel-anker/400/400', price: 129.99, compareAtPrice: 159.99, rating: 4.3, reviewCount: 4410 },
  ],
  recentlyViewed: [
    { id: 'rv-1', slug: 'sony-alpha-a6400', name: 'Sony Alpha a6400 Mirrorless Camera', brand: 'Sony', thumbnail: 'https://picsum.photos/seed/rv-camera/400/400', price: 898.00, rating: 4.7, reviewCount: 2145 },
    { id: 'rv-2', slug: 'jbl-flip-6', name: 'JBL Flip 6 Waterproof Speaker', brand: 'JBL', thumbnail: 'https://picsum.photos/seed/rv-jbl/400/400', price: 99.95, rating: 4.6, reviewCount: 6784 },
    { id: 'rv-3', slug: 'sony-linkbuds-s', name: 'Sony LinkBuds S Truly Wireless Earbuds', brand: 'Sony', thumbnail: 'https://picsum.photos/seed/rv-linkbuds/400/400', price: 179.99, compareAtPrice: 199.99, rating: 4.5, reviewCount: 3312 },
  ],
}

const MOCK_REVIEWS: readonly Review[] = [
  {
    id: 'rev-1', author: 'Michael T.', rating: 5, date: '2026-08-28', verifiedPurchase: true,
    title: 'Best noise canceling I have ever used', helpfulCount: 214,
    body: 'I fly for work almost every week and these have completely changed the experience. The auto NC optimizer genuinely adapts — cabin noise on a 787 disappears almost entirely. Battery easily lasts a full week of commuting.',
    images: [{ id: 'img-1', alt: 'Headphones on airplane tray table' }, { id: 'img-2', alt: 'Headphones case next to laptop' }],
    variantPurchased: 'Black · Headphones Only',
  },
  {
    id: 'rev-2', author: 'Priya N.', rating: 5, date: '2026-08-15', verifiedPurchase: true,
    title: 'Worth every penny', helpfulCount: 132,
    body: 'Sound quality is incredible for both music and podcasts. Multipoint pairing with my laptop and phone works flawlessly — genuinely one of the best purchases I have made this year.',
    variantPurchased: 'Midnight Blue · Headphones Only',
  },
  {
    id: 'rev-3', author: 'David K.', rating: 4, date: '2026-07-30', verifiedPurchase: true,
    title: 'Excellent, but the case is bulky', helpfulCount: 68,
    body: 'Everything about the sound and ANC is fantastic. My only complaint is the included case is a bit large for a backpack side pocket. Otherwise no regrets at all.',
  },
  {
    id: 'rev-4', author: 'Sarah L.', rating: 5, date: '2026-07-22', verifiedPurchase: true,
    title: 'Upgraded from the XM4 and it was worth it', helpfulCount: 97,
    body: 'The fit is noticeably more comfortable for long sessions, and call quality is a big step up thanks to the beamforming microphones. Highly recommend for remote workers.',
    images: [{ id: 'img-3', alt: 'Headphones on a home office desk' }],
    variantPurchased: 'Platinum Silver · Headphones + Travel Case',
  },
  {
    id: 'rev-5', author: 'James O.', rating: 3, date: '2026-06-19', verifiedPurchase: false,
    title: 'Great sound, touch controls are finicky', helpfulCount: 41,
    body: 'Audio quality and ANC are as good as advertised, but I occasionally trigger the touch controls by accident when adjusting the headband. Still a solid pair overall.',
  },
  {
    id: 'rev-6', author: 'Anika R.', rating: 5, date: '2026-06-02', verifiedPurchase: true,
    title: 'Perfect for open office noise', helpfulCount: 155,
    body: 'Our office is extremely loud and these block out almost everything without needing music playing. Speak-to-Chat is a nice touch when a coworker taps me on the shoulder.',
  },
]

const RATING_DISTRIBUTION: readonly { stars: 5 | 4 | 3 | 2 | 1; percentage: number; count: number }[] = [
  { stars: 5, percentage: 74, count: 13640 },
  { stars: 4, percentage: 16, count: 2949 },
  { stars: 3, percentage: 6, count: 1106 },
  { stars: 2, percentage: 2, count: 369 },
  { stars: 1, percentage: 2, count: 368 },
]

const MOCK_QUESTIONS: readonly Question[] = [
  {
    id: 'q-1', askedBy: 'Thomas B.', date: '2026-08-10',
    question: 'Does this support aptX or only LDAC/AAC/SBC?',
    answer: 'It does not support aptX. Supported codecs are SBC, AAC, and LDAC (LDAC gives the highest quality over Bluetooth on Android devices).',
    answeredBy: 'Sony Official Store', helpfulCount: 88,
  },
  {
    id: 'q-2', askedBy: 'Grace H.', date: '2026-07-28',
    question: 'Can I use these wired if the battery runs out?',
    answer: 'Yes — an audio cable is included in the box, and the headphones can be used passively over a wired connection even when powered off.',
    answeredBy: 'Sony Official Store', helpfulCount: 54,
  },
  {
    id: 'q-3', askedBy: 'Marco P.', date: '2026-07-05',
    question: 'Is the Midnight Blue color a limited edition, and will it restock?',
    answer: 'Midnight Blue is a limited seasonal color. Stock is intentionally limited and restocks are not guaranteed once sold out.',
    answeredBy: 'Sony Official Store', helpfulCount: 39,
  },
]


/* ============================================================================
 * 6. UTILITY FUNCTIONS
 * (pure, side-effect free — safe to call during render, cheap enough to skip memoization)
 * ==========================================================================*/

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY })

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

function computeDiscountPercentage(price: number, compareAtPrice?: number): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Resolves the exact purchasable SKU/price/stock for the currently selected variant options. */
function resolveVariantCombination(product: Product, selection: VariantSelection): VariantCombination | undefined {
  return product.variantCombinations.find((combo) =>
    product.variantDimensions.every((dimension) => combo.optionValues[dimension.key] === selection[dimension.key]),
  )
}

/** Builds the default selection from each dimension's first available option. */
function buildDefaultSelection(product: Product): VariantSelection {
  const selection: Record<string, string> = {}
  for (const dimension of product.variantDimensions) {
    const firstAvailable = dimension.options.find((option) => option.available) ?? dimension.options[0]
    if (firstAvailable) selection[dimension.key] = firstAvailable.value
  }
  return selection
}

/** True when choosing `value` for `dimensionKey` (holding other selections constant) yields a purchasable combo. */
function isOptionSelectable(product: Product, selection: VariantSelection, dimensionKey: string, value: string): boolean {
  const candidate = { ...selection, [dimensionKey]: value }
  const combo = resolveVariantCombination(product, candidate)
  return combo !== undefined
}

function isOptionLowStock(product: Product, selection: VariantSelection, dimensionKey: string, value: string): boolean {
  const candidate = { ...selection, [dimensionKey]: value }
  const combo = resolveVariantCombination(product, candidate)
  return combo?.stockStatus === 'low_stock'
}

function averageRatingLabel(rating: number): string {
  return rating.toFixed(1)
}

function filterAndSortReviews(reviews: readonly Review[], filter: ReviewFilter): readonly Review[] {
  switch (filter) {
    case 'most_recent':
      return [...reviews].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    case 'highest_rated':
      return [...reviews].sort((a, b) => b.rating - a.rating)
    case 'lowest_rated':
      return [...reviews].sort((a, b) => a.rating - b.rating)
    case 'with_photos':
      return reviews.filter((r) => (r.images?.length ?? 0) > 0)
    case 'verified_purchase':
      return reviews.filter((r) => r.verifiedPurchase)
    case 'most_relevant':
    default:
      return [...reviews].sort((a, b) => b.helpfulCount - a.helpfulCount)
  }
}


/* ============================================================================
 * 7. REDUX STATE / SLICES / STORE
 * State-ownership rule applied throughout this file:
 *   Redux → cart, wishlist, variant selection, quantity, delivery, recently-viewed,
 *           active info tab, review filter, Q&A expansion (all meaningfully shared
 *           or persistent-across-interaction state).
 *   Local → media lightbox open/closed, hover states, transient input focus
 *           (see component sections — kept out of Redux on purpose).
 * ==========================================================================*/

/* --- 7.1 product (recently-viewed tracking + active product id) ---------- */

interface ProductSliceState {
  currentProductId: string
  recentlyViewedIds: string[]
}

const productSlice = createSlice({
  name: 'product',
  initialState: { currentProductId: PRODUCT.id, recentlyViewedIds: [] } as ProductSliceState,
  reducers: {
    productViewed(state, action: PayloadAction<string>) {
      state.currentProductId = action.payload
      state.recentlyViewedIds = [action.payload, ...state.recentlyViewedIds.filter((id) => id !== action.payload)].slice(0, 8)
    },
  },
})

/* --- 7.2 variant (selected configuration options) ------------------------ */

const variantSlice = createSlice({
  name: 'variant',
  initialState: buildDefaultSelection(PRODUCT) as VariantSelection,
  reducers: {
    variantOptionSelected(state, action: PayloadAction<{ dimensionKey: string; value: string }>) {
      return { ...state, [action.payload.dimensionKey]: action.payload.value }
    },
  },
})

/* --- 7.3 quantity ---------------------------------------------------------*/

const quantitySlice = createSlice({
  name: 'quantity',
  initialState: MIN_QUANTITY,
  reducers: {
    quantitySet(_state, action: PayloadAction<number>) {
      return clamp(action.payload, MIN_QUANTITY, MAX_QUANTITY)
    },
    quantityIncremented(state) {
      return clamp(state + 1, MIN_QUANTITY, MAX_QUANTITY)
    },
    quantityDecremented(state) {
      return clamp(state - 1, MIN_QUANTITY, MAX_QUANTITY)
    },
    quantityReset() {
      return MIN_QUANTITY
    },
  },
})

/* --- 7.4 cart ---------------------------------------------------------- */

const cartSlice = createSlice({
  name: 'cart',
  initialState: [] as CartItem[],
  reducers: {
    itemAddedToCart(state, action: PayloadAction<Omit<CartItem, 'lineId'>>) {
      const lineId = `${action.payload.sku}`
      const existing = state.find((line) => line.lineId === lineId)
      if (existing) {
        existing.quantity += action.payload.quantity
      } else {
        state.push({ ...action.payload, lineId })
      }
    },
    cartItemRemoved(state, action: PayloadAction<string>) {
      return state.filter((line) => line.lineId !== action.payload)
    },
    cartCleared() {
      return []
    },
  },
})

/* --- 7.5 wishlist ---------------------------------------------------------*/

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: [] as string[],
  reducers: {
    wishlistToggled(state, action: PayloadAction<string>) {
      return state.includes(action.payload) ? state.filter((id) => id !== action.payload) : [...state, action.payload]
    },
  },
})

/* --- 7.6 media (selected gallery index — lightbox open state stays local) */

interface MediaSliceState {
  activeIndex: number
}

const mediaSlice = createSlice({
  name: 'media',
  initialState: { activeIndex: 0 } as MediaSliceState,
  reducers: {
    mediaSelected(state, action: PayloadAction<number>) {
      state.activeIndex = action.payload
    },
    mediaAdvanced(state, action: PayloadAction<{ direction: 1 | -1; count: number }>) {
      const { direction, count } = action.payload
      state.activeIndex = (state.activeIndex + direction + count) % count
    },
  },
})

/* --- 7.7 delivery ----------------------------------------------------- */

interface DeliverySliceState {
  location: string
  shippingMethodId: ShippingMethodId
}

const deliverySlice = createSlice({
  name: 'delivery',
  initialState: { location: DEFAULT_DELIVERY_LOCATION, shippingMethodId: 'standard' } as DeliverySliceState,
  reducers: {
    deliveryLocationSet(state, action: PayloadAction<string>) {
      state.location = action.payload
    },
    shippingMethodSelected(state, action: PayloadAction<ShippingMethodId>) {
      state.shippingMethodId = action.payload
    },
  },
})

/* --- 7.8 ui (info tabs + Q&A expansion) ---------------------------------- */

interface UiSliceState {
  activeInfoTab: ProductInfoTab
  expandedQuestionId: string | null
  isAskQuestionOpen: boolean
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: { activeInfoTab: 'description', expandedQuestionId: null, isAskQuestionOpen: false } as UiSliceState,
  reducers: {
    activeTabSet(state, action: PayloadAction<ProductInfoTab>) {
      state.activeInfoTab = action.payload
    },
    questionToggled(state, action: PayloadAction<string>) {
      state.expandedQuestionId = state.expandedQuestionId === action.payload ? null : action.payload
    },
    askQuestionOpened(state) {
      state.isAskQuestionOpen = true
    },
    askQuestionClosed(state) {
      state.isAskQuestionOpen = false
    },
  },
})

/* --- 7.9 reviews (display filter only — review data itself is static mock) */

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState: 'most_relevant' as ReviewFilter,
  reducers: {
    reviewFilterSet(_state, action: PayloadAction<ReviewFilter>) {
      return action.payload
    },
  },
})

/* --- store ----------------------------------------------------------------*/

const store = configureStore({
  reducer: {
    product: productSlice.reducer,
    variant: variantSlice.reducer,
    quantity: quantitySlice.reducer,
    cart: cartSlice.reducer,
    wishlist: wishlistSlice.reducer,
    media: mediaSlice.reducer,
    delivery: deliverySlice.reducer,
    ui: uiSlice.reducer,
    reviews: reviewsSlice.reducer,
  },
})

type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch

const useAppDispatch: () => AppDispatch = useDispatch
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

const { productViewed } = productSlice.actions
const { variantOptionSelected } = variantSlice.actions
const { quantitySet, quantityIncremented, quantityDecremented } = quantitySlice.actions
const { itemAddedToCart, cartItemRemoved } = cartSlice.actions
const { wishlistToggled } = wishlistSlice.actions
const { mediaSelected, mediaAdvanced } = mediaSlice.actions
const { deliveryLocationSet, shippingMethodSelected } = deliverySlice.actions
const { activeTabSet, questionToggled, askQuestionOpened, askQuestionClosed } = uiSlice.actions
const { reviewFilterSet } = reviewsSlice.actions

/* --- memoized selectors ---------------------------------------------------*/

const selectVariantSelection = (state: RootState) => state.variant
const selectQuantity = (state: RootState) => state.quantity
const selectCartItems = (state: RootState) => state.cart
const selectWishlistIds = (state: RootState) => state.wishlist
const selectMediaActiveIndex = (state: RootState) => state.media.activeIndex
const selectDelivery = (state: RootState) => state.delivery
const selectActiveInfoTab = (state: RootState) => state.ui.activeInfoTab
const selectExpandedQuestionId = (state: RootState) => state.ui.expandedQuestionId
const selectIsAskQuestionOpen = (state: RootState) => state.ui.isAskQuestionOpen
const selectReviewFilter = (state: RootState) => state.reviews

const selectCartCount = createSelector(selectCartItems, (items) => items.reduce((sum, i) => sum + i.quantity, 0))
const selectCartSubtotal = createSelector(selectCartItems, (items) => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0))
const selectWishlistCount = createSelector(selectWishlistIds, (ids) => ids.length)


/* ============================================================================
 * 8. REUSABLE PRIMITIVES
 * ==========================================================================*/

type Tone = 'accent' | 'destructive' | 'success' | 'warning' | 'info' | 'neutral'

const TONE_CLASSES: Record<Tone, string> = {
  accent: 'bg-accent text-accent-foreground',
  destructive: 'bg-destructive/10 text-destructive',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  info: 'bg-info/10 text-info',
  neutral: 'bg-muted text-muted-foreground',
}

function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-none ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  )
}

function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const rounded = Math.round(rating * 2) / 2
  const starSize = size === 'lg' ? 'h-5 w-5' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
  return (
    <div className="flex" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => {
        const fillLevel = clamp(rounded - i, 0, 1)
        return (
          <span key={i} className="relative">
            <Star className={`${starSize} text-border`} strokeWidth={1.5} />
            {fillLevel > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillLevel * 100}%` }}>
                <Star className={`${starSize} fill-rating text-rating`} strokeWidth={1.5} />
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  badgeCount?: number
}

function IconButton({ label, active, badgeCount, children, className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={`relative flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      {...rest}
    >
      {children}
      {!!badgeCount && badgeCount > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  )
}

/** Accessible quantity stepper — clamps to [min, max], announces the live value. */
function QuantitySelector({
  quantity, min, max, onIncrement, onDecrement, onChange,
}: {
  quantity: number
  min: number
  max: number
  onIncrement: () => void
  onDecrement: () => void
  onChange: (value: number) => void
}) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') { e.preventDefault(); onIncrement() }
    if (e.key === 'ArrowDown') { e.preventDefault(); onDecrement() }
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-input" role="group" aria-label="Quantity">
      <button
        type="button"
        onClick={onDecrement}
        disabled={quantity <= min}
        aria-label="Decrease quantity"
        className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={quantity}
        aria-label="Quantity"
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          const parsed = Number(e.target.value.replace(/\D/g, ''))
          if (!Number.isNaN(parsed)) onChange(clamp(parsed, min, max))
        }}
        className="h-11 w-12 border-x border-input bg-transparent text-center text-sm font-medium text-foreground focus-visible:outline-none"
      />
      <button
        type="button"
        onClick={onIncrement}
        disabled={quantity >= max}
        aria-label="Increase quantity"
        className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

/** Native <details>-backed disclosure: zero React state, full keyboard/AT support for free. */
function Disclosure({ summary, children, defaultOpen = false }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group border-b border-border py-3 last:border-0" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 text-sm font-medium text-foreground marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
        {summary}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="pt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </details>
  )
}

/** Generic accessible tabs — arrow-key navigation between tabs, single tabpanel below. */
function Tabs<T extends string>({
  tabs, activeTab, onChange,
}: { tabs: readonly { id: T; label: string }[]; activeTab: T; onChange: (id: T) => void }) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab)
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const nextIndex = (currentIndex + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
      const nextTab = tabs[nextIndex]
      if (nextTab) {
        onChange(nextTab.id)
        tabRefs.current[nextIndex]?.focus()
      }
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Product information"
      onKeyDown={handleKeyDown}
      className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border"
    >
      {tabs.map((tab, i) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[i] = el }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}


/* ============================================================================
 * 9. MEDIA COMPONENTS
 * ==========================================================================*/

/** Vertical (desktop) / horizontal (mobile) thumbnail rail — selection lives in Redux (`media.activeIndex`)
 *  because the main image, the counter, and the lightbox all need to stay in sync with it. */
function MediaThumbnailRail({
  media, activeIndex, onSelect, orientation,
}: { media: readonly ProductMedia[]; activeIndex: number; onSelect: (index: number) => void; orientation: 'vertical' | 'horizontal' }) {
  return (
    <div
      role="tablist"
      aria-label="Product media"
      className={
        orientation === 'vertical'
          ? 'themed-scrollbar hidden max-h-[560px] flex-col gap-3 overflow-y-auto pr-1 lg:flex'
          : 'no-scrollbar flex gap-3 overflow-x-auto lg:hidden'
      }
    >
      {media.map((item, index) => {
        const isActive = index === activeIndex
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={item.type === 'video' ? `Play video, ${index + 1} of ${media.length}` : `View image ${index + 1} of ${media.length}`}
            onClick={() => onSelect(index)}
            className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive ? 'border-primary' : 'border-transparent hover:border-border'
            }`}
          >
            <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
            {item.type === 'video' && (
              <span className="absolute inset-0 flex items-center justify-center bg-foreground/30">
                <Play className="h-5 w-5 fill-background text-background" aria-hidden="true" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Prev/next affordance shared by the inline gallery and the fullscreen lightbox. */
function MediaControls({ onPrevious, onNext }: { onPrevious: () => void; onNext: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onPrevious}
        aria-label="Previous media"
        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next media"
        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </>
  )
}

/** Fullscreen lightbox. Open/closed state is intentionally LOCAL (owned by ProductMediaGallery) —
 *  it is a transient modal interaction, not shared application state (see state-ownership rule, §7). */
function MediaLightbox({
  media, activeIndex, onClose, onSelect, onNavigate,
}: {
  media: readonly ProductMedia[]
  activeIndex: number
  onClose: () => void
  onSelect: (index: number) => void
  onNavigate: (direction: 1 | -1) => void
}) {
  const current = media[activeIndex]

  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNavigate(1)
      if (e.key === 'ArrowLeft') onNavigate(-1)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNavigate])

  if (!current) return null

  return (
    <div role="dialog" aria-modal="true" aria-label="Product media viewer" className="fixed inset-0 z-50 flex flex-col bg-foreground/95">
      <div className="flex items-center justify-between p-4">
        <span className="text-sm font-medium text-background">{activeIndex + 1} / {media.length}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close media viewer"
          className="flex h-10 w-10 items-center justify-center rounded-full text-background hover:bg-background/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
        <img src={current.src} alt={current.alt} className="max-h-full max-w-full rounded-lg object-contain" />
        <MediaControls onPrevious={() => onNavigate(-1)} onNext={() => onNavigate(1)} />
      </div>

      <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto p-4">
        {media.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`Go to media ${index + 1}`}
            aria-current={index === activeIndex}
            className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 ${index === activeIndex ? 'border-background' : 'border-transparent opacity-60'}`}
          >
            <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}

/** Main display surface: renders the active image/video, supports hover-to-zoom on desktop pointer
 *  devices via local (not Redux) cursor-position state, and exposes the fullscreen affordance. */
function MainProductMedia({
  item, index, total, onOpenFullscreen,
}: { item: ProductMedia; index: number; total: number; onOpenFullscreen: () => void }) {
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setZoomOrigin({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 })
  }, [])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setZoomOrigin(null)}
      className="group relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-card"
    >
      {item.type === 'video' ? (
        <div className="relative h-full w-full">
          <img src={item.src} alt={item.alt} className="h-full w-full object-cover opacity-80" />
          <button
            type="button"
            aria-label="Play product video"
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-background/90 shadow-lg">
              <Play className="h-7 w-7 fill-foreground text-foreground" aria-hidden="true" />
            </span>
          </button>
        </div>
      ) : (
        <img
          src={item.src}
          alt={item.alt}
          className="h-full w-full object-cover transition-transform duration-200 ease-out"
          style={zoomOrigin ? { transform: 'scale(1.8)', transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` } : undefined}
        />
      )}

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground">
        {index + 1} / {total}
      </span>

      <button
        type="button"
        onClick={onOpenFullscreen}
        aria-label="Open fullscreen view"
        className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {item.type === 'video' ? <Maximize2 className="h-4 w-4" aria-hidden="true" /> : <ZoomIn className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  )
}

/** Composes the full gallery: thumbnail rail + main media + mobile dot indicators + lightbox trigger.
 *  Reads/writes the shared `media.activeIndex` in Redux; owns its own lightbox-open boolean locally. */
function ProductMediaGallery({ media }: { media: readonly ProductMedia[] }) {
  const dispatch = useAppDispatch()
  const activeIndex = useAppSelector(selectMediaActiveIndex)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const activeItem = media[activeIndex] ?? media[0]

  const navigate = useCallback((direction: 1 | -1) => {
    dispatch(mediaAdvanced({ direction, count: media.length }))
  }, [dispatch, media.length])

  if (!activeItem) return null

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      <div className="relative flex-1">
        <MainProductMedia item={activeItem} index={activeIndex} total={media.length} onOpenFullscreen={() => setIsLightboxOpen(true)} />
        <div className="mt-3 flex justify-center gap-1.5 lg:hidden">
          {media.map((item, i) => (
            <span key={item.id} className={`h-1.5 rounded-full transition-all ${i === activeIndex ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`} />
          ))}
        </div>
      </div>

      <MediaThumbnailRail media={media} activeIndex={activeIndex} onSelect={(i) => dispatch(mediaSelected(i))} orientation="vertical" />
      <MediaThumbnailRail media={media} activeIndex={activeIndex} onSelect={(i) => dispatch(mediaSelected(i))} orientation="horizontal" />

      {isLightboxOpen && (
        <MediaLightbox
          media={media}
          activeIndex={activeIndex}
          onClose={() => setIsLightboxOpen(false)}
          onSelect={(i) => dispatch(mediaSelected(i))}
          onNavigate={navigate}
        />
      )}
    </div>
  )
}



/* ============================================================================
 * 10. PRODUCT INFORMATION COMPONENTS
 * (Brand / ProductTitle are plain text and intentionally NOT split into
 *  components — no independent state, interaction, or reuse to justify it.)
 * ==========================================================================*/

/** Shows at most two badges, prioritized — never all five at once (per PDP requirement). */
const BADGE_PRIORITY: readonly ProductBadge[] = ['limited_deal', 'exclusive', 'new', 'best_seller', 'top_rated']

function ProductBadgeList({ badges }: { badges: readonly ProductBadge[] }) {
  const visible = BADGE_PRIORITY.filter((b) => badges.includes(b)).slice(0, 2)
  if (visible.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((badge) => (
        <Badge key={badge} tone={BADGE_META[badge].tone}>{BADGE_META[badge].label}</Badge>
      ))}
    </div>
  )
}

function RatingSummary({ rating, reviewCount, onJumpToReviews }: { rating: number; reviewCount: number; onJumpToReviews: () => void }) {
  return (
    <button type="button" onClick={onJumpToReviews} className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <RatingStars rating={rating} size="md" />
      <span className="text-sm font-semibold text-foreground">{averageRatingLabel(rating)}</span>
      <span className="text-sm text-muted-foreground underline decoration-border underline-offset-4">
        {reviewCount.toLocaleString()} ratings
      </span>
    </button>
  )
}

/** Dominant pricing block: current price, strikethrough compare-at, discount %, tax note, installment plan. */
function PriceSection({ price, compareAtPrice }: { price: number; compareAtPrice?: number | undefined }) {
  const discountPct = computeDiscountPercentage(price, compareAtPrice)
  const installment = price / 4

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="text-3xl font-bold tracking-tight text-price">{formatCurrency(price)}</span>
        {compareAtPrice && discountPct !== null && (
          <>
            <span className="text-base text-price-muted line-through">{formatCurrency(compareAtPrice)}</span>
            <Badge tone="destructive">{discountPct}% OFF</Badge>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>
      <p className="text-sm text-foreground">
        or <span className="font-medium">{formatCurrency(installment)}/mo</span> for 4 months with no-cost EMI
      </p>
    </div>
  )
}

/** Renders the offers list. `variant="compact"` shows the top 3 inline near price; `variant="detailed"`
 *  (used by the standalone OffersSection further down the page) shows every offer with full descriptions —
 *  same data, same component, no duplicated markup to drift out of sync. */
function OffersPanel({ offers, variant }: { offers: readonly Offer[]; variant: 'compact' | 'detailed' }) {
  const visibleOffers = variant === 'compact' ? offers.slice(0, 3) : offers
  const OFFER_ICON: Record<OfferType, typeof Landmark> = {
    bank: Landmark, coupon: Tag, deal: Percent, membership: Award, bundle: Gift, payment: CreditCard,
  }

  return (
    <div className={variant === 'detailed' ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : 'flex flex-col gap-2'}>
      {visibleOffers.map((offer) => {
        const Icon = OFFER_ICON[offer.type]
        return (
          <div key={offer.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{OFFER_META[offer.type].label}</p>
                <p className="text-sm font-medium text-foreground">{offer.title}</p>
                {variant === 'detailed' && (
                  <>
                    <p className="mt-1 text-sm text-muted-foreground">{offer.description}</p>
                    {offer.eligibility && <p className="mt-1 text-xs text-muted-foreground">Eligibility: {offer.eligibility}</p>}
                    <button type="button" className="mt-2 text-xs font-semibold text-primary hover:underline">{offer.ctaLabel}</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}


/* ============================================================================
 * 11. VARIANT COMPONENTS
 * ==========================================================================*/

/** Renders every variant dimension with the presentation its data declares (swatch/button/card).
 *  Selecting an option updates Redux `variant` state, which the parent re-resolves into a
 *  concrete SKU/price/stock via `resolveVariantCombination` — configuration stays one coherent
 *  source of truth instead of independent, driftable pieces of state. */
function VariantSelector({
  dimensions, selection, onSelect,
}: { dimensions: readonly VariantDimension[]; selection: VariantSelection; onSelect: (dimensionKey: string, value: string) => void }) {
  return (
    <div className="flex flex-col gap-5">
      {dimensions.map((dimension) => {
        const selectedValue = selection[dimension.key]
        return (
          <fieldset key={dimension.key}>
            <legend className="mb-2 flex items-baseline gap-2 text-sm font-medium text-foreground">
              {dimension.label}
              {selectedValue && (
                <span className="text-sm font-normal text-muted-foreground">
                  {dimension.options.find((o) => o.value === selectedValue)?.label}
                </span>
              )}
            </legend>

            {dimension.presentation === 'swatch' && (
              <div className="flex flex-wrap gap-2.5">
                {dimension.options.map((option) => {
                  const selectable = isOptionSelectable(PRODUCT, selection, dimension.key, option.value)
                  const lowStock = isOptionLowStock(PRODUCT, selection, dimension.key, option.value)
                  const isSelected = selectedValue === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!selectable}
                      onClick={() => onSelect(dimension.key, option.value)}
                      aria-pressed={isSelected}
                      aria-label={`${dimension.label}: ${option.label}${lowStock ? ', low stock' : ''}${!selectable ? ', unavailable' : ''}`}
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        isSelected ? 'border-primary' : 'border-transparent'
                      } ${!selectable ? 'opacity-30' : ''}`}
                      title={option.label}
                    >
                      <span className="h-7 w-7 rounded-full ring-1 ring-inset ring-border" style={{ backgroundColor: option.swatchHex }} />
                      {isSelected && <Check className="absolute h-3.5 w-3.5 text-background mix-blend-difference" aria-hidden="true" />}
                      {!selectable && <span className="absolute inset-0 rounded-full" style={{ background: 'repeating-linear-gradient(-45deg, transparent, transparent 3px, var(--border) 3px, var(--border) 4px)' }} />}
                    </button>
                  )
                })}
              </div>
            )}

            {dimension.presentation === 'button' && (
              <div className="flex flex-wrap gap-2">
                {dimension.options.map((option) => {
                  const selectable = isOptionSelectable(PRODUCT, selection, dimension.key, option.value)
                  const isSelected = selectedValue === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!selectable}
                      onClick={() => onSelect(dimension.key, option.value)}
                      aria-pressed={isSelected}
                      className={`h-10 min-w-[44px] rounded-lg border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected ? 'border-primary bg-primary/5 text-primary' : 'border-input text-foreground hover:border-foreground/30'
                      } ${!selectable ? 'cursor-not-allowed text-muted-foreground/50 line-through' : ''}`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            )}

            {dimension.presentation === 'card' && (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {dimension.options.map((option) => {
                  const selectable = isOptionSelectable(PRODUCT, selection, dimension.key, option.value)
                  const isSelected = selectedValue === option.value
                  const combo = resolveVariantCombination(PRODUCT, { ...selection, [dimension.key]: option.value })
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!selectable}
                      onClick={() => onSelect(dimension.key, option.value)}
                      aria-pressed={isSelected}
                      className={`flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-input hover:border-foreground/30'
                      } ${!selectable ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <span className="text-sm font-medium text-foreground">{option.label}</span>
                      {combo && <span className="text-xs text-muted-foreground">{formatCurrency(combo.price)}</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </fieldset>
        )
      })}
    </div>
  )
}


/* ============================================================================
 * 12. PURCHASE COMPONENTS
 * ==========================================================================*/

/** Inventory messaging — informative, not manufactured urgency. */
function StockStatusMessage({ status, stockCount }: { status: StockStatus; stockCount?: number | undefined }) {
  const meta = STOCK_STATUS_META[status]
  const detail = status === 'low_stock' && stockCount ? `Only ${stockCount} left` : status === 'in_stock' && stockCount ? `${stockCount} available` : undefined
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`h-1.5 w-1.5 rounded-full ${
        meta.tone === 'success' ? 'bg-success' : meta.tone === 'warning' ? 'bg-warning' : meta.tone === 'destructive' ? 'bg-destructive' : 'bg-info'
      }`} aria-hidden="true" />
      <span className="font-medium text-foreground">{meta.label}</span>
      {detail && <span className="text-muted-foreground">· {detail}</span>}
    </div>
  )
}

/** Delivery / location panel. `variant="compact"` sits inline near the buy box; `variant="detailed"`
 *  powers the standalone DeliveryInformation section — one implementation, two placements. Location
 *  editing is a mock text field only (no real geolocation), per the PDP requirements. */
function DeliveryPanel({
  variant, location, shippingMethods, selectedShippingMethodId, onLocationChange, onShippingMethodChange,
}: {
  variant: 'compact' | 'detailed'
  location: string
  shippingMethods: readonly ShippingMethodOption[]
  selectedShippingMethodId: ShippingMethodId
  onLocationChange: (location: string) => void
  onShippingMethodChange: (id: ShippingMethodId) => void
}) {
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [draftLocation, setDraftLocation] = useState(location)
  const selectedMethod = shippingMethods.find((m) => m.id === selectedShippingMethodId) ?? shippingMethods[0]

  function commitLocation() {
    if (draftLocation.trim()) onLocationChange(draftLocation.trim())
    setIsEditingLocation(false)
  }

  return (
    <div className={variant === 'detailed' ? 'rounded-lg border border-border p-4' : ''}>
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {isEditingLocation ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={draftLocation}
              onChange={(e) => setDraftLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitLocation()}
              aria-label="Delivery location"
              className="h-8 w-40 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button type="button" onClick={commitLocation} className="text-xs font-semibold text-primary">Save</button>
          </div>
        ) : (
          <>
            <span className="text-foreground">Deliver to <span className="font-semibold">{location}</span></span>
            <button type="button" onClick={() => setIsEditingLocation(true)} className="text-xs font-medium text-primary hover:underline">Change</button>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {shippingMethods.map((method) => {
          const isSelected = method.id === selectedShippingMethodId
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onShippingMethodChange(method.id)}
              aria-pressed={isSelected}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <span className="flex items-center gap-2 text-sm">
                {method.id === 'pickup' ? <Store className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : <Truck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                <span>
                  <span className="font-medium text-foreground">{method.label}</span>
                  <span className="block text-xs text-muted-foreground">{method.etaLabel}</span>
                </span>
              </span>
              <span className="text-sm font-medium text-foreground">{method.price === 0 ? 'Free' : formatCurrency(method.price)}</span>
            </button>
          )
        })}
      </div>

      {variant === 'detailed' && selectedMethod && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Orders placed before 5 PM ship the same business day.
        </p>
      )}
    </div>
  )
}

/** Seller card. `variant="compact"` is the small trust strip near the buy box; `variant="detailed"`
 *  is the standalone SellerSection — same data, same component, deliberately not duplicated. */
function SellerPanel({ seller, variant }: { seller: Seller; variant: 'compact' | 'detailed' }) {
  return (
    <div className={variant === 'detailed' ? 'rounded-lg border border-border p-4' : 'flex items-center justify-between text-sm'}>
      <div className="flex items-center gap-2.5">
        <Store className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="text-foreground">
            Sold by <span className="font-medium">{seller.name}</span>
            {seller.isOfficialStore && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-xs font-medium text-info">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Official Store
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {seller.positiveRatingPct}% positive · {seller.ratingCount.toLocaleString()}+ ratings · Fulfilled by {seller.fulfilledBy}
          </p>
          {variant === 'detailed' && <p className="mt-1 text-xs text-muted-foreground">{seller.location}</p>}
        </div>
      </div>
      {variant === 'detailed' && (
        <button type="button" className="mt-3 text-xs font-semibold text-primary hover:underline">View store profile</button>
      )}
    </div>
  )
}

/** Wishlist / compare / share — secondary, visually subordinate to Add to Cart / Buy Now. */
function ProductActions({ productId, isWishlisted, onToggleWishlist }: { productId: string; isWishlisted: boolean; onToggleWishlist: () => void }) {
  const [justShared, setJustShared] = useState(false)

  async function handleShare() {
    const shareData = { title: PRODUCT.name, url: typeof window !== 'undefined' ? window.location.href : '' }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url)
        setJustShared(true)
        setTimeout(() => setJustShared(false), 2000)
      }
    } catch {
      /* user dismissed the native share sheet — no error state needed */
    }
  }

  return (
    <div className="flex items-center gap-2" data-product-id={productId}>
      <button
        type="button"
        onClick={onToggleWishlist}
        aria-pressed={isWishlisted}
        className="flex h-10 items-center gap-2 rounded-lg border border-input px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-destructive text-destructive' : ''}`} aria-hidden="true" />
        {isWishlisted ? 'Saved' : 'Wishlist'}
      </button>
      <button
        type="button"
        className="flex h-10 items-center gap-2 rounded-lg border border-input px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Scale className="h-4 w-4" aria-hidden="true" />
        Compare
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="flex h-10 items-center gap-2 rounded-lg border border-input px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {justShared ? 'Link copied' : 'Share'}
      </button>
    </div>
  )
}

/** Primary purchase CTAs. Reused both inline (desktop/tablet) and inside the mobile sticky bar —
 *  `layout="stacked"` vs `layout="row"` covers both placements from one implementation. */
function PurchaseActions({
  disabled, layout, onAddToCart, onBuyNow,
}: { disabled: boolean; layout: 'stacked' | 'row'; onAddToCart: () => void; onBuyNow: () => void }) {
  return (
    <div className={layout === 'stacked' ? 'flex flex-col gap-3' : 'flex flex-1 gap-3'}>
      <button
        type="button"
        onClick={onAddToCart}
        disabled={disabled}
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border-2 border-primary bg-transparent text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
        Add to Cart
      </button>
      <button
        type="button"
        onClick={onBuyNow}
        disabled={disabled}
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        Buy Now
      </button>
    </div>
  )
}

/** Fixed bottom purchase bar — mobile only. Mirrors the inline PurchaseActions but adds the live
 *  price so the CTA never scrolls out of context on small screens. */
function StickyMobilePurchaseBar({
  price, disabled, onAddToCart, onBuyNow,
}: { price: number; disabled: boolean; onAddToCart: () => void; onBuyNow: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
      <span className="shrink-0 text-base font-bold text-price">{formatCurrency(price)}</span>
      <PurchaseActions disabled={disabled} layout="row" onAddToCart={onAddToCart} onBuyNow={onBuyNow} />
    </div>
  )
}



/* ============================================================================
 * 13. INFORMATION / SPECIFICATION COMPONENTS
 * ==========================================================================*/

function ProductHighlights({ highlights }: { highlights: readonly string[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {highlights.map((highlight) => (
        <li key={highlight} className="flex items-start gap-2 text-sm text-foreground">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          {highlight}
        </li>
      ))}
    </ul>
  )
}

/** Grouped, extensible spec table — the group/item shape works for any product category,
 *  nothing here assumes "headphones". Each group is a native <details> for mobile collapsing. */
function ProductSpecifications({ groups }: { groups: readonly ProductSpecificationGroup[] }) {
  return (
    <div className="divide-y divide-border">
      {groups.map((group, i) => (
        <Disclosure key={group.id} summary={group.title} defaultOpen={i === 0}>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <div key={item.label} className="flex justify-between gap-4 border-b border-border/60 py-1.5 text-sm sm:border-0 sm:py-0">
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="text-right font-medium text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Disclosure>
      ))}
    </div>
  )
}

function ProductDescription({ product }: { product: Product }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-foreground">{product.descriptionOverview}</p>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Key features</h3>
        <ul className="flex flex-col gap-1.5">
          {product.descriptionFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Great for</h3>
        <ul className="flex flex-col gap-1.5">
          {product.descriptionUseCases.map((useCase) => (
            <li key={useCase} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
              {useCase}
            </li>
          ))}
        </ul>
      </div>

      <Disclosure summary="What's in the box">
        <ul className="flex flex-col gap-1">
          {product.inTheBox.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Disclosure>

      <Disclosure summary="Important notes">
        <ul className="flex flex-col gap-1">
          {product.importantNotes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      </Disclosure>
    </div>
  )
}

function ShippingReturnsWarrantyPanel({ product, kind }: { product: Product; kind: 'shipping' | 'returns' | 'warranty' }) {
  if (kind === 'shipping') {
    return (
      <DeliveryPanel
        variant="detailed"
        location={DEFAULT_DELIVERY_LOCATION}
        shippingMethods={product.shippingMethods}
        selectedShippingMethodId="standard"
        onLocationChange={() => {}}
        onShippingMethodChange={() => {}}
      />
    )
  }
  if (kind === 'returns') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border p-4">
        <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-muted-foreground">{product.returnsPolicyText}</p>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-4">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm leading-relaxed text-muted-foreground">{product.warrantyText}</p>
    </div>
  )
}

/** Tabbed deep-dive: Description/Specifications reuse the components above as tab panels;
 *  Shipping/Returns/Warranty reuse the same detail panels shown elsewhere on the page. */
function ProductInformationTabs({ product, activeTab, onTabChange }: { product: Product; activeTab: ProductInfoTab; onTabChange: (tab: ProductInfoTab) => void }) {
  return (
    <div>
      <Tabs tabs={INFO_TABS} activeTab={activeTab} onChange={onTabChange} />
      <div className="py-5">
        {INFO_TABS.map((tab) => (
          <div key={tab.id} role="tabpanel" id={`tabpanel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} hidden={activeTab !== tab.id}>
            {tab.id === 'description' && <ProductDescription product={product} />}
            {tab.id === 'specifications' && <ProductSpecifications groups={product.specificationGroups} />}
            {tab.id === 'shipping' && <ShippingReturnsWarrantyPanel product={product} kind="shipping" />}
            {tab.id === 'returns' && <ShippingReturnsWarrantyPanel product={product} kind="returns" />}
            {tab.id === 'warranty' && <ShippingReturnsWarrantyPanel product={product} kind="warranty" />}
          </div>
        ))}
      </div>
    </div>
  )
}


/* ============================================================================
 * 14. REVIEWS / Q&A COMPONENTS
 * ==========================================================================*/

function ReviewSummary({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-4xl font-bold text-foreground">{averageRatingLabel(rating)}</span>
      <RatingStars rating={rating} size="lg" />
      <span className="text-sm text-muted-foreground">{reviewCount.toLocaleString()} ratings</span>
    </div>
  )
}

function RatingDistribution({ distribution }: { distribution: typeof RATING_DISTRIBUTION }) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      {distribution.map((row) => (
        <div key={row.stars} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-10 shrink-0">{row.stars} star</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-rating" style={{ width: `${row.percentage}%` }} />
          </div>
          <span className="w-14 shrink-0 text-right">{row.count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

function ReviewFilterBar({ activeFilter, onChange }: { activeFilter: ReviewFilter; onChange: (filter: ReviewFilter) => void }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter reviews">
      {REVIEW_FILTERS.map((filter) => {
        const isActive = filter.id === activeFilter
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onChange(filter.id)}
            aria-pressed={isActive}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive ? 'border-primary bg-primary/5 text-primary' : 'border-input text-muted-foreground hover:text-foreground'
            }`}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount)
  const [hasMarkedHelpful, setHasMarkedHelpful] = useState(false)

  return (
    <article className="flex flex-col gap-2 border-b border-border py-5 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RatingStars rating={review.rating} />
          {review.verifiedPurchase && (
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified Purchase
            </span>
          )}
        </div>
        <time dateTime={review.date} className="text-xs text-muted-foreground">{formatReviewDate(review.date)}</time>
      </div>

      <h3 className="text-sm font-semibold text-foreground">{review.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{review.body}</p>

      {review.variantPurchased && <p className="text-xs text-muted-foreground">Configuration: {review.variantPurchased}</p>}

      {review.images && review.images.length > 0 && (
        <div className="flex gap-2">
          {review.images.map((image) => (
            <div key={image.id} className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-muted" role="img" aria-label={image.alt}>
              <ImageOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center gap-4">
        <span className="text-xs text-muted-foreground">By {review.author}</span>
        <button
          type="button"
          onClick={() => { if (!hasMarkedHelpful) { setHelpfulCount((c) => c + 1); setHasMarkedHelpful(true) } }}
          aria-pressed={hasMarkedHelpful}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ThumbsUp className={`h-3.5 w-3.5 ${hasMarkedHelpful ? 'fill-foreground' : ''}`} aria-hidden="true" />
          Helpful ({helpfulCount})
        </button>
        <button type="button" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
          <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Report
        </button>
      </div>
    </article>
  )
}

const REVIEWS_PER_PAGE = 3

/** Pagination over the (already filtered) review list. Current page is LOCAL state — pure
 *  in-page navigation with no reason to be shared across components or persisted. */
function ReviewPagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  if (pageCount <= 1) return null
  return (
    <nav aria-label="Review pages" className="flex items-center justify-center gap-2 pt-4">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page of reviews"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-input disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page of reviews"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-input disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  )
}

function ReviewsSection({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  const dispatch = useAppDispatch()
  const activeFilter = useAppSelector(selectReviewFilter)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => filterAndSortReviews(MOCK_REVIEWS, activeFilter), [activeFilter])
  const pageCount = Math.max(1, Math.ceil(filtered.length / REVIEWS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * REVIEWS_PER_PAGE, page * REVIEWS_PER_PAGE)

  function handleFilterChange(filter: ReviewFilter) {
    dispatch(reviewFilterSet(filter))
    setPage(1)
  }

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="flex flex-col gap-5">
      <h2 id="reviews-heading" className="text-lg font-semibold text-foreground">Customer Reviews</h2>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <ReviewSummary rating={rating} reviewCount={reviewCount} />
        <RatingDistribution distribution={RATING_DISTRIBUTION} />
      </div>

      <ReviewFilterBar activeFilter={activeFilter} onChange={handleFilterChange} />

      {paginated.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No reviews match this filter.</p>
      ) : (
        <div>
          {paginated.map((review) => <ReviewCard key={review.id} review={review} />)}
        </div>
      )}

      <ReviewPagination page={page} pageCount={pageCount} onChange={setPage} />
    </section>
  )
}

/** Q&A list + a purely-frontend "ask a question" affordance — no submission endpoint exists yet,
 *  so state stays local to this component (draft text + a brief inline confirmation). */
function QuestionsSection({ questions }: { questions: readonly Question[] }) {
  const dispatch = useAppDispatch()
  const expandedId = useAppSelector(selectExpandedQuestionId)
  const isAskOpen = useAppSelector(selectIsAskQuestionOpen)
  const [draftQuestion, setDraftQuestion] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (!draftQuestion.trim()) return
    setSubmitted(true)
    setDraftQuestion('')
    dispatch(askQuestionClosed())
  }

  return (
    <section aria-labelledby="qna-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id="qna-heading" className="text-lg font-semibold text-foreground">Questions &amp; Answers</h2>
        <button
          type="button"
          onClick={() => dispatch(isAskOpen ? askQuestionClosed() : askQuestionOpened())}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask a Question
        </button>
      </div>

      {isAskOpen && (
        <div className="rounded-lg border border-border p-4">
          <label htmlFor="ask-question-input" className="mb-1.5 block text-sm font-medium text-foreground">Your question</label>
          <textarea
            id="ask-question-input"
            value={draftQuestion}
            onChange={(e) => setDraftQuestion(e.target.value)}
            rows={3}
            placeholder="e.g. Does this work with a PS5?"
            className="w-full rounded-md border border-input bg-transparent p-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => dispatch(askQuestionClosed())} className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground">Cancel</button>
            <button type="button" onClick={handleSubmit} className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground">Submit</button>
          </div>
        </div>
      )}

      {submitted && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Thanks — your question has been submitted for review.
        </p>
      )}

      <div className="divide-y divide-border">
        {questions.map((q) => {
          const isExpanded = expandedId === q.id
          return (
            <div key={q.id} className="py-3">
              <button
                type="button"
                onClick={() => dispatch(questionToggled(q.id))}
                aria-expanded={isExpanded}
                aria-controls={`answer-${q.id}`}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <span className="text-sm font-medium text-foreground">Q: {q.question}</span>
                <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              <p className="mt-1 text-xs text-muted-foreground">Asked by {q.askedBy} · {formatReviewDate(q.date)} · {q.helpfulCount} found helpful</p>
              {isExpanded && (
                <p id={`answer-${q.id}`} className="mt-2 rounded-md bg-muted p-3 text-sm text-foreground">
                  <span className="font-medium">A:</span> {q.answer}
                  <span className="mt-1 block text-xs text-muted-foreground">— {q.answeredBy}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}



/* ============================================================================
 * 15. RECOMMENDATION COMPONENTS
 * ==========================================================================*/

/** Compact card shared by RelatedProducts and RecentlyViewed — intentionally simpler than the
 *  full buy-box; recommendations must stay visually subordinate to the primary product. */
function RelatedProductCard({ product }: { product: RelatedProductSummary }) {
  const dispatch = useAppDispatch()
  const isWishlisted = useAppSelector((s) => s.wishlist.includes(product.id))

  return (
    <div className="flex w-40 shrink-0 flex-col gap-1.5 sm:w-48">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card">
        <img src={product.thumbnail} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        <button
          type="button"
          onClick={() => dispatch(wishlistToggled(product.id))}
          aria-pressed={isWishlisted}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-background/90"
        >
          <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} aria-hidden="true" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{product.brand}</p>
      <p className="line-clamp-2 text-sm font-medium text-foreground">{product.name}</p>
      <RatingStars rating={product.rating} />
      <PriceTagCompact price={product.price} compareAtPrice={product.compareAtPrice} />
    </div>
  )
}

function PriceTagCompact({ price, compareAtPrice }: { price: number; compareAtPrice?: number | undefined }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-semibold text-price">{formatCurrency(price)}</span>
      {compareAtPrice && <span className="text-xs text-price-muted line-through">{formatCurrency(compareAtPrice)}</span>}
    </div>
  )
}

function ProductRail({ title, products }: { title: string; products: readonly RelatedProductSummary[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {products.map((product) => <RelatedProductCard key={product.id} product={product} />)}
      </div>
    </div>
  )
}

function RelatedProducts({ related }: { related: readonly RelatedProductSummary[] }) {
  const similar = related.slice(0, 3)
  const alsoViewed = [...related].reverse().slice(0, 3)
  return (
    <section aria-labelledby="related-heading" className="flex flex-col gap-6">
      <h2 id="related-heading" className="text-lg font-semibold text-foreground">You May Also Like</h2>
      <ProductRail title="Similar Products" products={similar} />
      <ProductRail title="Customers Also Viewed" products={alsoViewed} />
    </section>
  )
}

function RecentlyViewed({ items }: { items: readonly RelatedProductSummary[] }) {
  if (items.length === 0) return null
  return (
    <section aria-labelledby="recently-viewed-heading">
      <ProductRail title="Recently Viewed" products={items} />
      <span id="recently-viewed-heading" className="sr-only">Recently viewed products</span>
    </section>
  )
}

/** Bundle builder: main product + optional accessories, checkable, with a live combined total
 *  and savings computed from individually-listed accessory prices. */
function FrequentlyBoughtTogether({ product }: { product: Product }) {
  const dispatch = useAppDispatch()
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<Set<string>>(() => new Set(product.bundleAccessories.map((a) => a.id)))
  const resolvedCombo = resolveVariantCombination(product, buildDefaultSelection(product))
  const basePrice = resolvedCombo?.price ?? 0

  const selectedAccessories = product.bundleAccessories.filter((a) => selectedAccessoryIds.has(a.id))
  const bundleTotal = basePrice + selectedAccessories.reduce((sum, a) => sum + a.price, 0)
  const bundleSavings = selectedAccessories.length > 0 ? Math.round(bundleTotal * 0.05 * 100) / 100 : 0

  function toggleAccessory(id: string) {
    setSelectedAccessoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAddBundle() {
    if (!resolvedCombo) return
    dispatch(itemAddedToCart({ productId: product.id, sku: resolvedCombo.sku, name: product.name, thumbnail: product.media[0]?.thumbnail ?? '', optionValues: resolvedCombo.optionValues, unitPrice: basePrice, quantity: 1 }))
    for (const accessory of selectedAccessories) {
      dispatch(itemAddedToCart({ productId: accessory.id, sku: `ACC-${accessory.id}`, name: accessory.name, thumbnail: accessory.thumbnail, optionValues: {}, unitPrice: accessory.price, quantity: 1 }))
    }
  }

  return (
    <section aria-labelledby="fbt-heading" className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <h2 id="fbt-heading" className="text-lg font-semibold text-foreground">Frequently Bought Together</h2>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
          <img src={product.media[0]?.thumbnail} alt={product.name} className="h-full w-full object-cover" />
        </div>
        {product.bundleAccessories.map((accessory) => (
          <div key={accessory.id} className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2">
              <input
                type="checkbox"
                checked={selectedAccessoryIds.has(accessory.id)}
                onChange={() => toggleAccessory(accessory.id)}
                aria-label={`Include ${accessory.name}`}
                className="h-4 w-4"
              />
              <img src={accessory.thumbnail} alt={accessory.name} className="h-10 w-10 rounded-md object-cover" />
              <span className="text-xs text-foreground">
                {accessory.name}
                <span className="block font-medium">{formatCurrency(accessory.price)}</span>
              </span>
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div>
          <p className="text-sm text-muted-foreground">Bundle total {bundleSavings > 0 && <span className="text-success">(save {formatCurrency(bundleSavings)})</span>}</p>
          <p className="text-xl font-bold text-price">{formatCurrency(bundleTotal - bundleSavings)}</p>
        </div>
        <button
          type="button"
          onClick={handleAddBundle}
          className="flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" /> Add all to cart
        </button>
      </div>
    </section>
  )
}


/* ============================================================================
 * 16. HEADER / FOOTER
 * ==========================================================================*/

function AnnouncementBar() {
  return (
    <div className="bg-foreground py-2 text-center text-xs font-medium text-background">
      Free shipping on orders over {formatCurrency(FREE_SHIPPING_THRESHOLD)} · Extra 10% off with code SAVE10
    </div>
  )
}

/** Uncontrolled search affordance — no PDP-level search results to wire up, so state stays local. */
function SearchBar() {
  const [query, setQuery] = useState('')
  return (
    <div className="relative hidden max-w-xl flex-1 sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products, brands and more"
        aria-label="Search products"
        className="h-10 w-full rounded-full border border-input bg-muted/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:outline-none"
      />
    </div>
  )
}

function HeaderActions({ wishlistCount, cartCount }: { wishlistCount: number; cartCount: number }) {
  return (
    <div className="flex items-center gap-1">
      <IconButton label="Account"><User className="h-5 w-5" aria-hidden="true" /></IconButton>
      <IconButton label="Wishlist" badgeCount={wishlistCount}><Heart className="h-5 w-5" aria-hidden="true" /></IconButton>
      <IconButton label="Cart" badgeCount={cartCount}><ShoppingCart className="h-5 w-5" aria-hidden="true" /></IconButton>
    </div>
  )
}

function CategoryNavigation() {
  return (
    <nav aria-label="Categories" className="no-scrollbar hidden gap-5 overflow-x-auto border-t border-border px-4 py-2.5 text-sm text-muted-foreground lg:flex lg:px-8">
      {CATEGORY_LINKS.map((category) => (
        <a key={category} href="#" className="shrink-0 whitespace-nowrap hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          {category}
        </a>
      ))}
    </nav>
  )
}

function EcommerceHeader({ wishlistCount, cartCount }: { wishlistCount: number; cartCount: number }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <AnnouncementBar />
      <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          aria-label="Open menu"
          aria-expanded={isMobileMenuOpen}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="shrink-0 text-lg font-bold tracking-tight text-primary">Novamart</span>
        <SearchBar />
        <div className="ml-auto">
          <HeaderActions wishlistCount={wishlistCount} cartCount={cartCount} />
        </div>
      </div>
      <CategoryNavigation />
    </header>
  )
}

function Breadcrumbs({ product }: { product: Product }) {
  const crumbs = ['Home', 'Electronics', 'Headphones', product.name]
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {crumbs.map((crumb, i) => (
        <span key={crumb} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
          {i === crumbs.length - 1 ? (
            <span aria-current="page" className="max-w-[220px] truncate text-foreground sm:max-w-none">{crumb}</span>
          ) : (
            <a href="#" className="hover:text-foreground">{crumb}</a>
          )}
        </span>
      ))}
    </nav>
  )
}

function TrustSection() {
  return (
    <section aria-label="Why shop with us" className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4 sm:grid-cols-5">
      {TRUST_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.label} className="flex flex-col items-center gap-1.5 text-center">
            <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs font-medium text-foreground">{item.label}</p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">{item.description}</p>
          </div>
        )
      })}
    </section>
  )
}

function EcommerceFooter() {
  const columns: readonly { title: string; links: readonly string[] }[] = [
    { title: 'Shop', links: ['Electronics', 'Audio', 'Wearables', 'Deals'] },
    { title: 'Customer Service', links: ['Track Order', 'Returns & Refunds', 'Shipping Info', 'Contact Us'] },
    { title: 'Company', links: ['About Novamart', 'Careers', 'Press', 'Sustainability'] },
  ]
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4 lg:px-8">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-lg font-bold text-primary">Novamart</p>
          <p className="mt-2 text-sm text-muted-foreground">Everyday essentials, delivered fast.</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link}><a href="#" className="text-sm text-muted-foreground hover:text-foreground">{link}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground lg:px-8">
        © {new Date().getFullYear()} Novamart, Inc. All rights reserved.
      </div>
    </footer>
  )
}


/* ============================================================================
 * 17. PRODUCT DETAILS PAGE COMPOSITION
 * ==========================================================================*/

/** The right-hand information column: everything a shopper needs to decide and buy,
 *  composed from the focused components above — no inline JSX walls. */
function ProductInformation({ product }: { product: Product }) {
  const dispatch = useAppDispatch()
  const selection = useAppSelector(selectVariantSelection)
  const quantity = useAppSelector(selectQuantity)
  const wishlistIds = useAppSelector(selectWishlistIds)
  const delivery = useAppSelector(selectDelivery)
  const isWishlisted = wishlistIds.includes(product.id)

  const resolvedCombo = useMemo(() => resolveVariantCombination(product, selection), [product, selection])

  const handleAddToCart = useCallback(() => {
    if (!resolvedCombo) return
    dispatch(itemAddedToCart({
      productId: product.id,
      sku: resolvedCombo.sku,
      name: product.name,
      thumbnail: product.media[0]?.thumbnail ?? '',
      optionValues: resolvedCombo.optionValues,
      unitPrice: resolvedCombo.price,
      quantity,
    }))
  }, [dispatch, product, resolvedCombo, quantity])

  const handleBuyNow = useCallback(() => {
    handleAddToCart()
  }, [handleAddToCart])

  function scrollToReviews() {
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const isPurchasable = !!resolvedCombo && resolvedCombo.stockStatus !== 'out_of_stock' && resolvedCombo.stockStatus !== 'coming_soon'

  return (
    <div className="flex flex-col gap-5">
      <ProductBadgeList badges={product.badges} />

      <div>
        <p className="text-sm font-medium text-muted-foreground">{product.brand}</p>
        <h1 className="mt-1 text-xl font-semibold leading-snug text-foreground sm:text-2xl">{product.name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Model: {product.modelNumber} {resolvedCombo && <>· SKU: {resolvedCombo.sku}</>}</p>
      </div>

      <RatingSummary rating={product.rating} reviewCount={product.reviewCount} onJumpToReviews={scrollToReviews} />

      {resolvedCombo && <PriceSection price={resolvedCombo.price} compareAtPrice={resolvedCombo.compareAtPrice} />}

      <OffersPanel offers={product.offers} variant="compact" />

      <div className="border-t border-border pt-5">
        <VariantSelector
          dimensions={product.variantDimensions}
          selection={selection}
          onSelect={(dimensionKey, value) => dispatch(variantOptionSelected({ dimensionKey, value }))}
        />
      </div>

      {resolvedCombo && <StockStatusMessage status={resolvedCombo.stockStatus} stockCount={resolvedCombo.stockCount} />}

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-foreground">Quantity</span>
        <QuantitySelector
          quantity={quantity}
          min={MIN_QUANTITY}
          max={MAX_QUANTITY}
          onIncrement={() => dispatch(quantityIncremented())}
          onDecrement={() => dispatch(quantityDecremented())}
          onChange={(value) => dispatch(quantitySet(value))}
        />
      </div>

      <DeliveryPanel
        variant="compact"
        location={delivery.location}
        shippingMethods={product.shippingMethods}
        selectedShippingMethodId={delivery.shippingMethodId}
        onLocationChange={(location) => dispatch(deliveryLocationSet(location))}
        onShippingMethodChange={(id) => dispatch(shippingMethodSelected(id))}
      />

      <SellerPanel seller={product.seller} variant="compact" />

      <div className="hidden flex-col gap-3 lg:flex">
        <PurchaseActions disabled={!isPurchasable} layout="stacked" onAddToCart={handleAddToCart} onBuyNow={handleBuyNow} />
        <ProductActions productId={product.id} isWishlisted={isWishlisted} onToggleWishlist={() => dispatch(wishlistToggled(product.id))} />
      </div>

      <div className="lg:hidden">
        <ProductActions productId={product.id} isWishlisted={isWishlisted} onToggleWishlist={() => dispatch(wishlistToggled(product.id))} />
      </div>

      <StickyMobilePurchaseBar
        price={resolvedCombo?.price ?? product.variantCombinations[0]?.price ?? 0}
        disabled={!isPurchasable}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />
    </div>
  )
}

function ProductMainSection({ product }: { product: Product }) {
  return (
    <section className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
      <ProductMediaGallery media={product.media} />
      <ProductInformation product={product} />
    </section>
  )
}

function ProductDetailsPageContent() {
  const dispatch = useAppDispatch()
  const cartCount = useAppSelector(selectCartCount)
  const wishlistCount = useAppSelector(selectWishlistCount)
  const activeTab = useAppSelector(selectActiveInfoTab)

  useEffect(() => {
    dispatch(productViewed(PRODUCT.id))
  }, [dispatch])

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground lg:pb-0">
      <EcommerceHeader wishlistCount={wishlistCount} cartCount={cartCount} />

      <main className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-6 lg:px-8">
        <Breadcrumbs product={PRODUCT} />

        <ProductMainSection product={PRODUCT} />

        <section aria-labelledby="highlights-heading" className="border-t border-border pt-8">
          <h2 id="highlights-heading" className="mb-4 text-lg font-semibold text-foreground">Highlights</h2>
          <ProductHighlights highlights={PRODUCT.highlights} />
        </section>

        <section className="border-t border-border pt-8">
          <ProductInformationTabs product={PRODUCT} activeTab={activeTab} onTabChange={(tab) => dispatch(activeTabSet(tab))} />
        </section>

        <section aria-labelledby="offers-heading" className="border-t border-border pt-8">
          <h2 id="offers-heading" className="mb-4 text-lg font-semibold text-foreground">Offers For You</h2>
          <OffersPanel offers={PRODUCT.offers} variant="detailed" />
        </section>

        <section aria-labelledby="seller-heading" className="border-t border-border pt-8">
          <h2 id="seller-heading" className="mb-4 text-lg font-semibold text-foreground">Seller Information</h2>
          <SellerPanel seller={PRODUCT.seller} variant="detailed" />
        </section>

        <section aria-labelledby="delivery-heading" className="border-t border-border pt-8">
          <h2 id="delivery-heading" className="mb-4 text-lg font-semibold text-foreground">Delivery Information</h2>
          <DeliveryPanelConnected product={PRODUCT} />
        </section>

        <div className="border-t border-border pt-8">
          <FrequentlyBoughtTogether product={PRODUCT} />
        </div>

        <div className="border-t border-border pt-8">
          <ReviewsSection rating={PRODUCT.rating} reviewCount={PRODUCT.reviewCount} />
        </div>

        <div className="border-t border-border pt-8">
          <QuestionsSection questions={MOCK_QUESTIONS} />
        </div>

        <div className="border-t border-border pt-8">
          <RelatedProducts related={PRODUCT.relatedProducts} />
        </div>

        <div className="border-t border-border pt-8">
          <RecentlyViewed items={PRODUCT.recentlyViewed} />
        </div>

        <div className="border-t border-border pt-8">
          <TrustSection />
        </div>
      </main>

      <EcommerceFooter />
    </div>
  )
}

/** Thin connector so the standalone "Delivery Information" section reads/writes the same
 *  Redux delivery state as the compact panel in the buy box — one source of truth. */
function DeliveryPanelConnected({ product }: { product: Product }) {
  const dispatch = useAppDispatch()
  const delivery = useAppSelector(selectDelivery)
  return (
    <DeliveryPanel
      variant="detailed"
      location={delivery.location}
      shippingMethods={product.shippingMethods}
      selectedShippingMethodId={delivery.shippingMethodId}
      onLocationChange={(location) => dispatch(deliveryLocationSet(location))}
      onShippingMethodChange={(id) => dispatch(shippingMethodSelected(id))}
    />
  )
}

/* ============================================================================
 * 18. EXPORT
 * ==========================================================================*/

export default function ProductDetailsPage() {
  return (
    <Provider store={store}>
      <ProductDetailsPageContent />
    </Provider>
  )
}