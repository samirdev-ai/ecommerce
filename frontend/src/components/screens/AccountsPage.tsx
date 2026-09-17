'use client';

/**
 * AccountPage.tsx
 * -----------------------------------------------------------------------
 * Customer account control center for a global-scale ecommerce platform.
 *
 * File organization (top to bottom):
 *   Imports -> Types -> Constants -> Mock data -> Redux (state/slice/store)
 *   -> Formatting utilities -> Small purposeful UI components
 *   -> Domain components -> Layout components -> AccountPage (default export)
 *
 * Everything lives in one physical file by requirement; the architecture
 * inside it is still modular: each domain component owns a single
 * responsibility and reads only the state slice it needs.
 * -----------------------------------------------------------------------
 */

import React, { useId, useRef, useState } from 'react';
import {
  Provider,
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from 'react-redux';
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  Gift,
  Heart,
  History,
  Home,
  KeyRound,
  LayoutGrid,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  PhoneCall,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Trash2,
  Truck,
  User,
  Wallet,
  X,
} from 'lucide-react';

/* ========================================================================
 * TYPES
 * ==================================================================== */

type VerificationStatus = 'verified' | 'unverified' | 'pending';
type MembershipTier = 'standard' | 'plus' | 'premium' | 'vip';
type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

type OrderStatus =
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'return_pending'
  | 'refund_pending';

type AddressType = 'home' | 'work' | 'other';
type PaymentBrand = 'visa' | 'mastercard' | 'amex' | 'paypal' | 'bank_transfer';
type NotificationCategory = 'order' | 'delivery' | 'promotion' | 'security' | 'system';
type SupportCaseStatus = 'open' | 'awaiting_customer' | 'awaiting_support' | 'resolved';

interface Money {
  amountMinor: number;
  currency: string;
}

interface OrderItem {
  id: string;
  productName: string;
  brand: string;
  quantity: number;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  placedAt: string;
  sellerName: string;
  sellerCount: number;
  items: OrderItem[];
  itemCount: number;
  deliveredItemCount?: number;
  total: Money;
  status: OrderStatus;
  estimatedDelivery?: string;
  deliveredAt?: string;
}

interface Address {
  id: string;
  type: AddressType;
  isDefault: boolean;
  recipientName: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phoneMasked: string;
}

interface PaymentMethod {
  id: string;
  brand: PaymentBrand;
  label: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

interface Membership {
  tier: MembershipTier;
  renewalDate: string;
  isExpiringSoon: boolean;
  pointsBalance: number;
  pointsToNextTier: number;
  nextTier: MembershipTier | null;
  progressPercent: number;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
}

interface Notification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface SupportCase {
  id: string;
  caseNumber: string;
  subject: string;
  status: SupportCaseStatus;
  relatedOrderNumber?: string;
  updatedAt: string;
}

interface SecurityStatus {
  score: number;
  emailVerification: VerificationStatus;
  phoneVerification: VerificationStatus;
  twoFactorEnabled: boolean;
  passwordLastChangedDaysAgo: number;
  activeSessionCount: number;
  lastLoginAt: string;
  lastLoginLocation: string;
  hasAlert: boolean;
  alertMessage?: string;
}

interface RecentlyViewedProduct {
  id: string;
  name: string;
  brand: string;
  price: Money;
}

interface WishlistItem {
  id: string;
  name: string;
  brand: string;
  price: Money;
  originalPrice?: Money;
  inStock: boolean;
  hasPriceDrop: boolean;
}

interface SavedItem {
  id: string;
  name: string;
  brand: string;
  collectionName: string;
}

interface CartSummary {
  itemCount: number;
  subtotal: Money;
}

interface AccountProfile {
  displayName: string;
  email: string;
  emailVerification: VerificationStatus;
  phoneMasked: string;
  phoneVerification: VerificationStatus;
  memberSince: string;
  avatarInitials: string;
  profileCompletionPercent: number;
}

interface AccountNavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badgeKey?: 'orders' | 'wishlist' | 'notifications' | 'support';
}

interface AccountNavigationGroup {
  id: string;
  label: string;
  items: AccountNavigationItem[];
}

/* ========================================================================
 * CONSTANTS
 * ==================================================================== */

const CARD =
  'rounded-xl border border-border bg-card text-card-foreground shadow-sm';
const CARD_PAD = 'p-5 sm:p-6';
const SECTION_TITLE = 'text-base font-semibold tracking-tight text-foreground';
const MUTED = 'text-sm text-muted-foreground';

const NAV_GROUPS: AccountNavigationGroup[] = [
  {
    id: 'overview-group',
    label: 'Overview',
    items: [{ id: 'nav-overview', label: 'Account overview', icon: LayoutGrid, href: '#overview' }],
  },
  {
    id: 'shopping-group',
    label: 'Shopping',
    items: [
      { id: 'nav-orders', label: 'Orders', icon: Package, href: '#orders', badgeKey: 'orders' },
      { id: 'nav-returns', label: 'Returns & refunds', icon: RotateCcw, href: '#orders' },
      { id: 'nav-wishlist', label: 'Wishlist', icon: Heart, href: '#shopping', badgeKey: 'wishlist' },
      { id: 'nav-saved', label: 'Saved items', icon: Bookmark, href: '#shopping' },
      { id: 'nav-recent', label: 'Recently viewed', icon: History, href: '#shopping' },
    ],
  },
  {
    id: 'account-group',
    label: 'Account',
    items: [
      { id: 'nav-profile', label: 'Profile', icon: User, href: '#overview' },
      { id: 'nav-addresses', label: 'Addresses', icon: MapPin, href: '#addresses' },
      { id: 'nav-payment', label: 'Payment methods', icon: CreditCard, href: '#payment' },
      { id: 'nav-membership', label: 'Membership & rewards', icon: Sparkles, href: '#membership' },
    ],
  },
  {
    id: 'security-group',
    label: 'Security',
    items: [
      { id: 'nav-security', label: 'Security', icon: ShieldCheck, href: '#security' },
      { id: 'nav-sessions', label: 'Login & sessions', icon: KeyRound, href: '#security' },
      { id: 'nav-privacy', label: 'Privacy', icon: Lock, href: '#footer-actions' },
    ],
  },
  {
    id: 'communication-group',
    label: 'Communication',
    items: [
      { id: 'nav-notifications', label: 'Notifications', icon: Bell, href: '#notifications', badgeKey: 'notifications' },
      { id: 'nav-preferences', label: 'Communication preferences', icon: Settings, href: '#notifications' },
    ],
  },
  {
    id: 'support-group',
    label: 'Support',
    items: [
      { id: 'nav-help', label: 'Help center', icon: MessageCircle, href: '#support' },
      { id: 'nav-cases', label: 'Support cases', icon: MessageCircle, href: '#support', badgeKey: 'support' },
    ],
  },
];

const QUICK_ACTIONS: Array<{ id: string; label: string; icon: LucideIcon; href: string }> = [
  { id: 'qa-orders', label: 'View orders', icon: Package, href: '#orders' },
  { id: 'qa-track', label: 'Track a package', icon: Truck, href: '#orders' },
  { id: 'qa-return', label: 'Start a return', icon: RotateCcw, href: '#orders' },
  { id: 'qa-wishlist', label: 'Wishlist', icon: Heart, href: '#shopping' },
  { id: 'qa-addresses', label: 'Manage addresses', icon: MapPin, href: '#addresses' },
  { id: 'qa-payment', label: 'Payment methods', icon: CreditCard, href: '#payment' },
  { id: 'qa-security', label: 'Security', icon: ShieldCheck, href: '#security' },
  { id: 'qa-support', label: 'Contact support', icon: MessageCircle, href: '#support' },
];

/* ========================================================================
 * MOCK DATA (represents data that would be hydrated from account services)
 * ==================================================================== */

const usd = (amountMinor: number): Money => ({ amountMinor, currency: 'USD' });

const MOCK_PROFILE: AccountProfile = {
  displayName: 'Priya Shrestha',
  email: 'priya.shrestha@fieldmail.com',
  emailVerification: 'verified',
  phoneMasked: '+977 ••••••381',
  phoneVerification: 'unverified',
  memberSince: '2021-03-11',
  avatarInitials: 'PS',
  profileCompletionPercent: 80,
};

const MOCK_ORDERS: OrderSummary[] = [
  {
    id: 'ord-1',
    orderNumber: '113-7745291-2200347',
    placedAt: '2026-09-08',
    sellerName: 'Verve Audio',
    sellerCount: 1,
    items: [{ id: 'it-1', productName: 'Verve Aria Wireless Earbuds', brand: 'Verve Audio', quantity: 1 }],
    itemCount: 1,
    total: usd(8999),
    status: 'processing',
    estimatedDelivery: '2026-09-18',
  },
  {
    id: 'ord-2',
    orderNumber: '113-6620144-9981102',
    placedAt: '2026-09-05',
    sellerName: 'Kestrel Gear',
    sellerCount: 1,
    items: [{ id: 'it-2', productName: 'Kestrel Trailhead Rain Jacket', brand: 'Kestrel Gear', quantity: 1 }],
    itemCount: 1,
    total: usd(14500),
    status: 'out_for_delivery',
    estimatedDelivery: '2026-09-14',
  },
  {
    id: 'ord-3',
    orderNumber: '113-5510873-1123008',
    placedAt: '2026-08-22',
    sellerName: 'Northfield Kitchen',
    sellerCount: 2,
    items: [
      { id: 'it-3', productName: 'Northfield 10" Cast Iron Skillet', brand: 'Northfield Kitchen', quantity: 1 },
      { id: 'it-4', productName: 'Loam Botanicals Hand Cream Trio', brand: 'Loam Skincare', quantity: 1 },
      { id: 'it-5', productName: 'Marrow & Co. Stoneware Mug Set', brand: 'Marrow & Co.', quantity: 2 },
    ],
    itemCount: 4,
    deliveredItemCount: 3,
    total: usd(9840),
    status: 'shipped',
    estimatedDelivery: '2026-09-16',
  },
  {
    id: 'ord-4',
    orderNumber: '113-4402219-7765540',
    placedAt: '2026-08-10',
    sellerName: 'Kestrel Gear',
    sellerCount: 1,
    items: [{ id: 'it-6', productName: 'Kestrel Ridge Hiking Boots, Size 9', brand: 'Kestrel Gear', quantity: 1 }],
    itemCount: 1,
    total: usd(11200),
    status: 'return_pending',
    deliveredAt: '2026-08-15',
  },
  {
    id: 'ord-5',
    orderNumber: '113-3390027-4471869',
    placedAt: '2026-07-30',
    sellerName: 'Marrow & Co.',
    sellerCount: 1,
    items: [{ id: 'it-7', productName: 'Marrow & Co. Stoneware Mug Set', brand: 'Marrow & Co.', quantity: 1 }],
    itemCount: 1,
    total: usd(3200),
    status: 'refund_pending',
    deliveredAt: '2026-08-04',
  },
];

const MOCK_ADDRESSES: Address[] = [
  {
    id: 'addr-1',
    type: 'home',
    isDefault: true,
    recipientName: 'Priya Shrestha',
    line1: '412 Sundhara Marg, Apt 3B',
    city: 'Kathmandu',
    region: 'Bagmati',
    postalCode: '44600',
    country: 'Nepal',
    phoneMasked: '+977 ••••••381',
  },
  {
    id: 'addr-2',
    type: 'work',
    isDefault: false,
    recipientName: 'Priya Shrestha',
    line1: 'Fieldstone Coworking, 5th Floor',
    city: 'Lalitpur',
    region: 'Bagmati',
    postalCode: '44700',
    country: 'Nepal',
    phoneMasked: '+977 ••••••381',
  },
];

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm-1',
    brand: 'visa',
    label: 'Visa •••• 4821',
    expiryMonth: 8,
    expiryYear: 2029,
    isDefault: true,
    isExpired: false,
    isExpiringSoon: false,
  },
  {
    id: 'pm-2',
    brand: 'mastercard',
    label: 'Mastercard •••• 1174',
    expiryMonth: 10,
    expiryYear: 2026,
    isDefault: false,
    isExpired: false,
    isExpiringSoon: true,
  },
];

const MOCK_MEMBERSHIP: Membership = {
  tier: 'plus',
  renewalDate: '2026-09-27',
  isExpiringSoon: true,
  pointsBalance: 3240,
  pointsToNextTier: 760,
  nextTier: 'premium',
  progressPercent: 81,
};

const MOCK_REWARDS: Reward[] = [
  { id: 'rw-1', title: '$10 off your next order', description: 'Valid on orders over $40', pointsCost: 1000 },
  { id: 'rw-2', title: 'Free expedited shipping', description: 'One-time upgrade, any order', pointsCost: 500 },
  { id: 'rw-3', title: 'Early access to sales', description: '24 hours before public launch', pointsCost: 0 },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'ntf-1',
    category: 'security',
    title: 'New sign-in detected',
    message: 'A new device signed in from Kathmandu, NP. Was this you?',
    createdAt: '2026-09-12T09:14:00Z',
    isRead: false,
  },
  {
    id: 'ntf-2',
    category: 'delivery',
    title: 'Out for delivery',
    message: 'Your Kestrel Trailhead Rain Jacket arrives today.',
    createdAt: '2026-09-12T06:02:00Z',
    isRead: false,
  },
  {
    id: 'ntf-3',
    category: 'order',
    title: 'Order confirmed',
    message: 'Order #113-7745291-2200347 has been placed.',
    createdAt: '2026-09-08T14:30:00Z',
    isRead: true,
  },
  {
    id: 'ntf-4',
    category: 'promotion',
    title: 'Price drop on your wishlist',
    message: 'Solace Home Weighted Blanket dropped to $54.99.',
    createdAt: '2026-09-06T11:00:00Z',
    isRead: true,
  },
];

const MOCK_SUPPORT_CASES: SupportCase[] = [
  {
    id: 'case-1',
    caseNumber: 'SUP-28491',
    subject: 'Refund not yet received for order #113-3390027-4471869',
    status: 'awaiting_support',
    relatedOrderNumber: '113-3390027-4471869',
    updatedAt: '2026-09-10',
  },
];

const MOCK_SECURITY: SecurityStatus = {
  score: 72,
  emailVerification: 'verified',
  phoneVerification: 'unverified',
  twoFactorEnabled: false,
  passwordLastChangedDaysAgo: 214,
  activeSessionCount: 3,
  lastLoginAt: '2026-09-12T09:14:00Z',
  lastLoginLocation: 'Kathmandu, Nepal',
  hasAlert: true,
  alertMessage: 'A new device signed in that we don\u2019t recognize.',
};

const MOCK_WISHLIST: WishlistItem[] = [
  {
    id: 'wl-1',
    name: 'Solace Home Weighted Blanket',
    brand: 'Solace Home',
    price: usd(5499),
    originalPrice: usd(6999),
    inStock: true,
    hasPriceDrop: true,
  },
  {
    id: 'wl-2',
    name: 'Anchorpoint Canvas Weekender Bag',
    brand: 'Anchorpoint',
    price: usd(8900),
    inStock: false,
    hasPriceDrop: false,
  },
  {
    id: 'wl-3',
    name: 'Pentabyte Mechanical Keyboard, Low-Profile',
    brand: 'Pentabyte',
    price: usd(12900),
    inStock: true,
    hasPriceDrop: false,
  },
];

const MOCK_SAVED_ITEMS: SavedItem[] = [];

const MOCK_RECENTLY_VIEWED: RecentlyViewedProduct[] = [
  { id: 'rv-1', name: 'Northfield 10" Cast Iron Skillet', brand: 'Northfield Kitchen', price: usd(4200) },
  { id: 'rv-2', name: 'Verve Aria Wireless Earbuds', brand: 'Verve Audio', price: usd(8999) },
  { id: 'rv-3', name: 'Loam Botanicals Hand Cream Trio', brand: 'Loam Skincare', price: usd(2600) },
];

const MOCK_CART: CartSummary = { itemCount: 2, subtotal: usd(13299) };

/* ========================================================================
 * REDUX TOOLKIT: STATE, SLICE, STORE
 * ==================================================================== */

interface OrdersSectionState {
  status: AsyncStatus;
  error: string | null;
  byId: Record<string, OrderSummary>;
  ids: string[];
}

interface NotificationsState {
  byId: Record<string, Notification>;
  ids: string[];
}

interface WishlistState {
  byId: Record<string, WishlistItem>;
  ids: string[];
}

interface AccountState {
  profile: AccountProfile;
  membership: Membership;
  rewards: Reward[];
  orders: OrdersSectionState;
  wishlist: WishlistState;
  savedItems: SavedItem[];
  recentlyViewed: RecentlyViewedProduct[];
  cart: CartSummary;
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  notifications: NotificationsState;
  supportCases: SupportCase[];
  security: SecurityStatus;
  navigation: { selectedNavId: string };
  ui: { mobileNavOpen: boolean; mobileSearchOpen: boolean };
}

function normalizeOrders(orders: OrderSummary[]): { byId: Record<string, OrderSummary>; ids: string[] } {
  const byId: Record<string, OrderSummary> = {};
  const ids: string[] = [];
  for (const order of orders) {
    byId[order.id] = order;
    ids.push(order.id);
  }
  return { byId, ids };
}

function normalizeNotifications(items: Notification[]): NotificationsState {
  const byId: Record<string, Notification> = {};
  const ids: string[] = [];
  for (const item of items) {
    byId[item.id] = item;
    ids.push(item.id);
  }
  return { byId, ids };
}

function normalizeWishlist(items: WishlistItem[]): WishlistState {
  const byId: Record<string, WishlistItem> = {};
  const ids: string[] = [];
  for (const item of items) {
    byId[item.id] = item;
    ids.push(item.id);
  }
  return { byId, ids };
}

// Orders intentionally seed in an error state to exercise the isolated
// section-failure UX required for account dashboards at this scale: one
// subsection failing must never take down the rest of the page.
const initialState: AccountState = {
  profile: MOCK_PROFILE,
  membership: MOCK_MEMBERSHIP,
  rewards: MOCK_REWARDS,
  orders: { status: 'error', error: 'We could not load your recent orders.', byId: {}, ids: [] },
  wishlist: normalizeWishlist(MOCK_WISHLIST),
  savedItems: MOCK_SAVED_ITEMS,
  recentlyViewed: MOCK_RECENTLY_VIEWED,
  cart: MOCK_CART,
  addresses: MOCK_ADDRESSES,
  paymentMethods: MOCK_PAYMENT_METHODS,
  notifications: normalizeNotifications(MOCK_NOTIFICATIONS),
  supportCases: MOCK_SUPPORT_CASES,
  security: MOCK_SECURITY,
  navigation: { selectedNavId: 'nav-overview' },
  ui: { mobileNavOpen: false, mobileSearchOpen: false },
};

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    ordersLoadSucceeded(state) {
      const normalized = normalizeOrders(MOCK_ORDERS);
      state.orders = { status: 'success', error: null, byId: normalized.byId, ids: normalized.ids };
    },
    markNotificationRead(state, action: PayloadAction<string>) {
      const notification = state.notifications.byId[action.payload];
      if (notification) notification.isRead = true;
    },
    markAllNotificationsRead(state) {
      for (const id of state.notifications.ids) state.notifications.byId[id].isRead = true;
    },
    removeWishlistItem(state, action: PayloadAction<string>) {
      state.wishlist.ids = state.wishlist.ids.filter((id) => id !== action.payload);
      delete state.wishlist.byId[action.payload];
    },
    clearRecentlyViewed(state) {
      state.recentlyViewed = [];
    },
    setSelectedNav(state, action: PayloadAction<string>) {
      state.navigation.selectedNavId = action.payload;
    },
    setMobileNavOpen(state, action: PayloadAction<boolean>) {
      state.ui.mobileNavOpen = action.payload;
    },
    setMobileSearchOpen(state, action: PayloadAction<boolean>) {
      state.ui.mobileSearchOpen = action.payload;
    },
  },
});

const {
  ordersLoadSucceeded,
  markNotificationRead,
  markAllNotificationsRead,
  removeWishlistItem,
  clearRecentlyViewed,
  setSelectedNav,
  setMobileNavOpen,
  setMobileSearchOpen,
} = accountSlice.actions;

const store = configureStore({
  reducer: { account: accountSlice.reducer },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Selectors -------------------------------------------------------------
const selectProfile = (state: RootState): AccountProfile => state.account.profile;
const selectMembership = (state: RootState): Membership => state.account.membership;
const selectRewards = (state: RootState): Reward[] => state.account.rewards;
const selectOrdersSection = (state: RootState): OrdersSectionState => state.account.orders;
const selectOrders = (state: RootState): OrderSummary[] =>
  state.account.orders.ids.map((id) => state.account.orders.byId[id]);
const selectWishlist = (state: RootState): WishlistItem[] =>
  state.account.wishlist.ids.map((id) => state.account.wishlist.byId[id]);
const selectSavedItems = (state: RootState): SavedItem[] => state.account.savedItems;
const selectRecentlyViewed = (state: RootState): RecentlyViewedProduct[] => state.account.recentlyViewed;
const selectCart = (state: RootState): CartSummary => state.account.cart;
const selectAddresses = (state: RootState): Address[] => state.account.addresses;
const selectPaymentMethods = (state: RootState): PaymentMethod[] => state.account.paymentMethods;
const selectNotifications = (state: RootState): Notification[] =>
  state.account.notifications.ids.map((id) => state.account.notifications.byId[id]);
const selectUnreadNotificationCount = (state: RootState): number =>
  state.account.notifications.ids.filter((id) => !state.account.notifications.byId[id].isRead).length;
const selectSupportCases = (state: RootState): SupportCase[] => state.account.supportCases;
const selectOpenSupportCaseCount = (state: RootState): number =>
  state.account.supportCases.filter((c) => c.status !== 'resolved').length;
const selectSecurity = (state: RootState): SecurityStatus => state.account.security;
const selectSelectedNavId = (state: RootState): string => state.account.navigation.selectedNavId;
const selectMobileNavOpen = (state: RootState): boolean => state.account.ui.mobileNavOpen;
const selectActiveOrderCount = (state: RootState): number =>
  Object.values(state.account.orders.byId).filter((o) =>
    ['processing', 'shipped', 'out_for_delivery'].includes(o.status),
  ).length;

/* ========================================================================
 * FORMATTING UTILITIES
 * ==================================================================== */

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function formatMoney(money: Money): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: money.currency }).format(
    money.amountMinor / 100,
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(iso),
  );
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: Tone }> = {
  processing: { label: 'Processing', tone: 'info' },
  shipped: { label: 'Shipped', tone: 'info' },
  out_for_delivery: { label: 'Out for delivery', tone: 'warning' },
  delivered: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  return_pending: { label: 'Return pending', tone: 'warning' },
  refund_pending: { label: 'Refund pending', tone: 'warning' },
};

const SUPPORT_STATUS_META: Record<SupportCaseStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'info' },
  awaiting_customer: { label: 'Awaiting your response', tone: 'warning' },
  awaiting_support: { label: 'Awaiting support', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
};

const PAYMENT_BRAND_LABEL: Record<PaymentBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  paypal: 'PayPal',
  bank_transfer: 'Bank transfer',
};

const TIER_LABEL: Record<MembershipTier, string> = {
  standard: 'Standard',
  plus: 'Plus',
  premium: 'Premium',
  vip: 'VIP',
};

function orderActionForStatus(status: OrderStatus): string {
  switch (status) {
    case 'processing':
      return 'View order';
    case 'shipped':
    case 'out_for_delivery':
      return 'Track order';
    case 'delivered':
      return 'Buy again';
    case 'return_pending':
      return 'View return';
    case 'refund_pending':
      return 'View refund';
    case 'cancelled':
      return 'View order';
    default:
      return 'View order';
  }
}

/* ========================================================================
 * SMALL PURPOSEFUL UI COMPONENTS
 * ==================================================================== */

type Tone = 'success' | 'warning' | 'info' | 'destructive' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-info/10 text-info border-info/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  neutral: 'bg-muted text-muted-foreground border-border',
};

const TONE_ICON: Record<Tone, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Clock3,
  destructive: AlertTriangle,
  neutral: Clock3,
};

function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  const Icon = TONE_ICON[tone];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        TONE_CLASSES[tone],
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function ProgressBar({
  value,
  label,
  detail,
}: {
  value: number;
  label: string;
  detail?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {detail ? <span className="text-xs text-muted-foreground">{detail}</span> : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function VerificationRow({
  label,
  status,
}: {
  label: string;
  status: VerificationStatus;
}) {
  const tone: Tone = status === 'verified' ? 'success' : status === 'pending' ? 'warning' : 'destructive';
  const text = status === 'verified' ? 'Verified' : status === 'pending' ? 'Pending' : 'Not verified';
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <StatusBadge label={text} tone={tone} />
    </li>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <Icon aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionHref ? (
        <a
          href={actionHref}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:underline"
        >
          {actionLabel}
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </div>
  );
}

function SectionErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 px-5 py-5">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle aria-hidden="true" className="h-4 w-4" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  );
}

function QuietButton({
  icon: Icon,
  children,
  onClick,
  href,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    'inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
  const content = (
    <>
      {Icon ? <Icon aria-hidden="true" className="h-3.5 w-3.5" /> : null}
      {children}
    </>
  );
  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

/* ========================================================================
 * HEADER DOMAIN COMPONENTS
 * ==================================================================== */

function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-primary px-4 py-2 text-center text-xs font-medium text-primary-foreground">
      <span>Free shipping on orders over $35, plus free returns for Plus members and above.</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="ml-2 rounded p-0.5 hover:bg-primary-foreground/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SearchBar({ id, className }: { id: string; className?: string }) {
  return (
    <form role="search" className={cx('relative w-full', className)} onSubmit={(e) => e.preventDefault()}>
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        type="search"
        placeholder="Search products, brands, and orders"
        className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
    </form>
  );
}

function HeaderActions({
  wishlistCount,
  cartCount,
  unreadCount,
}: {
  wishlistCount: number;
  cartCount: number;
  unreadCount: number;
}) {
  const iconLinkClass =
    'relative inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
  return (
    <div className="flex items-center gap-1">
      <a href="#notifications" className={iconLinkClass} aria-label={`Notifications, ${unreadCount} unread`}>
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unreadCount}
          </span>
        ) : null}
      </a>
      <a href="#shopping" className={iconLinkClass} aria-label={`Wishlist, ${wishlistCount} items`}>
        <Heart aria-hidden="true" className="h-5 w-5" />
        {wishlistCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {wishlistCount}
          </span>
        ) : null}
      </a>
      <a href="#shopping" className={iconLinkClass} aria-label={`Cart, ${cartCount} items`}>
        <ShoppingCart aria-hidden="true" className="h-5 w-5" />
        {cartCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {cartCount}
          </span>
        ) : null}
      </a>
      <span className={cx(iconLinkClass, 'bg-muted')} aria-hidden="true">
        <User className="h-5 w-5" />
      </span>
    </div>
  );
}

const CATEGORIES = ['Deals', 'Electronics', 'Home & Kitchen', 'Fashion', 'Outdoors', 'Beauty', 'Grocery'];

function CategoryNavigation() {
  return (
    <nav aria-label="Product categories" className="hidden border-t border-border/60 lg:block">
      <ul className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2 sm:px-6 lg:px-8">
        {CATEGORIES.map((category) => (
          <li key={category}>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-sm text-foreground/80 transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {category}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function EcommerceHeader() {
  const wishlistCount = useAppSelector((s) => selectWishlist(s).length);
  const cartCount = useAppSelector((s) => selectCart(s).itemCount);
  const unreadCount = useAppSelector(selectUnreadNotificationCount);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const desktopSearchId = useId();
  const mobileSearchId = useId();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <AnnouncementBar />
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
          aria-label="Open menu"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
        <a href="#overview" className="shrink-0 text-lg font-semibold tracking-tight text-foreground">
          Northgate<span className="text-primary">.</span>
        </a>
        <SearchBar id={desktopSearchId} className="mx-2 hidden max-w-xl md:block" />
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-expanded={mobileSearchOpen}
            aria-controls={mobileSearchId}
            aria-label="Toggle search"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
          >
            <Search aria-hidden="true" className="h-5 w-5" />
          </button>
          <HeaderActions wishlistCount={wishlistCount} cartCount={cartCount} unreadCount={unreadCount} />
        </div>
      </div>
      {mobileSearchOpen ? (
        <div id={mobileSearchId} className="border-t border-border/60 px-4 py-3 md:hidden">
          <SearchBar id={mobileSearchId + '-input'} />
        </div>
      ) : null}
      <CategoryNavigation />
    </header>
  );
}

function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 hover:text-foreground">
            <Home aria-hidden="true" className="h-3.5 w-3.5" />
            Home
          </a>
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        </li>
        <li aria-current="page" className="font-medium text-foreground">
          Account
        </li>
      </ol>
    </nav>
  );
}

/* ========================================================================
 * SIDEBAR / NAVIGATION DOMAIN COMPONENTS
 * ==================================================================== */

function AccountIdentity({ profile }: { profile: AccountProfile }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4">
      <div
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
      >
        {profile.avatarInitials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{profile.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
      </div>
    </div>
  );
}

function AccountNavigation({
  badgeCounts,
  selectedId,
  onNavigate,
}: {
  badgeCounts: Record<string, number>;
  selectedId: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <nav aria-label="Account" className="px-2 py-3">
      {NAV_GROUPS.map((group) => (
        <div key={group.id} className="mb-4 last:mb-0">
          <h3 className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h3>
          <ul>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isSelected = item.id === selectedId;
              const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : undefined;
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    aria-current={isSelected ? 'page' : undefined}
                    onClick={() => onNavigate(item.id)}
                    className={cx(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      isSelected
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badgeCount ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {badgeCount}
                      </span>
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function AccountSidebar({
  profile,
  badgeCounts,
  selectedId,
  onNavigate,
}: {
  profile: AccountProfile;
  badgeCounts: Record<string, number>;
  selectedId: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <aside className="hidden lg:block lg:w-72 lg:shrink-0">
      <div className={cx(CARD, 'sticky top-24 overflow-hidden')}>
        <AccountIdentity profile={profile} />
        <AccountNavigation badgeCounts={badgeCounts} selectedId={selectedId} onNavigate={onNavigate} />
      </div>
    </aside>
  );
}

function MobileAccountNav({
  profile,
  badgeCounts,
  selectedId,
  onNavigate,
}: {
  profile: AccountProfile;
  badgeCounts: Record<string, number>;
  selectedId: string;
  onNavigate: (id: string) => void;
}) {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectMobileNavOpen);
  const panelId = useId();

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => dispatch(setMobileNavOpen(!open))}
        className="mb-4 flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground"
      >
        <span>Account menu</span>
        <ChevronDown aria-hidden="true" className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div id={panelId} className={cx(CARD, 'mb-4 overflow-hidden')}>
          <AccountIdentity profile={profile} />
          <AccountNavigation
            badgeCounts={badgeCounts}
            selectedId={selectedId}
            onNavigate={(id) => {
              onNavigate(id);
              dispatch(setMobileNavOpen(false));
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ========================================================================
 * ACCOUNT OVERVIEW DOMAIN COMPONENTS
 * ==================================================================== */

function ProfileSummary({ profile }: { profile: AccountProfile }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground"
          >
            {profile.avatarInitials}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{profile.displayName}</h3>
            <p className="text-sm text-muted-foreground">Member since {formatDate(profile.memberSince)}</p>
          </div>
        </div>
        <QuietButton href="#footer-actions">Edit profile</QuietButton>
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Mail aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <dt className="sr-only">Email</dt>
          <dd className="text-sm text-foreground">{profile.email}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Smartphone aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <dt className="sr-only">Phone</dt>
          <dd className="text-sm text-foreground">{profile.phoneMasked}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <ProgressBar
          value={profile.profileCompletionPercent}
          label="Profile completeness"
          detail={`${profile.profileCompletionPercent}%`}
        />
      </div>
    </div>
  );
}

function AccountHealth({
  profile,
  security,
  hasAddress,
  hasPaymentMethod,
}: {
  profile: AccountProfile;
  security: SecurityStatus;
  hasAddress: boolean;
  hasPaymentMethod: boolean;
}) {
  return (
    <div>
      <h3 className={SECTION_TITLE}>Account health</h3>
      <ul className="mt-2 divide-y divide-border">
        <VerificationRow label="Email verification" status={profile.emailVerification} />
        <VerificationRow label="Phone verification" status={profile.phoneVerification} />
        <li className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm text-foreground">Two-factor authentication</span>
          <StatusBadge
            label={security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            tone={security.twoFactorEnabled ? 'success' : 'warning'}
          />
        </li>
        <li className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm text-foreground">Shipping address</span>
          <StatusBadge label={hasAddress ? 'Added' : 'Missing'} tone={hasAddress ? 'success' : 'warning'} />
        </li>
        <li className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm text-foreground">Payment method</span>
          <StatusBadge label={hasPaymentMethod ? 'Added' : 'Missing'} tone={hasPaymentMethod ? 'success' : 'warning'} />
        </li>
      </ul>
    </div>
  );
}

function MembershipSummary({ membership }: { membership: Membership }) {
  return (
    <div>
      <h3 className={SECTION_TITLE}>Membership</h3>
      <div className="mt-2 flex items-center gap-2">
        <Sparkles aria-hidden="true" className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Northgate {TIER_LABEL[membership.tier]}</span>
      </div>
      <p className={cx(MUTED, 'mt-1')}>
        {membership.isExpiringSoon ? 'Renews' : 'Renewed'} on {formatDate(membership.renewalDate)}
      </p>
      <p className="mt-3 text-sm text-foreground">{membership.pointsBalance.toLocaleString()} points</p>
    </div>
  );
}

function QuickActions() {
  return (
    <div>
      <h3 className={SECTION_TITLE}>Quick actions</h3>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.id}>
              <a
                href={action.href}
                className="flex h-full flex-col items-center gap-2 rounded-lg border border-border px-3 py-4 text-center text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Icon aria-hidden="true" className="h-5 w-5 text-primary" />
                {action.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AccountOverview() {
  const profile = useAppSelector(selectProfile);
  const security = useAppSelector(selectSecurity);
  const membership = useAppSelector(selectMembership);
  const hasAddress = useAppSelector((s) => selectAddresses(s).length > 0);
  const hasPaymentMethod = useAppSelector((s) => selectPaymentMethods(s).length > 0);

  return (
    <section id="overview" aria-labelledby="overview-heading" className="scroll-mt-24">
      <h2 id="overview-heading" className="sr-only">
        Account overview
      </h2>
      <div className={cx(CARD, CARD_PAD)}>
        <ProfileSummary profile={profile} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={cx(CARD, CARD_PAD)}>
          <AccountHealth profile={profile} security={security} hasAddress={hasAddress} hasPaymentMethod={hasPaymentMethod} />
        </div>
        <div className={cx(CARD, CARD_PAD)}>
          <MembershipSummary membership={membership} />
        </div>
        <div className={cx(CARD, CARD_PAD, 'md:col-span-1')}>
          <h3 className={SECTION_TITLE}>Cart</h3>
          <p className="mt-2 text-sm text-foreground">
            {MOCK_CART.itemCount} item{MOCK_CART.itemCount === 1 ? '' : 's'} &middot; {formatMoney(MOCK_CART.subtotal)}
          </p>
          <div className="mt-3">
            <QuietButton icon={ShoppingCart} href="#shopping">
              Go to cart
            </QuietButton>
          </div>
        </div>
      </div>
      <div className={cx(CARD, CARD_PAD, 'mt-4')}>
        <QuickActions />
      </div>
    </section>
  );
}

/* ========================================================================
 * ORDERS DOMAIN COMPONENTS
 * ==================================================================== */

function OrderCard({ order }: { order: OrderSummary }) {
  const meta = ORDER_STATUS_META[order.status];
  const sellerText = order.sellerCount > 1 ? `${order.sellerCount} sellers` : order.sellerName;
  return (
    <li className="flex flex-col gap-4 border-b border-border py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted" aria-hidden="true">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {order.items[0].productName}
            {order.itemCount > 1 ? ` + ${order.itemCount - 1} more item${order.itemCount - 1 > 1 ? 's' : ''}` : ''}
          </p>
          <p className={cx(MUTED, 'mt-0.5')}>
            {sellerText} &middot; Order #{order.orderNumber} &middot; Placed {formatDate(order.placedAt)}
          </p>
          {order.deliveredItemCount !== undefined ? (
            <p className="mt-0.5 text-xs text-warning">
              {order.deliveredItemCount} of {order.itemCount} items delivered so far
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge label={meta.label} tone={meta.tone} />
            {order.estimatedDelivery && order.status !== 'delivered' ? (
              <span className="text-xs text-muted-foreground">
                Est. delivery {formatDate(order.estimatedDelivery)}
              </span>
            ) : null}
            {order.deliveredAt ? (
              <span className="text-xs text-muted-foreground">Delivered {formatDate(order.deliveredAt)}</span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
        <span className="text-sm font-semibold text-foreground">{formatMoney(order.total)}</span>
        <QuietButton icon={order.status === 'delivered' ? RefreshCw : Truck}>
          {orderActionForStatus(order.status)}
        </QuietButton>
      </div>
    </li>
  );
}

function OrderStatusSummary({ orders }: { orders: OrderSummary[] }) {
  const activeCount = orders.filter((o) => ['processing', 'shipped', 'out_for_delivery'].includes(o.status)).length;
  const attentionCount = orders.filter((o) => ['return_pending', 'refund_pending'].includes(o.status)).length;
  return (
    <div className="mb-5 flex flex-wrap gap-4 border-b border-border pb-5 text-sm">
      <p>
        <span className="font-semibold text-foreground">{activeCount}</span>{' '}
        <span className="text-muted-foreground">active</span>
      </p>
      <p>
        <span className="font-semibold text-foreground">{attentionCount}</span>{' '}
        <span className="text-muted-foreground">need attention</span>
      </p>
      <p>
        <span className="font-semibold text-foreground">{orders.length}</span>{' '}
        <span className="text-muted-foreground">in the last 90 days</span>
      </p>
    </div>
  );
}

function OrderOverview() {
  const dispatch = useAppDispatch();
  const ordersSection = useAppSelector(selectOrdersSection);
  const orders = useAppSelector(selectOrders);

  return (
    <section id="orders" aria-labelledby="orders-heading" className="scroll-mt-24">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="orders-heading" className={SECTION_TITLE}>
          Orders
        </h2>
        {ordersSection.status === 'success' ? (
          <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-medium text-primary hover:underline">
            View all orders
          </a>
        ) : null}
      </div>
      <div className={cx(CARD, CARD_PAD)}>
        {ordersSection.status === 'error' ? (
          <SectionErrorState
            title="Orders failed to load"
            message={ordersSection.error ?? 'Something went wrong loading your orders.'}
            onRetry={() => dispatch(ordersLoadSucceeded())}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="When you place an order, it will show up here with real-time tracking."
            actionLabel="Start shopping"
            actionHref="#"
          />
        ) : (
          <>
            <OrderStatusSummary orders={orders} />
            <ul>
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

/* ========================================================================
 * SHOPPING DOMAIN COMPONENTS
 * ==================================================================== */

function WishlistSummary({ items }: { items: WishlistItem[] }) {
  const dispatch = useAppDispatch();
  const priceDropCount = items.filter((i) => i.hasPriceDrop).length;
  const outOfStockCount = items.filter((i) => !i.inStock).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className={SECTION_TITLE}>Wishlist</h3>
        <span className="text-xs text-muted-foreground">{items.length} items</span>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Heart} title="Your wishlist is empty" description="Save items you love to find them here later." />
      ) : (
        <>
          {(priceDropCount > 0 || outOfStockCount > 0) && (
            <p className="mt-2 text-xs text-muted-foreground">
              {priceDropCount > 0 ? `${priceDropCount} price drop${priceDropCount > 1 ? 's' : ''}` : null}
              {priceDropCount > 0 && outOfStockCount > 0 ? ' \u00b7 ' : null}
              {outOfStockCount > 0 ? `${outOfStockCount} out of stock` : null}
            </p>
          )}
          <ul className="mt-3 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{item.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{formatMoney(item.price)}</span>
                    {item.originalPrice ? (
                      <span className="text-xs text-muted-foreground line-through">{formatMoney(item.originalPrice)}</span>
                    ) : null}
                    {!item.inStock ? <span className="text-xs text-destructive">Out of stock</span> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch(removeWishlistItem(item.id))}
                  aria-label={`Remove ${item.name} from wishlist`}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SavedItemsSummary({ items }: { items: SavedItem[] }) {
  return (
    <div>
      <h3 className={SECTION_TITLE}>Saved for later</h3>
      {items.length === 0 ? (
        <EmptyState icon={Bookmark} title="Nothing saved yet" description="Items you save while browsing will appear here." />
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="text-sm text-foreground">
              {item.name} <span className="text-muted-foreground">&middot; {item.collectionName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecentlyViewedSummary({ items }: { items: RecentlyViewedProduct[] }) {
  const dispatch = useAppDispatch();
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className={SECTION_TITLE}>Recently viewed</h3>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={() => dispatch(clearRecentlyViewed())}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Clear history
          </button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className={cx(MUTED, 'mt-2')}>Products you view will show up here.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span className="truncate text-foreground">{item.name}</span>
              <span className="shrink-0 text-muted-foreground">{formatMoney(item.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CartSummaryPanel({ cart }: { cart: CartSummary }) {
  return (
    <div>
      <h3 className={SECTION_TITLE}>Cart</h3>
      <p className={cx(MUTED, 'mt-2')}>
        {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} ready for checkout
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{formatMoney(cart.subtotal)}</p>
      <div className="mt-3">
        <QuietButton icon={ShoppingCart}>Go to checkout</QuietButton>
      </div>
    </div>
  );
}

function ShoppingOverview() {
  const wishlist = useAppSelector(selectWishlist);
  const savedItems = useAppSelector(selectSavedItems);
  const recentlyViewed = useAppSelector(selectRecentlyViewed);
  const cart = useAppSelector(selectCart);

  return (
    <section id="shopping" aria-labelledby="shopping-heading" className="scroll-mt-24">
      <h2 id="shopping-heading" className={cx(SECTION_TITLE, 'mb-3')}>
        Shopping
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={cx(CARD, CARD_PAD)}>
          <WishlistSummary items={wishlist} />
        </div>
        <div className={cx(CARD, CARD_PAD)}>
          <CartSummaryPanel cart={cart} />
        </div>
        <div className={cx(CARD, CARD_PAD)}>
          <RecentlyViewedSummary items={recentlyViewed} />
        </div>
        <div className={cx(CARD, CARD_PAD)}>
          <SavedItemsSummary items={savedItems} />
        </div>
      </div>
    </section>
  );
}

/* ========================================================================
 * ADDRESS DOMAIN COMPONENTS
 * ==================================================================== */

function AddressOverview() {
  const addresses = useAppSelector(selectAddresses);
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  return (
    <section id="addresses" aria-labelledby="addresses-heading" className="scroll-mt-24">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="addresses-heading" className={SECTION_TITLE}>
          Addresses
        </h2>
        <QuietButton>Add address</QuietButton>
      </div>
      <div className={cx(CARD, CARD_PAD)}>
        {addresses.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No saved addresses"
            description="Add a shipping address to speed up checkout."
            actionLabel="Add an address"
            actionHref="#"
          />
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium capitalize text-foreground">{defaultAddress.type} address</p>
                {defaultAddress.isDefault ? <StatusBadge label="Default" tone="info" /> : null}
              </div>
              <address className="mt-1 not-italic text-sm text-muted-foreground">
                {defaultAddress.recipientName}
                <br />
                {defaultAddress.line1}
                <br />
                {defaultAddress.city}, {defaultAddress.region} {defaultAddress.postalCode}
                <br />
                {defaultAddress.country} &middot; {defaultAddress.phoneMasked}
              </address>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>
                {addresses.length} saved address{addresses.length === 1 ? '' : 'es'}
              </p>
              <QuietButton>Manage addresses</QuietButton>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ========================================================================
 * PAYMENT DOMAIN COMPONENTS
 * ==================================================================== */

function PaymentMethodRow({ method }: { method: PaymentMethod }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded border border-border bg-muted text-[11px] font-semibold text-muted-foreground">
          {PAYMENT_BRAND_LABEL[method.brand].slice(0, 4).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{method.label}</p>
          <p className="text-xs text-muted-foreground">
            Expires {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {method.isDefault ? <StatusBadge label="Default" tone="info" /> : null}
        {method.isExpired ? (
          <StatusBadge label="Expired" tone="destructive" />
        ) : method.isExpiringSoon ? (
          <StatusBadge label="Expiring soon" tone="warning" />
        ) : null}
      </div>
    </li>
  );
}

function PaymentOverview() {
  const paymentMethods = useAppSelector(selectPaymentMethods);

  return (
    <section id="payment" aria-labelledby="payment-heading" className="scroll-mt-24">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="payment-heading" className={SECTION_TITLE}>
          Payment methods
        </h2>
        <QuietButton>Add payment method</QuietButton>
      </div>
      <div className={cx(CARD, CARD_PAD)}>
        {paymentMethods.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payment methods saved"
            description="Add a card or bank account for faster checkout."
            actionLabel="Add a payment method"
            actionHref="#"
          />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {paymentMethods.map((method) => (
                <PaymentMethodRow key={method.id} method={method} />
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-success" />
              Payment details are encrypted. We never show full card numbers.
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ========================================================================
 * MEMBERSHIP DOMAIN COMPONENTS
 * ==================================================================== */

function MembershipSection() {
  const membership = useAppSelector(selectMembership);
  const rewards = useAppSelector(selectRewards);

  return (
    <section id="membership" aria-labelledby="membership-heading" className="scroll-mt-24">
      <h2 id="membership-heading" className={cx(SECTION_TITLE, 'mb-3')}>
        Membership & rewards
      </h2>
      <div className={cx(CARD, CARD_PAD)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="h-5 w-5 text-primary" />
            <span className="text-base font-semibold text-foreground">Northgate {TIER_LABEL[membership.tier]}</span>
          </div>
          {membership.isExpiringSoon ? (
            <StatusBadge label={`Renews ${formatDate(membership.renewalDate)}`} tone="warning" />
          ) : (
            <span className="text-sm text-muted-foreground">Renews {formatDate(membership.renewalDate)}</span>
          )}
        </div>
        {membership.nextTier ? (
          <div className="mt-4">
            <ProgressBar
              value={membership.progressPercent}
              label={`Progress to ${TIER_LABEL[membership.nextTier]}`}
              detail={`${membership.pointsToNextTier} points to go`}
            />
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{membership.pointsBalance.toLocaleString()}</span> reward points available
          </p>
          <QuietButton icon={Gift}>Manage membership</QuietButton>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {rewards.map((reward) => (
            <li key={reward.id} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">{reward.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{reward.description}</p>
              <p className="mt-2 text-xs font-medium text-primary">
                {reward.pointsCost > 0 ? `${reward.pointsCost.toLocaleString()} points` : 'Included in your tier'}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ========================================================================
 * SECURITY DOMAIN COMPONENTS
 * ==================================================================== */

function SecurityOverview() {
  const security = useAppSelector(selectSecurity);

  return (
    <section id="security" aria-labelledby="security-heading" className="scroll-mt-24">
      <h2 id="security-heading" className={cx(SECTION_TITLE, 'mb-3')}>
        Security
      </h2>
      <div className={cx(CARD, CARD_PAD)}>
        {security.hasAlert ? (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-warning/25 bg-warning/10 px-3 py-2.5">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium text-foreground">Security alert</p>
              <p className="text-sm text-muted-foreground">{security.alertMessage}</p>
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <ProgressBar value={security.score} label="Security score" detail={`${security.score}/100`} />
            <ul className="mt-4 divide-y divide-border">
              <VerificationRow label="Email verification" status={security.emailVerification} />
              <VerificationRow label="Phone verification" status={security.phoneVerification} />
              <li className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-foreground">Two-factor authentication</span>
                <StatusBadge
                  label={security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  tone={security.twoFactorEnabled ? 'success' : 'warning'}
                />
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Sessions & activity</h3>
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Active sessions</dt>
                <dd className="font-medium text-foreground">{security.activeSessionCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Last sign-in</dt>
                <dd className="font-medium text-foreground">{formatDateTime(security.lastLoginAt)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="font-medium text-foreground">{security.lastLoginLocation}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Password last changed</dt>
                <dd className="font-medium text-foreground">{security.passwordLastChangedDaysAgo} days ago</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {!security.twoFactorEnabled ? <QuietButton icon={ShieldCheck}>Enable 2FA</QuietButton> : null}
              <QuietButton icon={KeyRound}>Review sessions</QuietButton>
              <QuietButton icon={Lock}>Change password</QuietButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================
 * NOTIFICATIONS DOMAIN COMPONENTS
 * ==================================================================== */

const NOTIFICATION_ICON: Record<NotificationCategory, LucideIcon> = {
  order: Package,
  delivery: Truck,
  promotion: Gift,
  security: ShieldCheck,
  system: Bell,
};

function NotificationRow({ notification }: { notification: Notification }) {
  const dispatch = useAppDispatch();
  const Icon = NOTIFICATION_ICON[notification.category];
  return (
    <li className={cx('flex items-start gap-3 px-1 py-3', !notification.isRead && 'bg-primary/5')}>
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{notification.title}</p>
          {!notification.isRead ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          ) : null}
          {!notification.isRead ? <span className="sr-only">Unread</span> : null}
        </div>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
      </div>
      {!notification.isRead ? (
        <button
          type="button"
          onClick={() => dispatch(markNotificationRead(notification.id))}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Mark read
        </button>
      ) : null}
    </li>
  );
}

function NotificationOverview() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadNotificationCount);

  return (
    <section id="notifications" aria-labelledby="notifications-heading" className="scroll-mt-24">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="notifications-heading" className={SECTION_TITLE}>
          Notifications
          {unreadCount > 0 ? <span className="ml-2 text-sm font-normal text-muted-foreground">({unreadCount} unread)</span> : null}
        </h2>
        <div className="flex items-center gap-3">
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => dispatch(markAllNotificationsRead())}
              className="text-sm font-medium text-primary hover:underline"
            >
              Mark all as read
            </button>
          ) : null}
          <QuietButton icon={Settings}>Preferences</QuietButton>
        </div>
      </div>
      <div className={cx(CARD, CARD_PAD)}>
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="You're all caught up" description="New order and account updates will appear here." />
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ========================================================================
 * SUPPORT DOMAIN COMPONENTS
 * ==================================================================== */

function SupportCaseRow({ supportCase }: { supportCase: SupportCase }) {
  const meta = SUPPORT_STATUS_META[supportCase.status];
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">
          Case #{supportCase.caseNumber} &middot; {supportCase.subject}
        </p>
        <p className="text-xs text-muted-foreground">
          Updated {formatDate(supportCase.updatedAt)}
          {supportCase.relatedOrderNumber ? ` \u00b7 Order #${supportCase.relatedOrderNumber}` : ''}
        </p>
      </div>
      <StatusBadge label={meta.label} tone={meta.tone} />
    </li>
  );
}

function SupportOverview() {
  const supportCases = useAppSelector(selectSupportCases);

  return (
    <section id="support" aria-labelledby="support-heading" className="scroll-mt-24">
      <h2 id="support-heading" className={cx(SECTION_TITLE, 'mb-3')}>
        Support
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={cx(CARD, CARD_PAD)}>
          <h3 className="text-sm font-semibold text-foreground">Help center</h3>
          <p className={cx(MUTED, 'mt-1')}>Find answers about orders, returns, shipping, and account settings.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <QuietButton icon={MessageCircle}>Browse help topics</QuietButton>
            <QuietButton icon={PhoneCall}>Contact support</QuietButton>
          </div>
        </div>
        <div className={cx(CARD, CARD_PAD)}>
          <h3 className="text-sm font-semibold text-foreground">Your support cases</h3>
          {supportCases.length === 0 ? (
            <EmptyState icon={MessageCircle} title="No open cases" description="Any support requests you open will be tracked here." />
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {supportCases.map((supportCase) => (
                <SupportCaseRow key={supportCase.id} supportCase={supportCase} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ========================================================================
 * FOOTER ACTIONS
 * ==================================================================== */

function AccountFooterActions() {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmHeadingRef = useRef<HTMLHeadingElement>(null);

  return (
    <section id="footer-actions" aria-labelledby="footer-actions-heading" className="scroll-mt-24">
      <h2 id="footer-actions-heading" className="sr-only">
        Account controls
      </h2>
      <div className={cx(CARD, CARD_PAD)}>
        <div className="flex flex-wrap gap-2">
          <QuietButton icon={Lock}>Privacy settings</QuietButton>
          <QuietButton icon={Eye}>Download my data</QuietButton>
          <QuietButton>Terms of service</QuietButton>
          <QuietButton icon={LogOut}>Sign out</QuietButton>
        </div>
        <div className="mt-6 border-t border-destructive/20 pt-5">
          <h3 className="text-sm font-semibold text-destructive">Delete account</h3>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Permanently deletes your profile, order history, and saved information. This cannot be undone.
          </p>
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => {
                setConfirmingDelete(true);
                requestAnimationFrame(() => confirmHeadingRef.current?.focus());
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              Delete account
            </button>
          ) : (
            <div role="alertdialog" aria-labelledby="delete-confirm-heading" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <h4
                id="delete-confirm-heading"
                ref={confirmHeadingRef}
                tabIndex={-1}
                className="text-sm font-semibold text-destructive focus:outline-none"
              >
                Are you sure you want to delete your account?
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Type your intent to confirm. This action is permanent and cannot be reversed.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90"
                >
                  Permanently delete account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ========================================================================
 * FOOTER (SITE-LEVEL)
 * ==================================================================== */

function EcommerceFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Shop</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Deals</li>
            <li>New arrivals</li>
            <li>Gift cards</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Customer service</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Help center</li>
            <li>Returns</li>
            <li>Shipping info</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Company</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>About Northgate</li>
            <li>Careers</li>
            <li>Sustainability</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Privacy policy</li>
            <li>Terms of service</li>
            <li>Accessibility</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
        &copy; {new Date().getFullYear()} Northgate Commerce, Inc. All rights reserved.
      </div>
    </footer>
  );
}

/* ========================================================================
 * LAYOUT
 * ==================================================================== */

function AccountHeader({ profile }: { profile: AccountProfile }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your account</h1>
        <p className={MUTED}>Welcome back, {profile.displayName.split(' ')[0]}.</p>
      </div>
    </div>
  );
}

function AccountMain({ profile }: { profile: AccountProfile }) {
  return (
    <div className="min-w-0 flex-1">
      <AccountHeader profile={profile} />
      <div className="flex flex-col gap-8">
        <AccountOverview />
        <OrderOverview />
        <ShoppingOverview />
        <PaymentOverview />
        <AddressOverview />
        <MembershipSection />
        <SecurityOverview />
        <NotificationOverview />
        <SupportOverview />
        <AccountFooterActions />
      </div>
    </div>
  );
}

function AccountLayout() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectProfile);
  const selectedNavId = useAppSelector(selectSelectedNavId);
  const activeOrderCount = useAppSelector(selectActiveOrderCount);
  const wishlistCount = useAppSelector((s) => selectWishlist(s).length);
  const unreadCount = useAppSelector(selectUnreadNotificationCount);
  const openSupportCount = useAppSelector(selectOpenSupportCaseCount);

  const badgeCounts: Record<string, number> = {
    orders: activeOrderCount,
    wishlist: wishlistCount,
    notifications: unreadCount,
    support: openSupportCount,
  };

  const handleNavigate = (id: string) => {
    dispatch(setSelectedNav(id));
  };

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <AccountSidebar profile={profile} badgeCounts={badgeCounts} selectedId={selectedNavId} onNavigate={handleNavigate} />
      <div className="min-w-0 flex-1">
        <MobileAccountNav profile={profile} badgeCounts={badgeCounts} selectedId={selectedNavId} onNavigate={handleNavigate} />
        <AccountMain profile={profile} />
      </div>
    </div>
  );
}

/* ========================================================================
 * PAGE (DEFAULT EXPORT)
 * ==================================================================== */

function AccountPageContent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EcommerceHeader />
      <Breadcrumbs />
      <AccountLayout />
      <EcommerceFooter />
    </div>
  );
}

export default function AccountPage() {
  return (
    <Provider store={store}>
      <AccountPageContent />
    </Provider>
  );
}