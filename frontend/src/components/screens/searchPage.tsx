'use client'

/**
 * SearchPage.tsx
 * -----------------------------------------------------------------------
 * Enterprise ecommerce search experience -- single-file delivery.
 * Internally organized as independent logical modules (types, redux,
 * utilities, components) so it can be mechanically split into a real
 * feature folder later without redesign.
 * -----------------------------------------------------------------------
 */

import * as React from 'react'
import {
  configureStore,
  createSlice,
  createSelector,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { Provider, useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import {
  Search,
  X,
  Mic,
  Heart,
  ShoppingCart,
  Bell,
  User,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  ChevronDown,
  ChevronRight,
  Star,
  Check,
  TrendingUp,
  Clock,
  Flame,
  Sun,
  Moon,
  AlertTriangle,
  RotateCcw,
  Eye,
  Truck,
  Zap,
} from 'lucide-react'

/* ========================================================================
   1. TYPES
   ======================================================================== */

type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock'
type DeliveryOption = 'free' | 'same-day' | 'next-day'
type AvailabilityOption = 'in-stock' | 'fast-delivery' | 'available-today'
type ProductBadgeKind = 'new' | 'best-seller' | 'discounted' | 'low-stock' | 'out-of-stock' | 'sponsored'

enum ViewMode {
  Grid = 'grid',
  List = 'list',
}

enum SortOption {
  Relevance = 'relevance',
  Popularity = 'popularity',
  Newest = 'newest',
  PriceLowToHigh = 'price-asc',
  PriceHighToLow = 'price-desc',
  CustomerRating = 'rating',
  BestSelling = 'best-selling',
  BiggestDiscount = 'discount',
}

type FilterGroupId = 'category' | 'brand' | 'availability' | 'delivery' | 'color'

interface Category {
  id: string
  label: string
}

interface Brand {
  id: string
  label: string
}

interface Product {
  id: string
  slug: string
  title: string
  brandId: string
  categoryId: string
  price: number
  originalPrice: number
  rating: number
  reviewCount: number
  unitsSold: number
  dateAdded: string
  stockStatus: StockStatus
  delivery: DeliveryOption[]
  availableToday: boolean
  sponsored: boolean
  color: string
  emoji: string
  installments?: { months: number; amount: number }
}

interface PriceRange {
  min: number | null
  max: number | null
}

interface FiltersState {
  selected: Record<FilterGroupId, string[]>
  price: PriceRange
  minRating: number | null
  minDiscount: number | null
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

interface SearchSuggestionGroups {
  recent: string[]
  trending: string[]
  suggested: string[]
  categories: Category[]
  brands: Brand[]
  products: Product[]
}

interface CartLine {
  productId: string
  quantity: number
}

/* ========================================================================
   2. CONSTANTS
   ======================================================================== */

const NOW = new Date('2026-09-13T00:00:00Z').getTime()
const NEW_WINDOW_DAYS = 45
const PAGE_SIZE = 12
const RECENT_SEARCHES_CAP = 8
const SIMULATED_LATENCY_MS = 550

const CATEGORIES: Category[] = [
  { id: 'headphones', label: 'Headphones' },
  { id: 'earbuds', label: 'Earbuds' },
  { id: 'speakers', label: 'Speakers' },
  { id: 'wearables', label: 'Wearables' },
  { id: 'laptops', label: 'Laptops' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'accessories', label: 'Accessories' },
]

const BRANDS: Brand[] = [
  { id: 'apple', label: 'Apple' },
  { id: 'sony', label: 'Sony' },
  { id: 'bose', label: 'Bose' },
  { id: 'jbl', label: 'JBL' },
  { id: 'samsung', label: 'Samsung' },
  { id: 'sennheiser', label: 'Sennheiser' },
  { id: 'anker', label: 'Anker' },
  { id: 'beats', label: 'Beats' },
  { id: 'jabra', label: 'Jabra' },
  { id: 'skullcandy', label: 'Skullcandy' },
  { id: 'logitech', label: 'Logitech' },
  { id: 'razer', label: 'Razer' },
]

const EMOJI_BY_CATEGORY: Record<string, string> = {
  headphones: '\u{1F3A7}',
  earbuds: '\u{1F3B6}',
  speakers: '\u{1F50A}',
  wearables: '\u{231A}',
  laptops: '\u{1F4BB}',
  gaming: '\u{1F3AE}',
  accessories: '\u{1F50C}',
}

const COLOR_OPTIONS = ['black', 'white', 'blue', 'silver', 'gray', 'titanium', 'graphite', 'midnight', 'starlight'] as const

const PRICE_RANGES: Array<{ label: string; min: number | null; max: number | null }> = [
  { label: 'Under $50', min: null, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: '$100 - $250', min: 100, max: 250 },
  { label: '$250 - $500', min: 250, max: 500 },
  { label: '$500+', min: 500, max: null },
]

const RATING_OPTIONS = [4, 3, 2] as const
const DISCOUNT_OPTIONS = [10, 20, 30, 50] as const

const AVAILABILITY_LABELS: Record<AvailabilityOption, string> = {
  'in-stock': 'In Stock',
  'fast-delivery': 'Fast Delivery',
  'available-today': 'Available Today',
}

const DELIVERY_LABELS: Record<DeliveryOption, string> = {
  free: 'Free Delivery',
  'same-day': 'Same Day',
  'next-day': 'Next Day',
}

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: SortOption.Relevance, label: 'Relevance' },
  { value: SortOption.Popularity, label: 'Popularity' },
  { value: SortOption.Newest, label: 'Newest' },
  { value: SortOption.PriceLowToHigh, label: 'Price: Low to High' },
  { value: SortOption.PriceHighToLow, label: 'Price: High to Low' },
  { value: SortOption.CustomerRating, label: 'Customer Rating' },
  { value: SortOption.BestSelling, label: 'Best Selling' },
  { value: SortOption.BiggestDiscount, label: 'Biggest Discount' },
]

const TRENDING_SEARCHES = [
  'wireless earbuds',
  'gaming laptop',
  'noise cancelling headphones',
  'smart watch',
  'portable speaker',
]

const SUGGESTED_QUERIES = [
  'wireless headphones',
  'noise cancelling headphones',
  'bluetooth headphones',
  'over ear headphones',
  'true wireless earbuds',
  'gaming headset',
  'portable bluetooth speaker',
  'fitness smart watch',
  'macbook air',
  'gaming laptop',
  'fast charger',
  'wireless charger',
]

const DEFAULT_RELATED_SEARCHES = [
  'noise cancelling headphones',
  'bluetooth speakers',
  'fitness tracker',
  'gaming headset',
]

const HEADPHONE_RELATED_SEARCHES = [
  'noise cancelling headphones',
  'bluetooth headphones',
  'over ear headphones',
  'true wireless earbuds',
]

const WATCH_RELATED_SEARCHES = [
  'fitness tracker',
  'smart watch bands',
  'running watch',
  'heart rate monitor',
]

const LAPTOP_RELATED_SEARCHES = [
  'laptop bag',
  'wireless mouse',
  'usb-c hub',
  'external monitor',
]

const INITIAL_RECENT_SEARCHES = ['sony headphones', 'gaming laptop', 'apple watch']

/* ========================================================================
   3. MOCK DATA
   ======================================================================== */

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', slug: 'sony-wh1000xm5', title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones', brandId: 'sony', categoryId: 'headphones', price: 348, originalPrice: 399, rating: 4.8, reviewCount: 18432, unitsSold: 25000, dateAdded: '2026-08-01', stockStatus: 'in-stock', delivery: ['free', 'next-day'], availableToday: false, sponsored: false, color: 'black', emoji: EMOJI_BY_CATEGORY.headphones },
  { id: 'p2', slug: 'apple-airpods-pro-2', title: 'Apple AirPods Pro (2nd Generation)', brandId: 'apple', categoryId: 'earbuds', price: 199, originalPrice: 249, rating: 4.7, reviewCount: 32011, unitsSold: 41000, dateAdded: '2026-06-10', stockStatus: 'in-stock', delivery: ['free', 'same-day'], availableToday: true, sponsored: false, color: 'white', emoji: EMOJI_BY_CATEGORY.earbuds },
  { id: 'p3', slug: 'bose-qc-ultra', title: 'Bose QuietComfort Ultra Headphones', brandId: 'bose', categoryId: 'headphones', price: 379, originalPrice: 429, rating: 4.6, reviewCount: 9021, unitsSold: 8000, dateAdded: '2026-07-20', stockStatus: 'low-stock', delivery: ['free'], availableToday: false, sponsored: false, color: 'black', emoji: EMOJI_BY_CATEGORY.headphones },
  { id: 'p4', slug: 'jbl-tune-770nc', title: 'JBL Tune 770NC Wireless Headphones', brandId: 'jbl', categoryId: 'headphones', price: 99, originalPrice: 129, rating: 4.3, reviewCount: 5210, unitsSold: 15000, dateAdded: '2026-05-02', stockStatus: 'in-stock', delivery: ['free', 'next-day'], availableToday: false, sponsored: false, color: 'blue', emoji: EMOJI_BY_CATEGORY.headphones },
  { id: 'p5', slug: 'galaxy-buds3-pro', title: 'Samsung Galaxy Buds3 Pro', brandId: 'samsung', categoryId: 'earbuds', price: 179, originalPrice: 229, rating: 4.4, reviewCount: 6789, unitsSold: 12000, dateAdded: '2026-08-15', stockStatus: 'in-stock', delivery: ['free', 'same-day'], availableToday: true, sponsored: false, color: 'silver', emoji: EMOJI_BY_CATEGORY.earbuds },
  { id: 'p6', slug: 'sennheiser-momentum-4', title: 'Sennheiser Momentum 4 Wireless', brandId: 'sennheiser', categoryId: 'headphones', price: 299, originalPrice: 349, rating: 4.6, reviewCount: 4120, unitsSold: 6000, dateAdded: '2026-03-11', stockStatus: 'in-stock', delivery: ['free'], availableToday: false, sponsored: false, color: 'black', emoji: EMOJI_BY_CATEGORY.headphones },
  { id: 'p7', slug: 'anker-soundcore-space-q45', title: 'Anker Soundcore Space Q45 Adaptive Noise Cancelling', brandId: 'anker', categoryId: 'headphones', price: 129, originalPrice: 179, rating: 4.5, reviewCount: 15342, unitsSold: 30000, dateAdded: '2026-04-22', stockStatus: 'in-stock', delivery: ['free', 'next-day'], availableToday: false, sponsored: true, color: 'gray', emoji: EMOJI_BY_CATEGORY.headphones },
  { id: 'p8', slug: 'beats-studio-pro', title: 'Beats Studio Pro Wireless Headphones', brandId: 'beats', categoryId: 'headphones', price: 269, originalPrice: 349, rating: 4.3, reviewCount: 7821, unitsSold: 9000, dateAdded: '2026-02-18', stockStatus: 'in-stock', delivery: ['free'], availableToday: false, sponsored: false, color: 'black', emoji: EMOJI_BY_CATEGORY.headphones },
  { id: 'p9', slug: 'jabra-elite-10', title: 'Jabra Elite 10 Earbuds', brandId: 'jabra', categoryId: 'earbuds', price: 179, originalPrice: 229, rating: 4.4, reviewCount: 3221, unitsSold: 5000, dateAdded: '2026-07-01', stockStatus: 'in-stock', delivery: ['free', 'same-day'], availableToday: true, sponsored: false, color: 'titanium', emoji: EMOJI_BY_CATEGORY.earbuds },
  { id: 'p10', slug: 'skullcandy-crusher-anc-2', title: 'Skullcandy Crusher ANC 2 Wireless', brandId: 'skullcandy', categoryId: 'headphones', price: 149, originalPrice: 199, rating: 4.1, reviewCount: 2894, unitsSold: 4000, dateAdded: '2026-01-15', stockStatus: 'out-of-stock', delivery: ['free'], availableToday: false, sponsored: false, color: 'black', emoji: EMOJI_BY_CATEGORY.headphones },
  { id: 'p11', slug: 'apple-airpods-max', title: 'Apple AirPods Max', brandId: 'apple', categoryId: 'headphones', price: 479, originalPrice: 549, rating: 4.5, reviewCount: 11029, unitsSold: 7000, dateAdded: '2025-11-05', stockStatus: 'in-stock', delivery: ['free'], availableToday: false, sponsored: false, color: 'silver', emoji: EMOJI_BY_CATEGORY.headphones },
  { id: 'p12', slug: 'sony-linkbuds-s', title: 'Sony LinkBuds S Truly Wireless Earbuds', brandId: 'sony', categoryId: 'earbuds', price: 128, originalPrice: 199, rating: 4.2, reviewCount: 2765, unitsSold: 5200, dateAdded: '2026-06-25', stockStatus: 'in-stock', delivery: ['free', 'next-day'], availableToday: false, sponsored: false, color: 'white', emoji: EMOJI_BY_CATEGORY.earbuds },
  { id: 'p13', slug: 'bose-soundlink-flex', title: 'Bose SoundLink Flex Portable Speaker', brandId: 'bose', categoryId: 'speakers', price: 129, originalPrice: 149, rating: 4.6, reviewCount: 6120, unitsSold: 14000, dateAdded: '2026-05-30', stockStatus: 'in-stock', delivery: ['free'], availableToday: false, sponsored: false, color: 'blue', emoji: EMOJI_BY_CATEGORY.speakers },
  { id: 'p14', slug: 'jbl-charge-5', title: 'JBL Charge 5 Portable Bluetooth Speaker', brandId: 'jbl', categoryId: 'speakers', price: 149, originalPrice: 179, rating: 4.7, reviewCount: 21032, unitsSold: 38000, dateAdded: '2025-09-10', stockStatus: 'in-stock', delivery: ['free', 'next-day'], availableToday: false, sponsored: false, color: 'black', emoji: EMOJI_BY_CATEGORY.speakers },
  { id: 'p15', slug: 'galaxy-watch7', title: 'Samsung Galaxy Watch7', brandId: 'samsung', categoryId: 'wearables', price: 299, originalPrice: 329, rating: 4.5, reviewCount: 4520, unitsSold: 9000, dateAdded: '2026-08-05', stockStatus: 'in-stock', delivery: ['free', 'same-day'], availableToday: true, sponsored: false, color: 'graphite', emoji: EMOJI_BY_CATEGORY.wearables },
  { id: 'p16', slug: 'apple-watch-series-10', title: 'Apple Watch Series 10', brandId: 'apple', categoryId: 'wearables', price: 399, originalPrice: 429, rating: 4.7, reviewCount: 8823, unitsSold: 16000, dateAdded: '2026-09-01', stockStatus: 'in-stock', delivery: ['free', 'same-day'], availableToday: true, sponsored: true, color: 'midnight', emoji: EMOJI_BY_CATEGORY.wearables },
  { id: 'p17', slug: 'macbook-air-15-m3', title: 'Apple MacBook Air 15" M3', brandId: 'apple', categoryId: 'laptops', price: 1299, originalPrice: 1399, rating: 4.8, reviewCount: 5231, unitsSold: 6000, dateAdded: '2026-04-01', stockStatus: 'in-stock', delivery: ['free'], availableToday: false, sponsored: false, color: 'starlight', emoji: EMOJI_BY_CATEGORY.laptops, installments: { months: 12, amount: 108.25 } },
  { id: 'p18', slug: 'galaxy-book4-pro', title: 'Samsung Galaxy Book4 Pro', brandId: 'samsung', categoryId: 'laptops', price: 1449, originalPrice: 1599, rating: 4.3, reviewCount: 1289, unitsSold: 1800, dateAdded: '2026-03-20', stockStatus: 'in-stock', delivery: ['free'], availableToday: false, sponsored: false, color: 'silver', emoji: EMOJI_BY_CATEGORY.laptops, installments: { months: 12, amount: 120.75 } },
  { id: 'p19', slug: 'logitech-g-pro-x-2', title: 'Logitech G PRO X 2 Wireless Gaming Headset', brandId: 'logitech', categoryId: 'gaming', price: 149, originalPrice: 199, rating: 4.5, reviewCount: 3021, unitsSold: 5000, dateAdded: '2026-02-14', stockStatus: 'in-stock', delivery: ['free', 'next-day'], availableToday: false, sponsored: false, color: 'black', emoji: EMOJI_BY_CATEGORY.gaming },
  { id: 'p20', slug: 'razer-blackshark-v2-pro', title: 'Razer BlackShark V2 Pro Wireless Gaming Headset', brandId: 'razer', categoryId: 'gaming', price: 179, originalPrice: 199, rating: 4.6, reviewCount: 4521, unitsSold: 7000, dateAdded: '2026-01-22', stockStatus: 'in-stock', delivery: ['free'], availableToday: false, sponsored: true, color: 'black', emoji: EMOJI_BY_CATEGORY.gaming },
  { id: 'p21', slug: 'anker-powercore-20000', title: 'Anker PowerCore 20000 Portable Charger', brandId: 'anker', categoryId: 'accessories', price: 45, originalPrice: 59, rating: 4.6, reviewCount: 32891, unitsSold: 60000, dateAdded: '2025-08-01', stockStatus: 'in-stock', delivery: ['free', 'next-day'], availableToday: false, sponsored: false, color: 'black', emoji: EMOJI_BY_CATEGORY.accessories },
  { id: 'p22', slug: 'apple-magsafe-charger', title: 'Apple MagSafe Charger', brandId: 'apple', categoryId: 'accessories', price: 39, originalPrice: 45, rating: 4.3, reviewCount: 12032, unitsSold: 25000, dateAdded: '2026-06-12', stockStatus: 'in-stock', delivery: ['free', 'same-day'], availableToday: true, sponsored: false, color: 'white', emoji: EMOJI_BY_CATEGORY.accessories },
  { id: 'p23', slug: 'sony-wf1000xm5', title: 'Sony WF-1000XM5 Truly Wireless Earbuds', brandId: 'sony', categoryId: 'earbuds', price: 259, originalPrice: 299, rating: 4.6, reviewCount: 7654, unitsSold: 11000, dateAdded: '2026-07-08', stockStatus: 'low-stock', delivery: ['free'], availableToday: false, sponsored: false, color: 'black', emoji: EMOJI_BY_CATEGORY.earbuds },
  { id: 'p24', slug: 'jbl-quantum-910', title: 'JBL Quantum 910 Wireless Gaming Headset', brandId: 'jbl', categoryId: 'gaming', price: 199, originalPrice: 249, rating: 4.2, reviewCount: 1893, unitsSold: 2600, dateAdded: '2026-05-18', stockStatus: 'in-stock', delivery: ['free', 'next-day'], availableToday: false, sponsored: false, color: 'black', emoji: EMOJI_BY_CATEGORY.gaming },
]

const PRODUCT_BY_ID: Record<string, Product> = MOCK_PRODUCTS.reduce((acc, p) => {
  acc[p.id] = p
  return acc
}, {} as Record<string, Product>)

const CATEGORY_COUNTS: Record<string, number> = MOCK_PRODUCTS.reduce((acc, p) => {
  acc[p.categoryId] = (acc[p.categoryId] ?? 0) + 1
  return acc
}, {} as Record<string, number>)

const BRAND_COUNTS: Record<string, number> = MOCK_PRODUCTS.reduce((acc, p) => {
  acc[p.brandId] = (acc[p.brandId] ?? 0) + 1
  return acc
}, {} as Record<string, number>)

/* ========================================================================
   4. UTILITIES
   ======================================================================== */

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatPrice(amount: number): string {
  return currencyFormatter.format(amount)
}

function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}

function formatCompact(n: number): string {
  if (n < 1000) return String(n)
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function getDiscountPercentage(price: number, originalPrice: number): number {
  if (originalPrice <= price) return 0
  return Math.round(((originalPrice - price) / originalPrice) * 100)
}

function daysSince(dateIso: string): number {
  return (NOW - new Date(dateIso).getTime()) / 86_400_000
}

function getProductBadges(product: Product): ProductBadgeKind[] {
  if (product.stockStatus === 'out-of-stock') return ['out-of-stock']

  const candidates: ProductBadgeKind[] = []
  if (product.sponsored) candidates.push('sponsored')
  if (daysSince(product.dateAdded) <= NEW_WINDOW_DAYS) candidates.push('new')
  if (product.unitsSold >= 20000) candidates.push('best-seller')
  if (getDiscountPercentage(product.price, product.originalPrice) >= 20) candidates.push('discounted')
  if (product.stockStatus === 'low-stock') candidates.push('low-stock')

  return candidates.slice(0, 2)
}

function getBrandLabel(brandId: string): string {
  return BRANDS.find(b => b.id === brandId)?.label ?? brandId
}

function getCategoryLabel(categoryId: string): string {
  return CATEGORIES.find(c => c.id === categoryId)?.label ?? categoryId
}

function getRelatedSearches(query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return DEFAULT_RELATED_SEARCHES
  if (q.includes('headphone') || q.includes('earbud')) return HEADPHONE_RELATED_SEARCHES
  if (q.includes('watch') || q.includes('fitness')) return WATCH_RELATED_SEARCHES
  if (q.includes('laptop') || q.includes('macbook')) return LAPTOP_RELATED_SEARCHES
  return DEFAULT_RELATED_SEARCHES
}

function getSuggestions(query: string, recentSearches: string[]): SearchSuggestionGroups {
  const q = query.trim().toLowerCase()

  if (!q) {
    return {
      recent: recentSearches.slice(0, 4),
      trending: TRENDING_SEARCHES,
      suggested: [],
      categories: [],
      brands: [],
      products: [],
    }
  }

  return {
    recent: recentSearches.filter(s => s.toLowerCase().includes(q)).slice(0, 3),
    trending: [],
    suggested: SUGGESTED_QUERIES.filter(s => s.toLowerCase().includes(q)).slice(0, 5),
    categories: CATEGORIES.filter(c => c.label.toLowerCase().includes(q)).slice(0, 4),
    brands: BRANDS.filter(b => b.label.toLowerCase().includes(q)).slice(0, 4),
    products: MOCK_PRODUCTS.filter(
      p => p.title.toLowerCase().includes(q) || getBrandLabel(p.brandId).toLowerCase().includes(q)
    ).slice(0, 4),
  }
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim()
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold text-foreground">{text.slice(idx, idx + q.length)}</strong>
      {text.slice(idx + q.length)}
    </>
  )
}

function matchesAvailability(product: Product, option: AvailabilityOption): boolean {
  switch (option) {
    case 'in-stock': return product.stockStatus !== 'out-of-stock'
    case 'fast-delivery': return product.delivery.includes('next-day') || product.delivery.includes('same-day')
    case 'available-today': return product.availableToday
  }
}

function filterAndSortProducts(
  products: Product[],
  query: string,
  filters: FiltersState,
  sort: SortOption
): Product[] {
  const q = query.trim().toLowerCase()

  let result = products.filter((p) => {
    if (q) {
      const haystack = `${p.title} ${getBrandLabel(p.brandId)} ${getCategoryLabel(p.categoryId)}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }

    const cats = filters.selected.category
    if (cats.length > 0 && !cats.includes(p.categoryId)) return false

    const brands = filters.selected.brand
    if (brands.length > 0 && !brands.includes(p.brandId)) return false

    const colors = filters.selected.color
    if (colors.length > 0 && !colors.includes(p.color)) return false

    const availability = filters.selected.availability as AvailabilityOption[]
    if (availability.length > 0 && !availability.some(a => matchesAvailability(p, a))) return false

    const delivery = filters.selected.delivery as DeliveryOption[]
    if (delivery.length > 0 && !delivery.some(d => p.delivery.includes(d))) return false

    if (filters.price.min !== null && p.price < filters.price.min) return false
    if (filters.price.max !== null && p.price > filters.price.max) return false

    if (filters.minRating !== null && p.rating < filters.minRating) return false

    if (filters.minDiscount !== null) {
      const discount = getDiscountPercentage(p.price, p.originalPrice)
      if (discount < filters.minDiscount) return false
    }

    return true
  })

  result = [...result].sort((a, b) => {
    switch (sort) {
      case SortOption.PriceLowToHigh: return a.price - b.price
      case SortOption.PriceHighToLow: return b.price - a.price
      case SortOption.CustomerRating: return b.rating - a.rating
      case SortOption.Newest: return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
      case SortOption.Popularity: return b.reviewCount - a.reviewCount
      case SortOption.BestSelling: return b.unitsSold - a.unitsSold
      case SortOption.BiggestDiscount:
        return getDiscountPercentage(b.price, b.originalPrice) - getDiscountPercentage(a.price, a.originalPrice)
      case SortOption.Relevance:
      default:
        return b.unitsSold * b.rating - a.unitsSold * a.rating
    }
  })

  return result
}

/* ========================================================================
   5. REDUX -- SLICES
   ======================================================================== */

interface SearchSliceState {
  query: string
  recentSearches: string[]
}

const searchSlice = createSlice({
  name: 'search',
  initialState: { query: '', recentSearches: INITIAL_RECENT_SEARCHES } satisfies SearchSliceState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload
    },
    submitSearch(state, action: PayloadAction<string>) {
      const term = action.payload.trim()
      if (!term) return
      state.query = term
      state.recentSearches = [term, ...state.recentSearches.filter(s => s !== term)].slice(0, RECENT_SEARCHES_CAP)
    },
    removeFromHistory(state, action: PayloadAction<string>) {
      state.recentSearches = state.recentSearches.filter(s => s !== action.payload)
    },
    clearSearchHistory(state) {
      state.recentSearches = []
    },
  },
})

const EMPTY_FILTERS: FiltersState = {
  selected: { category: [], brand: [], availability: [], delivery: [], color: [] },
  price: { min: null, max: null },
  minRating: null,
  minDiscount: null,
}

const filtersSlice = createSlice({
  name: 'filters',
  initialState: EMPTY_FILTERS,
  reducers: {
    toggleFilter(state, action: PayloadAction<{ group: FilterGroupId; value: string }>) {
      const { group, value } = action.payload
      const current = state.selected[group]
      state.selected[group] = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
    },
    removeFilter(state, action: PayloadAction<{ group: FilterGroupId; value: string }>) {
      const { group, value } = action.payload
      state.selected[group] = state.selected[group].filter(v => v !== value)
    },
    setPriceRange(state, action: PayloadAction<PriceRange>) {
      state.price = action.payload
    },
    clearPriceRange(state) {
      state.price = { min: null, max: null }
    },
    setMinRating(state, action: PayloadAction<number | null>) {
      state.minRating = action.payload
    },
    setMinDiscount(state, action: PayloadAction<number | null>) {
      state.minDiscount = action.payload
    },
    clearFilters() {
      return EMPTY_FILTERS
    },
  },
})

const sortSlice = createSlice({
  name: 'sort',
  initialState: { option: SortOption.Relevance },
  reducers: {
    setSort(state, action: PayloadAction<SortOption>) {
      state.option = action.payload
    },
  },
})

const viewSlice = createSlice({
  name: 'view',
  initialState: { mode: ViewMode.Grid },
  reducers: {
    setViewMode(state, action: PayloadAction<ViewMode>) {
      state.mode = action.payload
    },
  },
})

const uiSlice = createSlice({
  name: 'ui',
  initialState: { isFilterDrawerOpen: false, status: 'idle' as FetchStatus },
  reducers: {
    toggleFilterDrawer(state) {
      state.isFilterDrawerOpen = !state.isFilterDrawerOpen
    },
    closeFilterDrawer(state) {
      state.isFilterDrawerOpen = false
    },
    setStatus(state, action: PayloadAction<FetchStatus>) {
      state.status = action.payload
    },
  },
})

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { ids: ['p3', 'p16'] as string[] },
  reducers: {
    toggleWishlist(state, action: PayloadAction<string>) {
      state.ids = state.ids.includes(action.payload)
        ? state.ids.filter(id => id !== action.payload)
        : [...state.ids, action.payload]
    },
  },
})

const cartSlice = createSlice({
  name: 'cart',
  initialState: { lines: [] as CartLine[] },
  reducers: {
    addToCart(state, action: PayloadAction<string>) {
      const existing = state.lines.find(l => l.productId === action.payload)
      if (existing) existing.quantity += 1
      else state.lines.push({ productId: action.payload, quantity: 1 })
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.lines = state.lines.filter(l => l.productId !== action.payload)
    },
  },
})

const store = configureStore({
  reducer: {
    search: searchSlice.reducer,
    filters: filtersSlice.reducer,
    sort: sortSlice.reducer,
    view: viewSlice.reducer,
    ui: uiSlice.reducer,
    wishlist: wishlistSlice.reducer,
    cart: cartSlice.reducer,
  },
})

type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch

const useAppDispatch = () => useDispatch<AppDispatch>()
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

const searchActions = searchSlice.actions
const filtersActions = filtersSlice.actions
const sortActions = sortSlice.actions
const viewActions = viewSlice.actions
const uiActions = uiSlice.actions
const wishlistActions = wishlistSlice.actions
const cartActions = cartSlice.actions

/* ========================================================================
   6. REDUX -- SELECTORS
   ======================================================================== */

const selectCartLines = (s: RootState) => s.cart.lines
const selectCartCount = createSelector(selectCartLines, lines => lines.reduce((sum, l) => sum + l.quantity, 0))

const selectWishlistIds = (s: RootState) => s.wishlist.ids
const selectWishlistCount = createSelector(selectWishlistIds, ids => ids.length)
const selectIsWishlisted = (id: string) => (s: RootState) => s.wishlist.ids.includes(id)

const selectActiveFilterCount = createSelector(
  (s: RootState) => s.filters,
  (filters) => {
    const groupCount = Object.values(filters.selected).reduce((sum, arr) => sum + arr.length, 0)
    const priceCount = filters.price.min !== null || filters.price.max !== null ? 1 : 0
    const ratingCount = filters.minRating !== null ? 1 : 0
    const discountCount = filters.minDiscount !== null ? 1 : 0
    return groupCount + priceCount + ratingCount + discountCount
  }
)

/* ========================================================================
   7. PRIMITIVE / DOMAIN COMPONENTS
   ======================================================================== */

function Rating({ value, count, size = 'sm' }: { value: number; count?: number; size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`Rated ${value} out of 5 stars${count ? `, ${count} reviews` : ''}`}
    >
      <Star className={cx(iconSize, 'text-rating fill-rating')} aria-hidden="true" />
      <span className={cx('font-medium text-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-muted-foreground">({formatCompact(count)})</span>}
    </div>
  )
}

function BadgePill({ kind }: { kind: ProductBadgeKind }) {
  const config: Record<ProductBadgeKind, { label: string; className: string }> = {
    new: { label: 'New', className: 'bg-badge-new text-badge-new-foreground' },
    'best-seller': { label: 'Best Seller', className: 'bg-badge-bestseller text-badge-bestseller-foreground' },
    discounted: { label: 'Sale', className: 'bg-sale-bg text-sale-foreground' },
    'low-stock': { label: 'Low Stock', className: 'bg-badge-lowstock text-badge-lowstock-foreground' },
    'out-of-stock': { label: 'Out of Stock', className: 'bg-muted text-muted-foreground' },
    sponsored: { label: 'Sponsored', className: 'bg-badge-sponsored text-badge-sponsored-foreground' },
  }
  const { label, className } = config[kind]
  return (
    <span className={cx('inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', className)}>
      {label}
    </span>
  )
}

function PriceBlock({ product, size = 'md' }: { product: Product; size?: 'sm' | 'md' }) {
  const discount = getDiscountPercentage(product.price, product.originalPrice)
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className={cx('font-bold text-price', size === 'sm' ? 'text-sm' : 'text-base')}>
          {formatPrice(product.price)}
        </span>
        {discount > 0 && (
          <>
            <span className="text-xs text-price-original line-through">{formatPrice(product.originalPrice)}</span>
            <span className="text-xs font-semibold text-discount">-{discount}%</span>
          </>
        )}
      </div>
      {product.installments && (
        <span className="text-[11px] text-muted-foreground">
          or {formatPrice(product.installments.amount)}/mo for {product.installments.months} mo
        </span>
      )}
    </div>
  )
}

function ProductImage({ emoji, className }: { emoji: string; className?: string }) {
  const [failed, setFailed] = React.useState(false)
  const display = failed || !emoji ? '\u{1F4E6}' : emoji
  return (
    <div
      className={cx('flex items-center justify-center bg-muted text-4xl select-none', className)}
      role="img"
      aria-label="Product image"
      onError={() => setFailed(true)}
    >
      {display}
    </div>
  )
}

/* ========================================================================
   8. SEARCH COMPONENTS
   ======================================================================== */

interface FlatSuggestionItem {
  kind: 'recent' | 'trending' | 'suggested' | 'category' | 'brand' | 'product'
  value: string
  id: string
}

interface SearchSuggestionsDropdownProps {
  query: string
  groups: SearchSuggestionGroups
  activeIndex: number
  flatItems: FlatSuggestionItem[]
  onSelect: (value: string) => void
  onRemoveRecent: (value: string) => void
  onClearRecent: () => void
  id: string
}

function SearchSuggestionsDropdown({
  query,
  groups,
  activeIndex,
  flatItems,
  onSelect,
  onRemoveRecent,
  onClearRecent,
  id,
}: SearchSuggestionsDropdownProps) {
  const hasAnyContent =
    groups.recent.length > 0 || groups.trending.length > 0 || groups.suggested.length > 0 ||
    groups.categories.length > 0 || groups.brands.length > 0 || groups.products.length > 0

  const indexOf = (kind: string, value: string) => flatItems.findIndex(f => f.kind === kind && f.value === value)

  return (
    <div
      id={id}
      role="listbox"
      aria-label="Search suggestions"
      className="themed-scrollbar absolute left-0 right-0 top-full z-[var(--z-dropdown)] mt-2 max-h-[28rem] overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-popover animate-fade-in-up"
    >
      {!hasAnyContent && (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No matches yet -- keep typing.</p>
      )}

      {groups.recent.length > 0 && (
        <div className="border-b border-border py-2">
          <div className="flex items-center justify-between px-4 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Searches</span>
            <button type="button" onClick={onClearRecent} className="text-xs font-medium text-primary hover:underline focus-visible:outline-none">
              Clear
            </button>
          </div>
          {groups.recent.map((term) => {
            const flatIdx = indexOf('recent', term)
            return (
              <div
                key={term}
                id={`${id}-opt-${flatIdx}`}
                role="option"
                aria-selected={activeIndex === flatIdx}
                className={cx(
                  'group flex cursor-pointer items-center justify-between gap-2 px-4 py-2 text-sm',
                  activeIndex === flatIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                )}
                onMouseDown={(e) => { e.preventDefault(); onSelect(term) }}
              >
                <span className="flex items-center gap-2 truncate">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {highlightMatch(term, query)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove "${term}" from recent searches`}
                  className="shrink-0 rounded p-0.5 opacity-0 hover:bg-secondary group-hover:opacity-100 focus-visible:opacity-100"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveRecent(term) }}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {groups.trending.length > 0 && (
        <div className="border-b border-border py-2 last:border-b-0">
          <div className="px-4 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trending</span>
          </div>
          {groups.trending.map((term) => {
            const flatIdx = indexOf('trending', term)
            return (
              <div
                key={term}
                id={`${id}-opt-${flatIdx}`}
                role="option"
                aria-selected={activeIndex === flatIdx}
                className={cx(
                  'flex cursor-pointer items-center gap-2 px-4 py-2 text-sm',
                  activeIndex === flatIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                )}
                onMouseDown={(e) => { e.preventDefault(); onSelect(term) }}
              >
                <Flame className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                {term}
              </div>
            )
          })}
        </div>
      )}

      {groups.suggested.length > 0 && (
        <div className="border-b border-border py-2 last:border-b-0">
          <div className="px-4 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested</span>
          </div>
          {groups.suggested.map((term) => {
            const flatIdx = indexOf('suggested', term)
            return (
              <div
                key={term}
                id={`${id}-opt-${flatIdx}`}
                role="option"
                aria-selected={activeIndex === flatIdx}
                className={cx(
                  'flex cursor-pointer items-center gap-2 px-4 py-2 text-sm',
                  activeIndex === flatIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                )}
                onMouseDown={(e) => { e.preventDefault(); onSelect(term) }}
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                {highlightMatch(term, query)}
              </div>
            )
          })}
        </div>
      )}

      {groups.categories.length > 0 && (
        <div className="border-b border-border py-2 last:border-b-0">
          <div className="px-4 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categories</span>
          </div>
          {groups.categories.map((cat) => {
            const flatIdx = indexOf('category', cat.label)
            return (
              <div
                key={cat.id}
                id={`${id}-opt-${flatIdx}`}
                role="option"
                aria-selected={activeIndex === flatIdx}
                className={cx(
                  'flex cursor-pointer items-center justify-between px-4 py-2 text-sm',
                  activeIndex === flatIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                )}
                onMouseDown={(e) => { e.preventDefault(); onSelect(cat.label) }}
              >
                <span>{highlightMatch(cat.label, query)} <span className="text-muted-foreground">in Categories</span></span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </div>
            )
          })}
        </div>
      )}

      {groups.brands.length > 0 && (
        <div className="border-b border-border py-2 last:border-b-0">
          <div className="px-4 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brands</span>
          </div>
          {groups.brands.map((brand) => {
            const flatIdx = indexOf('brand', brand.label)
            return (
              <div
                key={brand.id}
                id={`${id}-opt-${flatIdx}`}
                role="option"
                aria-selected={activeIndex === flatIdx}
                className={cx(
                  'flex cursor-pointer items-center px-4 py-2 text-sm',
                  activeIndex === flatIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                )}
                onMouseDown={(e) => { e.preventDefault(); onSelect(brand.label) }}
              >
                {highlightMatch(brand.label, query)}
              </div>
            )
          })}
        </div>
      )}

      {groups.products.length > 0 && (
        <div className="py-2">
          <div className="px-4 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Products</span>
          </div>
          {groups.products.map((product) => {
            const flatIdx = indexOf('product', product.title)
            return (
              <div
                key={product.id}
                id={`${id}-opt-${flatIdx}`}
                role="option"
                aria-selected={activeIndex === flatIdx}
                className={cx(
                  'flex cursor-pointer items-center gap-3 px-4 py-2 text-sm',
                  activeIndex === flatIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                )}
                onMouseDown={(e) => { e.preventDefault(); onSelect(product.title) }}
              >
                <span className="text-lg" aria-hidden="true">{product.emoji}</span>
                <span className="min-w-0 flex-1 truncate">{highlightMatch(product.title, query)}</span>
                <span className="shrink-0 text-xs font-semibold text-price">{formatPrice(product.price)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SearchHeader() {
  const dispatch = useAppDispatch()
  const query = useAppSelector(s => s.search.query)
  const recentSearches = useAppSelector(s => s.search.recentSearches)
  const cartCount = useAppSelector(selectCartCount)
  const wishlistCount = useAppSelector(selectWishlistCount)
  const [isDark, setIsDark] = React.useState(false)

  const [localQuery, setLocalQuery] = React.useState(query)
  const [isFocused, setIsFocused] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const listboxId = 'search-suggestions-listbox'

  React.useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(prefersDark)
    document.documentElement.classList.toggle('dark', prefersDark)
  }, [])

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  }

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const suggestionGroups = React.useMemo(
    () => getSuggestions(localQuery, recentSearches),
    [localQuery, recentSearches]
  )

  const flatItems = React.useMemo(() => {
    const items: FlatSuggestionItem[] = []
    suggestionGroups.recent.forEach(v => items.push({ kind: 'recent', value: v, id: v }))
    suggestionGroups.trending.forEach(v => items.push({ kind: 'trending', value: v, id: v }))
    suggestionGroups.suggested.forEach(v => items.push({ kind: 'suggested', value: v, id: v }))
    suggestionGroups.categories.forEach(c => items.push({ kind: 'category', value: c.label, id: c.id }))
    suggestionGroups.brands.forEach(b => items.push({ kind: 'brand', value: b.label, id: b.id }))
    suggestionGroups.products.forEach(p => items.push({ kind: 'product', value: p.title, id: p.id }))
    return items
  }, [suggestionGroups])

  const commitSearch = (term: string) => {
    dispatch(searchActions.submitSearch(term))
    setLocalQuery(term)
    setIsFocused(false)
    setActiveIndex(-1)
    inputRef.current?.blur()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    commitSearch(localQuery)
  }

  const handleClear = () => {
    setLocalQuery('')
    dispatch(searchActions.setQuery(''))
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFocused || flatItems.length === 0) {
      if (e.key === 'Escape') inputRef.current?.blur()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % flatItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i <= 0 ? flatItems.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && flatItems[activeIndex]) {
        e.preventDefault()
        commitSearch(flatItems[activeIndex].value)
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <a href="#" className="shrink-0 text-lg font-bold tracking-tight text-foreground" aria-label="Shopfront home">
          <span className="text-primary">Shop</span>front
        </a>

        <div ref={containerRef} className="relative min-w-0 flex-1">
          <form role="search" onSubmit={handleSubmit}>
            <label htmlFor="global-search-input" className="sr-only">Search products, brands and categories</label>
            <div
              className={cx(
                'flex items-center gap-2 rounded-lg border bg-secondary px-3 transition-colors',
                isFocused ? 'border-ring ring-2 ring-ring' : 'border-transparent'
              )}
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                ref={inputRef}
                id="global-search-input"
                type="text"
                role="combobox"
                aria-expanded={isFocused}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
                value={localQuery}
                onChange={(e) => { setLocalQuery(e.target.value); setActiveIndex(-1) }}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search products, brands and categories..."
                autoComplete="off"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {localQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear search"
                  className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                aria-label="Search by voice"
                className="hidden shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none sm:block"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>

          {isFocused && (
            <SearchSuggestionsDropdown
              id={listboxId}
              query={localQuery}
              groups={suggestionGroups}
              activeIndex={activeIndex}
              flatItems={flatItems}
              onSelect={commitSearch}
              onRemoveRecent={(term) => dispatch(searchActions.removeFromHistory(term))}
              onClearRecent={() => dispatch(searchActions.clearSearchHistory())}
            />
          )}
        </div>

        <nav aria-label="Account actions" className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none"
          >
            {isDark ? <Sun className="h-[18px] w-[18px]" aria-hidden="true" /> : <Moon className="h-[18px] w-[18px]" aria-hidden="true" />}
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="relative hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none sm:flex"
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Account"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none sm:flex"
          >
            <User className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Wishlist, ${wishlistCount} items`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none"
          >
            <Heart className="h-[18px] w-[18px]" aria-hidden="true" />
            {wishlistCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {wishlistCount}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label={`Cart, ${cartCount} items`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none"
          >
            <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  )
}

function SearchBreadcrumb({ query }: { query: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8">
      <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <li><a href="#" className="hover:text-foreground focus-visible:outline-none">Home</a></li>
        <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
        <li><a href="#" className="hover:text-foreground focus-visible:outline-none">Search</a></li>
        {query && (
          <>
            <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
            <li aria-current="page" className="max-w-[16rem] truncate font-medium text-foreground">&ldquo;{query}&rdquo;</li>
          </>
        )}
      </ol>
    </nav>
  )
}

function SearchSummary({ query, resultCount, elapsedMs }: { query: string; resultCount: number; elapsedMs: number }) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8">
      <h1 className="text-xl font-bold text-foreground sm:text-2xl">
        {query ? <>Search results for &ldquo;{query}&rdquo;</> : 'All Products'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatCount(resultCount)} {resultCount === 1 ? 'result' : 'results'}
        <span className="mx-1.5">&middot;</span>
        found in {(elapsedMs / 1000).toFixed(2)}s
      </p>
    </div>
  )
}

/* ========================================================================
   9. DISCOVERY COMPONENTS
   ======================================================================== */

function TrendingSearches({ onSelect }: { onSelect: (term: string) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> Trending
      </span>
      <div className="flex flex-wrap gap-2">
        {TRENDING_SEARCHES.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onSelect(term)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary focus-visible:outline-none"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  )
}

function PopularBrands({ onSelect }: { onSelect: (label: string) => void }) {
  const featured = BRANDS.slice(0, 6)
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Popular Brands</span>
      <div className="flex flex-wrap gap-2">
        {featured.map((brand) => (
          <button
            key={brand.id}
            type="button"
            onClick={() => onSelect(brand.label)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline-none"
          >
            {brand.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function RelatedSearches({ query, onSelect }: { query: string; onSelect: (term: string) => void }) {
  const related = getRelatedSearches(query)
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related Searches</span>
      <div className="flex flex-wrap gap-2">
        {related.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onSelect(term)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary focus-visible:outline-none"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  )
}

function SuggestedCategories({ onSelect }: { onSelect: (categoryId: string) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested Categories</span>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary focus-visible:outline-none"
          >
            <span aria-hidden="true">{EMOJI_BY_CATEGORY[cat.id]}</span>
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SearchDiscovery({
  query,
  onSelectTerm,
  onSelectCategory,
}: {
  query: string
  onSelectTerm: (term: string) => void
  onSelectCategory: (categoryId: string) => void
}) {
  return (
    <section aria-label="Search discovery" className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-5 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <TrendingSearches onSelect={onSelectTerm} />
        <RelatedSearches query={query} onSelect={onSelectTerm} />
        <SuggestedCategories onSelect={onSelectCategory} />
        <PopularBrands onSelect={onSelectTerm} />
      </div>
    </section>
  )
}

/* ========================================================================
   10. TOOLBAR COMPONENTS
   ======================================================================== */

function FilterButton({ activeCount, onClick }: { activeCount: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary focus-visible:outline-none lg:hidden"
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      Filters
      {activeCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
          {activeCount}
        </span>
      )}
    </button>
  )
}

function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div role="group" aria-label="View mode" className="hidden items-center rounded-lg border border-border bg-card p-0.5 sm:flex">
      <button
        type="button"
        aria-label="Grid view"
        aria-pressed={mode === ViewMode.Grid}
        onClick={() => onChange(ViewMode.Grid)}
        className={cx(
          'flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none',
          mode === ViewMode.Grid ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
        )}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={mode === ViewMode.List}
        onClick={() => onChange(ViewMode.List)}
        className={cx(
          'flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none',
          mode === ViewMode.List ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
        )}
      >
        <ListIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

function SortSelect({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const activeLabel = SORT_OPTIONS.find(o => o.value === value)?.label ?? 'Relevance'

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary focus-visible:outline-none"
      >
        <span className="hidden text-muted-foreground sm:inline">Sort:</span>
        {activeLabel}
        <ChevronDown className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Sort by"
          className="absolute right-0 top-11 z-[var(--z-dropdown)] w-56 rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-popover"
        >
          {SORT_OPTIONS.map((opt) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none"
              >
                {opt.label}
                {opt.value === value && <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface ActiveFilterChip {
  group: FilterGroupId | 'price' | 'rating' | 'discount'
  value: string
  label: string
}

function ActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
}: {
  chips: ActiveFilterChip[]
  onRemove: (chip: ActiveFilterChip) => void
  onClearAll: () => void
}) {
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={`${chip.group}-${chip.value}`}
          type="button"
          role="listitem"
          onClick={() => onRemove(chip)}
          className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:opacity-80 focus-visible:outline-none"
        >
          {chip.label}
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      ))}
      <button type="button" onClick={onClearAll} className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none">
        Clear all
      </button>
    </div>
  )
}

function SearchToolbar({
  activeFilterCount,
  onOpenFilters,
  viewMode,
  onViewModeChange,
  sort,
  onSortChange,
  chips,
  onRemoveChip,
  onClearAll,
}: {
  activeFilterCount: number
  onOpenFilters: () => void
  viewMode: ViewMode
  onViewModeChange: (m: ViewMode) => void
  sort: SortOption
  onSortChange: (s: SortOption) => void
  chips: ActiveFilterChip[]
  onRemoveChip: (chip: ActiveFilterChip) => void
  onClearAll: () => void
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FilterButton activeCount={activeFilterCount} onClick={onOpenFilters} />
          <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
        </div>
        <SortSelect value={sort} onChange={onSortChange} />
      </div>
      <ActiveFilterChips chips={chips} onRemove={onRemoveChip} onClearAll={onClearAll} />
    </div>
  )
}

/* ========================================================================
   11. FILTER COMPONENTS
   ======================================================================== */

function FilterGroupSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen)
  const contentId = React.useId()
  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between text-sm font-semibold text-foreground focus-visible:outline-none"
      >
        {title}
        <ChevronDown className={cx('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && <div id={contentId} className="mt-3">{children}</div>}
    </div>
  )
}

function CategoryFilter({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <FilterGroupSection title="Category">
      <fieldset className="space-y-2">
        <legend className="sr-only">Filter by category</legend>
        {CATEGORIES.map((cat) => (
          <label key={cat.id} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(cat.id)}
                onChange={() => onToggle(cat.id)}
                className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-foreground">{cat.label}</span>
            </span>
            <span className="text-xs text-muted-foreground">{CATEGORY_COUNTS[cat.id] ?? 0}</span>
          </label>
        ))}
      </fieldset>
    </FilterGroupSection>
  )
}

function BrandFilter({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const [search, setSearch] = React.useState('')
  const filtered = React.useMemo(
    () => BRANDS.filter(b => b.label.toLowerCase().includes(search.trim().toLowerCase())),
    [search]
  )

  return (
    <FilterGroupSection title="Brand">
      <label className="sr-only" htmlFor="brand-filter-search">Search brands</label>
      <input
        id="brand-filter-search"
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search brands..."
        className="mb-3 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <fieldset className="themed-scrollbar max-h-48 space-y-2 overflow-y-auto pr-1">
        <legend className="sr-only">Filter by brand</legend>
        {filtered.map((brand) => (
          <label key={brand.id} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(brand.id)}
                onChange={() => onToggle(brand.id)}
                className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-foreground">{brand.label}</span>
            </span>
            <span className="text-xs text-muted-foreground">{BRAND_COUNTS[brand.id] ?? 0}</span>
          </label>
        ))}
        {filtered.length === 0 && <p className="text-xs text-muted-foreground">No brands match &ldquo;{search}&rdquo;</p>}
      </fieldset>
    </FilterGroupSection>
  )
}

function PriceFilter({ price, onChange }: { price: PriceRange; onChange: (range: PriceRange) => void }) {
  const [minInput, setMinInput] = React.useState(price.min !== null ? String(price.min) : '')
  const [maxInput, setMaxInput] = React.useState(price.max !== null ? String(price.max) : '')

  React.useEffect(() => {
    setMinInput(price.min !== null ? String(price.min) : '')
    setMaxInput(price.max !== null ? String(price.max) : '')
  }, [price.min, price.max])

  const applyCustomRange = () => {
    onChange({
      min: minInput.trim() ? Number(minInput) : null,
      max: maxInput.trim() ? Number(maxInput) : null,
    })
  }

  const isRangeSelected = (min: number | null, max: number | null) => price.min === min && price.max === max

  return (
    <FilterGroupSection title="Price">
      <fieldset className="space-y-2">
        <legend className="sr-only">Filter by price range</legend>
        {PRICE_RANGES.map((range) => (
          <label key={range.label} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="price-range"
              checked={isRangeSelected(range.min, range.max)}
              onChange={() => onChange({ min: range.min, max: range.max })}
              className="h-4 w-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-foreground">{range.label}</span>
          </label>
        ))}
      </fieldset>
      <div className="mt-3 flex items-center gap-2">
        <label className="sr-only" htmlFor="price-min">Minimum price</label>
        <input
          id="price-min"
          type="number"
          min={0}
          placeholder="Min"
          value={minInput}
          onChange={(e) => setMinInput(e.target.value)}
          onBlur={applyCustomRange}
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-muted-foreground" aria-hidden="true">-</span>
        <label className="sr-only" htmlFor="price-max">Maximum price</label>
        <input
          id="price-max"
          type="number"
          min={0}
          placeholder="Max"
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          onBlur={applyCustomRange}
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </FilterGroupSection>
  )
}

function RatingFilter({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <FilterGroupSection title="Customer Rating">
      <fieldset className="space-y-2">
        <legend className="sr-only">Filter by minimum rating</legend>
        {RATING_OPTIONS.map((stars) => (
          <label key={stars} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="min-rating"
              checked={value === stars}
              onChange={() => onChange(value === stars ? null : stars)}
              className="h-4 w-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="flex items-center gap-1 text-foreground">
              {stars}
              <Star className="h-3.5 w-3.5 fill-rating text-rating" aria-hidden="true" />
              &amp; above
            </span>
          </label>
        ))}
      </fieldset>
    </FilterGroupSection>
  )
}

function AvailabilityFilter({ selected, onToggle }: { selected: string[]; onToggle: (v: AvailabilityOption) => void }) {
  return (
    <FilterGroupSection title="Availability">
      <fieldset className="space-y-2">
        <legend className="sr-only">Filter by availability</legend>
        {(Object.keys(AVAILABILITY_LABELS) as AvailabilityOption[]).map((key) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(key)}
              onChange={() => onToggle(key)}
              className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-foreground">{AVAILABILITY_LABELS[key]}</span>
          </label>
        ))}
      </fieldset>
    </FilterGroupSection>
  )
}

function DiscountFilter({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <FilterGroupSection title="Discount">
      <div className="flex flex-wrap gap-2">
        {DISCOUNT_OPTIONS.map((pct) => (
          <button
            key={pct}
            type="button"
            aria-pressed={value === pct}
            onClick={() => onChange(value === pct ? null : pct)}
            className={cx(
              'rounded-full border px-3 py-1.5 text-xs font-semibold focus-visible:outline-none',
              value === pct
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-primary'
            )}
          >
            {pct}%+
          </button>
        ))}
      </div>
    </FilterGroupSection>
  )
}

function DeliveryFilter({ selected, onToggle }: { selected: string[]; onToggle: (v: DeliveryOption) => void }) {
  return (
    <FilterGroupSection title="Delivery">
      <fieldset className="space-y-2">
        <legend className="sr-only">Filter by delivery option</legend>
        {(Object.keys(DELIVERY_LABELS) as DeliveryOption[]).map((key) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(key)}
              onChange={() => onToggle(key)}
              className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-foreground">{DELIVERY_LABELS[key]}</span>
          </label>
        ))}
      </fieldset>
    </FilterGroupSection>
  )
}

function AttributeFilters({ selected, onToggle }: { selected: string[]; onToggle: (v: string) => void }) {
  return (
    <FilterGroupSection title="Color" defaultOpen={false}>
      <div className="flex flex-wrap gap-2">
        {COLOR_OPTIONS.map((color) => (
          <button
            key={color}
            type="button"
            aria-pressed={selected.includes(color)}
            onClick={() => onToggle(color)}
            className={cx(
              'rounded-full border px-3 py-1.5 text-xs font-medium capitalize focus-visible:outline-none',
              selected.includes(color)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-primary'
            )}
          >
            {color}
          </button>
        ))}
      </div>
    </FilterGroupSection>
  )
}

interface FilterSidebarProps {
  filters: FiltersState
  onToggleGroup: (group: FilterGroupId, value: string) => void
  onPriceChange: (range: PriceRange) => void
  onRatingChange: (v: number | null) => void
  onDiscountChange: (v: number | null) => void
  onClearAll: () => void
  activeCount: number
}

function FilterSidebar({ filters, onToggleGroup, onPriceChange, onRatingChange, onDiscountChange, onClearAll, activeCount }: FilterSidebarProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Filters</h2>
        {activeCount > 0 && (
          <button type="button" onClick={onClearAll} className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none">
            Clear all ({activeCount})
          </button>
        )}
      </div>
      <CategoryFilter selected={filters.selected.category} onToggle={(v) => onToggleGroup('category', v)} />
      <BrandFilter selected={filters.selected.brand} onToggle={(v) => onToggleGroup('brand', v)} />
      <PriceFilter price={filters.price} onChange={onPriceChange} />
      <RatingFilter value={filters.minRating} onChange={onRatingChange} />
      <AvailabilityFilter selected={filters.selected.availability} onToggle={(v) => onToggleGroup('availability', v)} />
      <DiscountFilter value={filters.minDiscount} onChange={onDiscountChange} />
      <DeliveryFilter selected={filters.selected.delivery} onToggle={(v) => onToggleGroup('delivery', v)} />
      <AttributeFilters selected={filters.selected.color} onToggle={(v) => onToggleGroup('color', v)} />
    </div>
  )
}

function FilterDrawer({
  open,
  onClose,
  resultCount,
  ...sidebarProps
}: FilterSidebarProps & { open: boolean; onClose: () => void; resultCount: number }) {
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[var(--z-drawer)] lg:hidden">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="themed-scrollbar absolute inset-y-0 left-0 flex w-[90%] max-w-sm flex-col overflow-y-auto bg-background p-4 shadow-popover"
      >
        <div className="mb-2 flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-base font-bold text-foreground">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <FilterSidebar {...sidebarProps} />
        <div className="sticky bottom-0 mt-4 border-t border-border bg-background pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none"
          >
            Show {formatCount(resultCount)} Results
          </button>
        </div>
      </div>
    </div>
  )
}

/* ========================================================================
   12. PRODUCT COMPONENTS
   ======================================================================== */

interface ProductCardProps {
  product: Product
  layout: ViewMode
  onQuickView: (id: string) => void
}

function ProductCard({ product, layout, onQuickView }: ProductCardProps) {
  const dispatch = useAppDispatch()
  const isWishlisted = useAppSelector(selectIsWishlisted(product.id))
  const [justAdded, setJustAdded] = React.useState(false)
  const badges = getProductBadges(product)
  const isOutOfStock = product.stockStatus === 'out-of-stock'

  const handleAddToCart = () => {
    if (isOutOfStock) return
    dispatch(cartActions.addToCart(product.id))
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 1400)
  }

  const handleWishlist = () => dispatch(wishlistActions.toggleWishlist(product.id))

  if (layout === ViewMode.List) {
    return (
      <article className="group flex gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
        <div className="relative shrink-0">
          <ProductImage emoji={product.emoji} className="h-28 w-28 rounded-lg" />
          {badges.length > 0 && (
            <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
              {badges.map(b => <BadgePill key={b} kind={b} />)}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{getBrandLabel(product.brandId)} &middot; {getCategoryLabel(product.categoryId)}</p>
            <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-foreground">{product.title}</h3>
            <div className="mt-1.5"><Rating value={product.rating} count={product.reviewCount} /></div>
            <p className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                {product.delivery.includes('free') ? 'Free delivery' : 'Standard delivery'}
              </span>
              {product.availableToday && (
                <span className="flex items-center gap-1 text-success">
                  <Zap className="h-3 w-3" aria-hidden="true" />Available today
                </span>
              )}
            </p>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <PriceBlock product={product} />
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleWishlist}
                aria-pressed={isWishlisted}
                aria-label={isWishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-destructive focus-visible:outline-none"
              >
                <Heart className="h-4 w-4" fill={isWishlisted ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onQuickView(product.id)}
                aria-label={`Quick view ${product.title}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={cx(
                  'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold focus-visible:outline-none',
                  isOutOfStock
                    ? 'cursor-not-allowed bg-muted text-muted-foreground'
                    : justAdded ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground hover:opacity-90'
                )}
              >
                <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                {isOutOfStock ? 'Sold Out' : justAdded ? 'Added' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group relative flex flex-col rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <div className="relative">
        <ProductImage emoji={product.emoji} className="aspect-square w-full rounded-t-xl" />
        {badges.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {badges.map(b => <BadgePill key={b} kind={b} />)}
          </div>
        )}
        <button
          type="button"
          onClick={handleWishlist}
          aria-pressed={isWishlisted}
          aria-label={isWishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-xs hover:text-destructive focus-visible:outline-none"
        >
          <Heart className="h-4 w-4" fill={isWishlisted ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onQuickView(product.id)}
          className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-lg bg-card/95 py-2 text-xs font-semibold text-foreground opacity-0 shadow-xs transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          Quick View
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="truncate text-xs text-muted-foreground">{getBrandLabel(product.brandId)}</p>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-foreground">{product.title}</h3>
        <Rating value={product.rating} count={product.reviewCount} />
        <PriceBlock product={product} size="sm" />
        {product.stockStatus === 'low-stock' && (
          <p className="text-[11px] font-medium text-badge-lowstock">Only a few left</p>
        )}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={cx(
            'mt-auto flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors focus-visible:outline-none',
            isOutOfStock
              ? 'cursor-not-allowed bg-muted text-muted-foreground'
              : justAdded ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground hover:opacity-90'
          )}
        >
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
          {isOutOfStock ? 'Sold Out' : justAdded ? 'Added to Cart' : 'Add to Cart'}
        </button>
      </div>
    </article>
  )
}

function ProductCardSkeleton({ layout }: { layout: ViewMode }) {
  if (layout === ViewMode.List) {
    return (
      <div className="flex gap-4 rounded-xl border border-border bg-card p-4" aria-hidden="true">
        <div className="h-28 w-28 shrink-0 animate-skeleton rounded-lg bg-muted" />
        <div className="flex flex-1 flex-col justify-between py-1">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-skeleton rounded bg-muted" />
            <div className="h-4 w-3/4 animate-skeleton rounded bg-muted" />
            <div className="h-3 w-32 animate-skeleton rounded bg-muted" />
          </div>
          <div className="h-8 w-28 animate-skeleton rounded-lg bg-muted" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card" aria-hidden="true">
      <div className="aspect-square w-full animate-skeleton rounded-t-xl bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-16 animate-skeleton rounded bg-muted" />
        <div className="h-4 w-full animate-skeleton rounded bg-muted" />
        <div className="h-3 w-20 animate-skeleton rounded bg-muted" />
        <div className="h-4 w-24 animate-skeleton rounded bg-muted" />
        <div className="h-8 w-full animate-skeleton rounded-lg bg-muted" />
      </div>
    </div>
  )
}

function ProductGrid({ products, onQuickView }: { products: Product[]; onQuickView: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => <ProductCard key={p.id} product={p} layout={ViewMode.Grid} onQuickView={onQuickView} />)}
    </div>
  )
}

function ProductList({ products, onQuickView }: { products: Product[]; onQuickView: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {products.map((p) => <ProductCard key={p.id} product={p} layout={ViewMode.List} onQuickView={onQuickView} />)}
    </div>
  )
}

function QuickViewModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const dispatch = useAppDispatch()
  const isWishlisted = useAppSelector(selectIsWishlisted(product.id))

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view: ${product.title}`}
        className="relative grid w-full max-w-2xl grid-cols-1 gap-6 rounded-xl border border-border bg-card p-6 shadow-popover sm:grid-cols-2"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <ProductImage emoji={product.emoji} className="aspect-square w-full rounded-lg text-6xl" />
        <div className="flex flex-col">
          <p className="text-xs text-muted-foreground">{getBrandLabel(product.brandId)} &middot; {getCategoryLabel(product.categoryId)}</p>
          <h2 className="mt-1 text-lg font-bold text-foreground">{product.title}</h2>
          <div className="mt-2"><Rating value={product.rating} count={product.reviewCount} size="md" /></div>
          <div className="mt-3"><PriceBlock product={product} /></div>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Truck className="h-4 w-4" aria-hidden="true" />
            {product.delivery.map(d => DELIVERY_LABELS[d]).join(' \u00b7 ')}
          </p>
          <div className="mt-auto flex gap-2 pt-6">
            <button
              type="button"
              onClick={() => dispatch(wishlistActions.toggleWishlist(product.id))}
              aria-pressed={isWishlisted}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive focus-visible:outline-none"
            >
              <Heart className="h-5 w-5" fill={isWishlisted ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={product.stockStatus === 'out-of-stock'}
              onClick={() => { dispatch(cartActions.addToCart(product.id)); onClose() }}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground focus-visible:outline-none"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              {product.stockStatus === 'out-of-stock' ? 'Sold Out' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ========================================================================
   13. RESULT-STATE COMPONENTS
   ======================================================================== */

function SearchResultsSkeletonGrid({ layout }: { layout: ViewMode }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading search results"
      className={layout === ViewMode.Grid ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4' : 'flex flex-col gap-3'}
    >
      {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} layout={layout} />)}
    </div>
  )
}

function EmptyResults({
  query,
  onSelectTerm,
  onSelectCategory,
}: {
  query: string
  onSelectTerm: (t: string) => void
  onSelectCategory: (id: string) => void
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Search className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">No results for &ldquo;{query}&rdquo;</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>Check your spelling</li>
          <li>Try using fewer keywords</li>
          <li>Browse a category instead</li>
          <li>Try a related search below</li>
        </ul>
      </div>
      <div className="w-full max-w-md">
        <RelatedSearches query={query} onSelect={onSelectTerm} />
      </div>
      <div className="w-full max-w-md">
        <SuggestedCategories onSelect={onSelectCategory} />
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">We couldn&apos;t load your results.</p>
        <p className="mt-1 text-sm text-muted-foreground">Please try again.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Retry
      </button>
    </div>
  )
}

function SearchPagination({
  visibleCount,
  totalCount,
  onLoadMore,
}: {
  visibleCount: number
  totalCount: number
  onLoadMore: () => void
}) {
  const hasMore = visibleCount < totalCount
  return (
    <div className="flex flex-col items-center gap-2 py-8">
      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          className="rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline-none"
        >
          Load More Products
        </button>
      ) : (
        totalCount > 0 && <p className="text-xs text-muted-foreground">You&apos;ve reached the end of the results</p>
      )}
      <p className="text-xs text-muted-foreground">
        Showing {formatCount(Math.min(visibleCount, totalCount))} of {formatCount(totalCount)}
      </p>
    </div>
  )
}

function SearchRecommendations({ excludeIds, onQuickView }: { excludeIds: Set<string>; onQuickView: (id: string) => void }) {
  const recommendations = React.useMemo(
    () => MOCK_PRODUCTS.filter(p => !excludeIds.has(p.id)).sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 4),
    [excludeIds]
  )
  if (recommendations.length === 0) return null
  return (
    <section aria-labelledby="recommendations-heading" className="mt-10 border-t border-border pt-8">
      <h2 id="recommendations-heading" className="mb-4 text-base font-bold text-foreground">You Might Also Like</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {recommendations.map((p) => <ProductCard key={p.id} product={p} layout={ViewMode.Grid} onQuickView={onQuickView} />)}
      </div>
    </section>
  )
}

/* ========================================================================
   14. PAGE-LEVEL COMPOSITION
   ======================================================================== */

function buildActiveChips(filters: FiltersState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = []

  filters.selected.category.forEach(id => chips.push({ group: 'category', value: id, label: getCategoryLabel(id) }))
  filters.selected.brand.forEach(id => chips.push({ group: 'brand', value: id, label: getBrandLabel(id) }))
  filters.selected.availability.forEach(v => chips.push({ group: 'availability', value: v, label: AVAILABILITY_LABELS[v as AvailabilityOption] }))
  filters.selected.delivery.forEach(v => chips.push({ group: 'delivery', value: v, label: DELIVERY_LABELS[v as DeliveryOption] }))
  filters.selected.color.forEach(v => chips.push({ group: 'color', value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))

  if (filters.price.min !== null || filters.price.max !== null) {
    const label = filters.price.min !== null && filters.price.max !== null
      ? `${formatPrice(filters.price.min)} - ${formatPrice(filters.price.max)}`
      : filters.price.min !== null
        ? `${formatPrice(filters.price.min)}+`
        : `Under ${formatPrice(filters.price.max as number)}`
    chips.push({ group: 'price', value: 'price', label })
  }
  if (filters.minRating !== null) {
    chips.push({ group: 'rating', value: String(filters.minRating), label: `${filters.minRating}\u2605 & above` })
  }
  if (filters.minDiscount !== null) {
    chips.push({ group: 'discount', value: String(filters.minDiscount), label: `${filters.minDiscount}%+ off` })
  }

  return chips
}

function SearchPageInner() {
  const dispatch = useAppDispatch()
  const query = useAppSelector(s => s.search.query)
  const filters = useAppSelector(s => s.filters)
  const sort = useAppSelector(s => s.sort.option)
  const viewMode = useAppSelector(s => s.view.mode)
  const isFilterDrawerOpen = useAppSelector(s => s.ui.isFilterDrawerOpen)
  const status = useAppSelector(s => s.ui.status)
  const activeFilterCount = useAppSelector(selectActiveFilterCount)

  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE)
  const [elapsedMs, setElapsedMs] = React.useState(SIMULATED_LATENCY_MS)
  const [quickViewId, setQuickViewId] = React.useState<string | null>(null)
  const failedOnceRef = React.useRef(false)

  const allResults = React.useMemo(
    () => filterAndSortProducts(MOCK_PRODUCTS, query, filters, sort),
    [query, filters, sort]
  )

  // Simulated network fetch -- resets pagination and re-derives a fetch lifecycle
  // whenever the query/filters/sort combination changes.
  React.useEffect(() => {
    let cancelled = false
    dispatch(uiActions.setStatus('loading'))
    const start = performance.now()

    const timer = window.setTimeout(() => {
      if (cancelled) return
      const shouldFail = !failedOnceRef.current && Math.random() < 0.06
      failedOnceRef.current = true
      if (shouldFail) {
        dispatch(uiActions.setStatus('error'))
      } else {
        setElapsedMs(performance.now() - start)
        setVisibleCount(PAGE_SIZE)
        dispatch(uiActions.setStatus('success'))
      }
    }, SIMULATED_LATENCY_MS)

    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query, filters, sort, dispatch])

  const handleRetry = () => {
    dispatch(uiActions.setStatus('loading'))
    window.setTimeout(() => {
      setElapsedMs(SIMULATED_LATENCY_MS)
      setVisibleCount(PAGE_SIZE)
      dispatch(uiActions.setStatus('success'))
    }, SIMULATED_LATENCY_MS)
  }

  const handleSelectTerm = (term: string) => dispatch(searchActions.submitSearch(term))
  const handleSelectCategory = (categoryId: string) => {
    dispatch(filtersActions.toggleFilter({ group: 'category', value: categoryId }))
  }

  const chips = React.useMemo(() => buildActiveChips(filters), [filters])

  const handleRemoveChip = (chip: ActiveFilterChip) => {
    if (chip.group === 'price') dispatch(filtersActions.clearPriceRange())
    else if (chip.group === 'rating') dispatch(filtersActions.setMinRating(null))
    else if (chip.group === 'discount') dispatch(filtersActions.setMinDiscount(null))
    else dispatch(filtersActions.removeFilter({ group: chip.group as FilterGroupId, value: chip.value }))
  }

  const visibleResults = allResults.slice(0, visibleCount)
  const quickViewProduct = quickViewId ? PRODUCT_BY_ID[quickViewId] : null

  const sidebarProps: FilterSidebarProps = {
    filters,
    activeCount: activeFilterCount,
    onToggleGroup: (group, value) => dispatch(filtersActions.toggleFilter({ group, value })),
    onPriceChange: (range) => dispatch(filtersActions.setPriceRange(range)),
    onRatingChange: (v) => dispatch(filtersActions.setMinRating(v)),
    onDiscountChange: (v) => dispatch(filtersActions.setMinDiscount(v)),
    onClearAll: () => dispatch(filtersActions.clearFilters()),
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#search-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <SearchHeader />
      <SearchBreadcrumb query={query} />
      <SearchSummary query={query} resultCount={status === 'success' ? allResults.length : 0} elapsedMs={elapsedMs} />

      {status !== 'loading' && status !== 'error' && (
        <SearchDiscovery query={query} onSelectTerm={handleSelectTerm} onSelectCategory={handleSelectCategory} />
      )}

      <main id="search-main-content" className="mx-auto max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-8">
        <div className="pt-2">
          <SearchToolbar
            activeFilterCount={activeFilterCount}
            onOpenFilters={() => dispatch(uiActions.toggleFilterDrawer())}
            viewMode={viewMode}
            onViewModeChange={(m) => dispatch(viewActions.setViewMode(m))}
            sort={sort}
            onSortChange={(s) => dispatch(sortActions.setSort(s))}
            chips={chips}
            onRemoveChip={handleRemoveChip}
            onClearAll={() => dispatch(filtersActions.clearFilters())}
          />
        </div>

        <div className="flex gap-8 pt-6">
          <aside className="hidden w-64 shrink-0 lg:block" aria-label="Product filters">
            <FilterSidebar {...sidebarProps} />
          </aside>

          <FilterDrawer
            {...sidebarProps}
            open={isFilterDrawerOpen}
            onClose={() => dispatch(uiActions.closeFilterDrawer())}
            resultCount={allResults.length}
          />

          <div className="min-w-0 flex-1">
            {status === 'loading' && <SearchResultsSkeletonGrid layout={viewMode} />}

            {status === 'error' && <ErrorState onRetry={handleRetry} />}

            {status === 'success' && allResults.length === 0 && (
              <EmptyResults query={query} onSelectTerm={handleSelectTerm} onSelectCategory={handleSelectCategory} />
            )}

            {status === 'success' && allResults.length > 0 && (
              <>
                {viewMode === ViewMode.Grid
                  ? <ProductGrid products={visibleResults} onQuickView={setQuickViewId} />
                  : <ProductList products={visibleResults} onQuickView={setQuickViewId} />}
                <SearchPagination
                  visibleCount={visibleCount}
                  totalCount={allResults.length}
                  onLoadMore={() => setVisibleCount(c => c + PAGE_SIZE)}
                />
                <SearchRecommendations
                  excludeIds={new Set(visibleResults.map(p => p.id))}
                  onQuickView={setQuickViewId}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {quickViewProduct && <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewId(null)} />}
    </div>
  )
}

/* ========================================================================
   15. EXPORT
   ======================================================================== */

export default function SearchPage() {
  return (
    <Provider store={store}>
      <SearchPageInner />
    </Provider>
  )
}