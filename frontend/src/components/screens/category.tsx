'use client'

/* ============================================================================
 * 1. IMPORTS
 * ==========================================================================*/

import {
  useState, useEffect, useMemo, useRef, useCallback, type ReactNode, type KeyboardEvent,
} from 'react'
import {
  configureStore, createSlice, createSelector, type PayloadAction,
} from '@reduxjs/toolkit'
import { Provider, useDispatch, useSelector } from 'react-redux'
import {
  Search, MapPin, User, Heart, Bell, ShoppingCart, Menu, X, ChevronRight, ChevronDown,
  ChevronLeft, SlidersHorizontal, LayoutGrid, List, Star, Truck, ShieldCheck, RotateCcw,
  Headphones, Check, AlertTriangle, RefreshCw, Zap, Award, Flame,
} from 'lucide-react'

/* ============================================================================
 * 2. TYPESCRIPT TYPES
 * ==========================================================================*/

interface Seller {
  readonly id: string
  readonly name: string
  readonly rating: number
  readonly isOfficial: boolean
}

interface ProductAttribute {
  readonly key: string
  readonly label: string
  readonly value: string
}

type ProductStatus =
  | 'default' | 'new' | 'bestSeller' | 'discounted' | 'lowStock' | 'outOfStock' | 'sponsored'

interface Product {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly brand: string
  readonly subcategoryId: string
  readonly image: string
  readonly rating: number
  readonly reviewCount: number
  readonly price: number
  readonly originalPrice?: number
  readonly currency: string
  readonly status: ProductStatus
  readonly isFreeDelivery: boolean
  readonly isSameDayEligible: boolean
  readonly isNextDayEligible: boolean
  readonly deliveryEstimate: string
  readonly seller: Seller
  readonly attributes: readonly ProductAttribute[]
  readonly installmentMonths?: number
}

interface Brand {
  readonly id: string
  readonly name: string
  readonly productCount: number
}

interface Subcategory {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly icon: string
  readonly productCount: number
}

interface BreadcrumbItem {
  readonly label: string
  readonly href: string
}

interface FilterOption {
  readonly id: string
  readonly label: string
  readonly count: number
}

interface PriceBucket {
  readonly id: string
  readonly label: string
  readonly min: number
  readonly max: number | null
}

interface AttributeFilterConfig {
  readonly key: string
  readonly label: string
  readonly options: readonly string[]
}

interface CartItem {
  readonly productId: string
  readonly quantity: number
}

interface CategoryInfo {
  readonly name: string
  readonly description: string
  readonly bannerImage: string
  readonly productCount: number
  readonly breadcrumbs: readonly BreadcrumbItem[]
}

interface FilterState {
  readonly subcategories: readonly string[]
  readonly brands: readonly string[]
  readonly priceBucketId: string | null
  readonly customMin: number | null
  readonly customMax: number | null
  readonly minRating: number | null
  readonly availability: readonly string[]
  readonly discount: readonly string[]
  readonly delivery: readonly string[]
  readonly sellers: readonly string[]
  readonly attributes: Readonly<Record<string, readonly string[]>>
}

interface FilterChip {
  readonly id: string
  readonly label: string
  readonly onRemove: () => void
}

/* ============================================================================
 * 3. ENUMS
 * ==========================================================================*/

enum SortOption {
  Relevance = 'relevance',
  Popularity = 'popularity',
  BestSelling = 'bestSelling',
  Newest = 'newest',
  PriceLowToHigh = 'priceLowToHigh',
  PriceHighToLow = 'priceHighToLow',
  CustomerRating = 'customerRating',
  BiggestDiscount = 'biggestDiscount',
}

enum ViewMode {
  Grid = 'grid',
  List = 'list',
}

/* ============================================================================
 * 4. CONSTANTS
 * ==========================================================================*/

const PAGE_SIZE = 12

const NAV_LINKS: readonly string[] = ['Categories', 'Deals', 'New Arrivals', 'Best Sellers', 'Brands', 'Trending']

const SORT_LABELS: Record<SortOption, string> = {
  [SortOption.Relevance]: 'Relevance',
  [SortOption.Popularity]: 'Popularity',
  [SortOption.BestSelling]: 'Best Selling',
  [SortOption.Newest]: 'Newest',
  [SortOption.PriceLowToHigh]: 'Price: Low to High',
  [SortOption.PriceHighToLow]: 'Price: High to Low',
  [SortOption.CustomerRating]: 'Customer Rating',
  [SortOption.BiggestDiscount]: 'Biggest Discount',
}

const PRICE_BUCKETS: readonly PriceBucket[] = [
  { id: 'under-500', label: 'Under $500', min: 0, max: 500 },
  { id: '500-1000', label: '$500 – $1,000', min: 500, max: 1000 },
  { id: '1000-1500', label: '$1,000 – $1,500', min: 1000, max: 1500 },
  { id: '1500-2000', label: '$1,500 – $2,000', min: 1500, max: 2000 },
  { id: '2000-plus', label: '$2,000+', min: 2000, max: null },
]

const RATING_OPTIONS: readonly number[] = [4, 3, 2]

const DISCOUNT_OPTIONS: readonly number[] = [10, 20, 30, 50]

const AVAILABILITY_OPTIONS: readonly FilterOption[] = [
  { id: 'inStock', label: 'In Stock', count: 0 },
  { id: 'availableToday', label: 'Available Today', count: 0 },
  { id: 'fastDelivery', label: 'Fast Delivery', count: 0 },
]

const DELIVERY_OPTIONS: readonly FilterOption[] = [
  { id: 'free', label: 'Free Delivery', count: 0 },
  { id: 'sameDay', label: 'Same Day', count: 0 },
  { id: 'nextDay', label: 'Next Day', count: 0 },
]

const ATTRIBUTE_CONFIG: readonly AttributeFilterConfig[] = [
  { key: 'ram', label: 'RAM', options: ['8GB', '16GB', '32GB', '64GB'] },
  { key: 'storage', label: 'Storage', options: ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'] },
  { key: 'processor', label: 'Processor', options: ['Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'Apple M3', 'Apple M3 Pro', 'AMD Ryzen 7', 'AMD Ryzen 9'] },
  { key: 'screenSize', label: 'Screen Size', options: ['13"', '14"', '15.6"', '16"', '17"'] },
  { key: 'gpu', label: 'Graphics', options: ['Integrated', 'RTX 4050', 'RTX 4060', 'RTX 4070', 'RTX 4080'] },
  { key: 'os', label: 'Operating System', options: ['Windows 11', 'macOS', 'ChromeOS'] },
  { key: 'color', label: 'Color', options: ['Space Gray', 'Silver', 'Midnight Black', 'Platinum'] },
]

const TRUST_SIGNALS: ReadonlyArray<{ icon: typeof Truck; label: string }> = [
  { icon: Truck, label: 'Free Shipping' },
  { icon: ShieldCheck, label: 'Secure Payments' },
  { icon: RotateCcw, label: 'Easy Returns' },
  { icon: Award, label: 'Buyer Protection' },
  { icon: Headphones, label: '24/7 Support' },
]

const FOOTER_COLUMNS: ReadonlyArray<{ heading: string; links: readonly string[] }> = [
  { heading: 'Shop', links: ['Deals', 'New Arrivals', 'Best Sellers', 'Gift Cards'] },
  { heading: 'Customer Service', links: ['Help Center', 'Track Order', 'Returns', 'Contact Us'] },
  { heading: 'About', links: ['Our Story', 'Careers', 'Press', 'Sustainability'] },
  { heading: 'Sell With Us', links: ['Become a Seller', 'Seller Center', 'Advertise'] },
  { heading: 'Payments & Delivery', links: ['Payment Methods', 'Delivery Options', 'Installments'] },
  { heading: 'Legal', links: ['Terms of Service', 'Privacy Policy', 'Cookie Settings'] },
]

const CATEGORY_INFO: CategoryInfo = {
  name: 'Laptops',
  description: 'Explore laptops for work, gaming, creativity and everyday productivity.',
  bannerImage: 'https://placehold.co/1200x400/111827/e5e7eb?text=Laptops',
  productCount: 12482,
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Electronics', href: '/electronics' },
    { label: 'Computers', href: '/electronics/computers' },
    { label: 'Laptops', href: '/electronics/computers/laptops' },
  ],
}

const SUBCATEGORIES: readonly Subcategory[] = [
  { id: 'gaming', name: 'Gaming Laptops', slug: 'gaming-laptops', icon: '🎮', productCount: 1842 },
  { id: 'business', name: 'Business Laptops', slug: 'business-laptops', icon: '💼', productCount: 2210 },
  { id: 'ultrabooks', name: 'Ultrabooks', slug: 'ultrabooks', icon: '⚡', productCount: 1356 },
  { id: '2in1', name: '2-in-1 Laptops', slug: '2-in-1-laptops', icon: '🔄', productCount: 984 },
  { id: 'macbooks', name: 'MacBooks', slug: 'macbooks', icon: '🍎', productCount: 621 },
  { id: 'chromebooks', name: 'Chromebooks', slug: 'chromebooks', icon: '🌐', productCount: 1103 },
  { id: 'accessories', name: 'Laptop Accessories', slug: 'laptop-accessories', icon: '🎒', productCount: 4366 },
]

const BRANDS: readonly Brand[] = [
  { id: 'Apple', name: 'Apple', productCount: 621 },
  { id: 'Dell', name: 'Dell', productCount: 1840 },
  { id: 'Lenovo', name: 'Lenovo', productCount: 2103 },
  { id: 'HP', name: 'HP', productCount: 1975 },
  { id: 'ASUS', name: 'ASUS', productCount: 1622 },
  { id: 'Acer', name: 'Acer', productCount: 1340 },
  { id: 'MSI', name: 'MSI', productCount: 812 },
  { id: 'Samsung', name: 'Samsung', productCount: 540 },
]

const SELLERS: readonly Seller[] = [
  { id: 'nexus-direct', name: 'Nexus Direct', rating: 4.8, isOfficial: true },
  { id: 'techhub', name: 'TechHub Official', rating: 4.6, isOfficial: true },
  { id: 'compuworld', name: 'CompuWorld', rating: 4.3, isOfficial: false },
  { id: 'bytebazaar', name: 'ByteBazaar', rating: 4.1, isOfficial: false },
]

/* ============================================================================
 * 5. MOCK DATA — PRODUCTS
 * ==========================================================================*/

interface RawProduct {
  title: string; brand: string; subcategoryId: string; price: number; originalPrice?: number
  rating: number; reviewCount: number; status: ProductStatus; sellerIdx: number
  ram: string; storage: string; processor: string; screenSize: string; gpu: string; os: string; color: string
  freeDelivery: boolean; sameDay: boolean; nextDay: boolean; deliveryEstimate: string; installmentMonths?: number
}

const RAW_PRODUCTS: readonly RawProduct[] = [
  { title: 'MacBook Air 13" M3', brand: 'Apple', subcategoryId: 'ultrabooks', price: 1099, rating: 4.8, reviewCount: 3420, status: 'bestSeller', sellerIdx: 0, ram: '16GB', storage: '512GB SSD', processor: 'Apple M3', screenSize: '13"', gpu: 'Integrated', os: 'macOS', color: 'Space Gray', freeDelivery: true, sameDay: true, nextDay: true, deliveryEstimate: 'Free delivery tomorrow', installmentMonths: 12 },
  { title: 'MacBook Pro 14" M3 Pro', brand: 'Apple', subcategoryId: 'macbooks', price: 1999, originalPrice: 2199, rating: 4.9, reviewCount: 2110, status: 'discounted', sellerIdx: 0, ram: '18GB', storage: '512GB SSD', processor: 'Apple M3 Pro', screenSize: '14"', gpu: 'Integrated', os: 'macOS', color: 'Space Gray', freeDelivery: true, sameDay: false, nextDay: true, deliveryEstimate: 'Free delivery in 2 days', installmentMonths: 24 },
  { title: 'MacBook Air 15" M3', brand: 'Apple', subcategoryId: 'macbooks', price: 1299, rating: 4.7, reviewCount: 1560, status: 'new', sellerIdx: 1, ram: '16GB', storage: '256GB SSD', processor: 'Apple M3', screenSize: '15.6"', gpu: 'Integrated', os: 'macOS', color: 'Silver', freeDelivery: true, sameDay: false, nextDay: true, deliveryEstimate: 'Free delivery in 2 days', installmentMonths: 12 },
  { title: 'XPS 13 Plus', brand: 'Dell', subcategoryId: 'ultrabooks', price: 1249, originalPrice: 1499, rating: 4.5, reviewCount: 980, status: 'discounted', sellerIdx: 1, ram: '16GB', storage: '512GB SSD', processor: 'Intel Core i7', screenSize: '13"', gpu: 'Integrated', os: 'Windows 11', color: 'Platinum', freeDelivery: true, sameDay: true, nextDay: true, deliveryEstimate: 'Free delivery today', installmentMonths: 12 },
  { title: 'XPS 15', brand: 'Dell', subcategoryId: 'business', price: 1799, rating: 4.6, reviewCount: 1240, status: 'default', sellerIdx: 0, ram: '32GB', storage: '1TB SSD', processor: 'Intel Core i9', screenSize: '15.6"', gpu: 'RTX 4060', os: 'Windows 11', color: 'Platinum', freeDelivery: true, sameDay: false, nextDay: true, deliveryEstimate: 'Free delivery in 2 days', installmentMonths: 24 },
  { title: 'Inspiron 15 3000', brand: 'Dell', subcategoryId: 'business', price: 449, rating: 4.1, reviewCount: 2870, status: 'bestSeller', sellerIdx: 2, ram: '8GB', storage: '256GB SSD', processor: 'Intel Core i5', screenSize: '15.6"', gpu: 'Integrated', os: 'Windows 11', color: 'Midnight Black', freeDelivery: true, sameDay: false, nextDay: false, deliveryEstimate: 'Delivery in 3-5 days' },
  { title: 'ThinkPad X1 Carbon Gen 11', brand: 'Lenovo', subcategoryId: 'business', price: 1649, rating: 4.7, reviewCount: 1680, status: 'default', sellerIdx: 0, ram: '16GB', storage: '512GB SSD', processor: 'Intel Core i7', screenSize: '14"', gpu: 'Integrated', os: 'Windows 11', color: 'Midnight Black', freeDelivery: true, sameDay: true, nextDay: true, deliveryEstimate: 'Free delivery today', installmentMonths: 12 },
  { title: 'Legion 5 Pro', brand: 'Lenovo', subcategoryId: 'gaming', price: 1399, originalPrice: 1699, rating: 4.6, reviewCount: 2240, status: 'discounted', sellerIdx: 1, ram: '32GB', storage: '1TB SSD', processor: 'AMD Ryzen 7', screenSize: '16"', gpu: 'RTX 4070', os: 'Windows 11', color: 'Midnight Black', freeDelivery: true, sameDay: false, nextDay: true, deliveryEstimate: 'Free delivery in 2 days', installmentMonths: 24 },
  { title: 'IdeaPad Flex 5', brand: 'Lenovo', subcategoryId: '2in1', price: 649, rating: 4.2, reviewCount: 940, status: 'default', sellerIdx: 2, ram: '16GB', storage: '512GB SSD', processor: 'Intel Core i5', screenSize: '14"', gpu: 'Integrated', os: 'Windows 11', color: 'Silver', freeDelivery: true, sameDay: false, nextDay: false, deliveryEstimate: 'Delivery in 3-5 days' },
  { title: 'Spectre x360 14', brand: 'HP', subcategoryId: '2in1', price: 1449, rating: 4.6, reviewCount: 1120, status: 'new', sellerIdx: 0, ram: '16GB', storage: '1TB SSD', processor: 'Intel Core i7', screenSize: '14"', gpu: 'Integrated', os: 'Windows 11', color: 'Midnight Black', freeDelivery: true, sameDay: true, nextDay: true, deliveryEstimate: 'Free delivery today', installmentMonths: 12 },
  { title: 'Pavilion 15', brand: 'HP', subcategoryId: 'business', price: 549, originalPrice: 699, rating: 4.0, reviewCount: 3120, status: 'discounted', sellerIdx: 3, ram: '8GB', storage: '512GB SSD', processor: 'Intel Core i5', screenSize: '15.6"', gpu: 'Integrated', os: 'Windows 11', color: 'Silver', freeDelivery: false, sameDay: false, nextDay: false, deliveryEstimate: 'Delivery in 5-7 days' },
  { title: 'Omen 16', brand: 'HP', subcategoryId: 'gaming', price: 1599, rating: 4.4, reviewCount: 860, status: 'lowStock', sellerIdx: 1, ram: '32GB', storage: '1TB SSD', processor: 'Intel Core i9', screenSize: '16"', gpu: 'RTX 4070', os: 'Windows 11', color: 'Midnight Black', freeDelivery: true, sameDay: false, nextDay: true, deliveryEstimate: 'Free delivery in 2 days', installmentMonths: 18 },
  { title: 'ROG Zephyrus G14', brand: 'ASUS', subcategoryId: 'gaming', price: 1749, originalPrice: 1999, rating: 4.7, reviewCount: 1980, status: 'discounted', sellerIdx: 0, ram: '32GB', storage: '1TB SSD', processor: 'AMD Ryzen 9', screenSize: '14"', gpu: 'RTX 4070', os: 'Windows 11', color: 'Platinum', freeDelivery: true, sameDay: true, nextDay: true, deliveryEstimate: 'Free delivery today', installmentMonths: 24 },
  { title: 'ZenBook 14 OLED', brand: 'ASUS', subcategoryId: 'ultrabooks', price: 999, rating: 4.5, reviewCount: 1440, status: 'bestSeller', sellerIdx: 2, ram: '16GB', storage: '512GB SSD', processor: 'Intel Core i7', screenSize: '14"', gpu: 'Integrated', os: 'Windows 11', color: 'Midnight Black', freeDelivery: true, sameDay: false, nextDay: true, deliveryEstimate: 'Free delivery in 2 days', installmentMonths: 12 },
  { title: 'Vivobook Go 15', brand: 'ASUS', subcategoryId: 'business', price: 379, rating: 3.9, reviewCount: 2210, status: 'default', sellerIdx: 3, ram: '8GB', storage: '256GB SSD', processor: 'Intel Core i5', screenSize: '15.6"', gpu: 'Integrated', os: 'Windows 11', color: 'Silver', freeDelivery: false, sameDay: false, nextDay: false, deliveryEstimate: 'Delivery in 5-7 days' },
  { title: 'Predator Helios 16', brand: 'Acer', subcategoryId: 'gaming', price: 1899, rating: 4.6, reviewCount: 640, status: 'sponsored', sellerIdx: 0, ram: '32GB', storage: '2TB SSD', processor: 'Intel Core i9', screenSize: '16"', gpu: 'RTX 4080', os: 'Windows 11', color: 'Midnight Black', freeDelivery: true, sameDay: false, nextDay: true, deliveryEstimate: 'Free delivery in 2 days', installmentMonths: 24 },
  { title: 'Swift 3', brand: 'Acer', subcategoryId: 'ultrabooks', price: 699, originalPrice: 849, rating: 4.3, reviewCount: 1870, status: 'discounted', sellerIdx: 1, ram: '16GB', storage: '512GB SSD', processor: 'AMD Ryzen 7', screenSize: '14"', gpu: 'Integrated', os: 'Windows 11', color: 'Silver', freeDelivery: true, sameDay: false, nextDay: true, deliveryEstimate: 'Free delivery in 2 days', installmentMonths: 12 },
  { title: 'Chromebook Plus 514', brand: 'Acer', subcategoryId: 'chromebooks', price: 399, rating: 4.2, reviewCount: 760, status: 'new', sellerIdx: 2, ram: '8GB', storage: '256GB SSD', processor: 'Intel Core i5', screenSize: '14"', gpu: 'Integrated', os: 'ChromeOS', color: 'Silver', freeDelivery: true, sameDay: false, nextDay: false, deliveryEstimate: 'Delivery in 3-5 days' },
  { title: 'Stealth 16', brand: 'MSI', subcategoryId: 'gaming', price: 2199, rating: 4.5, reviewCount: 410, status: 'default', sellerIdx: 0, ram: '32GB', storage: '2TB SSD', processor: 'Intel Core i9', screenSize: '16"', gpu: 'RTX 4080', os: 'Windows 11', color: 'Midnight Black', freeDelivery: true, sameDay: false, nextDay: true, deliveryEstimate: 'Free delivery in 2 days', installmentMonths: 24 },
  { title: 'Katana 15', brand: 'MSI', subcategoryId: 'gaming', price: 1099, originalPrice: 1299, rating: 4.3, reviewCount: 930, status: 'discounted', sellerIdx: 3, ram: '16GB', storage: '1TB SSD', processor: 'Intel Core i7', screenSize: '15.6"', gpu: 'RTX 4060', os: 'Windows 11', color: 'Midnight Black', freeDelivery: true, sameDay: false, nextDay: true, deliveryEstimate: 'Free delivery in 2 days', installmentMonths: 12 },
  { title: 'Galaxy Book4 Pro', brand: 'Samsung', subcategoryId: 'ultrabooks', price: 1449, rating: 4.4, reviewCount: 520, status: 'new', sellerIdx: 1, ram: '16GB', storage: '512GB SSD', processor: 'Intel Core i7', screenSize: '14"', gpu: 'Integrated', os: 'Windows 11', color: 'Platinum', freeDelivery: true, sameDay: true, nextDay: true, deliveryEstimate: 'Free delivery today', installmentMonths: 12 },
  { title: 'Galaxy Book4 360', brand: 'Samsung', subcategoryId: '2in1', price: 1199, rating: 4.3, reviewCount: 380, status: 'default', sellerIdx: 2, ram: '16GB', storage: '512GB SSD', processor: 'Intel Core i7', screenSize: '13"', gpu: 'Integrated', os: 'Windows 11', color: 'Silver', freeDelivery: true, sameDay: false, nextDay: true, deliveryEstimate: 'Free delivery in 2 days', installmentMonths: 12 },
  { title: 'ThinkPad E14', brand: 'Lenovo', subcategoryId: 'business', price: 0, originalPrice: 899, rating: 4.0, reviewCount: 610, status: 'outOfStock', sellerIdx: 0, ram: '16GB', storage: '512GB SSD', processor: 'Intel Core i5', screenSize: '14"', gpu: 'Integrated', os: 'Windows 11', color: 'Midnight Black', freeDelivery: true, sameDay: false, nextDay: false, deliveryEstimate: 'Currently unavailable' },
]

const PRODUCTS: readonly Product[] = RAW_PRODUCTS.map((r, i) => ({
  id: `prod-${i + 1}`,
  slug: r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  title: r.title,
  brand: r.brand,
  subcategoryId: r.subcategoryId,
  image: `https://placehold.co/500x500/f3f4f6/374151?text=${encodeURIComponent(r.title.split(' ').slice(0, 2).join(' '))}`,
  rating: r.rating,
  reviewCount: r.reviewCount,
  price: r.status === 'outOfStock' ? (r.originalPrice ?? 0) : r.price,
  originalPrice: r.originalPrice,
  currency: 'USD',
  status: r.status,
  isFreeDelivery: r.freeDelivery,
  isSameDayEligible: r.sameDay,
  isNextDayEligible: r.nextDay,
  deliveryEstimate: r.deliveryEstimate,
  seller: SELLERS[r.sellerIdx],
  attributes: [
    { key: 'ram', label: 'RAM', value: r.ram },
    { key: 'storage', label: 'Storage', value: r.storage },
    { key: 'processor', label: 'Processor', value: r.processor },
    { key: 'screenSize', label: 'Screen Size', value: r.screenSize },
    { key: 'gpu', label: 'Graphics', value: r.gpu },
    { key: 'os', label: 'Operating System', value: r.os },
    { key: 'color', label: 'Color', value: r.color },
  ],
  installmentMonths: r.installmentMonths,
}))

/* ============================================================================
 * 6. UTILITY FUNCTIONS
 * ==========================================================================*/

function cn(...classes: Array<string | false | undefined | null>): string {
  return classes.filter(Boolean).join(' ')
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function getDiscountPercentage(price: number, originalPrice?: number): number {
  if (!originalPrice || originalPrice <= price) return 0
  return Math.round(((originalPrice - price) / originalPrice) * 100)
}

function getInstallmentPrice(price: number, months?: number): number | null {
  if (!months) return null
  return Math.round((price / months) * 100) / 100
}

const INITIAL_FILTERS: FilterState = {
  subcategories: [],
  brands: [],
  priceBucketId: null,
  customMin: null,
  customMax: null,
  minRating: null,
  availability: [],
  discount: [],
  delivery: [],
  sellers: [],
  attributes: {},
}

function matchesPrice(product: Product, filters: FilterState): boolean {
  if (filters.customMin !== null && product.price < filters.customMin) return false
  if (filters.customMax !== null && product.price > filters.customMax) return false
  if (filters.customMin === null && filters.customMax === null && filters.priceBucketId) {
    const bucket = PRICE_BUCKETS.find((b) => b.id === filters.priceBucketId)
    if (bucket) {
      if (product.price < bucket.min) return false
      if (bucket.max !== null && product.price > bucket.max) return false
    }
  }
  return true
}

function matchesAvailability(product: Product, ids: readonly string[]): boolean {
  if (ids.length === 0) return true
  return ids.some((id) => {
    if (id === 'inStock') return product.status !== 'outOfStock'
    if (id === 'availableToday') return product.isSameDayEligible
    if (id === 'fastDelivery') return product.isSameDayEligible || product.isNextDayEligible
    return false
  })
}

function matchesDelivery(product: Product, ids: readonly string[]): boolean {
  if (ids.length === 0) return true
  return ids.some((id) => {
    if (id === 'free') return product.isFreeDelivery
    if (id === 'sameDay') return product.isSameDayEligible
    if (id === 'nextDay') return product.isNextDayEligible
    return false
  })
}

function matchesDiscount(product: Product, thresholds: readonly string[]): boolean {
  if (thresholds.length === 0) return true
  const pct = getDiscountPercentage(product.price, product.originalPrice)
  return thresholds.some((t) => pct >= Number(t))
}

function matchesAttributes(product: Product, selected: Readonly<Record<string, readonly string[]>>): boolean {
  return Object.entries(selected).every(([key, values]) => {
    if (values.length === 0) return true
    const attr = product.attributes.find((a) => a.key === key)
    return attr ? values.includes(attr.value) : false
  })
}

function filterProducts(products: readonly Product[], filters: FilterState): Product[] {
  return products.filter((p) => {
    if (filters.subcategories.length > 0 && !filters.subcategories.includes(p.subcategoryId)) return false
    if (filters.brands.length > 0 && !filters.brands.includes(p.brand)) return false
    if (filters.minRating !== null && p.rating < filters.minRating) return false
    if (filters.sellers.length > 0 && !filters.sellers.includes(p.seller.id)) return false
    if (!matchesPrice(p, filters)) return false
    if (!matchesAvailability(p, filters.availability)) return false
    if (!matchesDelivery(p, filters.delivery)) return false
    if (!matchesDiscount(p, filters.discount)) return false
    if (!matchesAttributes(p, filters.attributes)) return false
    return true
  })
}

function sortProducts(products: readonly Product[], sort: SortOption): Product[] {
  const copy = [...products]
  switch (sort) {
    case SortOption.PriceLowToHigh: return copy.sort((a, b) => a.price - b.price)
    case SortOption.PriceHighToLow: return copy.sort((a, b) => b.price - a.price)
    case SortOption.CustomerRating: return copy.sort((a, b) => b.rating - a.rating)
    case SortOption.BiggestDiscount: return copy.sort((a, b) =>
      getDiscountPercentage(b.price, b.originalPrice) - getDiscountPercentage(a.price, a.originalPrice))
    case SortOption.Newest: return copy.sort((a, b) => (b.status === 'new' ? 1 : 0) - (a.status === 'new' ? 1 : 0))
    case SortOption.BestSelling:
    case SortOption.Popularity: return copy.sort((a, b) => b.reviewCount - a.reviewCount)
    case SortOption.Relevance:
    default: return copy
  }
}

/* ============================================================================
 * 7. REDUX STATE / SLICES / STORE
 * ==========================================================================*/

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as CartItem[] },
  reducers: {
    addToCart(state, action: PayloadAction<string>) {
      const existing = state.items.find((i) => i.productId === action.payload)
      if (existing) existing.quantity += 1
      else state.items.push({ productId: action.payload, quantity: 1 })
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.productId !== action.payload)
    },
  },
})

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { ids: [] as string[] },
  reducers: {
    toggleWishlist(state, action: PayloadAction<string>) {
      const idx = state.ids.indexOf(action.payload)
      if (idx === -1) state.ids.unshift(action.payload)
      else state.ids.splice(idx, 1)
    },
  },
})

const filtersSlice = createSlice({
  name: 'filters',
  initialState: INITIAL_FILTERS,
  reducers: {
    toggleSubcategory(state, action: PayloadAction<string>) {
      state.subcategories = toggleInArray(state.subcategories, action.payload)
    },
    toggleBrand(state, action: PayloadAction<string>) {
      state.brands = toggleInArray(state.brands, action.payload)
    },
    toggleAvailability(state, action: PayloadAction<string>) {
      state.availability = toggleInArray(state.availability, action.payload)
    },
    toggleDiscount(state, action: PayloadAction<string>) {
      state.discount = toggleInArray(state.discount, action.payload)
    },
    toggleDelivery(state, action: PayloadAction<string>) {
      state.delivery = toggleInArray(state.delivery, action.payload)
    },
    toggleSeller(state, action: PayloadAction<string>) {
      state.sellers = toggleInArray(state.sellers, action.payload)
    },
    toggleAttribute(state, action: PayloadAction<{ key: string; value: string }>) {
      const current = state.attributes[action.payload.key] ?? []
      state.attributes[action.payload.key] = toggleInArray(current, action.payload.value)
    },
    setPriceBucket(state, action: PayloadAction<string | null>) {
      state.priceBucketId = action.payload
      state.customMin = null
      state.customMax = null
    },
    setCustomPriceRange(state, action: PayloadAction<{ min: number | null; max: number | null }>) {
      state.customMin = action.payload.min
      state.customMax = action.payload.max
      state.priceBucketId = null
    },
    setMinRating(state, action: PayloadAction<number | null>) {
      state.minRating = action.payload
    },
    clearFilters() {
      return INITIAL_FILTERS
    },
  },
})

function toggleInArray(arr: readonly string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

const sortSlice = createSlice({
  name: 'sort',
  initialState: { value: SortOption.Relevance },
  reducers: {
    setSort(state, action: PayloadAction<SortOption>) { state.value = action.payload },
  },
})

const viewModeSlice = createSlice({
  name: 'viewMode',
  initialState: { value: ViewMode.Grid },
  reducers: {
    setViewMode(state, action: PayloadAction<ViewMode>) { state.value = action.payload },
  },
})

const uiSlice = createSlice({
  name: 'ui',
  initialState: { filterDrawerOpen: false, mobileNavOpen: false },
  reducers: {
    openFilterDrawer(state) { state.filterDrawerOpen = true },
    closeFilterDrawer(state) { state.filterDrawerOpen = false },
    toggleMobileNav(state) { state.mobileNavOpen = !state.mobileNavOpen },
    closeMobileNav(state) { state.mobileNavOpen = false },
  },
})

const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
    wishlist: wishlistSlice.reducer,
    filters: filtersSlice.reducer,
    sort: sortSlice.reducer,
    viewMode: viewModeSlice.reducer,
    ui: uiSlice.reducer,
  },
})

type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch
const useAppDispatch = () => useDispatch<AppDispatch>()
const useAppSelector = <T,>(selector: (s: RootState) => T) => useSelector(selector)

const selectCartCount = createSelector(
  (s: RootState) => s.cart.items,
  (items) => items.reduce((sum, i) => sum + i.quantity, 0),
)
const selectWishlistIds = (s: RootState) => s.wishlist.ids
const selectIsWishlisted = (id: string) => (s: RootState) => s.wishlist.ids.includes(id)
const selectIsInCart = (id: string) => (s: RootState) => s.cart.items.some((i) => i.productId === id)
const selectFilters = (s: RootState) => s.filters
const selectSort = (s: RootState) => s.sort.value
const selectViewMode = (s: RootState) => s.viewMode.value
const selectFilterDrawerOpen = (s: RootState) => s.ui.filterDrawerOpen
const selectMobileNavOpen = (s: RootState) => s.ui.mobileNavOpen

const selectActiveFilterCount = createSelector(selectFilters, (f) =>
  f.subcategories.length + f.brands.length + f.availability.length + f.discount.length +
  f.sellers.length + f.delivery.length + (f.minRating !== null ? 1 : 0) +
  (f.priceBucketId !== null || f.customMin !== null || f.customMax !== null ? 1 : 0) +
  Object.values(f.attributes).reduce((sum, v) => sum + v.length, 0))

const selectFilteredSortedProducts = createSelector(
  [selectFilters, selectSort],
  (filters, sort) => sortProducts(filterProducts(PRODUCTS, filters), sort),
)

/* ============================================================================
 * 8. SMALL REUSABLE DOMAIN PRIMITIVES
 * ==========================================================================*/

const STATUS_BADGE_CONFIG: Partial<Record<ProductStatus, { label: string; tone: 'primary' | 'success' | 'destructive' | 'warning' | 'info' }>> = {
  new: { label: 'New', tone: 'info' },
  bestSeller: { label: 'Best Seller', tone: 'primary' },
  discounted: { label: 'Sale', tone: 'destructive' },
  lowStock: { label: 'Low Stock', tone: 'warning' },
  sponsored: { label: 'Sponsored', tone: 'info' },
}

function Badge({ label, tone }: { label: string; tone: 'primary' | 'success' | 'destructive' | 'warning' | 'info' | 'muted' }) {
  const toneClasses: Record<typeof tone, string> = {
    primary: 'bg-primary text-primary-foreground',
    success: 'bg-success text-success-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    warning: 'bg-warning text-warning-foreground',
    info: 'bg-info text-info-foreground',
    muted: 'bg-muted text-muted-foreground',
  }
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none', toneClasses[tone])}>
      {label}
    </span>
  )
}

function RatingStars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} className={i < Math.round(value) ? 'text-warning' : 'text-muted'} fill="currentColor" strokeWidth={0} />
      ))}
    </div>
  )
}

function PriceBlock({ product, size = 'md' }: { product: Product; size?: 'sm' | 'md' | 'lg' }) {
  const discount = getDiscountPercentage(product.price, product.originalPrice)
  const installment = getInstallmentPrice(product.price, product.installmentMonths)
  const priceSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg'

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={cn(priceSize, 'font-bold', discount > 0 ? 'text-destructive' : 'text-foreground')}>
          {formatCurrency(product.price, product.currency)}
        </span>
        {product.originalPrice && discount > 0 && (
          <>
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrency(product.originalPrice, product.currency)}
            </span>
            <span className="text-xs font-semibold text-destructive">-{discount}%</span>
          </>
        )}
      </div>
      {installment && (
        <p className="text-[11px] text-muted-foreground">
          or {formatCurrency(installment, product.currency)}/mo for {product.installmentMonths} mo
        </p>
      )}
    </div>
  )
}

function IconActionButton({ icon: Icon, label, active, onClick }: {
  icon: typeof Heart; label: string; active?: boolean; onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon size={15} fill={active ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}

/* ============================================================================
 * 9. CATEGORY COMPONENTS
 * ==========================================================================*/

function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-[1400px] px-4 py-3 lg:px-8">
      <ol className="flex items-center gap-1.5 overflow-x-auto text-xs">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={item.href} className="flex shrink-0 items-center gap-1.5">
              {i > 0 && <ChevronRight size={12} className="text-muted-foreground" aria-hidden="true" />}
              {isLast ? (
                <span aria-current="page" className="font-medium text-foreground">{item.label}</span>
              ) : (
                <a href={item.href} className="text-muted-foreground hover:text-foreground hover:underline">{item.label}</a>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function CategoryHero({ category, resultCount }: { category: CategoryInfo; resultCount: number }) {
  return (
    <div className="relative overflow-hidden bg-card">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={category.bannerImage} alt="" className="h-full w-full object-cover opacity-10" />
      </div>
      <div className="relative mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-8 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{category.name}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{category.description}</p>
        <p className="text-sm font-medium text-foreground">{formatCompactNumber(resultCount)} products</p>
      </div>
    </div>
  )
}

function SubcategoryCard({ subcategory }: { subcategory: Subcategory }) {
  const dispatch = useAppDispatch()
  const isActive = useAppSelector((s) => s.filters.subcategories.includes(subcategory.id))

  return (
    <button
      type="button"
      onClick={() => dispatch(filtersSlice.actions.toggleSubcategory(subcategory.id))}
      aria-pressed={isActive}
      className={cn(
        'flex w-[132px] shrink-0 flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50',
      )}
    >
      <span className="text-2xl" aria-hidden="true">{subcategory.icon}</span>
      <span className="text-xs font-semibold text-foreground leading-tight">{subcategory.name}</span>
      <span className="text-[11px] text-muted-foreground">{formatCompactNumber(subcategory.productCount)}</span>
    </button>
  )
}

function SubcategoryScroller({ subcategories }: { subcategories: readonly Subcategory[] }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-8">
      <h2 className="mb-3 text-sm font-bold text-foreground">Shop by type</h2>
      <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
        {subcategories.map((sc) => <SubcategoryCard key={sc.id} subcategory={sc} />)}
      </div>
    </div>
  )
}

function CategoryHighlights() {
  const promos = [
    { id: 'p1', title: 'Trade in & save', desc: 'Get up to $400 credit toward a new laptop', accent: 'oklch(60% 0.14 250)' },
    { id: 'p2', title: "Editor's picks", desc: 'The best laptops we tested this month', accent: 'oklch(62% 0.15 165)' },
  ]
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-5 lg:px-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {promos.map((p) => (
          <a key={p.id} href="#" className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50">
            <div>
              <p className="text-sm font-bold text-foreground">{p.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" style={{ color: p.accent }} aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  )
}

/* ============================================================================
 * 10. FILTER COMPONENTS
 * ==========================================================================*/

function CheckboxFilterGroup({ title, options, selectedIds, onToggle, searchable, defaultOpen = true }: {
  title: string; options: readonly FilterOption[]; selectedIds: readonly string[]
  onToggle: (id: string) => void; searchable?: boolean; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [query, setQuery] = useState('')

  const visible = useMemo(
    () => (searchable && query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options),
    [options, query, searchable],
  )

  return (
    <fieldset className="border-b border-border py-4 first:pt-0 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left focus-visible:outline-none"
      >
        <legend className="text-sm font-semibold text-foreground">
          {title} {selectedIds.length > 0 && <span className="ml-1 text-xs font-normal text-primary">({selectedIds.length})</span>}
        </legend>
        <ChevronDown size={15} className={cn('text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2.5">
          {searchable && (
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}`}
              aria-label={`Search ${title.toLowerCase()}`}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
          {visible.map((opt) => (
            <label key={opt.id} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(opt.id)}
                  onChange={() => onToggle(opt.id)}
                  className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="text-foreground">{opt.label}</span>
              </span>
              {opt.count > 0 && <span className="text-xs text-muted-foreground">({opt.count})</span>}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}

function PriceFilter() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector(selectFilters)
  const [minInput, setMinInput] = useState('')
  const [maxInput, setMaxInput] = useState('')
  const [open, setOpen] = useState(true)

  const applyCustom = () => {
    const min = minInput ? Number(minInput) : null
    const max = maxInput ? Number(maxInput) : null
    dispatch(filtersSlice.actions.setCustomPriceRange({ min, max }))
  }

  return (
    <fieldset className="border-b border-border py-4">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between text-left focus-visible:outline-none">
        <legend className="text-sm font-semibold text-foreground">Price</legend>
        <ChevronDown size={15} className={cn('text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2.5">
          {PRICE_BUCKETS.map((bucket) => (
            <label key={bucket.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="price-bucket"
                checked={filters.priceBucketId === bucket.id}
                onChange={() => { setMinInput(''); setMaxInput(''); dispatch(filtersSlice.actions.setPriceBucket(bucket.id)) }}
                className="h-4 w-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-foreground">{bucket.label}</span>
            </label>
          ))}

          <div className="mt-1 flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">Minimum price</span>
              <input
                type="number"
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                placeholder="Min"
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <span className="text-muted-foreground">–</span>
            <label className="flex-1">
              <span className="sr-only">Maximum price</span>
              <input
                type="number"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                placeholder="Max"
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <button
              type="button"
              onClick={applyCustom}
              className="shrink-0 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Go
            </button>
          </div>
        </div>
      )}
    </fieldset>
  )
}

function RatingFilter() {
  const dispatch = useAppDispatch()
  const minRating = useAppSelector((s) => s.filters.minRating)

  return (
    <fieldset className="border-b border-border py-4">
      <legend className="mb-3 text-sm font-semibold text-foreground">Rating</legend>
      <div className="flex flex-col gap-2.5">
        {RATING_OPTIONS.map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="min-rating"
              checked={minRating === r}
              onChange={() => dispatch(filtersSlice.actions.setMinRating(minRating === r ? null : r))}
              className="h-4 w-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <RatingStars value={r} size={13} />
            <span className="text-foreground">& above</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function FilterSidebarContent() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector(selectFilters)

  const subcategoryOptions: FilterOption[] = SUBCATEGORIES.map((s) => ({ id: s.id, label: s.name, count: s.productCount }))
  const brandOptions: FilterOption[] = BRANDS.map((b) => ({ id: b.id, label: b.name, count: b.productCount }))
  const sellerOptions: FilterOption[] = SELLERS.map((s) => ({ id: s.id, label: s.name, count: 0 }))
  const discountOptions: FilterOption[] = DISCOUNT_OPTIONS.map((d) => ({ id: String(d), label: `${d}% or more`, count: 0 }))

  return (
    <div>
      <CheckboxFilterGroup title="Category" options={subcategoryOptions} selectedIds={filters.subcategories} onToggle={(id) => dispatch(filtersSlice.actions.toggleSubcategory(id))} />
      <CheckboxFilterGroup title="Brand" options={brandOptions} selectedIds={filters.brands} onToggle={(id) => dispatch(filtersSlice.actions.toggleBrand(id))} searchable />
      <PriceFilter />
      <RatingFilter />
      <CheckboxFilterGroup title="Availability" options={AVAILABILITY_OPTIONS} selectedIds={filters.availability} onToggle={(id) => dispatch(filtersSlice.actions.toggleAvailability(id))} />
      <CheckboxFilterGroup title="Discount" options={discountOptions} selectedIds={filters.discount} onToggle={(id) => dispatch(filtersSlice.actions.toggleDiscount(id))} />
      <CheckboxFilterGroup title="Delivery" options={DELIVERY_OPTIONS} selectedIds={filters.delivery} onToggle={(id) => dispatch(filtersSlice.actions.toggleDelivery(id))} />
      <CheckboxFilterGroup title="Seller" options={sellerOptions} selectedIds={filters.sellers} onToggle={(id) => dispatch(filtersSlice.actions.toggleSeller(id))} defaultOpen={false} />
      {ATTRIBUTE_CONFIG.map((attr) => (
        <CheckboxFilterGroup
          key={attr.key}
          title={attr.label}
          options={attr.options.map((v) => ({ id: v, label: v, count: 0 }))}
          selectedIds={filters.attributes[attr.key] ?? []}
          onToggle={(value) => dispatch(filtersSlice.actions.toggleAttribute({ key: attr.key, value }))}
          defaultOpen={false}
        />
      ))}
    </div>
  )
}

function FilterSidebar() {
  return (
    <aside aria-label="Product filters" className="hidden w-[260px] shrink-0 lg:block">
      <div className="sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto pr-2">
        <FilterSidebarContent />
      </div>
    </aside>
  )
}

function FilterDrawer() {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector(selectFilterDrawerOpen)
  const activeCount = useAppSelector(selectActiveFilterCount)
  const resultCount = useAppSelector(selectFilteredSortedProducts).length

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => dispatch(uiSlice.actions.closeFilterDrawer())} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Filters" className="fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[340px] flex-col bg-background shadow-2xl lg:hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <h2 className="text-base font-bold text-foreground">Filters</h2>
          <button type="button" onClick={() => dispatch(uiSlice.actions.closeFilterDrawer())} aria-label="Close filters" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          <FilterSidebarContent />
        </div>
        <div className="flex gap-3 border-t border-border px-4 py-4">
          <button
            type="button"
            onClick={() => dispatch(filtersSlice.actions.clearFilters())}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => dispatch(uiSlice.actions.closeFilterDrawer())}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Show {resultCount} results
          </button>
        </div>
      </div>
    </>
  )
}

/* ============================================================================
 * 11. PRODUCT COMPONENTS
 * ==========================================================================*/

function ProductBadgeStack({ product }: { product: Product }) {
  const cfg = STATUS_BADGE_CONFIG[product.status]
  if (product.status === 'outOfStock') return <Badge label="Out of Stock" tone="muted" />
  if (!cfg) return null
  return <Badge label={cfg.label} tone={cfg.tone} />
}

function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const dispatch = useAppDispatch()
  const isWishlisted = useAppSelector(selectIsWishlisted(product.id))
  const isInCart = useAppSelector(selectIsInCart(product.id))
  const isOOS = product.status === 'outOfStock'

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <div className="relative aspect-square overflow-hidden rounded-t-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.title}
          loading={priority ? 'eager' : 'lazy'}
          className="absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2"><ProductBadgeStack product={product} /></div>
        <div className="absolute right-2 top-2">
          <IconActionButton icon={Heart} label={isWishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`} active={isWishlisted} onClick={(e) => { e.preventDefault(); dispatch(wishlistSlice.actions.toggleWishlist(product.id)) }} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-[11px] text-muted-foreground">{product.brand}</p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{product.title}</h3>
        <div className="flex items-center gap-1.5">
          <RatingStars value={product.rating} />
          <span className="text-[11px] text-muted-foreground">({formatCompactNumber(product.reviewCount)})</span>
        </div>
        <PriceBlock product={product} size="md" />
        <p className="text-[11px] text-muted-foreground">{product.deliveryEstimate}</p>

        <button
          type="button"
          onClick={() => dispatch(cartSlice.actions.addToCart(product.id))}
          disabled={isOOS}
          aria-label={`Add ${product.title} to cart`}
          className={cn(
            'mt-auto w-full rounded-lg py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isOOS
              ? 'cursor-not-allowed bg-muted text-muted-foreground'
              : isInCart
                ? 'border border-primary bg-primary/10 text-primary'
                : 'bg-primary text-primary-foreground hover:opacity-90',
          )}
        >
          {isOOS ? 'Out of stock' : isInCart ? 'Added ✓' : 'Add to cart'}
        </button>
      </div>
    </article>
  )
}

function ProductListItem({ product }: { product: Product }) {
  const dispatch = useAppDispatch()
  const isWishlisted = useAppSelector(selectIsWishlisted(product.id))
  const isInCart = useAppSelector(selectIsInCart(product.id))
  const isOOS = product.status === 'outOfStock'

  return (
    <article className="flex gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.title} className="absolute inset-0 h-full w-full object-contain p-2" />
        <div className="absolute left-1.5 top-1.5"><ProductBadgeStack product={product} /></div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{product.brand}</p>
            <h3 className="text-sm font-semibold text-foreground">{product.title}</h3>
          </div>
          <IconActionButton icon={Heart} label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'} active={isWishlisted} onClick={() => dispatch(wishlistSlice.actions.toggleWishlist(product.id))} />
        </div>

        <div className="flex items-center gap-1.5">
          <RatingStars value={product.rating} />
          <span className="text-[11px] text-muted-foreground">({formatCompactNumber(product.reviewCount)} reviews)</span>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {product.attributes.slice(0, 4).map((a) => (
            <li key={a.key}><span className="text-foreground">{a.label}:</span> {a.value}</li>
          ))}
        </ul>

        <p className="text-[11px] text-muted-foreground">
          Sold by <span className="font-medium text-foreground">{product.seller.name}</span>
          {product.seller.isOfficial && ' · Official Store'} · {product.deliveryEstimate}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <PriceBlock product={product} size="lg" />
          <button
            type="button"
            onClick={() => dispatch(cartSlice.actions.addToCart(product.id))}
            disabled={isOOS}
            aria-label={`Add ${product.title} to cart`}
            className={cn(
              'shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isOOS
                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                : isInCart
                  ? 'border border-primary bg-primary/10 text-primary'
                  : 'bg-primary text-primary-foreground hover:opacity-90',
            )}
          >
            {isOOS ? 'Out of stock' : isInCart ? 'Added ✓' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  )
}

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border overflow-hidden">
      <div className="skeleton-shimmer aspect-square w-full" />
      <div className="flex flex-col gap-2 p-3">
        <div className="skeleton-shimmer h-3 w-14 rounded" />
        <div className="skeleton-shimmer h-4 w-full rounded" />
        <div className="skeleton-shimmer h-4 w-3/4 rounded" />
        <div className="skeleton-shimmer h-3 w-24 rounded" />
        <div className="skeleton-shimmer h-5 w-20 rounded" />
        <div className="skeleton-shimmer h-9 w-full rounded-lg" />
      </div>
    </div>
  )
}

function ProductListItemSkeleton() {
  return (
    <div className="flex gap-4 rounded-xl border border-border p-4">
      <div className="skeleton-shimmer h-32 w-32 shrink-0 rounded-lg" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="skeleton-shimmer h-3 w-16 rounded" />
        <div className="skeleton-shimmer h-4 w-2/3 rounded" />
        <div className="skeleton-shimmer h-3 w-40 rounded" />
        <div className="skeleton-shimmer mt-auto h-8 w-32 rounded" />
      </div>
    </div>
  )
}

/* ============================================================================
 * 12. LISTING COMPONENTS
 * ==========================================================================*/

function ResultSummary({ count }: { count: number }) {
  return <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{formatCompactNumber(count)}</span> products</p>
}

function SortControl() {
  const dispatch = useAppDispatch()
  const sort = useAppSelector(selectSort)
  const [open, setOpen] = useState(false)
  const options = Object.values(SortOption)

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Sort: {SORT_LABELS[sort]}
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul role="listbox" aria-label="Sort products" className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-border bg-popover py-1 shadow-lg">
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={sort === opt}
                  onClick={() => { dispatch(sortSlice.actions.setSort(opt)); setOpen(false) }}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:bg-muted',
                    sort === opt ? 'font-semibold text-primary' : 'text-popover-foreground',
                  )}
                >
                  {SORT_LABELS[opt]}
                  {sort === opt && <Check size={14} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function ViewModeToggle() {
  const dispatch = useAppDispatch()
  const mode = useAppSelector(selectViewMode)

  return (
    <div role="group" aria-label="View mode" className="flex items-center rounded-lg border border-border">
      <button
        type="button"
        onClick={() => dispatch(viewModeSlice.actions.setViewMode(ViewMode.Grid))}
        aria-pressed={mode === ViewMode.Grid}
        aria-label="Grid view"
        className={cn('flex h-9 w-9 items-center justify-center rounded-l-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', mode === ViewMode.Grid ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50')}
      >
        <LayoutGrid size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => dispatch(viewModeSlice.actions.setViewMode(ViewMode.List))}
        aria-pressed={mode === ViewMode.List}
        aria-label="List view"
        className={cn('flex h-9 w-9 items-center justify-center rounded-r-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', mode === ViewMode.List ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50')}
      >
        <List size={15} aria-hidden="true" />
      </button>
    </div>
  )
}

function ActiveFilterChips() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector(selectFilters)

  const chips: FilterChip[] = []
  filters.subcategories.forEach((id) => {
    const sc = SUBCATEGORIES.find((s) => s.id === id)
    if (sc) chips.push({ id: `sc-${id}`, label: sc.name, onRemove: () => dispatch(filtersSlice.actions.toggleSubcategory(id)) })
  })
  filters.brands.forEach((id) => chips.push({ id: `brand-${id}`, label: id, onRemove: () => dispatch(filtersSlice.actions.toggleBrand(id)) }))
  filters.availability.forEach((id) => {
    const opt = AVAILABILITY_OPTIONS.find((o) => o.id === id)
    if (opt) chips.push({ id: `avail-${id}`, label: opt.label, onRemove: () => dispatch(filtersSlice.actions.toggleAvailability(id)) })
  })
  filters.delivery.forEach((id) => {
    const opt = DELIVERY_OPTIONS.find((o) => o.id === id)
    if (opt) chips.push({ id: `deliv-${id}`, label: opt.label, onRemove: () => dispatch(filtersSlice.actions.toggleDelivery(id)) })
  })
  filters.discount.forEach((id) => chips.push({ id: `disc-${id}`, label: `${id}%+ off`, onRemove: () => dispatch(filtersSlice.actions.toggleDiscount(id)) }))
  filters.sellers.forEach((id) => {
    const seller = SELLERS.find((s) => s.id === id)
    if (seller) chips.push({ id: `seller-${id}`, label: seller.name, onRemove: () => dispatch(filtersSlice.actions.toggleSeller(id)) })
  })
  if (filters.minRating !== null) {
    chips.push({ id: 'rating', label: `${filters.minRating}★ & above`, onRemove: () => dispatch(filtersSlice.actions.setMinRating(null)) })
  }
  if (filters.priceBucketId) {
    const bucket = PRICE_BUCKETS.find((b) => b.id === filters.priceBucketId)
    if (bucket) chips.push({ id: 'price', label: bucket.label, onRemove: () => dispatch(filtersSlice.actions.setPriceBucket(null)) })
  } else if (filters.customMin !== null || filters.customMax !== null) {
    chips.push({ id: 'price-custom', label: `${filters.customMin ?? 0} – ${filters.customMax ?? '∞'}`, onRemove: () => dispatch(filtersSlice.actions.setCustomPriceRange({ min: null, max: null })) })
  }
  Object.entries(filters.attributes).forEach(([key, values]) => {
    values.forEach((v) => chips.push({ id: `attr-${key}-${v}`, label: v, onRemove: () => dispatch(filtersSlice.actions.toggleAttribute({ key, value: v })) }))
  })

  if (chips.length === 0) return null

  return (
    <div role="list" aria-label="Active filters" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span key={chip.id} role="listitem" className="flex items-center gap-1.5 rounded-full bg-accent py-1 pl-3 pr-1.5 text-xs font-medium text-accent-foreground">
          {chip.label}
          <button type="button" onClick={chip.onRemove} aria-label={`Remove filter: ${chip.label}`} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-none">
            <X size={10} aria-hidden="true" />
          </button>
        </span>
      ))}
      <button type="button" onClick={() => dispatch(filtersSlice.actions.clearFilters())} className="text-xs font-semibold text-muted-foreground underline hover:text-foreground">
        Clear all
      </button>
    </div>
  )
}

function ListingToolbar({ resultCount }: { resultCount: number }) {
  const dispatch = useAppDispatch()
  const activeCount = useAppSelector(selectActiveFilterCount)

  return (
    <div className="sticky top-16 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResultSummary count={resultCount} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dispatch(uiSlice.actions.openFilterDrawer())}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            Filter{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
          <SortControl />
          <ViewModeToggle />
        </div>
      </div>
      <div className="mt-3 hidden lg:block"><ActiveFilterChips /></div>
    </div>
  )
}

function EmptyResultsState() {
  const dispatch = useAppDispatch()
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <AlertTriangle size={44} className="text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-foreground">No products match your filters</p>
        <p className="mt-1 text-sm text-muted-foreground">Try removing a few filters or browse related categories.</p>
      </div>
      <button
        type="button"
        onClick={() => dispatch(filtersSlice.actions.clearFilters())}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Clear all filters
      </button>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {SUBCATEGORIES.slice(0, 4).map((sc) => (
          <a key={sc.id} href="#" className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted">{sc.name}</a>
        ))}
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <AlertTriangle size={44} className="text-destructive" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-foreground">We couldn&rsquo;t load this category</p>
        <p className="mt-1 text-sm text-muted-foreground">Please try again.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RefreshCw size={14} aria-hidden="true" /> Retry
      </button>
    </div>
  )
}

type LoadStatus = 'loading' | 'success' | 'error'

function ProductResults() {
  const products = useAppSelector(selectFilteredSortedProducts)
  const viewMode = useAppSelector(selectViewMode)

  const [status, setStatus] = useState<LoadStatus>('loading')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setStatus('loading')
    const id = setTimeout(() => setStatus('success'), 400)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [products.length])

  const hasMore = visibleCount < products.length

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    setTimeout(() => {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, products.length))
      setIsLoadingMore(false)
    }, 500)
  }, [isLoadingMore, hasMore, products.length])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || status !== 'success') return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore()
    }, { rootMargin: '400px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore, status])

  if (status === 'error') return <ErrorState onRetry={() => setStatus('loading')} />

  if (status === 'loading') {
    return (
      <div className={viewMode === ViewMode.Grid ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4' : 'flex flex-col gap-4'}>
        {Array.from({ length: 8 }).map((_, i) => viewMode === ViewMode.Grid ? <ProductCardSkeleton key={i} /> : <ProductListItemSkeleton key={i} />)}
      </div>
    )
  }

  if (products.length === 0) return <EmptyResultsState />

  const visible = products.slice(0, visibleCount)

  return (
    <div>
      {viewMode === ViewMode.Grid ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((p) => <ProductListItem key={p.id} product={p} />)}
        </div>
      )}

      <div ref={sentinelRef} className="mt-8 flex items-center justify-center">
        {isLoadingMore && <p className="text-sm text-muted-foreground">Loading more products…</p>}
        {!hasMore && !isLoadingMore && (
          <p className="text-sm text-muted-foreground">You&rsquo;ve reached the end of the results.</p>
        )}
      </div>
    </div>
  )
}

function CategoryListingLayout() {
  const resultCount = useAppSelector(selectFilteredSortedProducts).length
  return (
    <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
      <ListingToolbar resultCount={resultCount} />
      <div className="mt-3 lg:hidden"><ActiveFilterChips /></div>
      <div className="flex gap-8 py-6">
        <FilterSidebar />
        <div className="min-w-0 flex-1"><ProductResults /></div>
      </div>
      <FilterDrawer />
    </div>
  )
}

/* ============================================================================
 * 13. HEADER / FOOTER COMPONENTS
 * ==========================================================================*/

function AnnouncementBar() {
  return (
    <div className="flex items-center justify-center gap-2 bg-primary px-4 py-2 text-center text-xs font-medium text-primary-foreground">
      <Flame size={13} aria-hidden="true" /> Free shipping on orders over $75 — shop laptops today
    </div>
  )
}

function SearchBar() {
  const [query, setQuery] = useState('')
  return (
    <form role="search" className="relative hidden flex-1 max-w-xl md:block" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="global-search" className="sr-only">Search products</label>
      <input
        id="global-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search laptops, brands and more…"
        className="w-full rounded-lg border border-input bg-background py-2.5 pl-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button type="submit" aria-label="Search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        <Search size={16} aria-hidden="true" />
      </button>
    </form>
  )
}

function HeaderActions() {
  const dispatch = useAppDispatch()
  const cartCount = useAppSelector(selectCartCount)
  const wishlistCount = useAppSelector(selectWishlistIds).length

  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Account" className="hidden h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex">
        <User size={19} aria-hidden="true" />
      </button>
      <button type="button" aria-label="Notifications" className="hidden h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex">
        <Bell size={19} aria-hidden="true" />
      </button>
      <button type="button" aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} items` : 'Wishlist'} className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Heart size={19} aria-hidden="true" />
        {wishlistCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{wishlistCount}</span>}
      </button>
      <button type="button" aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'} className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ShoppingCart size={19} aria-hidden="true" />
        {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{cartCount}</span>}
      </button>
      <button
        type="button"
        onClick={() => dispatch(uiSlice.actions.toggleMobileNav())}
        aria-label="Toggle menu"
        className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <Menu size={19} aria-hidden="true" />
      </button>
    </div>
  )
}

function CategoryNavigation() {
  return (
    <nav aria-label="Main navigation" className="hidden items-center gap-1 border-t border-border py-2 lg:flex">
      {NAV_LINKS.map((label) => (
        <a key={label} href="#" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">{label}</a>
      ))}
    </nav>
  )
}

function MobileNav() {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector(selectMobileNavOpen)
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => dispatch(uiSlice.actions.closeMobileNav())} aria-hidden="true" />
      <nav aria-label="Mobile navigation" className="fixed inset-y-0 right-0 z-50 flex w-[80vw] max-w-[300px] flex-col bg-background p-5 shadow-2xl lg:hidden">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-bold text-foreground">Menu</span>
          <button type="button" onClick={() => dispatch(uiSlice.actions.closeMobileNav())} aria-label="Close menu" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {NAV_LINKS.map((label) => (
            <a key={label} href="#" className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted">{label}</a>
          ))}
        </div>
      </nav>
    </>
  )
}

function EcommerceHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
      <AnnouncementBar />
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <div className="flex h-16 items-center gap-4">
          <a href="/" className="flex shrink-0 items-center gap-2" aria-label="Nexus — go to homepage">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary"><Zap size={16} className="text-primary-foreground" aria-hidden="true" /></span>
            <span className="text-lg font-extrabold tracking-tight text-foreground">Nexus</span>
          </a>
          <button type="button" className="hidden shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted md:flex">
            <MapPin size={14} aria-hidden="true" />
            <span className="text-left leading-tight">Deliver to<br /><span className="font-bold">94103</span></span>
          </button>
          <SearchBar />
          <div className="ml-auto"><HeaderActions /></div>
        </div>
        <CategoryNavigation />
      </div>
      <MobileNav />
    </header>
  )
}

function RecommendationSection({ title, subtitle, products }: { title: string; subtitle?: string; products: readonly Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scroll = (dir: 1 | -1) => scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })

  return (
    <section aria-label={title} className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          {subtitle && <p className="text-xs font-semibold uppercase tracking-wide text-primary">{subtitle}</p>}
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
        </div>
      </div>
      <div className="relative">
        <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" className="absolute -left-3 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted lg:flex">
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
        <div ref={scrollRef} className="scrollbar-hide flex gap-4 overflow-x-auto pb-1">
          {products.map((p) => <div key={p.id} className="w-[190px] shrink-0"><ProductCard product={p} /></div>)}
        </div>
        <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" className="absolute -right-3 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted lg:flex">
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

function TrustSection() {
  return (
    <section aria-label="Trust and service information" className="border-y border-border bg-card">
      <div className="mx-auto flex max-w-[1400px] flex-wrap justify-center gap-x-8 gap-y-4 px-4 py-6 lg:px-8">
        {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon size={16} className="text-primary" aria-hidden="true" />
            {label}
          </div>
        ))}
      </div>
    </section>
  )
}

function EcommerceFooter() {
  return (
    <footer className="bg-foreground text-background/70">
      <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-background/40">{col.heading}</h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link}><a href="#" className="text-sm hover:text-background">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-background/10 pt-6 text-xs">
          <p>© {new Date().getFullYear()} Nexus Commerce Ltd. All rights reserved.</p>
          <div className="flex gap-2">
            {['Visa', 'Mastercard', 'Amex', 'PayPal'].map((pm) => (
              <span key={pm} className="rounded border border-background/15 px-2 py-1 text-[10px] font-semibold">{pm}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ============================================================================
 * 14. CATEGORY PAGE COMPOSITION
 * ==========================================================================*/

function CategoryPageContent() {
  const resultCount = useAppSelector(selectFilteredSortedProducts).length
  const recommended = useMemo(() => PRODUCTS.slice(0, 8), [])
  const trending = useMemo(() => [...PRODUCTS].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 8), [])
  const recentlyViewed = useMemo(() => PRODUCTS.slice(4, 12), [])
  const popular = useMemo(() => [...PRODUCTS].sort((a, b) => b.rating - a.rating).slice(0, 8), [])

  return (
    <div className="min-h-screen bg-background">
      <EcommerceHeader />
      <main id="main-content">
        <Breadcrumbs items={CATEGORY_INFO.breadcrumbs} />
        <CategoryHero category={CATEGORY_INFO} resultCount={resultCount} />
        <SubcategoryScroller subcategories={SUBCATEGORIES} />
        <CategoryHighlights />
        <CategoryListingLayout />
        <RecommendationSection title="Recommended for You" subtitle="Picks" products={recommended} />
        <RecommendationSection title="Trending in Electronics" subtitle="Popular now" products={trending} />
        <RecommendationSection title="Popular in This Category" products={popular} />
        <RecommendationSection title="Recently Viewed" products={recentlyViewed} />
      </main>
      <TrustSection />
      <EcommerceFooter />
    </div>
  )
}

/* ============================================================================
 * 15. EXPORT
 * ==========================================================================*/

export default function CategoryPage() {
  return (
    <Provider store={store}>
      <CategoryPageContent />
    </Provider>
  )
}