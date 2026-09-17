"use client";

/**
 * ============================================================================
 * NOTIFICATIONS & SUPPORT WORKSPACE
 * ----------------------------------------------------------------------------
 * A centralized customer workspace for notifications, notification
 * preferences, support tickets, and the help center, built for a global
 * ecommerce platform. Paired with globals.css for the design system.
 *
 * File organization (top to bottom):
 *   imports → types → unions → constants → mock data → redux (state,
 *   reducers, selectors) → utilities → notification components →
 *   support components → help components → dialogs/forms →
 *   workspace components → header/footer → NotificationSupportPage
 * ============================================================================
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  configureStore,
  createSlice,
  createSelector,
  combineReducers,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import {
  Bell,
  Search,
  X,
  Check,
  CheckCheck,
  Archive,
  Trash2,
  ChevronDown,
  ChevronRight,
  Menu,
  User,
  Heart,
  ShoppingCart,
  MapPin,
  Package,
  Truck,
  CreditCard,
  Undo2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Tag,
  TrendingDown,
  PackageCheck,
  Star,
  Info,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  MessageCircle,
  Phone,
  Mail,
  LifeBuoy,
  HelpCircle,
  Paperclip,
  Send,
  Loader2,
  Plus,
  ExternalLink,
  Clock,
  CalendarDays,
  Building2,
  FileText,
  Image as ImageIcon,
  Download,
  RefreshCw,
  CircleDot,
  Lock,
  Sparkles,
  Globe2,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Settings,
  type LucideIcon,
} from "lucide-react";

// ============================================================================
// TYPES — NOTIFICATIONS
// ============================================================================

type NotificationCategory =
  | "Orders"
  | "Delivery"
  | "Payments"
  | "Returns"
  | "Refunds"
  | "Security"
  | "Account"
  | "Promotions"
  | "PriceAlerts"
  | "StockAlerts"
  | "Reviews"
  | "System";

type NotificationType =
  | "OrderConfirmed"
  | "OrderUpdated"
  | "ShipmentCreated"
  | "OutForDelivery"
  | "Delivered"
  | "PaymentSuccessful"
  | "PaymentFailed"
  | "RefundProcessed"
  | "ReturnRequested"
  | "ReturnUpdated"
  | "SecurityAlert"
  | "AccountActivity"
  | "PriceDrop"
  | "BackInStock"
  | "Promotion"
  | "ReviewReminder"
  | "SystemNotice";

/**
 * Single lifecycle field rather than independent booleans (isRead / isArchived
 * / isActionRequired), which could otherwise disagree with each other.
 * "ActionRequired" outranks Unread/Read in the UI until the customer resolves
 * or dismisses it; "Archived" is terminal.
 */
type NotificationStatus = "Unread" | "Read" | "Archived" | "ActionRequired";

type NotificationPriority = "Low" | "Normal" | "High" | "Critical";

/** Drives the contextual call-to-action shown on a card/detail view. */
type NotificationActionType =
  | "view-order"
  | "track-shipment"
  | "view-refund"
  | "review-product"
  | "update-payment"
  | "secure-account"
  | "view-details";

interface Notification {
  id: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  source: string;
  /** References only — related domain objects are never embedded. */
  relatedOrderId?: string;
  relatedProductId?: string;
  actionType?: NotificationActionType;
}

// ============================================================================
// TYPES — SUPPORT
// ============================================================================

type SupportTicketCategory =
  | "Order"
  | "Delivery"
  | "Payment"
  | "Return"
  | "Refund"
  | "Product"
  | "Seller"
  | "Account"
  | "Security"
  | "Technical"
  | "Other";

type SupportTicketPriority = "Low" | "Normal" | "High" | "Urgent";

type SupportTicketStatus =
  | "Open"
  | "InProgress"
  | "WaitingForCustomer"
  | "WaitingForSupport"
  | "Resolved"
  | "Closed"
  | "Reopened";

interface SupportTicket {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  assignedTeam?: string;
  messageCount: number;
}

type SupportMessageAuthor =
  | { kind: "customer"; name: string }
  | { kind: "agent"; name: string; team: string }
  | { kind: "system" };

interface SupportAttachment {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

interface SupportMessage {
  id: string;
  ticketId: string;
  author: SupportMessageAuthor;
  body: string;
  createdAt: string;
  attachments: SupportAttachment[];
}

/** Discriminated union — each timeline event carries only the fields it needs. */
type SupportTimelineEvent =
  | { id: string; ticketId: string; kind: "created"; at: string }
  | { id: string; ticketId: string; kind: "assigned"; at: string; team: string }
  | { id: string; ticketId: string; kind: "agent-replied"; at: string; agentName: string }
  | { id: string; ticketId: string; kind: "customer-replied"; at: string }
  | { id: string; ticketId: string; kind: "status-changed"; at: string; from: SupportTicketStatus; to: SupportTicketStatus }
  | { id: string; ticketId: string; kind: "attachment-added"; at: string; fileName: string }
  | { id: string; ticketId: string; kind: "resolved"; at: string }
  | { id: string; ticketId: string; kind: "reopened"; at: string };

// ============================================================================
// TYPES — PREFERENCES
// ============================================================================

type NotificationChannel = "Email" | "Push" | "SMS" | "InApp";

type DigestFrequency = "Instant" | "Daily" | "Weekly" | "Off";

type PreferenceCategory =
  | "Orders"
  | "Delivery"
  | "Payments"
  | "Returns"
  | "Refunds"
  | "Promotions"
  | "PriceAlerts"
  | "StockAlerts"
  | "Security"
  | "Reviews";

interface PreferenceCategorySetting {
  channels: Record<NotificationChannel, boolean>;
  digest: DigestFrequency;
}

// ============================================================================
// TYPES — HELP CENTER
// ============================================================================

type HelpCategory =
  | "Orders"
  | "Payments"
  | "Shipping"
  | "Delivery"
  | "Returns"
  | "Refunds"
  | "Account"
  | "Security"
  | "Products"
  | "SellerIssues";

interface HelpArticle {
  id: string;
  title: string;
  category: HelpCategory;
  summary: string;
  popularity: number;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: HelpCategory;
}

// ============================================================================
// TYPES — SHARED UI / OPERATION MODELING
// ============================================================================

/** Coherent async status for every mutating flow — no independent booleans. */
type OperationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string };

type NotificationQuickFilter =
  | "All"
  | "Unread"
  | "Orders"
  | "Delivery"
  | "Payments"
  | "Returns"
  | "Refunds"
  | "Security"
  | "Promotions"
  | "PriceAlerts"
  | "StockAlerts"
  | "System";

type NotificationReadFilter = "all" | "unread" | "read";

type NotificationSort = "newest" | "oldest" | "unread-first" | "highest-priority";

interface NotificationFilterState {
  quickFilter: NotificationQuickFilter;
  readFilter: NotificationReadFilter;
}

type SupportStatusTab = "All" | SupportTicketStatus;

type SupportSort = "newest" | "oldest" | "priority" | "status";

interface SupportFilterState {
  statusTab: SupportStatusTab;
  category: SupportTicketCategory | "All";
  priority: SupportTicketPriority | "All";
}

/** Primary section switcher for the workspace sidebar. */
type WorkspaceSection = "notifications" | "preferences" | "support-overview" | "support-tickets" | "help-center";

/** Where a new support ticket originated from, when launched contextually. */
type SupportOrigin =
  | { kind: "order"; orderId: string }
  | { kind: "product"; productId: string }
  | { kind: "payment" }
  | { kind: "return" }
  | { kind: "refund" }
  | { kind: "account" }
  | { kind: "security" }
  | { kind: "general" };

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPPORT_EMAIL = "support@meridianmarket.com";
const SUPPORT_PHONE = "+1 (800) 555-0142";

interface StatusVisual {
  label: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  icon: LucideIcon;
}

const NOTIFICATION_CATEGORY_META: Record<NotificationCategory, { label: string; icon: LucideIcon }> = {
  Orders: { label: "Orders", icon: Package },
  Delivery: { label: "Delivery", icon: Truck },
  Payments: { label: "Payments", icon: CreditCard },
  Returns: { label: "Returns", icon: RotateCcw },
  Refunds: { label: "Refunds", icon: Undo2 },
  Security: { label: "Security", icon: ShieldAlert },
  Account: { label: "Account", icon: User },
  Promotions: { label: "Promotions", icon: Tag },
  PriceAlerts: { label: "Price Alerts", icon: TrendingDown },
  StockAlerts: { label: "Stock Alerts", icon: PackageCheck },
  Reviews: { label: "Reviews", icon: Star },
  System: { label: "System", icon: Info },
};

const NOTIFICATION_TYPE_META: Record<NotificationType, { icon: LucideIcon }> = {
  OrderConfirmed: { icon: PackageCheck },
  OrderUpdated: { icon: Package },
  ShipmentCreated: { icon: Truck },
  OutForDelivery: { icon: Truck },
  Delivered: { icon: PackageCheck },
  PaymentSuccessful: { icon: CreditCard },
  PaymentFailed: { icon: AlertCircle },
  RefundProcessed: { icon: Undo2 },
  ReturnRequested: { icon: RotateCcw },
  ReturnUpdated: { icon: RotateCcw },
  SecurityAlert: { icon: ShieldAlert },
  AccountActivity: { icon: User },
  PriceDrop: { icon: TrendingDown },
  BackInStock: { icon: PackageCheck },
  Promotion: { icon: Tag },
  ReviewReminder: { icon: Star },
  SystemNotice: { icon: Info },
};

const NOTIFICATION_PRIORITY_META: Record<NotificationPriority, StatusVisual> = {
  Low: { label: "Low priority", tone: "neutral", icon: CircleDot },
  Normal: { label: "Normal", tone: "info", icon: CircleDot },
  High: { label: "High priority", tone: "warning", icon: AlertTriangle },
  Critical: { label: "Critical", tone: "danger", icon: AlertCircle },
};

const NOTIFICATION_STATUS_META: Record<NotificationStatus, StatusVisual> = {
  Unread: { label: "Unread", tone: "info", icon: CircleDot },
  Read: { label: "Read", tone: "neutral", icon: Check },
  Archived: { label: "Archived", tone: "neutral", icon: Archive },
  ActionRequired: { label: "Action required", tone: "warning", icon: AlertTriangle },
};

const NOTIFICATION_ACTION_META: Record<NotificationActionType, { label: string; icon: LucideIcon }> = {
  "view-order": { label: "View order", icon: Package },
  "track-shipment": { label: "Track shipment", icon: Truck },
  "view-refund": { label: "View refund", icon: Undo2 },
  "review-product": { label: "Write a review", icon: Star },
  "update-payment": { label: "Update payment method", icon: CreditCard },
  "secure-account": { label: "Secure my account", icon: ShieldCheck },
  "view-details": { label: "View details", icon: ExternalLink },
};

const NOTIFICATION_QUICK_FILTERS: NotificationQuickFilter[] = [
  "All",
  "Unread",
  "Orders",
  "Delivery",
  "Payments",
  "Returns",
  "Refunds",
  "Security",
  "Promotions",
  "PriceAlerts",
  "StockAlerts",
  "System",
];

const NOTIFICATION_SORT_OPTIONS: { value: NotificationSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "unread-first", label: "Unread first" },
  { value: "highest-priority", label: "Highest priority" },
];

const SUPPORT_CATEGORY_META: Record<SupportTicketCategory, { label: string; icon: LucideIcon }> = {
  Order: { label: "Order", icon: Package },
  Delivery: { label: "Delivery", icon: Truck },
  Payment: { label: "Payment", icon: CreditCard },
  Return: { label: "Return", icon: RotateCcw },
  Refund: { label: "Refund", icon: Undo2 },
  Product: { label: "Product", icon: Tag },
  Seller: { label: "Seller", icon: Building2 },
  Account: { label: "Account", icon: User },
  Security: { label: "Security", icon: ShieldAlert },
  Technical: { label: "Technical", icon: RefreshCw },
  Other: { label: "Other", icon: HelpCircle },
};

const SUPPORT_PRIORITY_META: Record<SupportTicketPriority, StatusVisual> = {
  Low: { label: "Low", tone: "neutral", icon: CircleDot },
  Normal: { label: "Normal", tone: "info", icon: CircleDot },
  High: { label: "High", tone: "warning", icon: AlertTriangle },
  Urgent: { label: "Urgent", tone: "danger", icon: AlertCircle },
};

const SUPPORT_STATUS_META: Record<SupportTicketStatus, StatusVisual> = {
  Open: { label: "Open", tone: "info", icon: CircleDot },
  InProgress: { label: "In progress", tone: "info", icon: RefreshCw },
  WaitingForCustomer: { label: "Waiting for you", tone: "warning", icon: Clock },
  WaitingForSupport: { label: "Waiting for support", tone: "neutral", icon: Clock },
  Resolved: { label: "Resolved", tone: "success", icon: Check },
  Closed: { label: "Closed", tone: "neutral", icon: Archive },
  Reopened: { label: "Reopened", tone: "warning", icon: RotateCcw },
};

const SUPPORT_STATUS_TABS: SupportStatusTab[] = ["All", "Open", "InProgress", "WaitingForCustomer", "WaitingForSupport", "Resolved", "Closed", "Reopened"];

const SUPPORT_SORT_OPTIONS: { value: SupportSort; label: string }[] = [
  { value: "newest", label: "Most recent activity" },
  { value: "oldest", label: "Oldest activity" },
  { value: "priority", label: "Highest priority" },
  { value: "status", label: "Status" },
];

const HELP_CATEGORY_META: Record<HelpCategory, { label: string; icon: LucideIcon }> = {
  Orders: { label: "Orders", icon: Package },
  Payments: { label: "Payments", icon: CreditCard },
  Shipping: { label: "Shipping", icon: Truck },
  Delivery: { label: "Delivery", icon: MapPin },
  Returns: { label: "Returns", icon: RotateCcw },
  Refunds: { label: "Refunds", icon: Undo2 },
  Account: { label: "Account", icon: User },
  Security: { label: "Security", icon: ShieldAlert },
  Products: { label: "Products", icon: Tag },
  SellerIssues: { label: "Seller issues", icon: Building2 },
};

const PREFERENCE_CATEGORY_META: Record<PreferenceCategory, { label: string; description: string }> = {
  Orders: { label: "Order updates", description: "Confirmations, status changes, and cancellations." },
  Delivery: { label: "Delivery updates", description: "Shipping, out-for-delivery, and delivered notices." },
  Payments: { label: "Payments", description: "Successful charges, failed payments, and receipts." },
  Returns: { label: "Returns", description: "Return requests and pickup/drop-off updates." },
  Refunds: { label: "Refunds", description: "Refund issued and refund status changes." },
  Promotions: { label: "Promotions", description: "Sales, coupons, and personalized offers." },
  PriceAlerts: { label: "Price alerts", description: "Price drops on items in your wishlist." },
  StockAlerts: { label: "Stock alerts", description: "Back-in-stock notices for saved items." },
  Security: { label: "Security", description: "Sign-in alerts and account protection notices." },
  Reviews: { label: "Review reminders", description: "Requests to review items you've purchased." },
};

const NOTIFICATION_CHANNELS: NotificationChannel[] = ["Email", "Push", "SMS", "InApp"];

const DIGEST_OPTIONS: { value: DigestFrequency; label: string }[] = [
  { value: "Instant", label: "Instant" },
  { value: "Daily", label: "Daily digest" },
  { value: "Weekly", label: "Weekly digest" },
  { value: "Off", label: "Off" },
];

// ============================================================================
// UTILITIES (pure functions)
// ============================================================================

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = createSeededRandom(19980512);
const randInt = (min: number, max: number) => Math.floor(min + rng() * (max - min + 1));
const pick = <T,>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)];

function hoursAgoIso(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}
function daysAgoIso(days: number, hourJitter = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hourJitter);
  return d.toISOString();
}

function formatRelativeTime(iso: string, nowMs: number): string {
  const diffMs = nowMs - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ============================================================================
// MOCK DATA
// Structurally realistic and reference-based — notifications/tickets store
// IDs only; small lookup maps resolve display labels without duplicating
// full Order/Product domain objects.
// ============================================================================

interface OrderReference {
  id: string;
  orderNumber: string;
  itemSummary: string;
  total: number;
  deliveredOrExpected: string;
}

interface ProductReference {
  id: string;
  name: string;
  brand: string;
}

const MOCK_ORDER_LOOKUP: Record<string, OrderReference> = {
  "ORD-88213904": { id: "ORD-88213904", orderNumber: "#88213904", itemSummary: "Aro Ceramic Nonstick Cookware Set (10-pc)", total: 189.99, deliveredOrExpected: "Delivered Sep 8" },
  "ORD-88209117": { id: "ORD-88209117", orderNumber: "#88209117", itemSummary: "Northline Trail Runner Jacket, Slate", total: 94.5, deliveredOrExpected: "Arriving Sep 15" },
  "ORD-88198822": { id: "ORD-88198822", orderNumber: "#88198822", itemSummary: "Kestrel 2-in-1 Cordless Stick Vacuum", total: 219.0, deliveredOrExpected: "Delivered Aug 29" },
  "ORD-88176430": { id: "ORD-88176430", orderNumber: "#88176430", itemSummary: "Fjord Wool Blend Throw Blanket", total: 58.25, deliveredOrExpected: "Delivered Aug 21" },
  "ORD-88231005": { id: "ORD-88231005", orderNumber: "#88231005", itemSummary: "Anchorpoint 27\" 4K Monitor", total: 342.0, deliveredOrExpected: "Processing" },
  "ORD-88165590": { id: "ORD-88165590", orderNumber: "#88165590", itemSummary: "Solace Down-Alternative Pillow (2-pack)", total: 44.99, deliveredOrExpected: "Delivered Aug 12" },
};

const MOCK_PRODUCT_LOOKUP: Record<string, ProductReference> = {
  "PRD-41029": { id: "PRD-41029", name: "Northline Trail Runner Jacket", brand: "Northline" },
  "PRD-38810": { id: "PRD-38810", name: "Kestrel 2-in-1 Cordless Stick Vacuum", brand: "Kestrel" },
  "PRD-22947": { id: "PRD-22947", name: "Aro Ceramic Nonstick Cookware Set", brand: "Aro" },
  "PRD-50213": { id: "PRD-50213", name: "Verve Noise-Cancelling Headphones", brand: "Verve" },
  "PRD-19064": { id: "PRD-19064", name: "Anchorpoint 27\" 4K Monitor", brand: "Anchorpoint" },
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "NTF-100231",
    category: "Security",
    type: "SecurityAlert",
    title: "New sign-in from an unrecognized device",
    message: "We noticed a sign-in to your account from a new device in Portland, OR. If this wasn't you, secure your account immediately.",
    createdAt: hoursAgoIso(1),
    priority: "Critical",
    status: "ActionRequired",
    source: "Account Security",
    actionType: "secure-account",
  },
  {
    id: "NTF-100230",
    category: "Payments",
    type: "PaymentFailed",
    title: "We couldn't process your payment",
    message: "Your card ending in 4417 was declined for order #88231005. Update your payment method to avoid delaying your shipment.",
    createdAt: hoursAgoIso(3),
    priority: "High",
    status: "ActionRequired",
    source: "Payments",
    relatedOrderId: "ORD-88231005",
    actionType: "update-payment",
  },
  {
    id: "NTF-100229",
    category: "Delivery",
    type: "OutForDelivery",
    title: "Your package is out for delivery",
    message: "Order #88209117 is on its way and should arrive by 8:00 PM today.",
    createdAt: hoursAgoIso(4),
    priority: "Normal",
    status: "Unread",
    source: "Shipping Carrier",
    relatedOrderId: "ORD-88209117",
    actionType: "track-shipment",
  },
  {
    id: "NTF-100228",
    category: "Orders",
    type: "OrderConfirmed",
    title: "Order confirmed",
    message: "Thanks for your order! We've confirmed #88231005 and will notify you once it ships.",
    createdAt: hoursAgoIso(6),
    priority: "Normal",
    status: "Unread",
    source: "Order System",
    relatedOrderId: "ORD-88231005",
    actionType: "view-order",
  },
  {
    id: "NTF-100227",
    category: "PriceAlerts",
    type: "PriceDrop",
    title: "Price drop on an item in your wishlist",
    message: "Verve Noise-Cancelling Headphones dropped from $249.00 to $189.00 — 24% off.",
    createdAt: hoursAgoIso(9),
    priority: "Normal",
    status: "Unread",
    source: "Wishlist Alerts",
    relatedProductId: "PRD-50213",
    actionType: "view-details",
  },
  {
    id: "NTF-100226",
    category: "Refunds",
    type: "RefundProcessed",
    title: "Refund processed",
    message: "A refund of $58.25 for order #88176430 has been issued to your original payment method. Funds typically appear within 5–7 business days.",
    createdAt: daysAgoIso(1, 2),
    priority: "Normal",
    status: "Read",
    source: "Refunds",
    relatedOrderId: "ORD-88176430",
    actionType: "view-refund",
  },
  {
    id: "NTF-100225",
    category: "Returns",
    type: "ReturnUpdated",
    title: "Your return has been received",
    message: "We've received your returned item from order #88176430 at our fulfillment center. Your refund is being processed.",
    createdAt: daysAgoIso(2, 5),
    priority: "Normal",
    status: "Read",
    source: "Returns",
    relatedOrderId: "ORD-88176430",
    actionType: "view-order",
  },
  {
    id: "NTF-100224",
    category: "Delivery",
    type: "Delivered",
    title: "Delivered",
    message: "Order #88213904 was delivered and left at the front door.",
    createdAt: daysAgoIso(3, 1),
    priority: "Low",
    status: "Read",
    source: "Shipping Carrier",
    relatedOrderId: "ORD-88213904",
    actionType: "view-order",
  },
  {
    id: "NTF-100223",
    category: "StockAlerts",
    type: "BackInStock",
    title: "Back in stock",
    message: "Kestrel 2-in-1 Cordless Stick Vacuum is back in stock in your saved size and color.",
    createdAt: daysAgoIso(3, 8),
    priority: "Normal",
    status: "Read",
    source: "Wishlist Alerts",
    relatedProductId: "PRD-38810",
    actionType: "view-details",
  },
  {
    id: "NTF-100222",
    category: "Reviews",
    type: "ReviewReminder",
    title: "How was your Aro Cookware Set?",
    message: "It's been two weeks since order #88213904 was delivered. Share your thoughts to help other shoppers.",
    createdAt: daysAgoIso(4, 3),
    priority: "Low",
    status: "Unread",
    source: "Reviews",
    relatedOrderId: "ORD-88213904",
    relatedProductId: "PRD-22947",
    actionType: "review-product",
  },
  {
    id: "NTF-100221",
    category: "Promotions",
    type: "Promotion",
    title: "Fall Sale: up to 40% off outerwear",
    message: "Our Fall Sale is live for a limited time. Save on jackets, coats, and cold-weather essentials.",
    createdAt: daysAgoIso(5, 6),
    priority: "Low",
    status: "Read",
    source: "Marketing",
    actionType: "view-details",
  },
  {
    id: "NTF-100220",
    category: "Account",
    type: "AccountActivity",
    title: "Your saved address was updated",
    message: "Your \"Home\" address was updated on Sep 5. If you didn't make this change, please review your account.",
    createdAt: daysAgoIso(6, 2),
    priority: "Normal",
    status: "Read",
    source: "Account Security",
    actionType: "view-details",
  },
  {
    id: "NTF-100219",
    category: "Payments",
    type: "PaymentSuccessful",
    title: "Payment successful",
    message: "Your payment of $219.00 for order #88198822 was processed successfully.",
    createdAt: daysAgoIso(7, 1),
    priority: "Low",
    status: "Archived",
    source: "Payments",
    relatedOrderId: "ORD-88198822",
    actionType: "view-order",
  },
  {
    id: "NTF-100218",
    category: "System",
    type: "SystemNotice",
    title: "Scheduled maintenance completed",
    message: "Scheduled maintenance on order tracking has completed. All systems are operating normally.",
    createdAt: daysAgoIso(9, 4),
    priority: "Low",
    status: "Archived",
    source: "Platform",
  },
  {
    id: "NTF-100217",
    category: "Orders",
    type: "OrderUpdated",
    title: "Delivery address confirmed",
    message: "You confirmed the delivery address for order #88165590. No further action is needed.",
    createdAt: daysAgoIso(11, 3),
    priority: "Low",
    status: "Read",
    source: "Order System",
    relatedOrderId: "ORD-88165590",
    actionType: "view-order",
  },
  {
    id: "NTF-100216",
    category: "Security",
    type: "SecurityAlert",
    title: "Two-factor authentication enabled",
    message: "Two-factor authentication was successfully enabled on your account.",
    createdAt: daysAgoIso(14, 5),
    priority: "Normal",
    status: "Read",
    source: "Account Security",
  },
];

const MOCK_TICKETS: SupportTicket[] = [
  {
    id: "TCK-70441",
    subject: "Payment declined for order #88231005",
    category: "Payment",
    priority: "High",
    status: "WaitingForCustomer",
    createdAt: hoursAgoIso(3),
    updatedAt: hoursAgoIso(2),
    lastMessageAt: hoursAgoIso(2),
    relatedOrderId: "ORD-88231005",
    assignedTeam: "Billing Support",
    messageCount: 3,
  },
  {
    id: "TCK-70418",
    subject: "Wrong item delivered — expected jacket, received boots",
    category: "Order",
    priority: "Urgent",
    status: "InProgress",
    createdAt: daysAgoIso(1, 4),
    updatedAt: hoursAgoIso(5),
    lastMessageAt: hoursAgoIso(5),
    relatedOrderId: "ORD-88209117",
    relatedProductId: "PRD-41029",
    assignedTeam: "Order Resolutions",
    messageCount: 5,
  },
  {
    id: "TCK-70392",
    subject: "Refund taking longer than the estimated window",
    category: "Refund",
    priority: "Normal",
    status: "WaitingForSupport",
    createdAt: daysAgoIso(3, 1),
    updatedAt: daysAgoIso(1, 6),
    lastMessageAt: daysAgoIso(1, 6),
    relatedOrderId: "ORD-88176430",
    assignedTeam: "Billing Support",
    messageCount: 4,
  },
  {
    id: "TCK-70355",
    subject: "Question about seller warranty on cordless vacuum",
    category: "Product",
    priority: "Low",
    status: "Resolved",
    createdAt: daysAgoIso(6, 2),
    updatedAt: daysAgoIso(5, 1),
    lastMessageAt: daysAgoIso(5, 1),
    relatedProductId: "PRD-38810",
    relatedOrderId: "ORD-88198822",
    assignedTeam: "Product Specialists",
    messageCount: 6,
  },
  {
    id: "TCK-70301",
    subject: "Unrecognized sign-in — requesting account review",
    category: "Security",
    priority: "Urgent",
    status: "Resolved",
    createdAt: daysAgoIso(10, 3),
    updatedAt: daysAgoIso(9, 8),
    lastMessageAt: daysAgoIso(9, 8),
    assignedTeam: "Trust & Safety",
    messageCount: 7,
  },
  {
    id: "TCK-70287",
    subject: "Can't update saved delivery address",
    category: "Technical",
    priority: "Normal",
    status: "Closed",
    createdAt: daysAgoIso(15, 2),
    updatedAt: daysAgoIso(13, 4),
    lastMessageAt: daysAgoIso(13, 4),
    assignedTeam: "Technical Support",
    messageCount: 4,
  },
  {
    id: "TCK-70260",
    subject: "Seller hasn't responded about a damaged item",
    category: "Seller",
    priority: "High",
    status: "Reopened",
    createdAt: daysAgoIso(20, 1),
    updatedAt: hoursAgoIso(20),
    lastMessageAt: hoursAgoIso(20),
    relatedOrderId: "ORD-88165590",
    assignedTeam: "Marketplace Support",
    messageCount: 8,
  },
  {
    id: "TCK-70219",
    subject: "Requesting invoice copy for expense reporting",
    category: "Account",
    priority: "Low",
    status: "Open",
    createdAt: hoursAgoIso(12),
    updatedAt: hoursAgoIso(12),
    lastMessageAt: hoursAgoIso(12),
    assignedTeam: "Account Services",
    messageCount: 1,
  },
];

const MOCK_MESSAGES: Record<string, SupportMessage[]> = {
  "TCK-70441": [
    {
      id: "MSG-1", ticketId: "TCK-70441",
      author: { kind: "customer", name: "You" },
      body: "My card ending in 4417 was declined for order #88231005, but the same card works fine everywhere else. Can you check what happened?",
      createdAt: hoursAgoIso(3), attachments: [],
    },
    {
      id: "MSG-2", ticketId: "TCK-70441",
      author: { kind: "agent", name: "Priya N.", team: "Billing Support" },
      body: "Thanks for reaching out! I checked and the decline came back as \"insufficient available limit\" from your card issuer, not from us. You're welcome to try a different card or contact your bank to confirm.",
      createdAt: hoursAgoIso(2.5), attachments: [],
    },
    {
      id: "MSG-3", ticketId: "TCK-70441",
      author: { kind: "system" },
      body: "Ticket status changed to Waiting for you.",
      createdAt: hoursAgoIso(2), attachments: [],
    },
  ],
  "TCK-70418": [
    {
      id: "MSG-4", ticketId: "TCK-70418",
      author: { kind: "customer", name: "You" },
      body: "I ordered the Northline Trail Runner Jacket in Slate, size M, but the box had a pair of hiking boots instead.",
      createdAt: daysAgoIso(1, 4), attachments: [
        { id: "ATT-1", fileName: "wrong-item-photo.jpg", fileSizeBytes: 1_240_000, mimeType: "image/jpeg" },
      ],
    },
    {
      id: "MSG-5", ticketId: "TCK-70418",
      author: { kind: "agent", name: "Marcus T.", team: "Order Resolutions" },
      body: "I'm sorry about that mix-up! I've flagged this as a fulfillment error. We'll ship the correct jacket at no extra cost and you can keep or donate the boots — no return needed.",
      createdAt: daysAgoIso(1, 2), attachments: [],
    },
    {
      id: "MSG-6", ticketId: "TCK-70418",
      author: { kind: "system" },
      body: "Replacement order #88244120 was created and linked to this ticket.",
      createdAt: daysAgoIso(0, 20), attachments: [],
    },
    {
      id: "MSG-7", ticketId: "TCK-70418",
      author: { kind: "customer", name: "You" },
      body: "Thank you! Do you have a tracking number for the replacement yet?",
      createdAt: hoursAgoIso(6), attachments: [],
    },
    {
      id: "MSG-8", ticketId: "TCK-70418",
      author: { kind: "agent", name: "Marcus T.", team: "Order Resolutions" },
      body: "Just picked up by the carrier — tracking should populate on the order page within the hour. I'll follow up here once it does.",
      createdAt: hoursAgoIso(5), attachments: [],
    },
  ],
  "TCK-70392": [
    {
      id: "MSG-9", ticketId: "TCK-70392",
      author: { kind: "customer", name: "You" },
      body: "It's been over a week since my return was received and I still haven't seen the refund for order #88176430.",
      createdAt: daysAgoIso(3, 1), attachments: [],
    },
    {
      id: "MSG-10", ticketId: "TCK-70392",
      author: { kind: "agent", name: "Elena R.", team: "Billing Support" },
      body: "I see the return was received on the 21st. Refunds to a bank card can take 5–7 business days after processing starts. I've escalated this to double-check nothing is stuck.",
      createdAt: daysAgoIso(2, 4), attachments: [],
    },
    {
      id: "MSG-11", ticketId: "TCK-70392",
      author: { kind: "system" },
      body: "Ticket status changed to Waiting for support.",
      createdAt: daysAgoIso(1, 6), attachments: [],
    },
    {
      id: "MSG-12", ticketId: "TCK-70392",
      author: { kind: "customer", name: "You" },
      body: "Any update? Just want to make sure it's still moving.",
      createdAt: daysAgoIso(1, 6), attachments: [],
    },
  ],
};

const MOCK_TIMELINES: Record<string, SupportTimelineEvent[]> = {
  "TCK-70441": [
    { id: "EVT-1", ticketId: "TCK-70441", kind: "created", at: hoursAgoIso(3) },
    { id: "EVT-2", ticketId: "TCK-70441", kind: "assigned", at: hoursAgoIso(3), team: "Billing Support" },
    { id: "EVT-3", ticketId: "TCK-70441", kind: "agent-replied", at: hoursAgoIso(2.5), agentName: "Priya N." },
    { id: "EVT-4", ticketId: "TCK-70441", kind: "status-changed", at: hoursAgoIso(2), from: "Open", to: "WaitingForCustomer" },
  ],
  "TCK-70418": [
    { id: "EVT-5", ticketId: "TCK-70418", kind: "created", at: daysAgoIso(1, 4) },
    { id: "EVT-6", ticketId: "TCK-70418", kind: "assigned", at: daysAgoIso(1, 4), team: "Order Resolutions" },
    { id: "EVT-7", ticketId: "TCK-70418", kind: "attachment-added", at: daysAgoIso(1, 4), fileName: "wrong-item-photo.jpg" },
    { id: "EVT-8", ticketId: "TCK-70418", kind: "agent-replied", at: daysAgoIso(1, 2), agentName: "Marcus T." },
    { id: "EVT-9", ticketId: "TCK-70418", kind: "status-changed", at: daysAgoIso(0, 20), from: "Open", to: "InProgress" },
    { id: "EVT-10", ticketId: "TCK-70418", kind: "customer-replied", at: hoursAgoIso(6) },
    { id: "EVT-11", ticketId: "TCK-70418", kind: "agent-replied", at: hoursAgoIso(5), agentName: "Marcus T." },
  ],
  "TCK-70392": [
    { id: "EVT-12", ticketId: "TCK-70392", kind: "created", at: daysAgoIso(3, 1) },
    { id: "EVT-13", ticketId: "TCK-70392", kind: "agent-replied", at: daysAgoIso(2, 4), agentName: "Elena R." },
    { id: "EVT-14", ticketId: "TCK-70392", kind: "status-changed", at: daysAgoIso(1, 6), from: "InProgress", to: "WaitingForSupport" },
  ],
  "TCK-70260": [
    { id: "EVT-15", ticketId: "TCK-70260", kind: "created", at: daysAgoIso(20, 1) },
    { id: "EVT-16", ticketId: "TCK-70260", kind: "resolved", at: daysAgoIso(4, 0) },
    { id: "EVT-17", ticketId: "TCK-70260", kind: "reopened", at: hoursAgoIso(20) },
  ],
};

const MOCK_HELP_ARTICLES: HelpArticle[] = [
  { id: "HLP-1", title: "Where is my order?", category: "Orders", summary: "Track your package and understand each delivery status.", popularity: 98 },
  { id: "HLP-2", title: "How do I return an item?", category: "Returns", summary: "Start a return, print a label, and drop off or schedule a pickup.", popularity: 95 },
  { id: "HLP-3", title: "When will my refund arrive?", category: "Refunds", summary: "Typical refund timelines by payment method.", popularity: 91 },
  { id: "HLP-4", title: "How can I change my delivery address?", category: "Delivery", summary: "Update an address before or after your order ships.", popularity: 87 },
  { id: "HLP-5", title: "Why did my payment fail?", category: "Payments", summary: "Common reasons a card is declined and how to fix it.", popularity: 84 },
  { id: "HLP-6", title: "How do I update my payment method?", category: "Payments", summary: "Add, remove, or set a default card or payment option.", popularity: 80 },
  { id: "HLP-7", title: "How do I reset my password?", category: "Security", summary: "Reset your password or recover a locked account.", popularity: 77 },
  { id: "HLP-8", title: "How do I enable two-factor authentication?", category: "Security", summary: "Add an extra layer of protection to your account.", popularity: 62 },
  { id: "HLP-9", title: "What if my item arrives damaged?", category: "Products", summary: "Report damage and get a replacement or refund.", popularity: 74 },
  { id: "HLP-10", title: "How do I contact a marketplace seller?", category: "SellerIssues", summary: "Message a third-party seller about your order.", popularity: 58 },
  { id: "HLP-11", title: "How do I cancel an order?", category: "Orders", summary: "Cancel before it ships, or start a return afterward.", popularity: 69 },
  { id: "HLP-12", title: "How is shipping cost calculated?", category: "Shipping", summary: "Understand shipping speeds, costs, and free-shipping thresholds.", popularity: 51 },
];

const MOCK_FAQS: FAQItem[] = [
  { id: "FAQ-1", question: "Where is my order?", category: "Orders", answer: "Go to Orders in your account and select the order to see live tracking, the carrier, and the latest scan event. You'll also get delivery notifications here as your package moves." },
  { id: "FAQ-2", question: "How do I return an item?", category: "Returns", answer: "Open the order, choose \"Return items,\" select a reason, and print your prepaid label. Most items can be dropped off or scheduled for pickup within 30 days of delivery." },
  { id: "FAQ-3", question: "When will my refund arrive?", category: "Refunds", answer: "Refunds are issued once your return is received and inspected. Card refunds typically take 5–7 business days; store credit is usually instant." },
  { id: "FAQ-4", question: "How can I change my delivery address?", category: "Delivery", answer: "If your order hasn't shipped, you can edit the address from the order details page. Once it has shipped, contact support and we'll coordinate with the carrier where possible." },
  { id: "FAQ-5", question: "Why did my payment fail?", category: "Payments", answer: "Payments most often fail due to insufficient funds, an expired card, or your bank flagging the charge for review. Try a different payment method or contact your bank." },
  { id: "FAQ-6", question: "How do I update my payment method?", category: "Payments", answer: "Go to Account > Payment Methods to add a new card or remove an old one. You can also set a default method used for future orders." },
];

// ============================================================================
// REDUX TOOLKIT — NOTIFICATIONS SLICE (normalized entities)
// ============================================================================

interface NotificationsState {
  entities: {
    byId: Record<string, Notification>;
    ids: string[];
  };
  selectedIds: string[];
  filters: NotificationFilterState;
  search: string;
  sort: NotificationSort;
  ui: {
    load: OperationState;
    bulkAction: OperationState;
  };
}

function buildNotificationEntities(list: Notification[]): NotificationsState["entities"] {
  const byId: Record<string, Notification> = {};
  const ids: string[] = [];
  for (const n of list) {
    byId[n.id] = n;
    ids.push(n.id);
  }
  return { byId, ids };
}

const initialNotificationsState: NotificationsState = {
  entities: buildNotificationEntities(MOCK_NOTIFICATIONS),
  selectedIds: [],
  filters: { quickFilter: "All", readFilter: "all" },
  search: "",
  sort: "newest",
  ui: { load: { status: "success" }, bulkAction: { status: "idle" } },
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: initialNotificationsState,
  reducers: {
    setNotificationSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setNotificationQuickFilter(state, action: PayloadAction<NotificationQuickFilter>) {
      state.filters.quickFilter = action.payload;
    },
    setNotificationReadFilter(state, action: PayloadAction<NotificationReadFilter>) {
      state.filters.readFilter = action.payload;
    },
    setNotificationSort(state, action: PayloadAction<NotificationSort>) {
      state.sort = action.payload;
    },
    toggleNotificationSelected(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.selectedIds = state.selectedIds.includes(id)
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id];
    },
    /** Only ever receives the currently-visible id list — never hidden/filtered rows. */
    selectAllVisible(state, action: PayloadAction<string[]>) {
      state.selectedIds = action.payload;
    },
    clearNotificationSelection(state) {
      state.selectedIds = [];
    },
    markNotificationsRead(state, action: PayloadAction<string[]>) {
      for (const id of action.payload) {
        const n = state.entities.byId[id];
        if (n && n.status !== "Archived") n.status = "Read";
      }
    },
    markNotificationsUnread(state, action: PayloadAction<string[]>) {
      for (const id of action.payload) {
        const n = state.entities.byId[id];
        if (n && n.status !== "Archived") n.status = "Unread";
      }
    },
    archiveNotifications(state, action: PayloadAction<string[]>) {
      for (const id of action.payload) {
        const n = state.entities.byId[id];
        if (n) n.status = "Archived";
      }
      // Archiving must not leave a stale selection referencing archived rows
      // still displayed under an "Unread"/quick filter view.
      state.selectedIds = state.selectedIds.filter((id) => !action.payload.includes(id));
    },
    deleteNotifications(state, action: PayloadAction<string[]>) {
      for (const id of action.payload) {
        delete state.entities.byId[id];
      }
      state.entities.ids = state.entities.ids.filter((id) => !action.payload.includes(id));
      state.selectedIds = state.selectedIds.filter((id) => !action.payload.includes(id));
    },
    resolveNotificationAction(state, action: PayloadAction<string>) {
      const n = state.entities.byId[action.payload];
      if (n && n.status === "ActionRequired") n.status = "Read";
    },
    setNotificationBulkActionState(state, action: PayloadAction<OperationState>) {
      state.ui.bulkAction = action.payload;
    },
  },
});

const {
  setNotificationSearch,
  setNotificationQuickFilter,
  setNotificationReadFilter,
  setNotificationSort,
  toggleNotificationSelected,
  selectAllVisible,
  clearNotificationSelection,
  markNotificationsRead,
  markNotificationsUnread,
  archiveNotifications,
  deleteNotifications,
  resolveNotificationAction,
  setNotificationBulkActionState,
} = notificationsSlice.actions;

// ============================================================================
// REDUX TOOLKIT — SUPPORT SLICE (normalized entities)
// ============================================================================

interface SupportState {
  tickets: {
    byId: Record<string, SupportTicket>;
    ids: string[];
  };
  messagesByTicketId: Record<string, SupportMessage[]>;
  timelineByTicketId: Record<string, SupportTimelineEvent[]>;
  selectedTicketId: string | null;
  filters: SupportFilterState;
  search: string;
  sort: SupportSort;
  ui: {
    ticketsLoad: OperationState;
    ticketDetailLoad: OperationState;
    createTicket: OperationState;
    reply: OperationState;
    closeTicket: OperationState;
    reopenTicket: OperationState;
  };
}

function buildTicketEntities(list: SupportTicket[]): SupportState["tickets"] {
  const byId: Record<string, SupportTicket> = {};
  const ids: string[] = [];
  for (const t of list) {
    byId[t.id] = t;
    ids.push(t.id);
  }
  return { byId, ids };
}

const initialSupportState: SupportState = {
  tickets: buildTicketEntities(MOCK_TICKETS),
  messagesByTicketId: MOCK_MESSAGES,
  timelineByTicketId: MOCK_TIMELINES,
  selectedTicketId: null,
  filters: { statusTab: "All", category: "All", priority: "All" },
  search: "",
  sort: "newest",
  ui: {
    ticketsLoad: { status: "success" },
    ticketDetailLoad: { status: "idle" },
    createTicket: { status: "idle" },
    reply: { status: "idle" },
    closeTicket: { status: "idle" },
    reopenTicket: { status: "idle" },
  },
};

let ticketSequence = 70442;
let messageSequence = 100;
let timelineSequence = 100;

const supportSlice = createSlice({
  name: "support",
  initialState: initialSupportState,
  reducers: {
    setSupportSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setSupportStatusTab(state, action: PayloadAction<SupportStatusTab>) {
      state.filters.statusTab = action.payload;
    },
    setSupportCategoryFilter(state, action: PayloadAction<SupportTicketCategory | "All">) {
      state.filters.category = action.payload;
    },
    setSupportPriorityFilter(state, action: PayloadAction<SupportTicketPriority | "All">) {
      state.filters.priority = action.payload;
    },
    setSupportSort(state, action: PayloadAction<SupportSort>) {
      state.sort = action.payload;
    },
    selectTicket(state, action: PayloadAction<string | null>) {
      state.selectedTicketId = action.payload;
    },
    setCreateTicketState(state, action: PayloadAction<OperationState>) {
      state.ui.createTicket = action.payload;
    },
    createTicket(state, action: PayloadAction<{
      subject: string;
      category: SupportTicketCategory;
      priority: SupportTicketPriority;
      description: string;
      relatedOrderId?: string;
      relatedProductId?: string;
      attachment?: SupportAttachment;
    }>) {
      const id = `TCK-${ticketSequence++}`;
      const now = new Date().toISOString();
      const ticket: SupportTicket = {
        id,
        subject: action.payload.subject,
        category: action.payload.category,
        priority: action.payload.priority,
        status: "Open",
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
        relatedOrderId: action.payload.relatedOrderId,
        relatedProductId: action.payload.relatedProductId,
        assignedTeam: undefined,
        messageCount: 1,
      };
      state.tickets.byId[id] = ticket;
      state.tickets.ids.unshift(id);
      state.messagesByTicketId[id] = [
        {
          id: `MSG-${messageSequence++}`,
          ticketId: id,
          author: { kind: "customer", name: "You" },
          body: action.payload.description,
          createdAt: now,
          attachments: action.payload.attachment ? [action.payload.attachment] : [],
        },
      ];
      state.timelineByTicketId[id] = [{ id: `EVT-${timelineSequence++}`, ticketId: id, kind: "created", at: now }];
      state.selectedTicketId = id;
    },
    setReplyState(state, action: PayloadAction<OperationState>) {
      state.ui.reply = action.payload;
    },
    appendCustomerReply(state, action: PayloadAction<{ ticketId: string; body: string; attachment?: SupportAttachment }>) {
      const { ticketId, body, attachment } = action.payload;
      const ticket = state.tickets.byId[ticketId];
      if (!ticket) return;
      const now = new Date().toISOString();
      const messages = state.messagesByTicketId[ticketId] ?? [];
      messages.push({
        id: `MSG-${messageSequence++}`,
        ticketId,
        author: { kind: "customer", name: "You" },
        body,
        createdAt: now,
        attachments: attachment ? [attachment] : [],
      });
      state.messagesByTicketId[ticketId] = messages;
      const timeline = state.timelineByTicketId[ticketId] ?? [];
      timeline.push({ id: `EVT-${timelineSequence++}`, ticketId, kind: "customer-replied", at: now });
      if (attachment) {
        timeline.push({ id: `EVT-${timelineSequence++}`, ticketId, kind: "attachment-added", at: now, fileName: attachment.fileName });
      }
      state.timelineByTicketId[ticketId] = timeline;
      ticket.lastMessageAt = now;
      ticket.updatedAt = now;
      ticket.messageCount += 1;
      if (ticket.status === "WaitingForCustomer" || ticket.status === "Resolved" || ticket.status === "Closed") {
        const from = ticket.status;
        ticket.status = "WaitingForSupport";
        timeline.push({ id: `EVT-${timelineSequence++}`, ticketId, kind: "status-changed", at: now, from, to: "WaitingForSupport" });
      }
    },
    setCloseTicketState(state, action: PayloadAction<OperationState>) {
      state.ui.closeTicket = action.payload;
    },
    closeTicket(state, action: PayloadAction<string>) {
      const ticket = state.tickets.byId[action.payload];
      if (!ticket) return;
      const now = new Date().toISOString();
      const from = ticket.status;
      ticket.status = "Closed";
      ticket.updatedAt = now;
      const timeline = state.timelineByTicketId[action.payload] ?? [];
      timeline.push({ id: `EVT-${timelineSequence++}`, ticketId: action.payload, kind: "status-changed", at: now, from, to: "Closed" });
      state.timelineByTicketId[action.payload] = timeline;
    },
    setReopenTicketState(state, action: PayloadAction<OperationState>) {
      state.ui.reopenTicket = action.payload;
    },
    reopenTicket(state, action: PayloadAction<string>) {
      const ticket = state.tickets.byId[action.payload];
      if (!ticket) return;
      const now = new Date().toISOString();
      ticket.status = "Reopened";
      ticket.updatedAt = now;
      const timeline = state.timelineByTicketId[action.payload] ?? [];
      timeline.push({ id: `EVT-${timelineSequence++}`, ticketId: action.payload, kind: "reopened", at: now });
      state.timelineByTicketId[action.payload] = timeline;
    },
    setTicketsLoadState(state, action: PayloadAction<OperationState>) {
      state.ui.ticketsLoad = action.payload;
    },
    setTicketDetailLoadState(state, action: PayloadAction<OperationState>) {
      state.ui.ticketDetailLoad = action.payload;
    },
  },
});

const {
  setSupportSearch,
  setSupportStatusTab,
  setSupportCategoryFilter,
  setSupportPriorityFilter,
  setSupportSort,
  selectTicket,
  setCreateTicketState,
  createTicket,
  setReplyState,
  appendCustomerReply,
  setCloseTicketState,
  closeTicket,
  setReopenTicketState,
  reopenTicket,
  setTicketsLoadState,
  setTicketDetailLoadState,
} = supportSlice.actions;

// ============================================================================
// REDUX TOOLKIT — PREFERENCES SLICE
// ============================================================================

type PreferencesEntities = Record<PreferenceCategory, PreferenceCategorySetting>;

interface PreferencesState {
  categories: PreferencesEntities;
  ui: { save: OperationState };
}

const PREFERENCE_CATEGORY_IDS: PreferenceCategory[] = [
  "Orders",
  "Delivery",
  "Payments",
  "Returns",
  "Refunds",
  "Promotions",
  "PriceAlerts",
  "StockAlerts",
  "Security",
  "Reviews",
];

function defaultChannelsFor(category: PreferenceCategory): Record<NotificationChannel, boolean> {
  if (category === "Security") return { Email: true, Push: true, SMS: true, InApp: true };
  if (category === "Promotions") return { Email: true, Push: false, SMS: false, InApp: true };
  return { Email: true, Push: true, SMS: false, InApp: true };
}

function defaultDigestFor(category: PreferenceCategory): DigestFrequency {
  if (category === "Security") return "Instant";
  if (category === "Promotions" || category === "PriceAlerts" || category === "StockAlerts") return "Weekly";
  return "Instant";
}

const initialPreferencesState: PreferencesState = {
  categories: PREFERENCE_CATEGORY_IDS.reduce((acc, category) => {
    acc[category] = { channels: defaultChannelsFor(category), digest: defaultDigestFor(category) };
    return acc;
  }, {} as PreferencesEntities),
  ui: { save: { status: "idle" } },
};

const preferencesSlice = createSlice({
  name: "preferences",
  initialState: initialPreferencesState,
  reducers: {
    toggleChannel(state, action: PayloadAction<{ category: PreferenceCategory; channel: NotificationChannel }>) {
      const { category, channel } = action.payload;
      const setting = state.categories[category];
      // Security cannot be silently disabled on Email or Push — the two
      // channels most likely to actually reach the customer in time.
      if (category === "Security" && (channel === "Email" || channel === "Push")) return;
      setting.channels[channel] = !setting.channels[channel];
    },
    setDigest(state, action: PayloadAction<{ category: PreferenceCategory; digest: DigestFrequency }>) {
      const { category, digest } = action.payload;
      // Security notifications are never allowed to go fully silent.
      if (category === "Security" && digest === "Off") return;
      state.categories[category].digest = digest;
    },
    setPreferencesSaveState(state, action: PayloadAction<OperationState>) {
      state.ui.save = action.payload;
    },
  },
});

const { toggleChannel, setDigest, setPreferencesSaveState } = preferencesSlice.actions;

// ============================================================================
// REDUX TOOLKIT — HELP SLICE
// ============================================================================

interface HelpState {
  search: string;
  category: HelpCategory | "All";
  selectedArticleId: string | null;
  ui: { search: OperationState };
}

const initialHelpState: HelpState = {
  search: "",
  category: "All",
  selectedArticleId: null,
  ui: { search: { status: "idle" } },
};

const helpSlice = createSlice({
  name: "help",
  initialState: initialHelpState,
  reducers: {
    setHelpSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setHelpCategory(state, action: PayloadAction<HelpCategory | "All">) {
      state.category = action.payload;
    },
    selectHelpArticle(state, action: PayloadAction<string | null>) {
      state.selectedArticleId = action.payload;
    },
    setHelpSearchState(state, action: PayloadAction<OperationState>) {
      state.ui.search = action.payload;
    },
  },
});

const { setHelpSearch, setHelpCategory, selectHelpArticle, setHelpSearchState } = helpSlice.actions;

// ============================================================================
// REDUX TOOLKIT — WORKSPACE (section navigation; the only "global" UI slice)
// ============================================================================

interface WorkspaceState {
  section: WorkspaceSection;
}

const initialWorkspaceState: WorkspaceState = { section: "notifications" };

const workspaceSlice = createSlice({
  name: "workspace",
  initialState: initialWorkspaceState,
  reducers: {
    setWorkspaceSection(state, action: PayloadAction<WorkspaceSection>) {
      state.section = action.payload;
    },
  },
});

const { setWorkspaceSection } = workspaceSlice.actions;

// ============================================================================
// REDUX STORE
// ============================================================================

const rootReducer = combineReducers({
  notifications: notificationsSlice.reducer,
  support: supportSlice.reducer,
  preferences: preferencesSlice.reducer,
  help: helpSlice.reducer,
  workspace: workspaceSlice.reducer,
});

function makeStore() {
  return configureStore({ reducer: rootReducer });
}

type RootState = ReturnType<typeof rootReducer>;
type AppStore = ReturnType<typeof makeStore>;
type AppDispatch = AppStore["dispatch"];

const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ============================================================================
// SELECTORS
// ============================================================================

const selectNotificationEntities = (state: RootState) => state.notifications.entities;
const selectNotificationFilters = (state: RootState) => state.notifications.filters;
const selectNotificationSearch = (state: RootState) => state.notifications.search;
const selectNotificationSort = (state: RootState) => state.notifications.sort;
const selectNotificationSelectedIds = (state: RootState) => state.notifications.selectedIds;
const selectNotificationUi = (state: RootState) => state.notifications.ui;

const selectAllNotifications = createSelector(selectNotificationEntities, (entities) =>
  entities.ids.map((id) => entities.byId[id]).filter((n): n is Notification => Boolean(n))
);

const selectUnreadCount = createSelector(selectAllNotifications, (list) =>
  list.filter((n) => n.status === "Unread" || n.status === "ActionRequired").length
);

const selectActionRequiredCount = createSelector(selectAllNotifications, (list) =>
  list.filter((n) => n.status === "ActionRequired").length
);

function matchesQuickFilter(n: Notification, filter: NotificationQuickFilter): boolean {
  if (filter === "All") return true;
  if (filter === "Unread") return n.status === "Unread" || n.status === "ActionRequired";
  return n.category === filter;
}

function matchesReadFilter(n: Notification, filter: NotificationReadFilter): boolean {
  if (filter === "all") return true;
  if (filter === "unread") return n.status === "Unread" || n.status === "ActionRequired";
  return n.status === "Read" || n.status === "Archived";
}

function matchesNotificationSearch(n: Notification, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const order = n.relatedOrderId ? MOCK_ORDER_LOOKUP[n.relatedOrderId] : undefined;
  const product = n.relatedProductId ? MOCK_PRODUCT_LOOKUP[n.relatedProductId] : undefined;
  const haystack = [n.title, n.message, n.category, order?.orderNumber, order?.id, product?.name].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(q);
}

const priorityRank: Record<NotificationPriority, number> = { Critical: 3, High: 2, Normal: 1, Low: 0 };

const selectVisibleNotifications = createSelector(
  [selectAllNotifications, selectNotificationFilters, selectNotificationSearch, selectNotificationSort],
  (all, filters, search, sort) => {
    let rows = all.filter(
      (n) => n.status !== "Archived" && matchesQuickFilter(n, filters.quickFilter) && matchesReadFilter(n, filters.readFilter) && matchesNotificationSearch(n, search)
    );
    // "Archived" items only surface through the explicit Archived quick filter is
    // out of scope for this build; they're simply excluded from the main list
    // above except when a caller wants them (kept simple & predictable).
    rows = [...rows].sort((a, b) => {
      if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "unread-first") {
        const aUnread = a.status === "Unread" || a.status === "ActionRequired" ? 1 : 0;
        const bUnread = b.status === "Unread" || b.status === "ActionRequired" ? 1 : 0;
        if (aUnread !== bUnread) return bUnread - aUnread;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // highest-priority
      const diff = priorityRank[b.priority] - priorityRank[a.priority];
      return diff !== 0 ? diff : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return rows;
  }
);

const selectSupportTicketEntities = (state: RootState) => state.support.tickets;
const selectSupportFilters = (state: RootState) => state.support.filters;
const selectSupportSearch = (state: RootState) => state.support.search;
const selectSupportSort = (state: RootState) => state.support.sort;
const selectSelectedTicketId = (state: RootState) => state.support.selectedTicketId;
const selectMessagesByTicketId = (state: RootState) => state.support.messagesByTicketId;
const selectTimelineByTicketId = (state: RootState) => state.support.timelineByTicketId;
const selectSupportUi = (state: RootState) => state.support.ui;

const selectAllTickets = createSelector(selectSupportTicketEntities, (entities) =>
  entities.ids.map((id) => entities.byId[id]).filter((t): t is SupportTicket => Boolean(t))
);

const ticketPriorityRank: Record<SupportTicketPriority, number> = { Urgent: 3, High: 2, Normal: 1, Low: 0 };

const selectVisibleTickets = createSelector(
  [selectAllTickets, selectSupportFilters, selectSupportSearch, selectSupportSort],
  (all, filters, search, sort) => {
    let rows = all.filter((t) => {
      if (filters.statusTab !== "All" && t.status !== filters.statusTab) return false;
      if (filters.category !== "All" && t.category !== filters.category) return false;
      if (filters.priority !== "All" && t.priority !== filters.priority) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const order = t.relatedOrderId ? MOCK_ORDER_LOOKUP[t.relatedOrderId] : undefined;
        const haystack = [t.id, t.subject, t.category, order?.orderNumber].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    rows = [...rows].sort((a, b) => {
      if (sort === "newest") return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      if (sort === "oldest") return new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime();
      if (sort === "priority") return ticketPriorityRank[b.priority] - ticketPriorityRank[a.priority];
      return a.status.localeCompare(b.status);
    });
    return rows;
  }
);

const selectSupportSummary = createSelector(selectAllTickets, (all) => ({
  open: all.filter((t) => t.status === "Open" || t.status === "InProgress" || t.status === "Reopened").length,
  waitingForCustomer: all.filter((t) => t.status === "WaitingForCustomer").length,
  waitingForSupport: all.filter((t) => t.status === "WaitingForSupport").length,
  resolved: all.filter((t) => t.status === "Resolved" || t.status === "Closed").length,
}));

const selectPreferenceCategories = (state: RootState) => state.preferences.categories;
const selectPreferencesUi = (state: RootState) => state.preferences.ui;

const selectHelpSearch = (state: RootState) => state.help.search;
const selectHelpCategory = (state: RootState) => state.help.category;

const selectVisibleHelpArticles = createSelector([selectHelpSearch, selectHelpCategory], (search, category) => {
  let rows = MOCK_HELP_ARTICLES;
  if (category !== "All") rows = rows.filter((a) => a.category === category);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q));
  }
  return [...rows].sort((a, b) => b.popularity - a.popularity);
});

const selectWorkspaceSection = (state: RootState) => state.workspace.section;

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

function useOutsideClick<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onOutside]);
  return ref;
}

function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    const focusable = container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || focusable.length === 0) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}

function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onEscape]);
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const listener = () => setMatches(mql.matches);
    listener();
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [query]);
  return matches;
}

const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");

function useNowTick(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ============================================================================
// PRIMITIVES — smallest reusable, purposeful building blocks
// ============================================================================

const TONE_CLASSES: Record<StatusVisual["tone"], string> = {
  success: "bg-[--color-success-muted] text-[--color-success-foreground]",
  warning: "bg-[--color-warning-muted] text-[--color-warning-foreground]",
  danger: "bg-[--color-destructive-muted] text-[--color-destructive]",
  info: "bg-[--color-info-muted] text-[--color-info-foreground]",
  neutral: "bg-secondary text-secondary-foreground",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "icon";
  loading?: boolean;
}

function Button({ variant = "secondary", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-[--color-border]",
    ghost: "bg-transparent text-foreground hover:bg-secondary",
    outline: "border border-border bg-transparent text-foreground hover:bg-secondary",
    destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
  };
  const sizes: Record<string, string> = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", icon: "h-10 w-10" };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-[--duration-fast] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function IconButton({ label, icon: Icon, active, className, ...rest }: { label: string; icon: LucideIcon; active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx(
        "inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors duration-[--duration-fast] hover:bg-secondary hover:text-foreground",
        active && "bg-secondary text-foreground",
        className
      )}
      {...rest}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
}

function Badge({ tone = "neutral", children }: { tone?: StatusVisual["tone"]; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", TONE_CLASSES[tone])}>{children}</span>;
}

/** Status is always conveyed with an icon + label, never color alone. */
function StatusBadge({ visual }: { visual: StatusVisual }) {
  const Icon = visual.icon;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", TONE_CLASSES[visual.tone])}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {visual.label}
    </span>
  );
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-lg border border-border bg-card text-card-foreground shadow-[--shadow-xs]", className)}>{children}</div>;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hideLabel?: boolean;
  error?: string;
  icon?: LucideIcon;
}

function Input({ label, hideLabel, error, icon: Icon, className, id, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className={cx("text-xs font-medium text-muted-foreground", hideLabel && "sr-only")}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /> : null}
        <input
          id={inputId}
          aria-invalid={!!error}
          className={cx(
            "h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            Icon && "pl-9",
            error && "border-destructive",
            className
          )}
          {...rest}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function Textarea({ label, error, className, id, ...rest }: { label?: string; error?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const areaId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={areaId} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      ) : null}
      <textarea
        id={areaId}
        aria-invalid={!!error}
        className={cx(
          "min-h-24 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          error && "border-destructive",
          className
        )}
        {...rest}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SelectField({ label, options, className, id, ...rest }: { label?: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={cx("h-10 w-full rounded-md border border-border bg-input px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ checked, onChange, label, description, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean; id?: string }) {
  const generatedId = useId();
  const toggleId = id ?? generatedId;
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={toggleId} className={cx("text-sm font-medium text-foreground", disabled && "text-muted-foreground")}>
          {label}
        </label>
        {description ? <p className="mt-0.5 max-w-sm text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <button
        id={toggleId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-[--duration-fast] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
          checked ? "bg-primary" : "bg-border"
        )}
      >
        <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-[--shadow-sm] transition-transform duration-[--duration-fast]", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

function SkeletonLine({ width = "100%", height = 14 }: { width?: string | number; height?: number }) {
  return <div className="skeleton-shimmer rounded-md" style={{ width, height }} aria-hidden="true" />;
}
function SkeletonBlock({ height = 120 }: { height?: number }) {
  return <div className="skeleton-shimmer rounded-lg" style={{ height }} aria-hidden="true" />;
}

function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

function ErrorState({ title = "Something went wrong", description, onRetry }: { title?: string; description: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive bg-[--color-destructive-muted] px-6 py-14 text-center">
      <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)} onFocus={() => setVisible(true)} onBlur={() => setVisible(false)}>
      {children}
      {visible ? (
        <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-[--shadow-md] animate-fade-in">
          {label}
        </span>
      ) : null}
    </span>
  );
}

// ---- Overlay primitives: Modal / Drawer (bottom sheet on mobile) ----------

function Overlay({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-40 bg-black/45 animate-fade-in" onClick={onClose} aria-hidden="true" />;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

/** Renders as a centered dialog on larger screens and a full-height sheet on mobile. */
function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(open, ref);
  useEscapeKey(open, onClose);
  const titleId = useId();
  if (!open) return null;
  const widths: Record<string, string> = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };
  return (
    <>
      <Overlay onClose={onClose} />
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cx(
            "flex max-h-[92vh] w-full flex-col rounded-t-xl border border-border bg-popover text-popover-foreground shadow-[--shadow-lg] animate-slide-in-bottom sm:rounded-xl sm:animate-scale-in",
            widths[size]
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 id={titleId} className="text-sm font-semibold text-foreground">
                {title}
              </h2>
              {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
            </div>
            <IconButton label="Close dialog" icon={X} onClick={onClose} />
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
        </div>
      </div>
    </>
  );
}

function Drawer({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(open, ref);
  useEscapeKey(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return (
    <>
      <Overlay onClose={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-popover text-popover-foreground shadow-[--shadow-lg] animate-slide-in-right"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="text-sm font-semibold text-foreground">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          <IconButton label="Close panel" icon={X} onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
      </div>
    </>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", tone = "destructive", loading }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "destructive" | "primary";
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={tone} size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-[--color-warning]" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">This action can affect what you and support can see. Please confirm you want to continue.</p>
      </div>
    </Modal>
  );
}

/** Accessible horizontal tabs — used for support status tabs and dialog steps. */
function Tabs<T extends string>({ value, onChange, tabs, ariaLabel }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[]; ariaLabel: string }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-1 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          aria-controls={`panel-${tab.value}`}
          onClick={() => onChange(tab.value)}
          className={cx(
            "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[--duration-fast]",
            value === tab.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          )}
        >
          {tab.label}
          {typeof tab.count === "number" ? (
            <span className={cx("rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none", value === tab.value ? "bg-background text-foreground" : "bg-muted text-muted-foreground")}>
              {tab.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// NOTIFICATION COMPONENTS
// ============================================================================

/** Resolves a notification's order/product references into display strings. */
function useNotificationContext(notification: Notification) {
  return useMemo(() => {
    const order = notification.relatedOrderId ? MOCK_ORDER_LOOKUP[notification.relatedOrderId] : undefined;
    const product = notification.relatedProductId ? MOCK_PRODUCT_LOOKUP[notification.relatedProductId] : undefined;
    return { order, product };
  }, [notification.relatedOrderId, notification.relatedProductId]);
}

/** Reused by the four overview tiles — a single parameterized stat card. */
function SummaryStatCard({ icon: Icon, label, value, tone, description }: { icon: LucideIcon; label: string; value: number; tone: StatusVisual["tone"]; description: string }) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", TONE_CLASSES[tone])}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-2xl font-semibold tabular-nums leading-none text-foreground">{value}</p>
        <p className="mt-1 text-xs font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}

function NotificationOverview({ notifications }: { notifications: Notification[] }) {
  const unread = notifications.filter((n) => n.status === "Unread" || n.status === "ActionRequired").length;
  const orders = notifications.filter((n) => (n.category === "Orders" || n.category === "Delivery") && n.status !== "Archived").length;
  const security = notifications.filter((n) => n.category === "Security" && n.status !== "Archived").length;
  const promotions = notifications.filter((n) => (n.category === "Promotions" || n.category === "PriceAlerts" || n.category === "StockAlerts") && n.status !== "Archived").length;
  return (
    <section aria-labelledby="notification-overview-heading" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <h2 id="notification-overview-heading" className="sr-only">
        Notification overview
      </h2>
      <SummaryStatCard icon={Bell} label="Unread" value={unread} tone="info" description="Need your attention" />
      <SummaryStatCard icon={Package} label="Orders & delivery" value={orders} tone="neutral" description="Active updates" />
      <SummaryStatCard icon={ShieldAlert} label="Security" value={security} tone="danger" description="Account-related" />
      <SummaryStatCard icon={Tag} label="Offers & alerts" value={promotions} tone="warning" description="Promotions & price/stock" />
    </section>
  );
}

function NotificationToolbar({
  search, onSearchChange, sort, onSortChange, selectedCount, onSelectAllVisible, onClearSelection,
  onBulkMarkRead, onBulkMarkUnread, onBulkArchive, onBulkDelete, readFilter, onReadFilterChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  sort: NotificationSort;
  onSortChange: (v: NotificationSort) => void;
  selectedCount: number;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onBulkMarkRead: () => void;
  onBulkMarkUnread: () => void;
  onBulkArchive: () => void;
  onBulkDelete: () => void;
  readFilter: NotificationReadFilter;
  onReadFilterChange: (v: NotificationReadFilter) => void;
}) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounced = useDebouncedValue(localSearch, 250);
  useEffect(() => {
    onSearchChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Input
            label="Search notifications"
            hideLabel
            icon={Search}
            placeholder="Search by title, message, order, or product"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          {localSearch ? (
            <button
              aria-label="Clear search"
              onClick={() => setLocalSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="read-status-filter" className="sr-only">
            Filter by read status
          </label>
          <SelectField
            id="read-status-filter"
            aria-label="Filter by read status"
            options={[
              { value: "all", label: "All notifications" },
              { value: "unread", label: "Unread only" },
              { value: "read", label: "Read & archived" },
            ]}
            value={readFilter}
            onChange={(e) => onReadFilterChange(e.target.value as NotificationReadFilter)}
            className="w-40"
          />
          <SelectField
            aria-label="Sort notifications"
            options={NOTIFICATION_SORT_OPTIONS}
            value={sort}
            onChange={(e) => onSortChange(e.target.value as NotificationSort)}
            className="w-44"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
        {selectedCount > 0 ? (
          <>
            <p className="text-xs font-medium text-foreground">{selectedCount} selected</p>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Bulk notification actions">
              <Button size="sm" variant="outline" onClick={onBulkMarkRead}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Mark read
              </Button>
              <Button size="sm" variant="outline" onClick={onBulkMarkUnread}>
                <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
                Mark unread
              </Button>
              <Button size="sm" variant="outline" onClick={onBulkArchive}>
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                Archive
              </Button>
              <Button size="sm" variant="outline" onClick={onBulkDelete}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={onClearSelection}>
                Clear
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Select notifications to take bulk action.</p>
            <Button size="sm" variant="ghost" onClick={onSelectAllVisible}>
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Select all visible
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function NotificationFilterPanel({ value, onChange, notifications }: { value: NotificationQuickFilter; onChange: (v: NotificationQuickFilter) => void; notifications: Notification[] }) {
  function countFor(filter: NotificationQuickFilter): number {
    if (filter === "All") return notifications.length;
    if (filter === "Unread") return notifications.filter((n) => n.status === "Unread" || n.status === "ActionRequired").length;
    return notifications.filter((n) => n.category === filter).length;
  }
  return (
    <nav aria-label="Notification categories" className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none lg:w-52 lg:flex-col lg:overflow-visible lg:pb-0">
      {NOTIFICATION_QUICK_FILTERS.map((filter) => {
        const meta = filter === "All" || filter === "Unread" ? null : NOTIFICATION_CATEGORY_META[filter];
        const Icon = filter === "All" ? Bell : filter === "Unread" ? CircleDot : meta!.icon;
        const label = filter === "All" ? "All" : filter === "Unread" ? "Unread" : meta!.label;
        return (
          <button
            key={filter}
            aria-current={value === filter ? "true" : undefined}
            onClick={() => onChange(filter)}
            className={cx(
              "flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition-colors duration-[--duration-fast] lg:whitespace-normal",
              value === filter ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </span>
            <span className="tabular-nums text-[11px] text-muted-foreground">{countFor(filter)}</span>
          </button>
        );
      })}
    </nav>
  );
}

function NotificationCard({ notification, selected, onToggleSelect, onOpenDetails, onMarkRead, onMarkUnread, onArchive, onDelete, onAction, now }: {
  notification: Notification;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onAction: (notification: Notification) => void;
  now: number;
}) {
  const { order, product } = useNotificationContext(notification);
  const TypeIcon = NOTIFICATION_TYPE_META[notification.type].icon;
  const isUnread = notification.status === "Unread" || notification.status === "ActionRequired";
  const priorityMeta = NOTIFICATION_PRIORITY_META[notification.priority];
  const statusMeta = NOTIFICATION_STATUS_META[notification.status];
  const isCriticalOrSecurity = notification.priority === "Critical" || notification.category === "Security";
  const actionMeta = notification.actionType ? NOTIFICATION_ACTION_META[notification.actionType] : null;

  return (
    <li
      className={cx(
        "group relative flex gap-3 rounded-lg border px-4 py-3.5 transition-colors duration-[--duration-fast]",
        isUnread ? "border-border bg-card" : "border-border/70 bg-card/60",
        isCriticalOrSecurity && "border-l-4 border-l-destructive"
      )}
    >
      {/* Selection + unread indicator */}
      <div className="flex flex-col items-center gap-2 pt-0.5">
        <input
          type="checkbox"
          aria-label={`Select notification: ${notification.title}`}
          checked={selected}
          onChange={() => onToggleSelect(notification.id)}
          className="h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {isUnread ? <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" /> : <span className="h-2 w-2" aria-hidden="true" />}
      </div>

      {/* Category icon */}
      <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", TONE_CLASSES[statusMeta.tone === "info" ? "info" : "neutral"])}>
        <TypeIcon className="h-4 w-4" aria-hidden="true" />
      </span>

      {/* Identity + message + metadata */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <button onClick={() => onOpenDetails(notification.id)} className="min-w-0 text-left">
            <p className={cx("truncate text-sm", isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/90")}>{notification.title}</p>
          </button>
          <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(notification.createdAt, now)}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{notification.message}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{NOTIFICATION_CATEGORY_META[notification.category].label}</Badge>
          {notification.priority === "Critical" || notification.priority === "High" ? <StatusBadge visual={priorityMeta} /> : null}
          {notification.status === "ActionRequired" ? <StatusBadge visual={statusMeta} /> : null}
          {order ? <span className="text-[11px] text-muted-foreground">Order {order.orderNumber}</span> : null}
          {product && !order ? <span className="text-[11px] text-muted-foreground">{product.name}</span> : null}
          <span className="text-[11px] text-muted-foreground">via {notification.source}</span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {actionMeta ? (
            <Button size="sm" variant={notification.status === "ActionRequired" ? "primary" : "outline"} onClick={() => onAction(notification)}>
              <actionMeta.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {actionMeta.label}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => onOpenDetails(notification.id)}>
            View details
          </Button>
          <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity duration-[--duration-fast] group-hover:opacity-100 group-focus-within:opacity-100">
            {isUnread ? (
              <IconButton label="Mark as read" icon={Check} onClick={() => onMarkRead(notification.id)} />
            ) : (
              <IconButton label="Mark as unread" icon={CircleDot} onClick={() => onMarkUnread(notification.id)} />
            )}
            <IconButton label="Archive notification" icon={Archive} onClick={() => onArchive(notification.id)} />
            <IconButton label="Delete notification" icon={Trash2} onClick={() => onDelete(notification.id)} />
          </div>
        </div>
      </div>
    </li>
  );
}

function NotificationListSkeleton() {
  return (
    <ul className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex gap-3 rounded-lg border border-border px-4 py-3.5">
          <SkeletonLine width={16} height={16} />
          <SkeletonBlock height={36} />
          <div className="flex-1">
            <SkeletonLine width="40%" />
            <div className="mt-2">
              <SkeletonLine width="80%" height={12} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function NotificationList({
  notifications, selectedIds, search, quickFilter, loadState, onRetry,
  onToggleSelect, onOpenDetails, onMarkRead, onMarkUnread, onArchive, onDelete, onAction, now,
}: {
  notifications: Notification[];
  selectedIds: string[];
  search: string;
  quickFilter: NotificationQuickFilter;
  loadState: OperationState;
  onRetry: () => void;
  onToggleSelect: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onAction: (notification: Notification) => void;
  now: number;
}) {
  if (loadState.status === "loading") return <NotificationListSkeleton />;
  if (loadState.status === "error") return <ErrorState description={loadState.message} onRetry={onRetry} />;

  if (notifications.length === 0) {
    if (search.trim()) {
      return (
        <EmptyState
          icon={Search}
          title={`No results for "${search.trim()}"`}
          description="Try a different order number, product name, or keyword."
        />
      );
    }
    if (quickFilter === "Unread") {
      return <EmptyState icon={CheckCheck} title="You're all caught up" description="You have no unread notifications right now." />;
    }
    return (
      <EmptyState
        icon={Bell}
        title="No notifications here"
        description="Notifications about orders, deliveries, payments, and account activity will show up in this view."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2" aria-live="polite">
      {notifications.map((n) => (
        <NotificationCard
          key={n.id}
          notification={n}
          selected={selectedIds.includes(n.id)}
          onToggleSelect={onToggleSelect}
          onOpenDetails={onOpenDetails}
          onMarkRead={onMarkRead}
          onMarkUnread={onMarkUnread}
          onArchive={onArchive}
          onDelete={onDelete}
          onAction={onAction}
          now={now}
        />
      ))}
    </ul>
  );
}

// ============================================================================
// SUPPORT COMPONENTS
// ============================================================================

function SupportOverview({ summary, onCreateTicket, onViewTickets }: { summary: { open: number; waitingForCustomer: number; waitingForSupport: number; resolved: number }; onCreateTicket: () => void; onViewTickets: () => void }) {
  return (
    <section aria-labelledby="support-overview-heading" className="flex flex-col gap-4">
      <h2 id="support-overview-heading" className="sr-only">
        Support overview
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryStatCard icon={CircleDot} label="Open tickets" value={summary.open} tone="info" description="Being worked on" />
        <SummaryStatCard icon={Clock} label="Waiting on you" value={summary.waitingForCustomer} tone="warning" description="We need a reply" />
        <SummaryStatCard icon={Clock} label="Waiting on support" value={summary.waitingForSupport} tone="neutral" description="We'll reply soon" />
        <SummaryStatCard icon={Check} label="Resolved" value={summary.resolved} tone="success" description="Closed or resolved" />
      </div>
      <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Need help with something specific?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Start a new ticket or review your recent support activity.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={onViewTickets}>
            View all tickets
          </Button>
          <Button variant="primary" size="sm" onClick={onCreateTicket}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New ticket
          </Button>
        </div>
      </Card>
    </section>
  );
}

function TicketToolbar({ search, onSearchChange, sort, onSortChange, onCreateTicket }: {
  search: string;
  onSearchChange: (v: string) => void;
  sort: SupportSort;
  onSortChange: (v: SupportSort) => void;
  onCreateTicket: () => void;
}) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounced = useDebouncedValue(localSearch, 250);
  useEffect(() => {
    onSearchChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Input label="Search tickets" hideLabel icon={Search} placeholder="Search by subject, ticket ID, or order" value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <SelectField aria-label="Sort tickets" options={SUPPORT_SORT_OPTIONS} value={sort} onChange={(e) => onSortChange(e.target.value as SupportSort)} className="w-48" />
        <Button variant="primary" size="sm" onClick={onCreateTicket} className="shrink-0">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New ticket
        </Button>
      </div>
    </div>
  );
}

function TicketFilters({ category, onCategoryChange, priority, onPriorityChange }: {
  category: SupportTicketCategory | "All";
  onCategoryChange: (v: SupportTicketCategory | "All") => void;
  priority: SupportTicketPriority | "All";
  onPriorityChange: (v: SupportTicketPriority | "All") => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <SelectField
        label="Category"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value as SupportTicketCategory | "All")}
        options={[{ value: "All", label: "All categories" }, ...Object.entries(SUPPORT_CATEGORY_META).map(([v, m]) => ({ value: v, label: m.label }))]}
        className="w-44"
      />
      <SelectField
        label="Priority"
        value={priority}
        onChange={(e) => onPriorityChange(e.target.value as SupportTicketPriority | "All")}
        options={[{ value: "All", label: "Any priority" }, ...Object.entries(SUPPORT_PRIORITY_META).map(([v, m]) => ({ value: v, label: m.label }))]}
        className="w-36"
      />
    </div>
  );
}

function SupportTicketCard({ ticket, active, onSelect, now }: { ticket: SupportTicket; active: boolean; onSelect: (id: string) => void; now: number }) {
  const order = ticket.relatedOrderId ? MOCK_ORDER_LOOKUP[ticket.relatedOrderId] : undefined;
  const categoryMeta = SUPPORT_CATEGORY_META[ticket.category];
  const statusMeta = SUPPORT_STATUS_META[ticket.status];
  const priorityMeta = SUPPORT_PRIORITY_META[ticket.priority];
  return (
    <li>
      <button
        onClick={() => onSelect(ticket.id)}
        aria-current={active ? "true" : undefined}
        className={cx(
          "flex w-full flex-col gap-1.5 rounded-lg border px-4 py-3 text-left transition-colors duration-[--duration-fast]",
          active ? "border-primary bg-secondary" : "border-border bg-card hover:bg-secondary/50"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{ticket.id}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(ticket.lastMessageAt, now)}</span>
        </div>
        <p className="truncate text-sm font-semibold text-foreground">{ticket.subject}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge visual={statusMeta} />
          {ticket.priority === "Urgent" || ticket.priority === "High" ? <StatusBadge visual={priorityMeta} /> : null}
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <categoryMeta.icon className="h-3 w-3" aria-hidden="true" />
            {categoryMeta.label}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{order ? `Order ${order.orderNumber}` : ticket.assignedTeam ?? "Unassigned"}</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" aria-hidden="true" />
            {ticket.messageCount}
          </span>
        </div>
      </button>
    </li>
  );
}

function TicketListSkeleton() {
  return (
    <ul className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="rounded-lg border border-border px-4 py-3">
          <SkeletonLine width="30%" height={10} />
          <div className="mt-2">
            <SkeletonLine width="70%" />
          </div>
          <div className="mt-2">
            <SkeletonLine width="50%" height={10} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TicketList({ tickets, selectedTicketId, onSelect, loadState, onRetry, statusTab, now }: {
  tickets: SupportTicket[];
  selectedTicketId: string | null;
  onSelect: (id: string) => void;
  loadState: OperationState;
  onRetry: () => void;
  statusTab: SupportStatusTab;
  now: number;
}) {
  if (loadState.status === "loading") return <TicketListSkeleton />;
  if (loadState.status === "error") return <ErrorState description={loadState.message} onRetry={onRetry} />;
  if (tickets.length === 0) {
    if (statusTab === "Open") {
      return <EmptyState icon={CheckCheck} title="No open tickets" description="You don't have any tickets currently being worked on." />;
    }
    return <EmptyState icon={LifeBuoy} title="No support tickets" description="When you contact support, your tickets will appear here." />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {tickets.map((t) => (
        <SupportTicketCard key={t.id} ticket={t} active={t.id === selectedTicketId} onSelect={onSelect} now={now} />
      ))}
    </ul>
  );
}

const TIMELINE_EVENT_META: Record<SupportTimelineEvent["kind"], { icon: LucideIcon; describe: (e: SupportTimelineEvent) => string }> = {
  created: { icon: Plus, describe: () => "Ticket created" },
  assigned: { icon: Building2, describe: (e) => (e.kind === "assigned" ? `Assigned to ${e.team}` : "Assigned") },
  "agent-replied": { icon: MessageCircle, describe: (e) => (e.kind === "agent-replied" ? `${e.agentName} replied` : "Agent replied") },
  "customer-replied": { icon: MessageSquare, describe: () => "You replied" },
  "status-changed": { icon: RefreshCw, describe: (e) => (e.kind === "status-changed" ? `Status changed to ${SUPPORT_STATUS_META[e.to].label}` : "Status changed") },
  "attachment-added": { icon: Paperclip, describe: (e) => (e.kind === "attachment-added" ? `Attachment added: ${e.fileName}` : "Attachment added") },
  resolved: { icon: Check, describe: () => "Ticket resolved" },
  reopened: { icon: RotateCcw, describe: () => "Ticket reopened" },
};

function TicketTimeline({ events }: { events: SupportTimelineEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h4>
      <ol className="flex flex-col gap-3 border-l border-border pl-4">
        {events.map((event) => {
          const meta = TIMELINE_EVENT_META[event.kind];
          const Icon = meta.icon;
          return (
            <li key={event.id} className="relative">
              <span className="absolute -left-[21px] flex h-4 w-4 items-center justify-center rounded-full border border-border bg-background">
                <Icon className="h-2.5 w-2.5 text-muted-foreground" aria-hidden="true" />
              </span>
              <p className="text-xs text-foreground">{meta.describe(event)}</p>
              <p className="text-[11px] text-muted-foreground">{formatDateTime(event.at)}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TicketAttachmentsSummary({ messages, onPreview }: { messages: SupportMessage[]; onPreview: (attachment: SupportAttachment) => void }) {
  const attachments = messages.flatMap((m) => m.attachments);
  if (attachments.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attachments ({attachments.length})</h4>
      <ul className="flex flex-col gap-1.5">
        {attachments.map((a) => (
          <li key={a.id}>
            <button onClick={() => onPreview(a)} className="flex w-full items-center gap-2 rounded-md border border-border px-2.5 py-2 text-left text-xs hover:bg-secondary">
              {a.mimeType.startsWith("image/") ? <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <span className="min-w-0 flex-1 truncate text-foreground">{a.fileName}</span>
              <span className="shrink-0 text-muted-foreground">{formatFileSize(a.fileSizeBytes)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function authorLabel(author: SupportMessageAuthor): { label: string; tone: StatusVisual["tone"] } {
  if (author.kind === "customer") return { label: author.name, tone: "info" };
  if (author.kind === "agent") return { label: `${author.name} · ${author.team}`, tone: "success" };
  return { label: "System", tone: "neutral" };
}

function TicketMessageThread({ messages, onPreviewAttachment }: { messages: SupportMessage[]; onPreviewAttachment: (a: SupportAttachment) => void }) {
  return (
    <div className="flex flex-col gap-3" role="log" aria-label="Ticket conversation">
      {messages.map((message) => {
        const { label, tone } = authorLabel(message.author);
        const isCustomer = message.author.kind === "customer";
        const isSystem = message.author.kind === "system";
        if (isSystem) {
          return (
            <div key={message.id} className="flex items-center gap-2 py-1 text-center text-[11px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
              {message.body}
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </div>
          );
        }
        return (
          <div key={message.id} className={cx("flex flex-col gap-1", isCustomer && "items-end")}>
            <div className="flex items-center gap-1.5">
              <Badge tone={tone}>{label}</Badge>
              <span className="text-[11px] text-muted-foreground">{formatDateTime(message.createdAt)}</span>
            </div>
            <div className={cx("max-w-[85%] rounded-lg border px-3.5 py-2.5 text-sm", isCustomer ? "border-primary/20 bg-secondary text-foreground" : "border-border bg-card text-foreground")}>
              <p className="whitespace-pre-wrap">{message.body}</p>
              {message.attachments.length > 0 ? (
                <div className="mt-2 flex flex-col gap-1">
                  {message.attachments.map((a) => (
                    <button key={a.id} onClick={() => onPreviewAttachment(a)} className="flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1 text-left text-xs hover:bg-secondary">
                      <Paperclip className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      {a.fileName}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TicketReplyComposer({ ticketId, disabled, onSubmit, operationState }: { ticketId: string; disabled: boolean; onSubmit: (body: string, attachment?: SupportAttachment) => void; operationState: OperationState }) {
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<SupportAttachment | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleAttach() {
    // No real upload backend — mock attachment metadata only.
    setAttachment({ id: `ATT-${Date.now()}`, fileName: "screenshot.png", fileSizeBytes: 842_000, mimeType: "image/png" });
  }

  function handleSubmit() {
    if (!body.trim()) {
      setValidationError("Write a message before sending.");
      return;
    }
    setValidationError(null);
    onSubmit(body.trim(), attachment ?? undefined);
    setBody("");
    setAttachment(null);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <Textarea
        label="Reply"
        aria-label={`Reply to ticket ${ticketId}`}
        placeholder="Type your message…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={disabled || operationState.status === "loading"}
        error={validationError ?? undefined}
        rows={3}
      />
      {attachment ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-1.5 text-xs">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 truncate">{attachment.fileName}</span>
          <button aria-label="Remove attachment" onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {operationState.status === "error" ? <p className="text-xs text-destructive">{operationState.message}</p> : null}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleAttach} disabled={disabled || operationState.status === "loading"}>
          <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
          Attach file
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setBody(""); setAttachment(null); setValidationError(null); }} disabled={operationState.status === "loading"}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={operationState.status === "loading"} disabled={disabled}>
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

const CLOSED_STATUSES: SupportTicketStatus[] = ["Resolved", "Closed"];

function TicketDetails({
  ticket, messages, timeline, onReply, replyState, onRequestClose, onReopen, closeState, reopenState,
  onPreviewAttachment, onStartRelatedTicket,
}: {
  ticket: SupportTicket | null;
  messages: SupportMessage[];
  timeline: SupportTimelineEvent[];
  onReply: (ticketId: string, body: string, attachment?: SupportAttachment) => void;
  replyState: OperationState;
  onRequestClose: (ticketId: string) => void;
  onReopen: (ticketId: string) => void;
  closeState: OperationState;
  reopenState: OperationState;
  onPreviewAttachment: (a: SupportAttachment) => void;
  onStartRelatedTicket: (origin: SupportOrigin) => void;
}) {
  if (!ticket) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Select a ticket"
        description="Choose a ticket from the list to view the full conversation and take action."
      />
    );
  }

  const order = ticket.relatedOrderId ? MOCK_ORDER_LOOKUP[ticket.relatedOrderId] : undefined;
  const product = ticket.relatedProductId ? MOCK_PRODUCT_LOOKUP[ticket.relatedProductId] : undefined;
  const statusMeta = SUPPORT_STATUS_META[ticket.status];
  const priorityMeta = SUPPORT_PRIORITY_META[ticket.priority];
  const categoryMeta = SUPPORT_CATEGORY_META[ticket.category];
  const isClosed = CLOSED_STATUSES.includes(ticket.status);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{ticket.id}</p>
            <h3 className="text-base font-semibold text-foreground">{ticket.subject}</h3>
          </div>
          <StatusBadge visual={statusMeta} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">
            <span className="inline-flex items-center gap-1">
              <categoryMeta.icon className="h-3 w-3" aria-hidden="true" />
              {categoryMeta.label}
            </span>
          </Badge>
          <StatusBadge visual={priorityMeta} />
          {ticket.assignedTeam ? <span className="text-[11px] text-muted-foreground">Assigned to {ticket.assignedTeam}</span> : <span className="text-[11px] text-muted-foreground">Awaiting assignment</span>}
        </div>
        <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" aria-hidden="true" />
            Created {formatDateTime(ticket.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Updated {formatDateTime(ticket.updatedAt)}
          </span>
        </div>
        {order ? (
          <button
            onClick={() => onStartRelatedTicket({ kind: "order", orderId: order.id })}
            className="flex items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-left text-xs hover:bg-secondary"
          >
            <span className="flex items-center gap-2 text-foreground">
              <Package className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              Order {order.orderNumber} · {order.itemSummary}
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        ) : null}
        {product ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            {product.brand} — {product.name}
          </div>
        ) : null}
      </div>

      {/* Conversation */}
      <div className="max-h-[420px] flex-1 overflow-y-auto pr-1">
        <TicketMessageThread messages={messages} onPreviewAttachment={onPreviewAttachment} />
      </div>

      <TicketAttachmentsSummary messages={messages} onPreview={onPreviewAttachment} />
      <TicketTimeline events={timeline} />

      {/* Actions + composer */}
      {isClosed ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted px-3.5 py-3">
          <p className="text-xs text-muted-foreground">This ticket is {ticket.status.toLowerCase()}. You can reopen it if the issue isn't fully resolved.</p>
          <Button variant="outline" size="sm" onClick={() => onReopen(ticket.id)} loading={reopenState.status === "loading"}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reopen ticket
          </Button>
        </div>
      ) : (
        <>
          <TicketReplyComposer ticketId={ticket.id} disabled={false} onSubmit={(body, attachment) => onReply(ticket.id, body, attachment)} operationState={replyState} />
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => onRequestClose(ticket.id)} loading={closeState.status === "loading"}>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Mark as resolved / close ticket
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function SupportTicketWorkspace({
  tickets, selectedTicketId, onSelectTicket, listLoadState, onRetryList, statusTab, onStatusTabChange,
  category, onCategoryChange, priority, onPriorityChange, search, onSearchChange, sort, onSortChange,
  onCreateTicket, selectedTicket, messages, timeline, onReply, replyState, onRequestClose, onReopen,
  closeState, reopenState, onPreviewAttachment, onStartRelatedTicket, now, statusCounts,
}: {
  tickets: SupportTicket[];
  selectedTicketId: string | null;
  onSelectTicket: (id: string) => void;
  listLoadState: OperationState;
  onRetryList: () => void;
  statusTab: SupportStatusTab;
  onStatusTabChange: (v: SupportStatusTab) => void;
  category: SupportTicketCategory | "All";
  onCategoryChange: (v: SupportTicketCategory | "All") => void;
  priority: SupportTicketPriority | "All";
  onPriorityChange: (v: SupportTicketPriority | "All") => void;
  search: string;
  onSearchChange: (v: string) => void;
  sort: SupportSort;
  onSortChange: (v: SupportSort) => void;
  onCreateTicket: () => void;
  selectedTicket: SupportTicket | null;
  messages: SupportMessage[];
  timeline: SupportTimelineEvent[];
  onReply: (ticketId: string, body: string, attachment?: SupportAttachment) => void;
  replyState: OperationState;
  onRequestClose: (ticketId: string) => void;
  onReopen: (ticketId: string) => void;
  closeState: OperationState;
  reopenState: OperationState;
  onPreviewAttachment: (a: SupportAttachment) => void;
  onStartRelatedTicket: (origin: SupportOrigin) => void;
  now: number;
  statusCounts: Record<SupportStatusTab, number>;
}) {
  return (
    <section aria-labelledby="ticket-workspace-heading" className="flex flex-col gap-4">
      <h2 id="ticket-workspace-heading" className="sr-only">
        Support tickets
      </h2>
      <TicketToolbar search={search} onSearchChange={onSearchChange} sort={sort} onSortChange={onSortChange} onCreateTicket={onCreateTicket} />
      <Tabs
        ariaLabel="Ticket status"
        value={statusTab}
        onChange={onStatusTabChange}
        tabs={SUPPORT_STATUS_TABS.map((tab) => ({ value: tab, label: tab === "All" ? "All" : SUPPORT_STATUS_META[tab].label, count: statusCounts[tab] }))}
      />
      <TicketFilters category={category} onCategoryChange={onCategoryChange} priority={priority} onPriorityChange={onPriorityChange} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="max-h-[640px] overflow-y-auto pr-1">
          <TicketList tickets={tickets} selectedTicketId={selectedTicketId} onSelect={onSelectTicket} loadState={listLoadState} onRetry={onRetryList} statusTab={statusTab} now={now} />
        </div>
        <Card className="p-5">
          <TicketDetails
            ticket={selectedTicket}
            messages={messages}
            timeline={timeline}
            onReply={onReply}
            replyState={replyState}
            onRequestClose={onRequestClose}
            onReopen={onReopen}
            closeState={closeState}
            reopenState={reopenState}
            onPreviewAttachment={onPreviewAttachment}
            onStartRelatedTicket={onStartRelatedTicket}
          />
        </Card>
      </div>
    </section>
  );
}

function ContactSupportSection({ onStartChat, onCreateTicket }: { onStartChat: () => void; onCreateTicket: () => void }) {
  return (
    <section aria-labelledby="contact-support-heading" className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <h2 id="contact-support-heading" className="sr-only">
        Contact support
      </h2>
      <Card className="flex flex-col gap-2.5 p-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[--color-success-muted] text-[--color-success-foreground]">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-foreground">Live chat</p>
        <p className="text-xs text-muted-foreground">Available now · Average wait under 3 minutes</p>
        <Button variant="primary" size="sm" onClick={onStartChat} className="mt-1 w-full sm:w-auto">
          Start chat
        </Button>
      </Card>
      <Card className="flex flex-col gap-2.5 p-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[--color-info-muted] text-[--color-info-foreground]">
          <Mail className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-foreground">Email support</p>
        <p className="text-xs text-muted-foreground">{SUPPORT_EMAIL} · Typical reply within 24 hours</p>
        <Button variant="outline" size="sm" onClick={onCreateTicket} className="mt-1 w-full sm:w-auto">
          Send a message
        </Button>
      </Card>
      <Card className="flex flex-col gap-2.5 p-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[--color-warning-muted] text-[--color-warning-foreground]">
          <Phone className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-foreground">Phone support</p>
        <p className="text-xs text-muted-foreground">{SUPPORT_PHONE} · Mon–Fri, 6am–8pm PT</p>
        <p className="text-[11px] text-muted-foreground">Currently closed · Opens tomorrow at 6:00 AM PT</p>
      </Card>
    </section>
  );
}

// ============================================================================
// PREFERENCES COMPONENTS
// ============================================================================

function SecurityPreferenceNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-[--color-warning] bg-[--color-warning-muted] px-3.5 py-3">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[--color-warning-foreground]" aria-hidden="true" />
      <p className="text-xs text-[--color-warning-foreground]">
        Security notifications (like new sign-ins and password changes) are treated differently from marketing preferences. Email and push can't be
        turned off, and digest can't be set to Off, so you're never caught off guard about account activity.
      </p>
    </div>
  );
}

/** One reusable row, applied to every preference category — channels + digest. */
function PreferenceCategoryRow({ category, setting, onToggleChannel, onSetDigest }: {
  category: PreferenceCategory;
  setting: PreferenceCategorySetting;
  onToggleChannel: (category: PreferenceCategory, channel: NotificationChannel) => void;
  onSetDigest: (category: PreferenceCategory, digest: DigestFrequency) => void;
}) {
  const meta = PREFERENCE_CATEGORY_META[category];
  const isSecurity = category === "Security";
  return (
    <div className={cx("flex flex-col gap-3 border-b border-border py-4 last:border-0", isSecurity && "rounded-md border border-[--color-warning]/40 bg-[--color-warning-muted]/30 px-3.5 last:border")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            {meta.label}
            {isSecurity ? <Lock className="h-3.5 w-3.5 text-[--color-warning-foreground]" aria-hidden="true" /> : null}
          </p>
          <p className="mt-0.5 max-w-sm text-xs text-muted-foreground">{meta.description}</p>
        </div>
        <SelectField
          aria-label={`${meta.label} digest frequency`}
          value={setting.digest}
          onChange={(e) => onSetDigest(category, e.target.value as DigestFrequency)}
          options={isSecurity ? DIGEST_OPTIONS.filter((d) => d.value !== "Off") : DIGEST_OPTIONS}
          className="w-40 shrink-0"
        />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2" role="group" aria-label={`${meta.label} channels`}>
        {NOTIFICATION_CHANNELS.map((channel) => {
          const locked = isSecurity && (channel === "Email" || channel === "Push");
          return (
            <label key={channel} className={cx("flex items-center gap-2 text-xs", locked ? "text-muted-foreground" : "text-foreground")}>
              <input
                type="checkbox"
                checked={setting.channels[channel]}
                disabled={locked}
                onChange={() => onToggleChannel(category, channel)}
                className="h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              />
              {channel === "InApp" ? "In-app" : channel}
              {locked ? <span className="text-[10px]">(required)</span> : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function NotificationPreferencesSection({ categories, onToggleChannel, onSetDigest, onSave, saveState }: {
  categories: PreferencesEntities;
  onToggleChannel: (category: PreferenceCategory, channel: NotificationChannel) => void;
  onSetDigest: (category: PreferenceCategory, digest: DigestFrequency) => void;
  onSave: () => void;
  saveState: OperationState;
}) {
  return (
    <section aria-labelledby="preferences-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="preferences-heading" className="text-base font-semibold text-foreground">
          Notification preferences
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Choose how you'd like to hear from us for each type of update, and how often.</p>
      </div>
      <SecurityPreferenceNotice />
      <Card className="p-5">
        {PREFERENCE_CATEGORY_IDS.map((category) => (
          <PreferenceCategoryRow key={category} category={category} setting={categories[category]} onToggleChannel={onToggleChannel} onSetDigest={onSetDigest} />
        ))}
      </Card>
      {saveState.status === "error" ? <p className="text-sm text-destructive">{saveState.message}</p> : null}
      {saveState.status === "success" ? <p className="text-sm text-[--color-success]">Preferences saved.</p> : null}
      <div className="flex justify-end">
        <Button variant="primary" onClick={onSave} loading={saveState.status === "loading"}>
          Save preferences
        </Button>
      </div>
    </section>
  );
}

// ============================================================================
// HELP CENTER COMPONENTS
// ============================================================================

function HelpSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  const debounced = useDebouncedValue(local, 250);
  useEffect(() => {
    onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return (
    <div className="relative">
      <Input label="Search the help center" hideLabel icon={Search} placeholder="Search help articles (e.g. \u201Ctrack my order\u201D)" value={local} onChange={(e) => setLocal(e.target.value)} className="h-11" />
      {local ? (
        <button aria-label="Clear help search" onClick={() => setLocal("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function PopularTopics({ articles, onSelect }: { articles: HelpArticle[]; onSelect: (id: string) => void }) {
  const topFive = [...articles].sort((a, b) => b.popularity - a.popularity).slice(0, 5);
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Popular topics</h3>
      <ul className="flex flex-col gap-1.5">
        {topFive.map((a) => (
          <li key={a.id}>
            <button onClick={() => onSelect(a.id)} className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-secondary">
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {a.title}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HelpCategoryGrid({ active, onSelect }: { active: HelpCategory | "All"; onSelect: (c: HelpCategory | "All") => void }) {
  const categories = Object.entries(HELP_CATEGORY_META) as [HelpCategory, { label: string; icon: LucideIcon }][];
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Browse by category</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <button
          onClick={() => onSelect("All")}
          aria-pressed={active === "All"}
          className={cx("flex flex-col items-center gap-1.5 rounded-md border px-3 py-3 text-center text-xs font-medium", active === "All" ? "border-primary bg-secondary text-foreground" : "border-border text-muted-foreground hover:bg-secondary/50")}
        >
          <Globe2 className="h-4 w-4" aria-hidden="true" />
          All topics
        </button>
        {categories.map(([id, meta]) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            aria-pressed={active === id}
            className={cx("flex flex-col items-center gap-1.5 rounded-md border px-3 py-3 text-center text-xs font-medium", active === id ? "border-primary bg-secondary text-foreground" : "border-border text-muted-foreground hover:bg-secondary/50")}
          >
            <meta.icon className="h-4 w-4" aria-hidden="true" />
            {meta.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Shared list used for every category (Orders, Payments, Delivery, Returns, Account, Security, etc.) */
function HelpArticleResults({ articles, search, category, searchState, onRetry, onOpenTicketForHelp }: {
  articles: HelpArticle[];
  search: string;
  category: HelpCategory | "All";
  searchState: OperationState;
  onRetry: () => void;
  onOpenTicketForHelp: () => void;
}) {
  if (searchState.status === "error") return <ErrorState description={searchState.message} onRetry={onRetry} />;
  if (articles.length === 0) {
    return (
      <EmptyState
        icon={HelpCircle}
        title={search.trim() ? `No help articles for "${search.trim()}"` : "No articles in this category yet"}
        description="Try a different search term, or contact support directly and we'll help you sort it out."
        action={
          <Button variant="outline" size="sm" onClick={onOpenTicketForHelp} className="mt-1">
            Contact support
          </Button>
        }
      />
    );
  }
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {category === "All" ? "All articles" : `${HELP_CATEGORY_META[category].label} articles`}
      </h3>
      <ul className="flex flex-col gap-2">
        {articles.map((a) => (
          <li key={a.id}>
            <div className="rounded-md border border-border px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {a.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.summary}</p>
              <span className="mt-1 inline-block text-[11px] text-muted-foreground">{HELP_CATEGORY_META[a.category].label}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HelpCenter({ search, onSearchChange, category, onCategoryChange, articles, allArticles, searchState, onRetry, onOpenTicketForHelp, onSelectArticle }: {
  search: string;
  onSearchChange: (v: string) => void;
  category: HelpCategory | "All";
  onCategoryChange: (v: HelpCategory | "All") => void;
  articles: HelpArticle[];
  allArticles: HelpArticle[];
  searchState: OperationState;
  onRetry: () => void;
  onOpenTicketForHelp: () => void;
  onSelectArticle: (article: HelpArticle) => void;
}) {
  return (
    <section aria-labelledby="help-center-heading" className="flex flex-col gap-5">
      <div>
        <h2 id="help-center-heading" className="text-base font-semibold text-foreground">
          Help center
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Find answers about orders, payments, shipping, returns, and your account.</p>
      </div>
      <HelpSearch value={search} onChange={onSearchChange} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
        <div className="flex flex-col gap-5">
          <PopularTopics articles={allArticles} onSelect={(id) => {
            const article = allArticles.find((a) => a.id === id);
            if (article) onSelectArticle(article);
          }} />
        </div>
        <div className="flex flex-col gap-5">
          <HelpCategoryGrid active={category} onSelect={onCategoryChange} />
          <HelpArticleResults articles={articles} search={search} category={category} searchState={searchState} onRetry={onRetry} onOpenTicketForHelp={onOpenTicketForHelp} />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ SECTION
// ============================================================================

function FAQDisclosure({ item, expanded, onToggle }: { item: FAQItem; expanded: boolean; onToggle: (id: string) => void }) {
  const panelId = useId();
  return (
    <div className="border-b border-border last:border-0">
      <h3>
        <button
          id={`faq-trigger-${item.id}`}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => onToggle(item.id)}
          className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-sm font-medium text-foreground hover:text-primary"
        >
          {item.question}
          <ChevronDown className={cx("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-[--duration-fast]", expanded && "rotate-180")} aria-hidden="true" />
        </button>
      </h3>
      {expanded ? (
        <div id={panelId} role="region" aria-labelledby={`faq-trigger-${item.id}`} className="pb-4 text-sm text-muted-foreground">
          {item.answer}
        </div>
      ) : null}
    </div>
  );
}

function FAQSection() {
  const [expandedId, setExpandedId] = useState<string | null>(MOCK_FAQS[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return MOCK_FAQS;
    const q = query.trim().toLowerCase();
    return MOCK_FAQS.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  }, [query]);

  return (
    <section aria-labelledby="faq-heading" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h2 id="faq-heading" className="text-lg font-semibold text-foreground">
        Frequently asked questions
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Quick answers to the questions we hear most often.</p>
      <div className="mt-4">
        <Input label="Search FAQs" hideLabel icon={Search} placeholder="Search frequently asked questions" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="mt-4">
        {filtered.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No FAQs match your search. Try the Help Center above or contact support.</p>
        ) : (
          filtered.map((item) => <FAQDisclosure key={item.id} item={item} expanded={expandedId === item.id} onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))} />)
        )}
      </div>
    </section>
  );
}

// ============================================================================
// DIALOGS / FORMS
// ============================================================================

function NotificationDetailsDialog({ notification, onClose, onMarkRead, onMarkUnread, onArchive, onAction, now }: {
  notification: Notification | null;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onArchive: (id: string) => void;
  onAction: (notification: Notification) => void;
  now: number;
}) {
  if (!notification) return null;
  const order = notification.relatedOrderId ? MOCK_ORDER_LOOKUP[notification.relatedOrderId] : undefined;
  const product = notification.relatedProductId ? MOCK_PRODUCT_LOOKUP[notification.relatedProductId] : undefined;
  const TypeIcon = NOTIFICATION_TYPE_META[notification.type].icon;
  const priorityMeta = NOTIFICATION_PRIORITY_META[notification.priority];
  const statusMeta = NOTIFICATION_STATUS_META[notification.status];
  const actionMeta = notification.actionType ? NOTIFICATION_ACTION_META[notification.actionType] : null;
  const isUnread = notification.status === "Unread" || notification.status === "ActionRequired";

  return (
    <Modal
      open={!!notification}
      onClose={onClose}
      title="Notification details"
      size="md"
      footer={
        <>
          {isUnread ? (
            <Button variant="outline" size="sm" onClick={() => onMarkRead(notification.id)}>
              Mark as read
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => onMarkUnread(notification.id)}>
              Mark as unread
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onArchive(notification.id)}>
            Archive
          </Button>
          {actionMeta ? (
            <Button variant="primary" size="sm" onClick={() => onAction(notification)}>
              <actionMeta.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {actionMeta.label}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
            <TypeIcon className="h-5 w-5 text-foreground" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{notification.title}</h3>
            <p className="text-xs text-muted-foreground">{formatDateTime(notification.createdAt)} · via {notification.source}</p>
          </div>
        </div>
        <p className="text-sm text-foreground">{notification.message}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="neutral">{NOTIFICATION_CATEGORY_META[notification.category].label}</Badge>
          <StatusBadge visual={priorityMeta} />
          <StatusBadge visual={statusMeta} />
        </div>
        {order ? (
          <div className="rounded-md border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related order</p>
            <p className="mt-1 text-sm text-foreground">Order {order.orderNumber} — {order.itemSummary}</p>
            <p className="text-xs text-muted-foreground">{order.deliveredOrExpected} · {formatCurrency(order.total)}</p>
          </div>
        ) : null}
        {product ? (
          <div className="rounded-md border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related product</p>
            <p className="mt-1 text-sm text-foreground">{product.brand} — {product.name}</p>
          </div>
        ) : null}
        {!order && (notification.relatedOrderId || notification.relatedProductId) ? (
          <p className="text-xs text-muted-foreground">The related order is no longer available for this account.</p>
        ) : null}
      </div>
    </Modal>
  );
}

interface CreateTicketFormValues {
  category: SupportTicketCategory;
  subject: string;
  description: string;
  relatedOrderId: string;
  relatedProductId: string;
  priority: SupportTicketPriority;
}

const EMPTY_TICKET_FORM: CreateTicketFormValues = {
  category: "Order",
  subject: "",
  description: "",
  relatedOrderId: "",
  relatedProductId: "",
  priority: "Normal",
};

function CreateSupportTicketDialog({ open, onClose, onSubmit, operationState, initialOrigin }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreateTicketFormValues, attachment?: SupportAttachment) => void;
  operationState: OperationState;
  initialOrigin: SupportOrigin | null;
}) {
  const [values, setValues] = useState<CreateTicketFormValues>(EMPTY_TICKET_FORM);
  const [attachment, setAttachment] = useState<SupportAttachment | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateTicketFormValues, string>>>({});

  useEffect(() => {
    if (!open) return;
    let next = EMPTY_TICKET_FORM;
    if (initialOrigin?.kind === "order") next = { ...EMPTY_TICKET_FORM, category: "Order", relatedOrderId: initialOrigin.orderId };
    else if (initialOrigin?.kind === "product") next = { ...EMPTY_TICKET_FORM, category: "Product", relatedProductId: initialOrigin.productId };
    else if (initialOrigin?.kind === "payment") next = { ...EMPTY_TICKET_FORM, category: "Payment" };
    else if (initialOrigin?.kind === "return") next = { ...EMPTY_TICKET_FORM, category: "Return" };
    else if (initialOrigin?.kind === "refund") next = { ...EMPTY_TICKET_FORM, category: "Refund" };
    else if (initialOrigin?.kind === "account") next = { ...EMPTY_TICKET_FORM, category: "Account" };
    else if (initialOrigin?.kind === "security") next = { ...EMPTY_TICKET_FORM, category: "Security", priority: "High" };
    setValues(next);
    setAttachment(null);
    setErrors({});
  }, [open, initialOrigin]);

  function validate(): boolean {
    const next: Partial<Record<keyof CreateTicketFormValues, string>> = {};
    if (values.subject.trim().length < 6) next.subject = "Give your ticket a short, specific subject (6+ characters).";
    if (values.description.trim().length < 20) next.description = "Please add a bit more detail (20+ characters) so support can help quickly.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit(values, attachment ?? undefined);
  }

  function handleAttach() {
    setAttachment({ id: `ATT-${Date.now()}`, fileName: "order-photo.jpg", fileSizeBytes: 1_040_000, mimeType: "image/jpeg" });
  }

  const isSubmitting = operationState.status === "loading";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a support ticket"
      description="Tell us what's going on and we'll route it to the right team."
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={isSubmitting}>
            Submit ticket
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {operationState.status === "error" ? <p className="rounded-md border border-destructive bg-[--color-destructive-muted] px-3 py-2 text-xs text-destructive">{operationState.message}</p> : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Category"
            value={values.category}
            onChange={(e) => setValues((v) => ({ ...v, category: e.target.value as SupportTicketCategory }))}
            options={Object.entries(SUPPORT_CATEGORY_META).map(([v, m]) => ({ value: v, label: m.label }))}
          />
          <SelectField
            label="Priority"
            value={values.priority}
            onChange={(e) => setValues((v) => ({ ...v, priority: e.target.value as SupportTicketPriority }))}
            options={Object.entries(SUPPORT_PRIORITY_META).map(([v, m]) => ({ value: v, label: m.label }))}
            hint="Only mark Urgent if you're blocked right now."
          />
        </div>
        <Input label="Subject" placeholder="e.g. Wrong item delivered for order #88209117" value={values.subject} onChange={(e) => setValues((v) => ({ ...v, subject: e.target.value }))} error={errors.subject} />
        <Textarea
          label="Description"
          placeholder="Include what happened, when, and any order or product details."
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          error={errors.description}
          rows={4}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Related order (optional)"
            value={values.relatedOrderId}
            onChange={(e) => setValues((v) => ({ ...v, relatedOrderId: e.target.value }))}
            options={[{ value: "", label: "No related order" }, ...Object.values(MOCK_ORDER_LOOKUP).map((o) => ({ value: o.id, label: `${o.orderNumber} — ${o.itemSummary}` }))]}
          />
          <SelectField
            label="Related product (optional)"
            value={values.relatedProductId}
            onChange={(e) => setValues((v) => ({ ...v, relatedProductId: e.target.value }))}
            options={[{ value: "", label: "No related product" }, ...Object.values(MOCK_PRODUCT_LOOKUP).map((p) => ({ value: p.id, label: `${p.brand} — ${p.name}` }))]}
          />
        </div>
        <div>
          {attachment ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-1.5 text-xs">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1 truncate">{attachment.fileName} · {formatFileSize(attachment.fileSizeBytes)}</span>
              <button aria-label="Remove attachment" onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleAttach} type="button">
              <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
              Attach a file
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function AttachmentPreviewDialog({ attachment, onClose }: { attachment: SupportAttachment | null; onClose: () => void }) {
  if (!attachment) return null;
  const isImage = attachment.mimeType.startsWith("image/");
  return (
    <Modal
      open={!!attachment}
      onClose={onClose}
      title={attachment.fileName}
      description={`${formatFileSize(attachment.fileSizeBytes)} · ${attachment.mimeType}`}
      size="sm"
      footer={
        <Button variant="outline" size="sm" disabled>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download (unavailable in preview)
        </Button>
      }
    >
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted text-muted-foreground">
        {isImage ? <ImageIcon className="h-8 w-8" aria-hidden="true" /> : <FileText className="h-8 w-8" aria-hidden="true" />}
        <p className="text-xs">Preview not available in this workspace</p>
      </div>
    </Modal>
  );
}

// ============================================================================
// WORKSPACE LAYOUT COMPONENTS
// ============================================================================

interface WorkspaceNavItem {
  id: WorkspaceSection;
  label: string;
  icon: LucideIcon;
}

const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "preferences", label: "Preferences", icon: Settings },
  { id: "support-overview", label: "Support overview", icon: LifeBuoy },
  { id: "support-tickets", label: "My tickets", icon: MessageSquare },
  { id: "help-center", label: "Help center", icon: HelpCircle },
];

function AccountIdentity() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4 lg:px-0 lg:pb-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">AM</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">Alex Morgan</p>
        <p className="truncate text-xs text-muted-foreground">alex.morgan@email.com</p>
      </div>
    </div>
  );
}

function WorkspaceNavigation({ active, onSelect, unreadCount, openTicketCount }: { active: WorkspaceSection; onSelect: (s: WorkspaceSection) => void; unreadCount: number; openTicketCount: number }) {
  return (
    <nav aria-label="Notifications and support sections" className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-none lg:flex-col lg:overflow-visible lg:px-0 lg:py-0">
      {WORKSPACE_NAV_ITEMS.map((item) => {
        const badgeCount = item.id === "notifications" ? unreadCount : item.id === "support-tickets" ? openTicketCount : 0;
        return (
          <button
            key={item.id}
            aria-current={active === item.id ? "page" : undefined}
            onClick={() => onSelect(item.id)}
            className={cx(
              "flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors duration-[--duration-fast] lg:whitespace-normal",
              active === item.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2.5">
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </span>
            {badgeCount > 0 ? <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">{badgeCount}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}

function WorkspaceSidebar({ active, onSelect, unreadCount, openTicketCount }: { active: WorkspaceSection; onSelect: (s: WorkspaceSection) => void; unreadCount: number; openTicketCount: number }) {
  return (
    <aside aria-label="Workspace navigation" className="lg:w-60 lg:shrink-0">
      <div className="lg:sticky lg:top-20">
        <AccountIdentity />
        <div className="pt-2 lg:pt-4">
          <WorkspaceNavigation active={active} onSelect={onSelect} unreadCount={unreadCount} openTicketCount={openTicketCount} />
        </div>
      </div>
    </aside>
  );
}

const WORKSPACE_SECTION_META: Record<WorkspaceSection, { title: string; description: string }> = {
  notifications: { title: "Notifications", description: "Everything about your orders, deliveries, payments, and account." },
  preferences: { title: "Notification preferences", description: "Control how and when we reach you." },
  "support-overview": { title: "Support", description: "Your support activity at a glance." },
  "support-tickets": { title: "My support tickets", description: "Track and continue conversations with our support team." },
  "help-center": { title: "Help center", description: "Self-serve answers to common questions." },
};

function WorkspaceHeader({ section }: { section: WorkspaceSection }) {
  const meta = WORKSPACE_SECTION_META[section];
  return (
    <div className="border-b border-border pb-4">
      <h1 className="text-xl font-semibold text-foreground">{meta.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
    </div>
  );
}

// ============================================================================
// HEADER / FOOTER — shared ecommerce chrome for visual consistency
// ============================================================================

function AnnouncementBar() {
  return (
    <div className="bg-primary px-4 py-2 text-center text-xs font-medium text-primary-foreground">
      Free standard shipping on orders over $35 · Extended returns through Jan 31
    </div>
  );
}

function SearchBar() {
  return (
    <div className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        aria-label="Search products"
        placeholder="Search products, brands, and categories"
        className="h-10 w-full rounded-md border border-border bg-input pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

function HeaderActions({ unreadCount, onOpenNotifications }: { unreadCount: number; onOpenNotifications: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <IconButton label="Wishlist" icon={Heart} className="hidden sm:inline-flex" />
      <div className="relative">
        <IconButton label={`Notifications, ${unreadCount} unread`} icon={Bell} onClick={onOpenNotifications} />
        {unreadCount > 0 ? (
          <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </div>
      <IconButton label="Cart, 2 items" icon={ShoppingCart} />
      <IconButton label="Account" icon={User} />
    </div>
  );
}

const CATEGORY_NAV_ITEMS = ["Deals", "Electronics", "Home & Kitchen", "Fashion", "Beauty", "Sports & Outdoors", "Toys & Games", "Orders & Support"] as const;

function CategoryNavigation() {
  return (
    <nav aria-label="Product categories" className="hidden border-t border-border lg:block">
      <ul className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-2.5 text-sm text-muted-foreground">
        {CATEGORY_NAV_ITEMS.map((item) => (
          <li key={item}>
            <a href="#" className={cx("hover:text-foreground", item === "Orders & Support" && "font-medium text-foreground")} aria-current={item === "Orders & Support" ? "page" : undefined}>
              {item}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function EcommerceHeader({ unreadCount, onOpenNotifications, onOpenMobileNav }: { unreadCount: number; onOpenNotifications: () => void; onOpenMobileNav: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <AnnouncementBar />
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
        <IconButton label="Open menu" icon={Menu} className="lg:hidden" onClick={onOpenMobileNav} />
        <a href="#" className="shrink-0 text-lg font-bold tracking-tight text-foreground">
          Meridian<span className="text-primary">Market</span>
        </a>
        <div className="hidden flex-1 justify-center sm:flex">
          <SearchBar />
        </div>
        <div className="ml-auto">
          <HeaderActions unreadCount={unreadCount} onOpenNotifications={onOpenNotifications} />
        </div>
      </div>
      <div className="px-4 pb-3 sm:hidden">
        <SearchBar />
      </div>
      <CategoryNavigation />
    </header>
  );
}

function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-[1400px] px-4 py-3 text-xs text-muted-foreground sm:px-6">
      <ol className="flex items-center gap-1.5">
        <li>
          <a href="#" className="hover:text-foreground">
            Home
          </a>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3 w-3" />
        </li>
        <li>
          <a href="#" className="hover:text-foreground">
            Account
          </a>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3 w-3" />
        </li>
        <li aria-current="page" className="font-medium text-foreground">
          Notifications & Support
        </li>
      </ol>
    </nav>
  );
}

function TrustSection() {
  const items = [
    { icon: ShieldCheck, title: "Secure checkout", description: "256-bit encryption on every order" },
    { icon: RotateCcw, title: "Easy 30-day returns", description: "Free returns on most items" },
    { icon: LifeBuoy, title: "24/7 help center", description: "Live chat and support tickets anytime" },
    { icon: Truck, title: "Fast, tracked delivery", description: "Real-time tracking on every shipment" },
  ];
  return (
    <section aria-label="Why shop with us" className="border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-4 px-4 py-8 sm:px-6 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="flex flex-col items-start gap-2">
            <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EcommerceFooter() {
  const columns: { title: string; links: string[] }[] = [
    { title: "Shop", links: ["Deals", "New arrivals", "Best sellers", "Gift cards"] },
    { title: "Account", links: ["Orders", "Wishlist", "Addresses", "Payment methods"] },
    { title: "Support", links: ["Help center", "Contact us", "Returns & refunds", "Shipping info"] },
    { title: "Company", links: ["About us", "Careers", "Sustainability", "Sell on MeridianMarket"] },
  ];
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-5">
        <div className="col-span-2 lg:col-span-1">
          <p className="text-lg font-bold text-foreground">
            Meridian<span className="text-primary">Market</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Everything you need, delivered reliably — wherever you are.</p>
          <div className="mt-4 flex items-center gap-2">
            <IconButton label="Facebook" icon={Facebook} />
            <IconButton label="Twitter" icon={Twitter} />
            <IconButton label="Instagram" icon={Instagram} />
            <IconButton label="YouTube" icon={Youtube} />
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.title}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-foreground hover:text-primary">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-[11px] text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} MeridianMarket, Inc. All rights reserved.
      </div>
    </footer>
  );
}

// ============================================================================
// NOTIFICATION SUPPORT WORKSPACE — composes the active section
// ============================================================================

function NotificationsSection({
  visibleNotifications, allNotifications, selectedIds, filters, search, sort, loadState,
  onQuickFilterChange, onReadFilterChange, onSearchChange, onSortChange,
  onToggleSelect, onSelectAllVisible, onClearSelection, onOpenDetails,
  onMarkRead, onMarkUnread, onArchive, onDelete, onAction,
  onBulkMarkRead, onBulkMarkUnread, onRequestBulkArchive, onRequestBulkDelete, onRetry, now,
}: {
  visibleNotifications: Notification[];
  allNotifications: Notification[];
  selectedIds: string[];
  filters: NotificationFilterState;
  search: string;
  sort: NotificationSort;
  loadState: OperationState;
  onQuickFilterChange: (v: NotificationQuickFilter) => void;
  onReadFilterChange: (v: NotificationReadFilter) => void;
  onSearchChange: (v: string) => void;
  onSortChange: (v: NotificationSort) => void;
  onToggleSelect: (id: string) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onOpenDetails: (id: string) => void;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onAction: (n: Notification) => void;
  onBulkMarkRead: () => void;
  onBulkMarkUnread: () => void;
  onRequestBulkArchive: () => void;
  onRequestBulkDelete: () => void;
  onRetry: () => void;
  now: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <NotificationOverview notifications={allNotifications} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <NotificationFilterPanel value={filters.quickFilter} onChange={onQuickFilterChange} notifications={allNotifications} />
        <div className="flex flex-col gap-4">
          <NotificationToolbar
            search={search}
            onSearchChange={onSearchChange}
            sort={sort}
            onSortChange={onSortChange}
            selectedCount={selectedIds.length}
            onSelectAllVisible={onSelectAllVisible}
            onClearSelection={onClearSelection}
            onBulkMarkRead={onBulkMarkRead}
            onBulkMarkUnread={onBulkMarkUnread}
            onBulkArchive={onRequestBulkArchive}
            onBulkDelete={onRequestBulkDelete}
            readFilter={filters.readFilter}
            onReadFilterChange={onReadFilterChange}
          />
          <NotificationList
            notifications={visibleNotifications}
            selectedIds={selectedIds}
            search={search}
            quickFilter={filters.quickFilter}
            loadState={loadState}
            onRetry={onRetry}
            onToggleSelect={onToggleSelect}
            onOpenDetails={onOpenDetails}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
            onArchive={onArchive}
            onDelete={onDelete}
            onAction={onAction}
            now={now}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LIGHTWEIGHT TOAST FEEDBACK (module-scoped pub/sub — not global app state)
// ============================================================================

type ToastTone = "success" | "error" | "info";
interface ToastMessage {
  id: number;
  tone: ToastTone;
  title: string;
}
type ToastListener = (toasts: ToastMessage[]) => void;

class ToastStore {
  private toasts: ToastMessage[] = [];
  private listeners = new Set<ToastListener>();
  private nextId = 1;
  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => this.listeners.delete(listener);
  }
  private emit() {
    this.listeners.forEach((l) => l(this.toasts));
  }
  push(tone: ToastTone, title: string) {
    const id = this.nextId++;
    this.toasts = [...this.toasts, { id, tone, title }];
    this.emit();
    setTimeout(() => this.dismiss(id), 3800);
  }
  dismiss(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.emit();
  }
}
const toastStore = new ToastStore();

function useToasts(): ToastMessage[] {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  useEffect(() => toastStore.subscribe(setToasts), []);
  return toasts;
}

function ToastViewport() {
  const toasts = useToasts();
  const toneIcon: Record<ToastTone, LucideIcon> = { success: Check, error: AlertCircle, info: Info };
  const toneClass: Record<ToastTone, string> = {
    success: "border-[--color-success] bg-[--color-success-muted] text-[--color-success-foreground]",
    error: "border-destructive bg-[--color-destructive-muted] text-destructive",
    info: "border-[--color-info] bg-[--color-info-muted] text-[--color-info-foreground]",
  };
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => {
        const Icon = toneIcon[t.tone];
        return (
          <div key={t.id} className={cx("pointer-events-auto flex items-start gap-2 rounded-md border px-3.5 py-3 shadow-[--shadow-md] animate-scale-in", toneClass[t.tone])}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm font-medium">{t.title}</p>
            <button aria-label="Dismiss notification" onClick={() => toastStore.dismiss(t.id)} className="opacity-70 hover:opacity-100">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function useToast() {
  return useMemo(
    () => ({
      success: (title: string) => toastStore.push("success", title),
      error: (title: string) => toastStore.push("error", title),
      info: (title: string) => toastStore.push("info", title),
    }),
    []
  );
}

/** Simulated async operation for mutating flows — no real backend to call. */
function simulateAsync(successProbability = 0.88, delayMs = 650): Promise<boolean> {
  return new Promise((resolve) => setTimeout(() => resolve(rng() < successProbability), delayMs));
}

// ============================================================================
// NOTIFICATION SUPPORT PAGE — root composition
// ============================================================================

type DeleteTarget = { kind: "single"; id: string } | { kind: "bulk"; ids: string[] };

function NotificationSupportPageInner() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const now = useNowTick();

  const section = useAppSelector(selectWorkspaceSection);

  // ---- Notifications state ----
  const allNotifications = useAppSelector(selectAllNotifications);
  const visibleNotifications = useAppSelector(selectVisibleNotifications);
  const notificationFilters = useAppSelector(selectNotificationFilters);
  const notificationSearch = useAppSelector(selectNotificationSearch);
  const notificationSort = useAppSelector(selectNotificationSort);
  const selectedNotificationIds = useAppSelector(selectNotificationSelectedIds);
  const notificationUi = useAppSelector(selectNotificationUi);
  const unreadCount = useAppSelector(selectUnreadCount);

  // ---- Support state ----
  const allTickets = useAppSelector(selectAllTickets);
  const visibleTickets = useAppSelector(selectVisibleTickets);
  const supportFilters = useAppSelector(selectSupportFilters);
  const supportSearch = useAppSelector(selectSupportSearch);
  const supportSort = useAppSelector(selectSupportSort);
  const selectedTicketId = useAppSelector(selectSelectedTicketId);
  const messagesByTicketId = useAppSelector(selectMessagesByTicketId);
  const timelineByTicketId = useAppSelector(selectTimelineByTicketId);
  const supportUi = useAppSelector(selectSupportUi);
  const supportSummary = useAppSelector(selectSupportSummary);

  // ---- Preferences / Help state ----
  const preferenceCategories = useAppSelector(selectPreferenceCategories);
  const preferencesUi = useAppSelector(selectPreferencesUi);
  const helpSearch = useAppSelector(selectHelpSearch);
  const helpCategory = useAppSelector(selectHelpCategory);
  const visibleHelpArticles = useAppSelector(selectVisibleHelpArticles);
  const helpUi = useAppSelector((s: RootState) => s.help.ui);

  // ---- Local-only UI state (dialogs, previews, temporary forms) ----
  const [detailsNotificationId, setDetailsNotificationId] = useState<string | null>(null);
  const [markAllReadConfirmOpen, setMarkAllReadConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [archiveBulkConfirmOpen, setArchiveBulkConfirmOpen] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [createTicketOrigin, setCreateTicketOrigin] = useState<SupportOrigin | null>(null);
  const [closeTicketTarget, setCloseTicketTarget] = useState<string | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<SupportAttachment | null>(null);

  const detailsNotification = useMemo(
    () => (detailsNotificationId ? allNotifications.find((n) => n.id === detailsNotificationId) ?? null : null),
    [detailsNotificationId, allNotifications]
  );
  const selectedTicket = useMemo(() => allTickets.find((t) => t.id === selectedTicketId) ?? null, [allTickets, selectedTicketId]);
  const ticketStatusCounts = useMemo(() => {
    const counts: Record<SupportStatusTab, number> = {
      All: allTickets.length,
      Open: 0,
      InProgress: 0,
      WaitingForCustomer: 0,
      WaitingForSupport: 0,
      Resolved: 0,
      Closed: 0,
      Reopened: 0,
    };
    for (const t of allTickets) counts[t.status] += 1;
    return counts;
  }, [allTickets]);

  // ---- Notification handlers ----
  const handleOpenDetails = useCallback((id: string) => setDetailsNotificationId(id), []);
  const handleCloseDetails = useCallback(() => setDetailsNotificationId(null), []);

  const handleMarkRead = useCallback((id: string) => dispatch(markNotificationsRead([id])), [dispatch]);
  const handleMarkUnread = useCallback((id: string) => dispatch(markNotificationsUnread([id])), [dispatch]);
  const handleArchive = useCallback(
    (id: string) => {
      dispatch(archiveNotifications([id]));
      toast.success("Notification archived");
    },
    [dispatch, toast]
  );
  const handleRequestDelete = useCallback((id: string) => setDeleteTarget({ kind: "single", id }), []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const ids = deleteTarget.kind === "single" ? [deleteTarget.id] : deleteTarget.ids;
    dispatch(deleteNotifications(ids));
    if (detailsNotificationId && ids.includes(detailsNotificationId)) setDetailsNotificationId(null);
    toast.success(ids.length > 1 ? `${ids.length} notifications deleted` : "Notification deleted");
    setDeleteTarget(null);
  }, [deleteTarget, dispatch, toast, detailsNotificationId]);

  const handleConfirmMarkAllRead = useCallback(() => {
    const unreadIds = allNotifications.filter((n) => n.status === "Unread" || n.status === "ActionRequired").map((n) => n.id);
    dispatch(markNotificationsRead(unreadIds));
    toast.success("All notifications marked as read");
    setMarkAllReadConfirmOpen(false);
  }, [allNotifications, dispatch, toast]);

  const handleConfirmBulkArchive = useCallback(() => {
    dispatch(archiveNotifications(selectedNotificationIds));
    toast.success(`${selectedNotificationIds.length} notifications archived`);
    setArchiveBulkConfirmOpen(false);
  }, [dispatch, selectedNotificationIds, toast]);

  const handleNotificationAction = useCallback(
    (notification: Notification) => {
      dispatch(resolveNotificationAction(notification.id));
      const actionMeta = notification.actionType ? NOTIFICATION_ACTION_META[notification.actionType] : null;
      if (notification.actionType === "secure-account") {
        toast.info("Opening account security settings…");
      } else if (notification.actionType === "update-payment") {
        toast.info("Opening payment methods…");
      } else if (actionMeta) {
        toast.info(`${actionMeta.label}…`);
      }
    },
    [dispatch, toast]
  );

  // ---- Support handlers ----
  const handleOpenCreateTicket = useCallback((origin: SupportOrigin | null = null) => {
    setCreateTicketOrigin(origin);
    setCreateTicketOpen(true);
  }, []);

  const handleSubmitCreateTicket = useCallback(
    async (values: CreateTicketFormValues, attachment?: SupportAttachment) => {
      dispatch(setCreateTicketState({ status: "loading" }));
      const ok = await simulateAsync(0.9);
      if (!ok) {
        dispatch(setCreateTicketState({ status: "error", message: "We couldn't submit your ticket. Check your connection and try again." }));
        return;
      }
      dispatch(
        createTicket({
          subject: values.subject.trim(),
          category: values.category,
          priority: values.priority,
          description: values.description.trim(),
          relatedOrderId: values.relatedOrderId || undefined,
          relatedProductId: values.relatedProductId || undefined,
          attachment,
        })
      );
      dispatch(setCreateTicketState({ status: "success" }));
      dispatch(setWorkspaceSection("support-tickets"));
      toast.success("Support ticket created");
      setCreateTicketOpen(false);
      dispatch(setCreateTicketState({ status: "idle" }));
    },
    [dispatch, toast]
  );

  const handleReply = useCallback(
    async (ticketId: string, body: string, attachment?: SupportAttachment) => {
      dispatch(setReplyState({ status: "loading" }));
      const ok = await simulateAsync(0.9);
      if (!ok) {
        dispatch(setReplyState({ status: "error", message: "Your reply couldn't be sent. Please try again." }));
        return;
      }
      dispatch(appendCustomerReply({ ticketId, body, attachment }));
      dispatch(setReplyState({ status: "success" }));
      dispatch(setReplyState({ status: "idle" }));
    },
    [dispatch]
  );

  const handleConfirmCloseTicket = useCallback(async () => {
    if (!closeTicketTarget) return;
    dispatch(setCloseTicketState({ status: "loading" }));
    const ok = await simulateAsync(0.92);
    if (!ok) {
      dispatch(setCloseTicketState({ status: "error", message: "Couldn't close this ticket. Please try again." }));
      return;
    }
    dispatch(closeTicket(closeTicketTarget));
    dispatch(setCloseTicketState({ status: "idle" }));
    toast.success("Ticket closed");
    setCloseTicketTarget(null);
  }, [closeTicketTarget, dispatch, toast]);

  const handleReopenTicket = useCallback(
    async (ticketId: string) => {
      dispatch(setReopenTicketState({ status: "loading" }));
      const ok = await simulateAsync(0.92);
      if (!ok) {
        dispatch(setReopenTicketState({ status: "error", message: "Couldn't reopen this ticket. Please try again." }));
        return;
      }
      dispatch(reopenTicket(ticketId));
      dispatch(setReopenTicketState({ status: "idle" }));
      toast.info("Ticket reopened");
    },
    [dispatch, toast]
  );

  const handleStartRelatedTicket = useCallback((origin: SupportOrigin) => {
    setCreateTicketOrigin(origin);
    setCreateTicketOpen(true);
  }, []);

  // ---- Preferences handlers ----
  const handleToggleChannel = useCallback((category: PreferenceCategory, channel: NotificationChannel) => dispatch(toggleChannel({ category, channel })), [dispatch]);
  const handleSetDigest = useCallback((category: PreferenceCategory, digest: DigestFrequency) => dispatch(setDigest({ category, digest })), [dispatch]);
  const handleSavePreferences = useCallback(async () => {
    dispatch(setPreferencesSaveState({ status: "loading" }));
    const ok = await simulateAsync(0.94);
    if (!ok) {
      dispatch(setPreferencesSaveState({ status: "error", message: "Preferences couldn't be saved due to a conflict. Please retry." }));
      return;
    }
    dispatch(setPreferencesSaveState({ status: "success" }));
  }, [dispatch]);

  // ---- Help handlers ----
  const handleSelectHelpArticle = useCallback(
    (article: HelpArticle) => {
      dispatch(setHelpCategory(article.category));
      dispatch(setHelpSearch(article.title));
      dispatch(selectHelpArticle(article.id));
    },
    [dispatch]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground">
        Skip to main content
      </a>
      <EcommerceHeader unreadCount={unreadCount} onOpenNotifications={() => dispatch(setWorkspaceSection("notifications"))} onOpenMobileNav={() => dispatch(setWorkspaceSection("notifications"))} />
      <Breadcrumbs />

      <main id="main-content" className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-12 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <WorkspaceSidebar
            active={section}
            onSelect={(s) => dispatch(setWorkspaceSection(s))}
            unreadCount={unreadCount}
            openTicketCount={ticketStatusCounts.Open ?? 0}
          />
          <div className="min-w-0 flex-1">
            <WorkspaceHeader section={section} />
            <div className="pt-5">
              {section === "notifications" ? (
                <div className="flex flex-col gap-3">
                  {unreadCount > 0 ? (
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setMarkAllReadConfirmOpen(true)}>
                        <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Mark all as read
                      </Button>
                    </div>
                  ) : null}
                  <NotificationsSection
                    visibleNotifications={visibleNotifications}
                    allNotifications={allNotifications}
                    selectedIds={selectedNotificationIds}
                    filters={notificationFilters}
                    search={notificationSearch}
                    sort={notificationSort}
                    loadState={notificationUi.load}
                    onQuickFilterChange={(v) => dispatch(setNotificationQuickFilter(v))}
                    onReadFilterChange={(v) => dispatch(setNotificationReadFilter(v))}
                    onSearchChange={(v) => dispatch(setNotificationSearch(v))}
                    onSortChange={(v) => dispatch(setNotificationSort(v))}
                    onToggleSelect={(id) => dispatch(toggleNotificationSelected(id))}
                    onSelectAllVisible={() => dispatch(selectAllVisible(visibleNotifications.map((n) => n.id)))}
                    onClearSelection={() => dispatch(clearNotificationSelection())}
                    onOpenDetails={handleOpenDetails}
                    onMarkRead={handleMarkRead}
                    onMarkUnread={handleMarkUnread}
                    onArchive={handleArchive}
                    onDelete={handleRequestDelete}
                    onAction={handleNotificationAction}
                    onBulkMarkRead={() => {
                      dispatch(markNotificationsRead(selectedNotificationIds));
                      dispatch(clearNotificationSelection());
                      toast.success("Marked as read");
                    }}
                    onBulkMarkUnread={() => {
                      dispatch(markNotificationsUnread(selectedNotificationIds));
                      dispatch(clearNotificationSelection());
                      toast.success("Marked as unread");
                    }}
                    onRequestBulkArchive={() => setArchiveBulkConfirmOpen(true)}
                    onRequestBulkDelete={() => setDeleteTarget({ kind: "bulk", ids: selectedNotificationIds })}
                    onRetry={() => dispatch(setNotificationBulkActionState({ status: "idle" }))}
                    now={now}
                  />
                </div>
              ) : null}

              {section === "preferences" ? (
                <NotificationPreferencesSection categories={preferenceCategories} onToggleChannel={handleToggleChannel} onSetDigest={handleSetDigest} onSave={handleSavePreferences} saveState={preferencesUi.save} />
              ) : null}

              {section === "support-overview" ? (
                <div className="flex flex-col gap-6">
                  <SupportOverview summary={supportSummary} onCreateTicket={() => handleOpenCreateTicket(null)} onViewTickets={() => dispatch(setWorkspaceSection("support-tickets"))} />
                  <ContactSupportSection onStartChat={() => toast.info("Connecting you to live chat…")} onCreateTicket={() => handleOpenCreateTicket(null)} />
                </div>
              ) : null}

              {section === "support-tickets" ? (
                <SupportTicketWorkspace
                  tickets={visibleTickets}
                  selectedTicketId={selectedTicketId}
                  onSelectTicket={(id) => dispatch(selectTicket(id))}
                  listLoadState={supportUi.ticketsLoad}
                  onRetryList={() => dispatch(setTicketsLoadState({ status: "success" }))}
                  statusTab={supportFilters.statusTab}
                  onStatusTabChange={(v) => dispatch(setSupportStatusTab(v))}
                  category={supportFilters.category}
                  onCategoryChange={(v) => dispatch(setSupportCategoryFilter(v))}
                  priority={supportFilters.priority}
                  onPriorityChange={(v) => dispatch(setSupportPriorityFilter(v))}
                  search={supportSearch}
                  onSearchChange={(v) => dispatch(setSupportSearch(v))}
                  sort={supportSort}
                  onSortChange={(v) => dispatch(setSupportSort(v))}
                  onCreateTicket={() => handleOpenCreateTicket(null)}
                  selectedTicket={selectedTicket}
                  messages={selectedTicketId ? messagesByTicketId[selectedTicketId] ?? [] : []}
                  timeline={selectedTicketId ? timelineByTicketId[selectedTicketId] ?? [] : []}
                  onReply={handleReply}
                  replyState={supportUi.reply}
                  onRequestClose={setCloseTicketTarget}
                  onReopen={handleReopenTicket}
                  closeState={supportUi.closeTicket}
                  reopenState={supportUi.reopenTicket}
                  onPreviewAttachment={setAttachmentPreview}
                  onStartRelatedTicket={handleStartRelatedTicket}
                  now={now}
                  statusCounts={ticketStatusCounts}
                />
              ) : null}

              {section === "help-center" ? (
                <HelpCenter
                  search={helpSearch}
                  onSearchChange={(v) => dispatch(setHelpSearch(v))}
                  category={helpCategory}
                  onCategoryChange={(v) => dispatch(setHelpCategory(v))}
                  articles={visibleHelpArticles}
                  allArticles={MOCK_HELP_ARTICLES}
                  searchState={helpUi.search}
                  onRetry={() => dispatch(setHelpSearchState({ status: "idle" }))}
                  onOpenTicketForHelp={() => handleOpenCreateTicket(null)}
                  onSelectArticle={handleSelectHelpArticle}
                />
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <TrustSection />
      <FAQSection />
      <EcommerceFooter />

      {/* Dialogs */}
      <NotificationDetailsDialog
        notification={detailsNotification}
        onClose={handleCloseDetails}
        onMarkRead={handleMarkRead}
        onMarkUnread={handleMarkUnread}
        onArchive={(id) => {
          handleArchive(id);
          handleCloseDetails();
        }}
        onAction={handleNotificationAction}
        now={now}
      />

      <ConfirmDialog
        open={markAllReadConfirmOpen}
        onClose={() => setMarkAllReadConfirmOpen(false)}
        onConfirm={handleConfirmMarkAllRead}
        title="Mark all notifications as read?"
        description={`This will mark all ${unreadCount} unread notifications as read.`}
        confirmLabel="Mark all as read"
        tone="primary"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.kind === "bulk" ? "Delete selected notifications?" : "Delete this notification?"}
        description="Deleted notifications can't be recovered."
        confirmLabel="Delete"
        tone="destructive"
      />

      <ConfirmDialog
        open={archiveBulkConfirmOpen}
        onClose={() => setArchiveBulkConfirmOpen(false)}
        onConfirm={handleConfirmBulkArchive}
        title="Archive selected notifications?"
        description={`${selectedNotificationIds.length} notifications will be moved out of your main notification list.`}
        confirmLabel="Archive"
        tone="primary"
      />

      <CreateSupportTicketDialog
        open={createTicketOpen}
        onClose={() => {
          setCreateTicketOpen(false);
          dispatch(setCreateTicketState({ status: "idle" }));
        }}
        onSubmit={handleSubmitCreateTicket}
        operationState={supportUi.createTicket}
        initialOrigin={createTicketOrigin}
      />

      <ConfirmDialog
        open={!!closeTicketTarget}
        onClose={() => setCloseTicketTarget(null)}
        onConfirm={handleConfirmCloseTicket}
        title="Close this ticket?"
        description="You can reopen it later if the issue comes back."
        confirmLabel="Close ticket"
        tone="primary"
        loading={supportUi.closeTicket.status === "loading"}
      />

      <AttachmentPreviewDialog attachment={attachmentPreview} onClose={() => setAttachmentPreview(null)} />

      <ToastViewport />
    </div>
  );
}

function NotificationSupportPage() {
  const [store] = useState(() => makeStore());
  return (
    <Provider store={store}>
      <NotificationSupportPageInner />
    </Provider>
  );
}

export default NotificationSupportPage;