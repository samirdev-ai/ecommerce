"use client";

/**
 * OrdersPage.tsx
 * Enterprise-grade Orders experience for a global ecommerce platform.
 *
 * Organization:
 *  1. Imports
 *  2. Type definitions
 *  3. Enums / discriminated unions & metadata
 *  4. Constants
 *  5. Mock data
 *  6. Formatting utilities
 *  7. Filter / sort utilities
 *  8. Order status / action utilities
 *  9. Redux store, slices, thunJosé-free async mock hydration
 * 10. Redux selectors
 * 11. Small UI primitives
 * 12. Ecommerce header
 * 13. Breadcrumbs
 * 14. Orders header
 * 15. Status navigation
 * 16. Search / filter toolbar
 * 17. Filter panel (sidebar + drawer)
 * 18. Order list
 * 19. Order card
 * 20. Order item
 * 21. Tracking / progress
 * 22. Order actions + dialogs
 * 23. Empty / loading / error states
 * 24. Pagination
 * 25. Recommendations
 * 26. Trust section
 * 27. Footer
 * 28. Main OrdersPage composition
 * 29. Export
 */

// ─────────────────────────────────────────────────────────────────────────
// 1. Imports
// ─────────────────────────────────────────────────────────────────────────
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  configureStore,
  createSlice,
  createSelector,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  Provider,
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";

// ─────────────────────────────────────────────────────────────────────────
// 2. Type definitions
// ─────────────────────────────────────────────────────────────────────────
type CurrencyCode = "USD" | "EUR" | "GBP";
type MoneyMinor = number; // integer minor units (cents) — never floats for currency math

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "partially_cancelled"
  | "return_requested"
  | "partially_returned"
  | "returned"
  | "refund_pending"
  | "partially_refunded"
  | "refunded"
  | "failed";

type PaymentStatus =
  | "paid"
  | "pending"
  | "failed"
  | "refunded"
  | "partially_refunded";

type PaymentMethodType = "card" | "wallet" | "bank" | "cod" | "bnpl" | "gift_card";
type DeliveryMethod = "standard" | "express" | "same_day" | "pickup";

type ItemState =
  | "processing"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "returned"
  | "refunded"
  | "return_eligible"
  | "review_pending";

type StatusTone = "success" | "info" | "warning" | "danger" | "neutral" | "pending";

type ActionKey =
  | "view_details"
  | "track_package"
  | "buy_again"
  | "return"
  | "cancel"
  | "invoice"
  | "review"
  | "contact_seller"
  | "track_return"
  | "refund_details";

type DateRangeKey = "all" | "30d" | "3m" | "6m" | "1y" | "custom";
type SortKey =
  | "newest"
  | "oldest"
  | "highest_value"
  | "lowest_value"
  | "recently_delivered"
  | "delivery_soonest"
  | "most_items";
type ViewMode = "list" | "compact";
type TabKey =
  | "all"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "returns"
  | "cancelled";

interface Address {
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

interface PaymentInfo {
  method: PaymentMethodType;
  status: PaymentStatus;
  displayLabel: string;
  amountPaidMinor: MoneyMinor;
  transactionRef?: string;
}

interface TrackingInfo {
  carrier: string;
  trackingNumber: string;
  statusLabel: string;
  estimatedDeliveryLabel?: string;
  lastUpdateLabel: string;
  currentLocation?: string;
}

interface ProductRef {
  id: string;
  name: string;
  brand: string;
  variant?: string;
  sku: string;
  imageAlt: string;
}

interface Seller {
  id: string;
  name: string;
  verified: boolean;
  rating: number;
  responseTimeLabel: string;
}

interface OrderItem {
  id: string;
  orderId: string;
  sellerId: string;
  product: ProductRef;
  quantity: number;
  unitPriceMinor: MoneyMinor;
  discountMinor: MoneyMinor;
  currency: CurrencyCode;
  state: ItemState;
  reviewSubmitted: boolean;
  returnEligibleUntil?: string;
  currentPriceMinor?: MoneyMinor;
  inStock: boolean;
}

interface SellerGroup {
  sellerId: string;
  itemIds: string[];
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  estimatedDeliveryLabel?: string;
  deliveredAtLabel?: string;
  tracking?: TrackingInfo;
  trackingUnavailable?: boolean;
}

interface OrderTotals {
  subtotalMinor: MoneyMinor;
  discountMinor: MoneyMinor;
  couponMinor: MoneyMinor;
  shippingMinor: MoneyMinor;
  taxMinor: MoneyMinor;
  feesMinor: MoneyMinor;
  rewardsMinor: MoneyMinor;
  totalMinor: MoneyMinor;
  currency: CurrencyCode;
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totals: OrderTotals;
  payment: PaymentInfo;
  shippingAddress: Address;
  sellerGroups: SellerGroup[];
  itemIds: string[];
  returnEligibleUntil?: string;
  invoiceNumber?: string;
  cancellationReason?: string;
}

interface OrderFilters {
  status: OrderStatus[];
  dateRange: DateRangeKey;
  sellerIds: string[];
  paymentMethods: PaymentMethodType[];
  deliveryMethods: DeliveryMethod[];
  priceMin: number | null;
  priceMax: number | null;
  returnEligible: boolean;
  reviewPending: boolean;
  buyAgain: boolean;
  discounted: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Enums / discriminated unions & metadata
// ─────────────────────────────────────────────────────────────────────────
const STATUS_META: Record<
  OrderStatus,
  { label: string; tone: StatusTone; description: string }
> = {
  pending: { label: "Pending", tone: "pending", description: "Awaiting confirmation" },
  confirmed: { label: "Confirmed", tone: "info", description: "Order confirmed by seller" },
  processing: { label: "Processing", tone: "warning", description: "Being prepared for shipment" },
  packed: { label: "Packed", tone: "warning", description: "Packed and awaiting pickup" },
  shipped: { label: "Shipped", tone: "info", description: "On its way to you" },
  out_for_delivery: { label: "Out for Delivery", tone: "info", description: "Arriving today" },
  delivered: { label: "Delivered", tone: "success", description: "Delivered successfully" },
  cancelled: { label: "Cancelled", tone: "neutral", description: "Order was cancelled" },
  partially_cancelled: { label: "Partially Cancelled", tone: "neutral", description: "Some items were cancelled" },
  return_requested: { label: "Return Requested", tone: "warning", description: "Return request submitted" },
  partially_returned: { label: "Partially Returned", tone: "warning", description: "Some items were returned" },
  returned: { label: "Returned", tone: "neutral", description: "Items returned to seller" },
  refund_pending: { label: "Refund Pending", tone: "warning", description: "Refund is being processed" },
  partially_refunded: { label: "Partially Refunded", tone: "info", description: "Part of this order was refunded" },
  refunded: { label: "Refunded", tone: "success", description: "Refund completed" },
  failed: { label: "Payment Failed", tone: "danger", description: "Payment could not be completed" },
};

const ITEM_STATE_META: Record<ItemState, { label: string; tone: StatusTone }> = {
  processing: { label: "Processing", tone: "warning" },
  in_transit: { label: "In Transit", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  returned: { label: "Returned", tone: "neutral" },
  refunded: { label: "Refunded", tone: "success" },
  return_eligible: { label: "Return Eligible", tone: "info" },
  review_pending: { label: "Review Pending", tone: "pending" },
};

const ACTIONS_BY_STATUS: Record<OrderStatus, ActionKey[]> = {
  pending: ["view_details", "cancel", "contact_seller"],
  confirmed: ["view_details", "cancel", "contact_seller"],
  processing: ["view_details", "cancel", "contact_seller"],
  packed: ["view_details", "cancel", "contact_seller"],
  shipped: ["view_details", "track_package", "contact_seller"],
  out_for_delivery: ["view_details", "track_package", "contact_seller"],
  delivered: ["view_details", "buy_again", "return", "review", "invoice"],
  cancelled: ["view_details", "buy_again", "invoice"],
  partially_cancelled: ["view_details", "buy_again", "invoice", "contact_seller"],
  return_requested: ["view_details", "track_return", "contact_seller"],
  partially_returned: ["view_details", "track_return", "refund_details"],
  returned: ["view_details", "refund_details", "buy_again"],
  refund_pending: ["view_details", "refund_details"],
  partially_refunded: ["view_details", "refund_details", "buy_again"],
  refunded: ["view_details", "refund_details", "buy_again"],
  failed: ["view_details", "cancel", "contact_seller"],
};

const ACTION_LABELS: Record<ActionKey, string> = {
  view_details: "View Details",
  track_package: "Track Package",
  buy_again: "Buy Again",
  return: "Return",
  cancel: "Cancel Order",
  invoice: "Invoice",
  review: "Write a Review",
  contact_seller: "Contact Seller",
  track_return: "Track Return",
  refund_details: "Refund Details",
};

// ─────────────────────────────────────────────────────────────────────────
// 4. Constants
// ─────────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 5;

const ORDER_TABS: { key: TabKey; label: string; statuses: OrderStatus[] | null }[] = [
  { key: "all", label: "All", statuses: null },
  { key: "processing", label: "Processing", statuses: ["pending", "confirmed", "processing", "packed", "failed"] },
  { key: "shipped", label: "Shipped", statuses: ["shipped"] },
  { key: "out_for_delivery", label: "Out for Delivery", statuses: ["out_for_delivery"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  {
    key: "returns",
    label: "Returns & Refunds",
    statuses: ["return_requested", "partially_returned", "returned", "refund_pending", "partially_refunded", "refunded"],
  },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "partially_cancelled"] },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "highest_value", label: "Highest Value" },
  { key: "lowest_value", label: "Lowest Value" },
  { key: "recently_delivered", label: "Recently Delivered" },
  { key: "delivery_soonest", label: "Delivery Soonest" },
  { key: "most_items", label: "Most Items" },
];

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "30d", label: "Last 30 days" },
  { key: "3m", label: "Last 3 months" },
  { key: "6m", label: "Last 6 months" },
  { key: "1y", label: "Last year" },
  { key: "custom", label: "Custom range" },
];

const STATUS_FILTER_OPTIONS: OrderStatus[] = [
  "processing",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
  "partially_refunded",
];

const PAYMENT_FILTER_OPTIONS: { key: PaymentMethodType; label: string }[] = [
  { key: "card", label: "Card" },
  { key: "wallet", label: "Wallet" },
  { key: "bank", label: "Bank" },
  { key: "cod", label: "Cash on Delivery" },
  { key: "bnpl", label: "Buy Now, Pay Later" },
  { key: "gift_card", label: "Gift Card" },
];

const DELIVERY_FILTER_OPTIONS: { key: DeliveryMethod; label: string }[] = [
  { key: "standard", label: "Standard" },
  { key: "express", label: "Express" },
  { key: "same_day", label: "Same Day" },
  { key: "pickup", label: "Pickup" },
];

const CANCELLATION_REASONS = [
  "Ordered by mistake",
  "Found a better price",
  "Delivery is too slow",
  "Changed my mind",
  "Wrong item ordered",
  "Other",
] as const;

const SUPPORT_ISSUES = [
  "Order not received",
  "Wrong item",
  "Damaged item",
  "Missing item",
  "Payment issue",
  "Refund issue",
  "Delivery issue",
] as const;

const DEFAULT_FILTERS: OrderFilters = {
  status: [],
  dateRange: "all",
  sellerIds: [],
  paymentMethods: [],
  deliveryMethods: [],
  priceMin: null,
  priceMax: null,
  returnEligible: false,
  reviewPending: false,
  buyAgain: false,
  discounted: false,
};

// ─────────────────────────────────────────────────────────────────────────
// 5. Mock data
// ─────────────────────────────────────────────────────────────────────────
const MOCK_SELLERS: Seller[] = [
  { id: "slr-aurora", name: "Aurora Home & Living", verified: true, rating: 4.8, responseTimeLabel: "within 2 hours" },
  { id: "slr-northpeak", name: "NorthPeak Outfitters", verified: true, rating: 4.6, responseTimeLabel: "within 4 hours" },
  { id: "slr-vertex", name: "Vertex Electronics", verified: true, rating: 4.7, responseTimeLabel: "within 1 hour" },
  { id: "slr-marketplace", name: "Global Marketplace Direct", verified: false, rating: 4.1, responseTimeLabel: "within 24 hours" },
  { id: "slr-lumen", name: "Lumen Beauty Co.", verified: true, rating: 4.9, responseTimeLabel: "within 3 hours" },
];

function sellerById(id: string): Seller {
  const found = MOCK_SELLERS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown seller ${id}`);
  return found;
}

const mockItem = (item: Omit<OrderItem, "currency">): OrderItem => ({
  ...item,
  currency: "USD",
});

const MOCK_ORDERS: { order: Order; items: OrderItem[] }[] = [
  {
    order: {
      id: "ord-1",
      orderNumber: "ORD-482913",
      createdAt: "2026-09-01T14:22:00Z",
      updatedAt: "2026-09-04T09:10:00Z",
      status: "delivered",
      paymentStatus: "paid",
      shippingAddress: { line1: "214 Bramble Court", city: "Austin", region: "TX", postalCode: "78701", country: "United States" },
      payment: { method: "card", status: "paid", displayLabel: "Visa •••• 4242", amountPaidMinor: 18697, transactionRef: "TXN-90213847" },
      totals: { subtotalMinor: 17998, discountMinor: 1200, couponMinor: 0, shippingMinor: 0, taxMinor: 1899, feesMinor: 0, rewardsMinor: 0, totalMinor: 18697, currency: "USD" },
      sellerGroups: [
        {
          sellerId: "slr-vertex",
          itemIds: ["itm-1a", "itm-1b"],
          status: "delivered",
          deliveryMethod: "express",
          deliveredAtLabel: "Sep 4, 2026",
          tracking: { carrier: "Express Logistics", trackingNumber: "TRK-8392014", statusLabel: "Delivered", lastUpdateLabel: "2 days ago" },
        },
      ],
      itemIds: ["itm-1a", "itm-1b"],
      returnEligibleUntil: "2026-10-04",
      invoiceNumber: "INV-82931",
    },
    items: [
      mockItem({ id: "itm-1a", orderId: "ord-1", sellerId: "slr-vertex", quantity: 1, unitPriceMinor: 12999, discountMinor: 1000, state: "review_pending", reviewSubmitted: false, returnEligibleUntil: "2026-10-04", currentPriceMinor: 11999, inStock: true, product: { id: "prd-1a", name: "SoundForge Pro Wireless Noise-Cancelling Headphones", brand: "SoundForge", variant: "Midnight Black", sku: "SF-HP-402B", imageAlt: "Black over-ear wireless headphones" } }),
      mockItem({ id: "itm-1b", orderId: "ord-1", sellerId: "slr-vertex", quantity: 1, unitPriceMinor: 4999, discountMinor: 200, state: "delivered", reviewSubmitted: true, returnEligibleUntil: "2026-10-04", currentPriceMinor: 4999, inStock: true, product: { id: "prd-1b", name: "Vertex USB-C Fast Charging Cable (2m)", brand: "Vertex", variant: "2 Meter", sku: "VX-CBL-220", imageAlt: "Braided USB-C charging cable" } }),
    ],
  },
  {
    order: {
      id: "ord-2",
      orderNumber: "ORD-481207",
      createdAt: "2026-09-10T08:05:00Z",
      updatedAt: "2026-09-11T16:40:00Z",
      status: "out_for_delivery",
      paymentStatus: "paid",
      shippingAddress: { line1: "88 Riverside Ave", city: "Portland", region: "OR", postalCode: "97201", country: "United States" },
      payment: { method: "wallet", status: "paid", displayLabel: "PayFast Wallet", amountPaidMinor: 6499, transactionRef: "TXN-88213410" },
      totals: { subtotalMinor: 5999, discountMinor: 0, couponMinor: 0, shippingMinor: 499, taxMinor: 0, feesMinor: 0, rewardsMinor: 0, totalMinor: 6499, currency: "USD" },
      sellerGroups: [
        {
          sellerId: "slr-northpeak",
          itemIds: ["itm-2a"],
          status: "out_for_delivery",
          deliveryMethod: "standard",
          estimatedDeliveryLabel: "Arriving today by 8 PM",
          tracking: { carrier: "MetroShip", trackingNumber: "TRK-2201938", statusLabel: "Out for delivery", estimatedDeliveryLabel: "Today", lastUpdateLabel: "10 min ago", currentLocation: "Portland, OR distribution hub" },
        },
      ],
      itemIds: ["itm-2a"],
    },
    items: [
      mockItem({ id: "itm-2a", orderId: "ord-2", sellerId: "slr-northpeak", quantity: 1, unitPriceMinor: 5999, discountMinor: 0, state: "in_transit", reviewSubmitted: false, inStock: true, product: { id: "prd-2a", name: "Trailhead 3-Season Insulated Jacket", brand: "NorthPeak", variant: "Slate Gray / M", sku: "NP-JKT-119M", imageAlt: "Gray insulated outdoor jacket" } }),
    ],
  },
  {
    order: {
      id: "ord-3",
      orderNumber: "ORD-479654",
      createdAt: "2026-09-12T19:30:00Z",
      updatedAt: "2026-09-12T19:31:00Z",
      status: "processing",
      paymentStatus: "paid",
      shippingAddress: { line1: "1500 Elmwood Drive", city: "Denver", region: "CO", postalCode: "80202", country: "United States" },
      payment: { method: "bnpl", status: "paid", displayLabel: "Pay in 4 — Installments", amountPaidMinor: 3200, transactionRef: "TXN-77102981" },
      totals: { subtotalMinor: 12800, discountMinor: 0, couponMinor: 0, shippingMinor: 0, taxMinor: 0, feesMinor: 0, rewardsMinor: 0, totalMinor: 12800, currency: "USD" },
      sellerGroups: [
        { sellerId: "slr-vertex", itemIds: ["itm-3a"], status: "processing", deliveryMethod: "standard", estimatedDeliveryLabel: "Arriving Sep 18–20" },
      ],
      itemIds: ["itm-3a"],
    },
    items: [
      mockItem({ id: "itm-3a", orderId: "ord-3", sellerId: "slr-vertex", quantity: 1, unitPriceMinor: 12800, discountMinor: 0, state: "processing", reviewSubmitted: false, inStock: true, product: { id: "prd-3a", name: "Vertex 27\" QHD IPS Monitor, 165Hz", brand: "Vertex", variant: "27-inch", sku: "VX-MON-270Q", imageAlt: "27 inch computer monitor" } }),
    ],
  },
  {
    order: {
      id: "ord-4",
      orderNumber: "ORD-475310",
      createdAt: "2026-08-22T11:15:00Z",
      updatedAt: "2026-08-30T13:00:00Z",
      status: "delivered",
      paymentStatus: "paid",
      shippingAddress: { line1: "77 Kestrel Lane", city: "Chicago", region: "IL", postalCode: "60614", country: "United States" },
      payment: { method: "card", status: "paid", displayLabel: "Mastercard •••• 8891", amountPaidMinor: 9648, transactionRef: "TXN-70129384" },
      totals: { subtotalMinor: 8900, discountMinor: 450, couponMinor: 300, shippingMinor: 0, taxMinor: 798, feesMinor: 0, rewardsMinor: 200, totalMinor: 9648, currency: "USD" },
      sellerGroups: [
        { sellerId: "slr-aurora", itemIds: ["itm-4a"], status: "delivered", deliveryMethod: "standard", deliveredAtLabel: "Aug 27, 2026", tracking: { carrier: "ParcelHost", trackingNumber: "TRK-1029384", statusLabel: "Delivered", lastUpdateLabel: "5 days ago" } },
        { sellerId: "slr-lumen", itemIds: ["itm-4b", "itm-4c"], status: "delivered", deliveryMethod: "standard", deliveredAtLabel: "Aug 29, 2026", tracking: { carrier: "ParcelHost", trackingNumber: "TRK-1029391", statusLabel: "Delivered", lastUpdateLabel: "3 days ago" } },
      ],
      itemIds: ["itm-4a", "itm-4b", "itm-4c"],
      returnEligibleUntil: "2026-09-13",
      invoiceNumber: "INV-79102",
    },
    items: [
      mockItem({ id: "itm-4a", orderId: "ord-4", sellerId: "slr-aurora", quantity: 1, unitPriceMinor: 4900, discountMinor: 200, state: "return_eligible", reviewSubmitted: false, returnEligibleUntil: "2026-09-13", inStock: true, product: { id: "prd-4a", name: "Linen Weave Throw Pillow Cover, 18x18", brand: "Aurora Home", variant: "Sage", sku: "AH-PIL-018S", imageAlt: "Sage green throw pillow" } }),
      mockItem({ id: "itm-4b", orderId: "ord-4", sellerId: "slr-lumen", quantity: 2, unitPriceMinor: 1600, discountMinor: 150, state: "review_pending", reviewSubmitted: false, returnEligibleUntil: "2026-09-13", inStock: true, product: { id: "prd-4b", name: "Vitamin C Brightening Serum, 30ml", brand: "Lumen Beauty", variant: "30ml", sku: "LB-SER-030", imageAlt: "Bottle of vitamin C serum" } }),
      mockItem({ id: "itm-4c", orderId: "ord-4", sellerId: "slr-lumen", quantity: 1, unitPriceMinor: 1800, discountMinor: 100, state: "delivered", reviewSubmitted: true, returnEligibleUntil: "2026-09-13", inStock: false, product: { id: "prd-4c", name: "Silk Sleep Mask with Adjustable Strap", brand: "Lumen Beauty", variant: "Charcoal", sku: "LB-MSK-011", imageAlt: "Charcoal silk sleep mask" } }),
    ],
  },
  {
    order: {
      id: "ord-5",
      orderNumber: "ORD-462017",
      createdAt: "2026-07-14T10:00:00Z",
      updatedAt: "2026-07-15T09:00:00Z",
      status: "cancelled",
      paymentStatus: "refunded",
      shippingAddress: { line1: "410 Harbor View", city: "Seattle", region: "WA", postalCode: "98101", country: "United States" },
      payment: { method: "card", status: "refunded", displayLabel: "Visa •••• 4242", amountPaidMinor: 0, transactionRef: "TXN-60123098" },
      totals: { subtotalMinor: 6500, discountMinor: 0, couponMinor: 0, shippingMinor: 0, taxMinor: 0, feesMinor: 0, rewardsMinor: 0, totalMinor: 0, currency: "USD" },
      sellerGroups: [{ sellerId: "slr-marketplace", itemIds: ["itm-5a"], status: "cancelled", deliveryMethod: "standard" }],
      itemIds: ["itm-5a"],
      cancellationReason: "Found a better price",
      invoiceNumber: "INV-63021",
    },
    items: [
      mockItem({ id: "itm-5a", orderId: "ord-5", sellerId: "slr-marketplace", quantity: 1, unitPriceMinor: 6500, discountMinor: 0, state: "cancelled", reviewSubmitted: false, inStock: true, product: { id: "prd-5a", name: "Portable Espresso Maker, Manual Pump", brand: "BrewPeak", variant: "Standard", sku: "BP-ESP-005", imageAlt: "Compact manual espresso maker" } }),
    ],
  },
  {
    order: {
      id: "ord-6",
      orderNumber: "ORD-459884",
      createdAt: "2026-07-02T17:45:00Z",
      updatedAt: "2026-07-20T12:00:00Z",
      status: "refunded",
      paymentStatus: "refunded",
      shippingAddress: { line1: "1902 Cedar Ridge Rd", city: "Nashville", region: "TN", postalCode: "37203", country: "United States" },
      payment: { method: "gift_card", status: "refunded", displayLabel: "Gift Card •••• 7743", amountPaidMinor: 0, transactionRef: "TXN-59021873" },
      totals: { subtotalMinor: 3400, discountMinor: 0, couponMinor: 0, shippingMinor: 0, taxMinor: 0, feesMinor: 0, rewardsMinor: 0, totalMinor: 0, currency: "USD" },
      sellerGroups: [{ sellerId: "slr-aurora", itemIds: ["itm-6a"], status: "refunded", deliveryMethod: "standard", deliveredAtLabel: "Jul 8, 2026" }],
      itemIds: ["itm-6a"],
      invoiceNumber: "INV-59882",
    },
    items: [
      mockItem({ id: "itm-6a", orderId: "ord-6", sellerId: "slr-aurora", quantity: 1, unitPriceMinor: 3400, discountMinor: 0, state: "refunded", reviewSubmitted: false, inStock: true, product: { id: "prd-6a", name: "Ceramic Pour-Over Coffee Dripper", brand: "Aurora Home", variant: "Terracotta", sku: "AH-CER-090", imageAlt: "Terracotta ceramic coffee dripper" } }),
    ],
  },
  {
    order: {
      id: "ord-7",
      orderNumber: "ORD-491042",
      createdAt: "2026-09-13T06:20:00Z",
      updatedAt: "2026-09-13T06:20:00Z",
      status: "failed",
      paymentStatus: "failed",
      shippingAddress: { line1: "56 Willow Bend", city: "Miami", region: "FL", postalCode: "33131", country: "United States" },
      payment: { method: "card", status: "failed", displayLabel: "Visa •••• 1120", amountPaidMinor: 0, transactionRef: "TXN-99310221" },
      totals: { subtotalMinor: 8999, discountMinor: 0, couponMinor: 0, shippingMinor: 599, taxMinor: 720, feesMinor: 0, rewardsMinor: 0, totalMinor: 10318, currency: "USD" },
      sellerGroups: [{ sellerId: "slr-vertex", itemIds: ["itm-7a"], status: "failed", deliveryMethod: "express" }],
      itemIds: ["itm-7a"],
    },
    items: [
      mockItem({ id: "itm-7a", orderId: "ord-7", sellerId: "slr-vertex", quantity: 1, unitPriceMinor: 8999, discountMinor: 0, state: "cancelled", reviewSubmitted: false, inStock: true, product: { id: "prd-7a", name: "Vertex Mechanical Keyboard, Hot-Swappable", brand: "Vertex", variant: "Graphite / US Layout", sku: "VX-KB-750G", imageAlt: "Graphite mechanical keyboard" } }),
    ],
  },
  {
    order: {
      id: "ord-8",
      orderNumber: "ORD-488120",
      createdAt: "2026-09-08T13:10:00Z",
      updatedAt: "2026-09-09T15:00:00Z",
      status: "shipped",
      paymentStatus: "pending",
      shippingAddress: { line1: "300 Magnolia St", city: "Charlotte", region: "NC", postalCode: "28202", country: "United States" },
      payment: { method: "cod", status: "pending", displayLabel: "Cash on Delivery", amountPaidMinor: 0, transactionRef: undefined },
      totals: { subtotalMinor: 4200, discountMinor: 0, couponMinor: 0, shippingMinor: 0, taxMinor: 336, feesMinor: 150, rewardsMinor: 0, totalMinor: 4686, currency: "USD" },
      sellerGroups: [
        { sellerId: "slr-marketplace", itemIds: ["itm-8a"], status: "shipped", deliveryMethod: "standard", estimatedDeliveryLabel: "Arriving Sep 17–19", tracking: { carrier: "RegionalPost", trackingNumber: "TRK-4021983", statusLabel: "In transit", estimatedDeliveryLabel: "Sep 17–19", lastUpdateLabel: "6 hours ago", currentLocation: "Charlotte, NC hub" } },
      ],
      itemIds: ["itm-8a"],
    },
    items: [
      mockItem({ id: "itm-8a", orderId: "ord-8", sellerId: "slr-marketplace", quantity: 3, unitPriceMinor: 1400, discountMinor: 0, state: "in_transit", reviewSubmitted: false, inStock: true, product: { id: "prd-8a", name: "Recycled Cotton Kitchen Towels (Set of 3)", brand: "Everweave", variant: "Natural", sku: "EW-TWL-003", imageAlt: "Set of folded kitchen towels" } }),
    ],
  },
  {
    order: {
      id: "ord-9",
      orderNumber: "ORD-501122",
      createdAt: "2026-09-05T09:00:00Z",
      updatedAt: "2026-09-06T09:00:00Z",
      status: "partially_cancelled",
      paymentStatus: "paid",
      shippingAddress: { line1: "12 Founders Way", city: "Boston", region: "MA", postalCode: "02110", country: "United States" },
      payment: { method: "card", status: "paid", displayLabel: "Amex •••• 3009", amountPaidMinor: 15400, transactionRef: "TXN-83021094" },
      totals: { subtotalMinor: 15400, discountMinor: 0, couponMinor: 0, shippingMinor: 0, taxMinor: 0, feesMinor: 0, rewardsMinor: 0, totalMinor: 15400, currency: "USD" },
      sellerGroups: [
        { sellerId: "slr-northpeak", itemIds: ["itm-9a"], status: "shipped", deliveryMethod: "standard", estimatedDeliveryLabel: "Arriving Sep 16–18", tracking: { carrier: "MetroShip", trackingNumber: "TRK-5510283", statusLabel: "In transit", lastUpdateLabel: "1 day ago" } },
        { sellerId: "slr-vertex", itemIds: ["itm-9b"], status: "cancelled", deliveryMethod: "standard" },
      ],
      itemIds: ["itm-9a", "itm-9b"],
      invoiceNumber: "INV-91882",
    },
    items: [
      mockItem({ id: "itm-9a", orderId: "ord-9", sellerId: "slr-northpeak", quantity: 1, unitPriceMinor: 9900, discountMinor: 0, state: "in_transit", reviewSubmitted: false, inStock: true, product: { id: "prd-9a", name: "Summit Ridge 45L Hiking Backpack", brand: "NorthPeak", variant: "Forest Green", sku: "NP-BAG-045G", imageAlt: "Green hiking backpack" } }),
      mockItem({ id: "itm-9b", orderId: "ord-9", sellerId: "slr-vertex", quantity: 1, unitPriceMinor: 5500, discountMinor: 0, state: "cancelled", reviewSubmitted: false, inStock: false, product: { id: "prd-9b", name: "Vertex Portable SSD, 1TB", brand: "Vertex", variant: "1TB", sku: "VX-SSD-100", imageAlt: "Small portable solid state drive" } }),
    ],
  },
  {
    order: {
      id: "ord-10",
      orderNumber: "ORD-455201",
      createdAt: "2026-06-18T12:30:00Z",
      updatedAt: "2026-07-02T12:00:00Z",
      status: "return_requested",
      paymentStatus: "paid",
      shippingAddress: { line1: "980 Prairie Lane", city: "Kansas City", region: "MO", postalCode: "64105", country: "United States" },
      payment: { method: "card", status: "paid", displayLabel: "Visa •••• 4242", amountPaidMinor: 7480, transactionRef: "TXN-52091834" },
      totals: { subtotalMinor: 6900, discountMinor: 0, couponMinor: 0, shippingMinor: 0, taxMinor: 580, feesMinor: 0, rewardsMinor: 0, totalMinor: 7480, currency: "USD" },
      sellerGroups: [{ sellerId: "slr-lumen", itemIds: ["itm-10a"], status: "return_requested", deliveryMethod: "standard", deliveredAtLabel: "Jun 24, 2026" }],
      itemIds: ["itm-10a"],
      invoiceNumber: "INV-55021",
    },
    items: [
      mockItem({ id: "itm-10a", orderId: "ord-10", sellerId: "slr-lumen", quantity: 1, unitPriceMinor: 6900, discountMinor: 0, state: "returned", reviewSubmitted: false, inStock: true, product: { id: "prd-10a", name: "Hydrating Rose Clay Face Mask, 100g", brand: "Lumen Beauty", variant: "100g", sku: "LB-MSK-100", imageAlt: "Jar of rose clay face mask" } }),
    ],
  },
  {
    order: {
      id: "ord-11",
      orderNumber: "ORD-497733",
      createdAt: "2026-09-11T21:00:00Z",
      updatedAt: "2026-09-12T07:00:00Z",
      status: "confirmed",
      paymentStatus: "paid",
      shippingAddress: { line1: "45 Sunset Terrace", city: "San Diego", region: "CA", postalCode: "92101", country: "United States" },
      payment: { method: "bank", status: "paid", displayLabel: "Bank Transfer", amountPaidMinor: 26900, transactionRef: "TXN-98213741" },
      totals: { subtotalMinor: 24900, discountMinor: 1000, couponMinor: 0, shippingMinor: 0, taxMinor: 3000, feesMinor: 0, rewardsMinor: 0, totalMinor: 26900, currency: "USD" },
      sellerGroups: [{ sellerId: "slr-vertex", itemIds: ["itm-11a"], status: "confirmed", deliveryMethod: "same_day", estimatedDeliveryLabel: "Arriving today by 9 PM" }],
      itemIds: ["itm-11a"],
    },
    items: [
      mockItem({ id: "itm-11a", orderId: "ord-11", sellerId: "slr-vertex", quantity: 1, unitPriceMinor: 24900, discountMinor: 1000, state: "processing", reviewSubmitted: false, inStock: true, product: { id: "prd-11a", name: "Vertex 55\" 4K Smart Display", brand: "Vertex", variant: "55-inch", sku: "VX-TV-550K", imageAlt: "Large flat screen television" } }),
    ],
  },
];

// Normalize mock data once at module scope — never re-derive in render.
function buildInitialEntities() {
  const ordersById: Record<string, Order> = {};
  const itemsById: Record<string, OrderItem> = {};
  const ids: string[] = [];
  for (const { order, items } of MOCK_ORDERS) {
    ordersById[order.id] = order;
    ids.push(order.id);
    for (const item of items) itemsById[item.id] = item;
  }
  const sellersById: Record<string, Seller> = {};
  for (const seller of MOCK_SELLERS) sellersById[seller.id] = seller;
  // Newest first by default.
  ids.sort((a, b) => (ordersById[a].createdAt < ordersById[b].createdAt ? 1 : -1));
  return { ids, ordersById, itemsById, sellersById };
}

// ─────────────────────────────────────────────────────────────────────────
// 6. Formatting utilities
// ─────────────────────────────────────────────────────────────────────────
function formatMoney(minor: MoneyMinor, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function formatReturnWindow(untilIso: string | undefined, now: Date): string | null {
  if (!untilIso) return null;
  const until = new Date(untilIso);
  const days = daysBetween(until, now);
  if (days < 0) return "Return window expired";
  return `Return eligible until ${formatDate(untilIso)}`;
}

// ─────────────────────────────────────────────────────────────────────────
// 7. Filter / sort utilities
// ─────────────────────────────────────────────────────────────────────────
function withinDateRange(createdAt: string, range: DateRangeKey, now: Date): boolean {
  if (range === "all" || range === "custom") return true;
  const created = new Date(createdAt);
  const days = daysBetween(now, created);
  const bounds: Record<Exclude<DateRangeKey, "all" | "custom">, number> = {
    "30d": 30,
    "3m": 92,
    "6m": 183,
    "1y": 366,
  };
  return days <= bounds[range];
}

function orderMatchesSearch(order: Order, items: OrderItem[], sellers: Record<string, Seller>, query: string): boolean {
  if (!query.trim()) return true;
  const needle = query.trim().toLowerCase();
  if (order.orderNumber.toLowerCase().includes(needle)) return true;
  return items.some((item) => {
    const seller = sellers[item.sellerId];
    return (
      item.product.name.toLowerCase().includes(needle) ||
      item.product.brand.toLowerCase().includes(needle) ||
      item.product.sku.toLowerCase().includes(needle) ||
      (seller && seller.name.toLowerCase().includes(needle))
    );
  });
}

function orderMatchesFilters(order: Order, items: OrderItem[], filters: OrderFilters, now: Date): boolean {
  if (filters.status.length > 0 && !filters.status.includes(order.status)) return false;
  if (!withinDateRange(order.createdAt, filters.dateRange, now)) return false;
  if (filters.sellerIds.length > 0 && !order.sellerGroups.some((g) => filters.sellerIds.includes(g.sellerId))) return false;
  if (filters.paymentMethods.length > 0 && !filters.paymentMethods.includes(order.payment.method)) return false;
  if (filters.deliveryMethods.length > 0 && !order.sellerGroups.some((g) => filters.deliveryMethods.includes(g.deliveryMethod))) return false;
  const totalMajor = order.totals.totalMinor / 100;
  if (filters.priceMin !== null && totalMajor < filters.priceMin) return false;
  if (filters.priceMax !== null && totalMajor > filters.priceMax) return false;
  if (filters.returnEligible) {
    const eligible = order.returnEligibleUntil && new Date(order.returnEligibleUntil) >= now;
    if (!eligible) return false;
  }
  if (filters.reviewPending && !items.some((i) => i.state === "review_pending")) return false;
  if (filters.buyAgain && !["delivered", "cancelled", "returned", "refunded", "partially_refunded"].includes(order.status)) return false;
  if (filters.discounted && order.totals.discountMinor <= 0 && order.totals.couponMinor <= 0) return false;
  return true;
}

function orderMatchesTab(order: Order, tab: TabKey): boolean {
  const tabDef = ORDER_TABS.find((t) => t.key === tab);
  if (!tabDef || tabDef.statuses === null) return true;
  return tabDef.statuses.includes(order.status);
}

function sortOrders(orders: Order[], sort: SortKey): Order[] {
  const list = [...orders];
  switch (sort) {
    case "newest":
      return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    case "oldest":
      return list.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    case "highest_value":
      return list.sort((a, b) => b.totals.totalMinor - a.totals.totalMinor);
    case "lowest_value":
      return list.sort((a, b) => a.totals.totalMinor - b.totals.totalMinor);
    case "recently_delivered":
      return list.sort((a, b) => {
        const da = a.sellerGroups.find((g) => g.deliveredAtLabel)?.deliveredAtLabel ?? "";
        const db = b.sellerGroups.find((g) => g.deliveredAtLabel)?.deliveredAtLabel ?? "";
        return db.localeCompare(da);
      });
    case "delivery_soonest":
      return list.sort((a, b) => {
        const ea = a.sellerGroups.find((g) => g.estimatedDeliveryLabel) ? 0 : 1;
        const eb = b.sellerGroups.find((g) => g.estimatedDeliveryLabel) ? 0 : 1;
        return ea - eb;
      });
    case "most_items":
      return list.sort((a, b) => b.itemIds.length - a.itemIds.length);
    default:
      return list;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 8. Order status / action utilities
// ─────────────────────────────────────────────────────────────────────────
function getOrderActions(order: Order): ActionKey[] {
  return ACTIONS_BY_STATUS[order.status];
}

function isActiveOrder(status: OrderStatus): boolean {
  return ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery"].includes(status);
}

const PROGRESS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "confirmed", label: "Confirmed" },
  { status: "packed", label: "Packed" },
  { status: "shipped", label: "Shipped" },
  { status: "out_for_delivery", label: "Out for Delivery" },
  { status: "delivered", label: "Delivered" },
];

function progressIndexFor(status: OrderStatus): number {
  const order: OrderStatus[] = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered"];
  const normalized = status === "processing" ? "confirmed" : status;
  const idx = order.indexOf(normalized);
  return idx < 0 ? 0 : Math.min(idx, PROGRESS_STEPS.length - 1);
}

// ─────────────────────────────────────────────────────────────────────────
// 9. Redux store & slices
// ─────────────────────────────────────────────────────────────────────────
interface OrdersState {
  ids: string[];
  byId: Record<string, Order>;
  itemsById: Record<string, OrderItem>;
  sellersById: Record<string, Seller>;
  status: "idle" | "loading" | "succeeded" | "failed";
}

const initialEntities = buildInitialEntities();

const ordersSlice = createSlice({
  name: "orders",
  initialState: {
    ids: initialEntities.ids,
    byId: initialEntities.ordersById,
    itemsById: initialEntities.itemsById,
    sellersById: initialEntities.sellersById,
    status: "loading",
  } as OrdersState,
  reducers: {
    hydrated(state) {
      state.status = "succeeded";
    },
    hydrationFailed(state) {
      state.status = "failed";
    },
    orderCancelled(state, action: PayloadAction<{ orderId: string; reason: string }>) {
      const order = state.byId[action.payload.orderId];
      if (!order) return;
      order.status = "cancelled";
      order.cancellationReason = action.payload.reason;
      order.sellerGroups.forEach((g) => (g.status = "cancelled"));
    },
  },
});

interface SearchState {
  query: string;
}
const searchSlice = createSlice({
  name: "search",
  initialState: { query: "" } as SearchState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    clearSearch(state) {
      state.query = "";
    },
  },
});

const filtersSlice = createSlice({
  name: "filters",
  initialState: DEFAULT_FILTERS,
  reducers: {
    setStatusFilter(state, action: PayloadAction<OrderStatus[]>) {
      state.status = action.payload;
    },
    setDateFilter(state, action: PayloadAction<DateRangeKey>) {
      state.dateRange = action.payload;
    },
    setSellerFilter(state, action: PayloadAction<string[]>) {
      state.sellerIds = action.payload;
    },
    setPaymentFilter(state, action: PayloadAction<PaymentMethodType[]>) {
      state.paymentMethods = action.payload;
    },
    setDeliveryFilter(state, action: PayloadAction<DeliveryMethod[]>) {
      state.deliveryMethods = action.payload;
    },
    setPriceRange(state, action: PayloadAction<{ min: number | null; max: number | null }>) {
      state.priceMin = action.payload.min;
      state.priceMax = action.payload.max;
    },
    toggleQuickFilter(state, action: PayloadAction<"returnEligible" | "reviewPending" | "buyAgain" | "discounted">) {
      state[action.payload] = !state[action.payload];
    },
    removeFilter(state, action: PayloadAction<{ key: keyof OrderFilters; value?: string }>) {
      const { key, value } = action.payload;
      if (key === "status" && value) state.status = state.status.filter((s) => s !== value);
      else if (key === "sellerIds" && value) state.sellerIds = state.sellerIds.filter((s) => s !== value);
      else if (key === "paymentMethods" && value) state.paymentMethods = state.paymentMethods.filter((s) => s !== value) as PaymentMethodType[];
      else if (key === "deliveryMethods" && value) state.deliveryMethods = state.deliveryMethods.filter((s) => s !== value) as DeliveryMethod[];
      else if (key === "dateRange") state.dateRange = "all";
      else if (key === "priceMin" || key === "priceMax") {
        state.priceMin = null;
        state.priceMax = null;
      } else if (key === "returnEligible" || key === "reviewPending" || key === "buyAgain" || key === "discounted") {
        state[key] = false;
      }
    },
    clearFilters() {
      return DEFAULT_FILTERS;
    },
  },
});

interface ViewState {
  viewMode: ViewMode;
  activeTab: TabKey;
  sortBy: SortKey;
  page: number;
}
const viewSlice = createSlice({
  name: "view",
  initialState: { viewMode: "list", activeTab: "all", sortBy: "newest", page: 1 } as ViewState,
  reducers: {
    setViewMode(state, action: PayloadAction<ViewMode>) {
      state.viewMode = action.payload;
    },
    setActiveTab(state, action: PayloadAction<TabKey>) {
      state.activeTab = action.payload;
      state.page = 1;
    },
    setSort(state, action: PayloadAction<SortKey>) {
      state.sortBy = action.payload;
      state.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    resetPage(state) {
      state.page = 1;
    },
  },
});

interface UiState {
  filterDrawerOpen: boolean;
  orderActionsOpenId: string | null;
  trackingOrderId: string | null;
  cancelOrderId: string | null;
  returnOrderId: string | null;
}
const uiSlice = createSlice({
  name: "ui",
  initialState: {
    filterDrawerOpen: false,
    orderActionsOpenId: null,
    trackingOrderId: null,
    cancelOrderId: null,
    returnOrderId: null,
  } as UiState,
  reducers: {
    openFilterDrawer(state) {
      state.filterDrawerOpen = true;
    },
    closeFilterDrawer(state) {
      state.filterDrawerOpen = false;
    },
    openOrderActions(state, action: PayloadAction<string>) {
      state.orderActionsOpenId = action.payload;
    },
    closeOrderActions(state) {
      state.orderActionsOpenId = null;
    },
    setTrackingOrder(state, action: PayloadAction<string | null>) {
      state.trackingOrderId = action.payload;
    },
    setCancelOrder(state, action: PayloadAction<string | null>) {
      state.cancelOrderId = action.payload;
    },
    setReturnOrder(state, action: PayloadAction<string | null>) {
      state.returnOrderId = action.payload;
    },
  },
});

export const {
  setSearchQuery,
  clearSearch,
} = searchSlice.actions;
export const {
  setStatusFilter,
  setDateFilter,
  setSellerFilter,
  setPaymentFilter,
  setDeliveryFilter,
  setPriceRange,
  toggleQuickFilter,
  removeFilter,
  clearFilters,
} = filtersSlice.actions;
export const { setViewMode, setActiveTab, setSort, setPage, resetPage } = viewSlice.actions;
export const {
  openFilterDrawer,
  closeFilterDrawer,
  openOrderActions,
  closeOrderActions,
  setTrackingOrder,
  setCancelOrder,
  setReturnOrder,
} = uiSlice.actions;
const { hydrated, orderCancelled } = ordersSlice.actions;

const store = configureStore({
  reducer: {
    orders: ordersSlice.reducer,
    search: searchSlice.reducer,
    filters: filtersSlice.reducer,
    view: viewSlice.reducer,
    ui: uiSlice.reducer,
  },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ─────────────────────────────────────────────────────────────────────────
// 10. Redux selectors
// ─────────────────────────────────────────────────────────────────────────
const selectOrdersState = (s: RootState) => s.orders;
const selectSearchQuery = (s: RootState) => s.search.query;
const selectFilters = (s: RootState) => s.filters;
const selectView = (s: RootState) => s.view;
const selectUi = (s: RootState) => s.ui;

const selectAllOrders = createSelector(selectOrdersState, (o) => o.ids.map((id) => o.byId[id]));

const selectStatusCounts = createSelector(selectAllOrders, (orders) => {
  const counts: Record<TabKey, number> = {
    all: orders.length,
    processing: 0,
    shipped: 0,
    out_for_delivery: 0,
    delivered: 0,
    returns: 0,
    cancelled: 0,
  };
  for (const order of orders) {
    for (const tab of ORDER_TABS) {
      if (tab.key !== "all" && orderMatchesTab(order, tab.key)) counts[tab.key] += 1;
    }
  }
  return counts;
});

const selectVisibleOrders = createSelector(
  [selectOrdersState, selectSearchQuery, selectFilters, selectView],
  (ordersState, query, filters, view) => {
    const now = new Date();
    const filtered = ordersState.ids
      .map((id) => ordersState.byId[id])
      .filter((order) => orderMatchesTab(order, view.activeTab))
      .filter((order) => orderMatchesFilters(order, order.itemIds.map((i) => ordersState.itemsById[i]), filters, now))
      .filter((order) => orderMatchesSearch(order, order.itemIds.map((i) => ordersState.itemsById[i]), ordersState.sellersById, query));
    return sortOrders(filtered, view.sortBy);
  }
);

const selectPagedOrders = createSelector([selectVisibleOrders, selectView], (visible, view) => {
  const start = (view.page - 1) * PAGE_SIZE;
  return {
    items: visible.slice(start, start + PAGE_SIZE),
    total: visible.length,
    totalPages: Math.max(1, Math.ceil(visible.length / PAGE_SIZE)),
    page: view.page,
  };
});

const selectActiveFilterChips = createSelector(selectFilters, (filters) => {
  const chips: { key: keyof OrderFilters; value?: string; label: string }[] = [];
  filters.status.forEach((s) => chips.push({ key: "status", value: s, label: STATUS_META[s].label }));
  if (filters.dateRange !== "all") {
    chips.push({ key: "dateRange", label: DATE_RANGE_OPTIONS.find((d) => d.key === filters.dateRange)?.label ?? "" });
  }
  filters.sellerIds.forEach((id) => chips.push({ key: "sellerIds", value: id, label: sellerById(id).name }));
  filters.paymentMethods.forEach((p) => chips.push({ key: "paymentMethods", value: p, label: PAYMENT_FILTER_OPTIONS.find((o) => o.key === p)?.label ?? p }));
  filters.deliveryMethods.forEach((d) => chips.push({ key: "deliveryMethods", value: d, label: DELIVERY_FILTER_OPTIONS.find((o) => o.key === d)?.label ?? d }));
  if (filters.priceMin !== null || filters.priceMax !== null) {
    chips.push({ key: "priceMin", label: `$${filters.priceMin ?? 0} – $${filters.priceMax ?? "∞"}` });
  }
  if (filters.returnEligible) chips.push({ key: "returnEligible", label: "Return Eligible" });
  if (filters.reviewPending) chips.push({ key: "reviewPending", label: "Review Pending" });
  if (filters.buyAgain) chips.push({ key: "buyAgain", label: "Buy Again" });
  if (filters.discounted) chips.push({ key: "discounted", label: "Discounted Orders" });
  return chips;
});

// ─────────────────────────────────────────────────────────────────────────
// 11. Small UI primitives
// ─────────────────────────────────────────────────────────────────────────
const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/10 text-success border-success/25",
  info: "bg-info/10 text-info border-info/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  neutral: "bg-muted text-muted-foreground border-border",
  pending: "bg-accent text-accent-foreground border-border",
};

function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} aria-hidden="true" />;
}

function ActionButton({
  children,
  onClick,
  variant = "secondary",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  ariaLabel?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-md border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const variants: Record<string, string> = {
    primary: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground",
    danger: "border-destructive/40 bg-card text-destructive hover:bg-destructive/10",
  };
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
}

function Dialog({
  titleId,
  title,
  onClose,
  children,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl border border-border bg-card p-5 shadow-lg sm:rounded-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-base font-semibold text-card-foreground">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 12. Ecommerce header
// ─────────────────────────────────────────────────────────────────────────
function AnnouncementBar() {
  return (
    <div className="hidden bg-primary text-primary-foreground sm:block">
      <p className="mx-auto max-w-[1400px] px-4 py-1.5 text-center text-xs font-medium sm:px-6 lg:px-8">
        Free standard shipping on orders over $35 · Extended holiday returns through Jan 31
      </p>
    </div>
  );
}

function SiteSearchBar() {
  return (
    <div className="hidden flex-1 md:block md:max-w-xl">
      <label htmlFor="site-search" className="sr-only">
        Search the store
      </label>
      <div className="relative">
        <input
          id="site-search"
          type="search"
          placeholder="Search products, brands, and more"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          ⌕
        </span>
      </div>
    </div>
  );
}

function HeaderActions() {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="rounded-md p-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account"
      >
        Account
      </button>
      <button
        type="button"
        className="rounded-md p-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Cart, 0 items"
      >
        Cart
      </button>
    </div>
  );
}

function CategoryNavigation() {
  const categories = ["Deals", "Electronics", "Home", "Fashion", "Beauty", "Outdoors", "Grocery"];
  return (
    <nav aria-label="Category navigation" className="hidden border-t border-border lg:block">
      <ul className="mx-auto flex max-w-[1400px] gap-6 px-4 py-2 text-sm text-muted-foreground sm:px-6 lg:px-8">
        {categories.map((c) => (
          <li key={c}>
            <a href="#" className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {c}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function EcommerceHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <AnnouncementBar />
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a href="#" className="text-lg font-bold tracking-tight text-foreground" aria-label="Marketplace home">
          Meridian
        </a>
        <SiteSearchBar />
        <div className="ml-auto">
          <HeaderActions />
        </div>
      </div>
      <CategoryNavigation />
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 13. Breadcrumbs
// ─────────────────────────────────────────────────────────────────────────
function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-[1400px] px-4 pt-4 text-sm text-muted-foreground sm:px-6 lg:px-8">
      <ol className="flex items-center gap-1.5">
        <li>
          <a href="#" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
            Home
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <a href="#" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
            Account
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="font-medium text-foreground">
          Orders
        </li>
      </ol>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 14. Orders header
// ─────────────────────────────────────────────────────────────────────────
function OrdersHeader({ total }: { total: number }) {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-3 px-4 pt-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Your Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
          {total} {total === 1 ? "order" : "orders"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <ActionButton>Need Help?</ActionButton>
        <ActionButton variant="primary">Continue Shopping</ActionButton>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 15. Status navigation
// ─────────────────────────────────────────────────────────────────────────
function OrdersNavigation() {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector((s) => s.view.activeTab);
  const counts = useAppSelector(selectStatusCounts);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex: number | null = null;
      if (e.key === "ArrowRight") nextIndex = (index + 1) % ORDER_TABS.length;
      if (e.key === "ArrowLeft") nextIndex = (index - 1 + ORDER_TABS.length) % ORDER_TABS.length;
      if (nextIndex !== null) {
        e.preventDefault();
        const next = ORDER_TABS[nextIndex];
        dispatch(setActiveTab(next.key));
        tabRefs.current[next.key]?.focus();
      }
    },
    [dispatch]
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
      <div
        role="tablist"
        aria-label="Filter orders by status"
        className="mt-4 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {ORDER_TABS.map((tab, index) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls="orders-panel"
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, index)}
              onClick={() => dispatch(setActiveTab(tab.key))}
              className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[tab.key]}
              </span>
              {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 16. Search / filter toolbar
// ─────────────────────────────────────────────────────────────────────────
function OrderSearchInput() {
  const dispatch = useAppDispatch();
  const query = useAppSelector(selectSearchQuery);
  const [draft, setDraft] = useState(query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = (value: string) => {
    setDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => dispatch(setSearchQuery(value)), 250);
  };

  return (
    <div className="relative flex-1 sm:max-w-sm">
      <label htmlFor="order-search" className="sr-only">
        Search your orders
      </label>
      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        ⌕
      </span>
      <input
        id="order-search"
        type="search"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search order #, product, seller, tracking #"
        className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            dispatch(clearSearch());
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function SortControl() {
  const dispatch = useAppDispatch();
  const sortBy = useAppSelector((s) => s.view.sortBy);
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="order-sort" className="text-sm text-muted-foreground">
        Sort
      </label>
      <select
        id="order-sort"
        value={sortBy}
        onChange={(e) => dispatch(setSort(e.target.value as SortKey))}
        className="rounded-md border border-input bg-background py-2 pl-2 pr-8 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ViewModeToggle() {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector((s) => s.view.viewMode);
  return (
    <div className="hidden items-center gap-0.5 rounded-md border border-border p-0.5 lg:flex" role="group" aria-label="Order list view mode">
      {(["list", "compact"] as ViewMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={viewMode === mode}
          onClick={() => dispatch(setViewMode(mode))}
          className={`rounded px-2.5 py-1.5 text-xs font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            viewMode === mode ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

function FilterButton() {
  const dispatch = useAppDispatch();
  const chips = useAppSelector(selectActiveFilterChips);
  return (
    <button
      type="button"
      onClick={() => dispatch(openFilterDrawer())}
      aria-haspopup="dialog"
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-card-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
    >
      Filters
      {chips.length > 0 && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">{chips.length}</span>
      )}
    </button>
  );
}

function ActiveFilterChips() {
  const dispatch = useAppDispatch();
  const chips = useAppSelector(selectActiveFilterChips);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      {chips.map((chip, idx) => (
        <span
          key={`${chip.key}-${chip.value ?? idx}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-3 pr-1.5 text-xs font-medium text-card-foreground"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => dispatch(removeFilter({ key: chip.key, value: chip.value }))}
            aria-label={`Remove filter ${chip.label}`}
            className="rounded-full p-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ✕
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => dispatch(clearFilters())}
        className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        Clear all
      </button>
    </div>
  );
}

function OrdersToolbar() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-3 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <OrderSearchInput />
        <FilterButton />
        <div className="ml-auto flex items-center gap-3">
          <SortControl />
          <ViewModeToggle />
        </div>
      </div>
      <ActiveFilterChips />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 17. Filter panel (sidebar + drawer)
// ─────────────────────────────────────────────────────────────────────────
function CheckboxRow({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {label}
    </label>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-border py-4 first:pt-0 last:border-none">
      <legend className="mb-2 text-sm font-semibold text-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

function FilterPanelContent() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);
  const [minDraft, setMinDraft] = useState(filters.priceMin?.toString() ?? "");
  const [maxDraft, setMaxDraft] = useState(filters.priceMax?.toString() ?? "");

  const toggleArrayValue = <T,>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  return (
    <div>
      <FilterSection title="Order Status">
        {STATUS_FILTER_OPTIONS.map((status) => (
          <CheckboxRow
            key={status}
            checked={filters.status.includes(status)}
            onChange={() => dispatch(setStatusFilter(toggleArrayValue(filters.status, status)))}
            label={STATUS_META[status].label}
          />
        ))}
      </FilterSection>

      <FilterSection title="Date Placed">
        <div className="space-y-1">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-foreground">
              <input
                type="radio"
                name="date-range"
                checked={filters.dateRange === opt.key}
                onChange={() => dispatch(setDateFilter(opt.key))}
                className="h-4 w-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Seller">
        {MOCK_SELLERS.map((seller) => (
          <CheckboxRow
            key={seller.id}
            checked={filters.sellerIds.includes(seller.id)}
            onChange={() => dispatch(setSellerFilter(toggleArrayValue(filters.sellerIds, seller.id)))}
            label={seller.name}
          />
        ))}
      </FilterSection>

      <FilterSection title="Payment Method">
        {PAYMENT_FILTER_OPTIONS.map((opt) => (
          <CheckboxRow
            key={opt.key}
            checked={filters.paymentMethods.includes(opt.key)}
            onChange={() => dispatch(setPaymentFilter(toggleArrayValue(filters.paymentMethods, opt.key)))}
            label={opt.label}
          />
        ))}
      </FilterSection>

      <FilterSection title="Delivery Method">
        {DELIVERY_FILTER_OPTIONS.map((opt) => (
          <CheckboxRow
            key={opt.key}
            checked={filters.deliveryMethods.includes(opt.key)}
            onChange={() => dispatch(setDeliveryFilter(toggleArrayValue(filters.deliveryMethods, opt.key)))}
            label={opt.label}
          />
        ))}
      </FilterSection>

      <FilterSection title="Price Range">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="price-min">
            Minimum price
          </label>
          <input
            id="price-min"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min"
            value={minDraft}
            onChange={(e) => setMinDraft(e.target.value)}
            onBlur={() => dispatch(setPriceRange({ min: minDraft ? Number(minDraft) : null, max: filters.priceMax }))}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span aria-hidden="true" className="text-muted-foreground">
            –
          </span>
          <label className="sr-only" htmlFor="price-max">
            Maximum price
          </label>
          <input
            id="price-max"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max"
            value={maxDraft}
            onChange={(e) => setMaxDraft(e.target.value)}
            onBlur={() => dispatch(setPriceRange({ min: filters.priceMin, max: maxDraft ? Number(maxDraft) : null }))}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </FilterSection>

      <FilterSection title="Quick Filters">
        <CheckboxRow checked={filters.returnEligible} onChange={() => dispatch(toggleQuickFilter("returnEligible"))} label="Return Eligible" />
        <CheckboxRow checked={filters.reviewPending} onChange={() => dispatch(toggleQuickFilter("reviewPending"))} label="Review Pending" />
        <CheckboxRow checked={filters.buyAgain} onChange={() => dispatch(toggleQuickFilter("buyAgain"))} label="Buy Again" />
        <CheckboxRow checked={filters.discounted} onChange={() => dispatch(toggleQuickFilter("discounted"))} label="Discounted Orders" />
      </FilterSection>
    </div>
  );
}

function FilterSidebar() {
  return (
    <aside aria-label="Filter orders" className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-24 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-card-foreground">Filters</h2>
        <FilterPanelContent />
      </div>
    </aside>
  );
}

function FilterDrawer() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.ui.filterDrawerOpen);
  const chips = useAppSelector(selectActiveFilterChips);
  if (!isOpen) return null;
  return (
    <Dialog titleId="filter-drawer-title" title="Filter Orders" onClose={() => dispatch(closeFilterDrawer())}>
      <FilterPanelContent />
      <div className="mt-4 flex gap-2 border-t border-border pt-4">
        <ActionButton onClick={() => dispatch(clearFilters())}>Clear all ({chips.length})</ActionButton>
        <ActionButton variant="primary" onClick={() => dispatch(closeFilterDrawer())}>
          Show Results
        </ActionButton>
      </div>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 20. Order item
// ─────────────────────────────────────────────────────────────────────────
function OrderItemRow({ item, seller }: { item: OrderItem; seller: Seller }) {
  const meta = ITEM_STATE_META[item.state];
  const hasDiscount = item.discountMinor > 0;
  return (
    <li className="flex gap-3 py-3">
      <div
        role="img"
        aria-label={item.product.imageAlt}
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[10px] text-muted-foreground"
      >
        {item.product.brand.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{item.product.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.product.brand}
          {item.product.variant ? ` · ${item.product.variant}` : ""} · Qty {item.quantity}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">Sold by {seller.name}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StatusBadge tone={meta.tone} label={meta.label} />
          {!item.inStock && <StatusBadge tone="neutral" label="Currently Unavailable" />}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-foreground">{formatMoney(item.unitPriceMinor - item.discountMinor, item.currency)}</p>
        {hasDiscount && <p className="text-xs text-muted-foreground line-through">{formatMoney(item.unitPriceMinor, item.currency)}</p>}
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 21. Tracking / progress
// ─────────────────────────────────────────────────────────────────────────
function OrderProgress({ status }: { status: OrderStatus }) {
  const currentIndex = progressIndexFor(status);
  return (
    <ol className="flex items-center" aria-label="Delivery progress">
      {PROGRESS_STEPS.map((step, idx) => {
        const complete = idx <= currentIndex;
        const isLast = idx === PROGRESS_STEPS.length - 1;
        return (
          <li key={step.status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                aria-current={idx === currentIndex ? "step" : undefined}
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                  complete ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"
                }`}
              >
                {complete ? "✓" : ""}
              </span>
              <span className={`hidden text-[11px] sm:block ${complete ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {!isLast && <span className={`mx-1 h-0.5 flex-1 rounded ${idx < currentIndex ? "bg-primary" : "bg-border"}`} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function TrackingPreview({ tracking, unavailable }: { tracking?: TrackingInfo; unavailable?: boolean }) {
  const [retrying, setRetrying] = useState(false);
  if (unavailable && !tracking) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
        <p>Tracking information is temporarily unavailable.</p>
        <button
          type="button"
          onClick={() => setRetrying(true)}
          className="mt-1 font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          {retrying ? "Retrying…" : "Try Again"}
        </button>
      </div>
    );
  }
  if (!tracking) return null;
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{tracking.carrier}</p>
          <p className="font-mono text-xs text-muted-foreground">{tracking.trackingNumber}</p>
        </div>
        <StatusBadge tone="info" label={tracking.statusLabel} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {tracking.estimatedDeliveryLabel && (
          <div className="col-span-2 flex justify-between sm:col-span-1">
            <dt>Estimated delivery</dt>
            <dd className="font-medium text-foreground">{tracking.estimatedDeliveryLabel}</dd>
          </div>
        )}
        {tracking.currentLocation && (
          <div className="col-span-2 flex justify-between sm:col-span-1">
            <dt>Location</dt>
            <dd className="text-right font-medium text-foreground">{tracking.currentLocation}</dd>
          </div>
        )}
      </dl>
      <p className="mt-1.5 text-[11px] text-muted-foreground">Updated {tracking.lastUpdateLabel}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 22. Order actions + dialogs
// ─────────────────────────────────────────────────────────────────────────
function CancelOrderDialog({ orderId }: { orderId: string }) {
  const dispatch = useAppDispatch();
  const [reason, setReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  const onConfirm = () => {
    setSubmitting(true);
    setFailed(false);
    // Mock async cancellation — a real integration would call the Order Service.
    setTimeout(() => {
      setSubmitting(false);
      dispatch(orderCancelled({ orderId, reason }));
      dispatch(setCancelOrder(null));
    }, 500);
  };

  return (
    <Dialog titleId="cancel-order-title" title="Cancel Order" onClose={() => dispatch(setCancelOrder(null))}>
      <p className="text-sm text-muted-foreground">Tell us why you're cancelling this order.</p>
      <fieldset className="mt-3 space-y-1">
        <legend className="sr-only">Cancellation reason</legend>
        {CANCELLATION_REASONS.map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-foreground">
            <input
              type="radio"
              name="cancel-reason"
              checked={reason === r}
              onChange={() => setReason(r)}
              className="h-4 w-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {r}
          </label>
        ))}
      </fieldset>
      {failed && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Unable to cancel order. Please try again.
        </p>
      )}
      <div className="mt-4 flex gap-2 border-t border-border pt-4">
        <ActionButton onClick={() => dispatch(setCancelOrder(null))}>Keep Order</ActionButton>
        <ActionButton variant="danger" onClick={onConfirm}>
          {submitting ? "Cancelling…" : "Confirm Cancellation"}
        </ActionButton>
      </div>
    </Dialog>
  );
}

function ReturnEntryDialog({ order }: { order: Order }) {
  const dispatch = useAppDispatch();
  const now = new Date();
  const windowLabel = formatReturnWindow(order.returnEligibleUntil, now);
  const expired = windowLabel === "Return window expired";
  return (
    <Dialog titleId="return-entry-title" title="Start a Return" onClose={() => dispatch(setReturnOrder(null))}>
      <p className={`text-sm ${expired ? "text-destructive" : "text-muted-foreground"}`}>{windowLabel}</p>
      {!expired && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-foreground">Choose how you'd like to proceed:</p>
          <ActionButton variant="primary">Return Item for Refund</ActionButton>
          <ActionButton>Replace Item</ActionButton>
        </div>
      )}
      <div className="mt-4 border-t border-border pt-4">
        <ActionButton onClick={() => dispatch(setReturnOrder(null))}>Close</ActionButton>
      </div>
    </Dialog>
  );
}

function TrackingDialog({ order }: { order: Order }) {
  const dispatch = useAppDispatch();
  return (
    <Dialog titleId="tracking-dialog-title" title={`Track Order ${order.orderNumber}`} onClose={() => dispatch(setTrackingOrder(null))}>
      <div className="space-y-3">
        {order.sellerGroups.map((group) => (
          <div key={group.sellerId}>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">{sellerById(group.sellerId).name}</p>
            <TrackingPreview tracking={group.tracking} unavailable={group.trackingUnavailable} />
          </div>
        ))}
      </div>
    </Dialog>
  );
}

function OrderActions({ order }: { order: Order }) {
  const dispatch = useAppDispatch();
  const actions = getOrderActions(order);

  const onAction = (action: ActionKey) => {
    switch (action) {
      case "track_package":
      case "track_return":
        dispatch(setTrackingOrder(order.id));
        break;
      case "cancel":
        dispatch(setCancelOrder(order.id));
        break;
      case "return":
        dispatch(setReturnOrder(order.id));
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={`Actions for order ${order.orderNumber}`}>
      {actions.map((action) => (
        <ActionButton
          key={action}
          variant={action === "view_details" ? "primary" : "secondary"}
          onClick={() => onAction(action)}
        >
          {ACTION_LABELS[action]}
        </ActionButton>
      ))}
    </div>
  );
}

function BuyAgainSummary({ order, items }: { order: Order; items: OrderItem[] }) {
  const eligible = ["delivered", "cancelled", "returned", "refunded", "partially_refunded"].includes(order.status);
  if (!eligible) return null;
  const available = items.filter((i) => i.inStock);
  if (available.length === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
      <p className="text-muted-foreground">
        {available.length} of {items.length} {items.length === 1 ? "item is" : "items are"} available to buy again
      </p>
      <ActionButton variant="primary">Add Available Items</ActionButton>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 19. Order card
// ─────────────────────────────────────────────────────────────────────────
function PaymentSummary({ payment }: { payment: PaymentInfo }) {
  const paidToneMap: Record<PaymentStatus, StatusTone> = {
    paid: "success",
    pending: "pending",
    failed: "danger",
    refunded: "info",
    partially_refunded: "info",
  };
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{payment.displayLabel}</span>
      <StatusBadge tone={paidToneMap[payment.status]} label={STATUS_META_FOR_PAYMENT(payment.status)} />
    </div>
  );
}

function STATUS_META_FOR_PAYMENT(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    paid: "Paid",
    pending: "Pending",
    failed: "Failed",
    refunded: "Refunded",
    partially_refunded: "Partially Refunded",
  };
  return labels[status];
}

function PriceSummary({ totals }: { totals: OrderTotals }) {
  const rows: { label: string; value: number; show: boolean }[] = [
    { label: "Subtotal", value: totals.subtotalMinor, show: true },
    { label: "Product discounts", value: -totals.discountMinor, show: totals.discountMinor > 0 },
    { label: "Coupon", value: -totals.couponMinor, show: totals.couponMinor > 0 },
    { label: "Shipping", value: totals.shippingMinor, show: true },
    { label: "Tax", value: totals.taxMinor, show: true },
    { label: "Fees", value: totals.feesMinor, show: totals.feesMinor > 0 },
    { label: "Rewards applied", value: -totals.rewardsMinor, show: totals.rewardsMinor > 0 },
  ];
  return (
    <dl className="space-y-1 text-sm">
      {rows
        .filter((r) => r.show)
        .map((r) => (
          <div key={r.label} className="flex justify-between text-muted-foreground">
            <dt>{r.label}</dt>
            <dd className={r.value < 0 ? "text-success" : "text-foreground"}>
              {r.value < 0 ? "−" : ""}
              {formatMoney(Math.abs(r.value), totals.currency)}
            </dd>
          </div>
        ))}
      <div className="flex justify-between border-t border-border pt-1.5 text-sm font-semibold text-foreground">
        <dt>Total</dt>
        <dd>{formatMoney(totals.totalMinor, totals.currency)}</dd>
      </div>
    </dl>
  );
}

function SellerGroupBlock({ order, group, items }: { order: Order; group: SellerGroup; items: OrderItem[] }) {
  const seller = sellerById(group.sellerId);
  const meta = STATUS_META[group.status];
  const now = new Date();
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{seller.name}</p>
          {seller.verified && <StatusBadge tone="info" label="Verified" />}
        </div>
        <StatusBadge tone={meta.tone} label={meta.label} />
      </div>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <OrderItemRow key={item.id} item={item} seller={seller} />
        ))}
      </ul>
      {isActiveOrder(group.status) && (
        <div className="mt-2 space-y-2">
          <OrderProgress status={group.status} />
          {group.estimatedDeliveryLabel && (
            <p className="text-xs font-medium text-foreground">{group.estimatedDeliveryLabel}</p>
          )}
          <TrackingPreview tracking={group.tracking} unavailable={group.trackingUnavailable} />
        </div>
      )}
      {group.status === "delivered" && group.deliveredAtLabel && (
        <p className="mt-2 text-xs font-medium text-success">Delivered {group.deliveredAtLabel}</p>
      )}
      {order.returnEligibleUntil && group.status === "delivered" && (
        <p className="mt-1 text-xs text-muted-foreground">{formatReturnWindow(order.returnEligibleUntil, now)}</p>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const itemsById = useAppSelector((s) => s.orders.itemsById);
  const items = order.itemIds.map((id) => itemsById[id]);
  const meta = STATUS_META[order.status];

  return (
    <li className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Order #{order.orderNumber}</h3>
          <p className="text-xs text-muted-foreground">
            Placed {formatDate(order.createdAt)} · {order.itemIds.length} {order.itemIds.length === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={meta.tone} label={meta.label} />
          <span className="text-sm font-semibold text-card-foreground">{formatMoney(order.totals.totalMinor, order.totals.currency)}</span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {order.sellerGroups.map((group) => (
          <SellerGroupBlock key={group.sellerId} order={order} group={group} items={items.filter((i) => i.sellerId === group.sellerId)} />
        ))}

        <BuyAgainSummary order={order} items={items} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border p-3">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Payment</p>
            <PaymentSummary payment={order.payment} />
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Price Summary</p>
            <PriceSummary totals={order.totals} />
          </div>
        </div>

        {order.invoiceNumber ? (
          <p className="text-xs text-muted-foreground">
            Invoice available · <span className="font-medium text-foreground">{order.invoiceNumber}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Invoice unavailable for this order.</p>
        )}

        <OrderActions order={order} />
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 23. Empty / loading / error states
// ─────────────────────────────────────────────────────────────────────────
function OrderCardSkeleton() {
  return (
    <li className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex justify-between">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-4 w-20" />
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-16 w-full" />
      </div>
      <div className="mt-4 flex gap-2">
        <SkeletonBlock className="h-9 w-28" />
        <SkeletonBlock className="h-9 w-28" />
      </div>
    </li>
  );
}

function OrdersListSkeleton() {
  return (
    <ul className="space-y-4" aria-label="Loading orders">
      {Array.from({ length: 3 }).map((_, idx) => (
        <OrderCardSkeleton key={idx} />
      ))}
    </ul>
  );
}

function ErrorState({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <p className="text-sm font-semibold text-destructive">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">Something went wrong on our end.</p>
      <div className="mt-4 flex justify-center gap-2">
        <ActionButton onClick={onRetry}>Try Again</ActionButton>
        <ActionButton variant="secondary">Contact Support</ActionButton>
      </div>
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="rounded-lg border border-border bg-card px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-foreground">You haven't placed any orders yet</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">Your future purchases will appear here.</p>
      <div className="mt-5 flex justify-center gap-2">
        <ActionButton variant="primary">Start Shopping</ActionButton>
        <ActionButton>Explore Deals</ActionButton>
      </div>
    </div>
  );
}

function NoSearchResults({ onClearSearch }: { onClearSearch: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card px-6 py-14 text-center">
      <h2 className="text-base font-semibold text-foreground">No orders found</h2>
      <p className="mt-1 text-sm text-muted-foreground">Try another order number, product name, or filter.</p>
      <div className="mt-4 flex justify-center">
        <ActionButton onClick={onClearSearch}>Clear Search</ActionButton>
      </div>
    </div>
  );
}

function NoFilterResults({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card px-6 py-14 text-center">
      <h2 className="text-base font-semibold text-foreground">No orders match these filters</h2>
      <div className="mt-4 flex justify-center">
        <ActionButton onClick={onClearFilters}>Clear Filters</ActionButton>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 18. Order list
// ─────────────────────────────────────────────────────────────────────────
function OrderList() {
  const dispatch = useAppDispatch();
  const ordersStatus = useAppSelector((s) => s.orders.status);
  const query = useAppSelector(selectSearchQuery);
  const filters = useAppSelector(selectFilters);
  const totalOrders = useAppSelector(selectAllOrders).length;
  const { items, total } = useAppSelector(selectPagedOrders);

  if (ordersStatus === "loading") return <OrdersListSkeleton />;
  if (ordersStatus === "failed") return <ErrorState title="Unable to load orders" onRetry={() => dispatch(hydrated())} />;
  if (totalOrders === 0) return <EmptyOrders />;
  if (total === 0 && query.trim()) return <NoSearchResults onClearSearch={() => dispatch(clearSearch())} />;
  if (total === 0) return <NoFilterResults onClearFilters={() => dispatch(clearFilters())} />;

  return (
    <ul id="orders-panel" role="tabpanel" aria-labelledby="tab-all" className="space-y-4">
      {items.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 24. Pagination
// ─────────────────────────────────────────────────────────────────────────
function Pagination() {
  const dispatch = useAppDispatch();
  const { page, totalPages, total } = useAppSelector(selectPagedOrders);
  if (total === 0) return null;
  return (
    <nav aria-label="Orders pagination" className="mt-6 flex items-center justify-between border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages} · {total} results
      </p>
      <div className="flex gap-2">
        <ActionButton onClick={() => dispatch(setPage(Math.max(1, page - 1)))}>Previous</ActionButton>
        <ActionButton onClick={() => dispatch(setPage(Math.min(totalPages, page + 1)))}>Next</ActionButton>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 25. Recommendations
// ─────────────────────────────────────────────────────────────────────────
function OrderRecommendations() {
  const picks = [
    { name: "Vertex Wireless Earbuds Pro", price: "$79.99" },
    { name: "Aurora Ceramic Dinnerware Set (16pc)", price: "$64.00" },
    { name: "NorthPeak Trail Running Shoes", price: "$98.00" },
    { name: "Lumen Hyaluronic Hydration Duo", price: "$32.00" },
  ];
  return (
    <section aria-labelledby="recs-heading" className="mt-10">
      <h2 id="recs-heading" className="text-base font-semibold text-foreground">
        Inspired by your orders
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {picks.map((p) => (
          <div key={p.name} className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 flex h-20 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">Preview</div>
            <p className="line-clamp-2 text-xs font-medium text-card-foreground">{p.name}</p>
            <p className="mt-1 text-sm font-semibold text-card-foreground">{p.price}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 26. Trust section
// ─────────────────────────────────────────────────────────────────────────
function TrustSection() {
  const items = [
    { title: "Buyer Protection", body: "Full refund if items arrive damaged or not as described." },
    { title: "Secure Payments", body: "Your payment details are encrypted end-to-end." },
    { title: "Verified Sellers", body: "Every marketplace seller is identity-verified." },
  ];
  return (
    <section aria-labelledby="trust-heading" className="mt-10 rounded-lg border border-border bg-muted/30 p-6">
      <h2 id="trust-heading" className="sr-only">
        Why shop with us
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((i) => (
          <div key={i.title}>
            <p className="text-sm font-semibold text-foreground">{i.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{i.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 27. Footer
// ─────────────────────────────────────────────────────────────────────────
function EcommerceFooter() {
  const columns = [
    { title: "Get to Know Us", links: ["About", "Careers", "Press"] },
    { title: "Make Money With Us", links: ["Sell on Meridian", "Advertise", "Affiliate Program"] },
    { title: "Payment Products", links: ["Business Card", "Shop with Points", "Gift Cards"] },
    { title: "Let Us Help You", links: ["Your Orders", "Shipping Rates", "Returns Center", "Help Center"] },
  ];
  return (
    <footer className="mt-12 border-t border-border bg-card">
      <div className="mx-auto max-w-[1400px] grid gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-card-foreground">{col.title}</h3>
            <ul className="mt-2 space-y-1.5">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
        © 2026 Meridian Marketplace, Inc.
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 28. Main OrdersPage composition
// ─────────────────────────────────────────────────────────────────────────
function SupportSection() {
  return (
    <section aria-labelledby="support-heading" className="mt-6 rounded-lg border border-border bg-card p-4">
      <h2 id="support-heading" className="text-sm font-semibold text-foreground">
        Need help?
      </h2>
      <div className="mt-2 flex flex-wrap gap-2">
        <ActionButton>Contact Support</ActionButton>
        <ActionButton>Report an Order Issue</ActionButton>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Common topics: {SUPPORT_ISSUES.slice(0, 4).join(" · ")}
      </p>
    </section>
  );
}

function OrdersPageContent() {
  const dispatch = useAppDispatch();
  const ui = useAppSelector(selectUi);
  const { total } = useAppSelector(selectPagedOrders);
  const orderById = useAppSelector((s) => s.orders.byId);

  // Mock hydration — represents an initial Order Service fetch on mount.
  useEffect(() => {
    const timer = setTimeout(() => dispatch(hydrated()), 400);
    return () => clearTimeout(timer);
  }, [dispatch]);

  const cancelOrder = ui.cancelOrderId ? orderById[ui.cancelOrderId] : null;
  const returnOrder = ui.returnOrderId ? orderById[ui.returnOrderId] : null;
  const trackingOrder = ui.trackingOrderId ? orderById[ui.trackingOrderId] : null;

  return (
    <div className="min-h-screen bg-background">
      <EcommerceHeader />
      <Breadcrumbs />
      <OrdersHeader total={total} />
      <OrdersNavigation />
      <OrdersToolbar />

      <main className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          <FilterSidebar />
          <div className="min-w-0 flex-1">
            <OrderList />
            <Pagination />
            <SupportSection />
            <OrderRecommendations />
            <TrustSection />
          </div>
        </div>
      </main>

      <EcommerceFooter />

      <FilterDrawer />
      {cancelOrder && <CancelOrderDialog orderId={cancelOrder.id} />}
      {returnOrder && <ReturnEntryDialog order={returnOrder} />}
      {trackingOrder && <TrackingDialog order={trackingOrder} />}
    </div>
  );
}

function OrdersPage() {
  return (
    <Provider store={store}>
      <OrdersPageContent />
    </Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 29. Export
// ─────────────────────────────────────────────────────────────────────────
export default OrdersPage;