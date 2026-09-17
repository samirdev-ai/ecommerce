"use client";

/* ============================================================================
 * 1. IMPORTS
 * ========================================================================== */
import React, { useCallback, useMemo, useState } from "react";
import {
  configureStore,
  createSlice,
  createSelector,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";

/* ============================================================================
 * 2. TYPE DEFINITIONS
 * ========================================================================== */

interface Money {
  amountMinor: number; // integer minor units, e.g. 12999 = $129.99
  currency: string; // ISO 4217
}

interface Address {
  line1: string;
  city: string;
  region?: string;
  countryCode: string;
}

interface Seller {
  id: string;
  name: string;
  verified: boolean;
  rating: number; // 0-5
  returnWindowDays: number;
}

interface ProductVariant {
  color?: string;
  size?: string;
  storage?: string;
}

interface ReturnLineItem {
  id: string;
  productName: string;
  brand: string;
  sku: string;
  variant: ProductVariant;
  imageLabel: string; // placeholder swatch label instead of real image asset
  quantity: number;
  unitPrice: Money;
  refundableAmount: Money;
  eligibility: ItemEligibility;
  itemStatus: ItemStatus;
  sellerId: string;
}

type ItemEligibility =
  | { kind: "eligible"; until: string }
  | { kind: "windowExpired" }
  | { kind: "finalSale" }
  | { kind: "nonReturnableCategory" }
  | { kind: "warrantyRequired" };

type ItemStatus =
  | "pendingReturn"
  | "refundApproved"
  | "inspectionPending"
  | "rejected"
  | "replacementIssued"
  | "retained";

type ReturnReason =
  | "damaged"
  | "defective"
  | "wrongItem"
  | "missingParts"
  | "notAsDescribed"
  | "changedMind"
  | "wrongSize"
  | "wrongColor"
  | "lateDelivery"
  | "qualityIssue"
  | "other";

type Resolution = "refund" | "replacement" | "exchange" | "storeCredit";

type RefundMethod =
  | "originalPayment"
  | "wallet"
  | "storeCredit"
  | "bankTransfer";

type ReturnMethod = "pickup" | "dropoff" | "courier" | "selfShip";

type ReturnStatus =
  | "eligible"
  | "requested"
  | "underReview"
  | "approved"
  | "pickupScheduled"
  | "pickupAttempted"
  | "inTransit"
  | "received"
  | "underInspection"
  | "approvedForRefund"
  | "approvedForReplacement"
  | "refundPending"
  | "partiallyRefunded"
  | "refunded"
  | "replacementProcessing"
  | "replacementShipped"
  | "replacementDelivered"
  | "rejected"
  | "cancelled"
  | "disputed"
  | "failed";

type RefundState =
  | "notStarted"
  | "pending"
  | "processing"
  | "partiallyRefunded"
  | "refunded"
  | "failed"
  | "reversed";

type InspectionState =
  | "notStarted"
  | "pending"
  | "inProgress"
  | "passed"
  | "partiallyApproved"
  | "failed";

interface ReturnTrackingEvent {
  id: string;
  status: string;
  title: string;
  description: string;
  location?: string;
  timestamp: string;
  completed: boolean;
  current: boolean;
  exception: boolean;
}

interface PickupInfo {
  date: string;
  windowStart: string;
  windowEnd: string;
  address: Address;
  instructions?: string;
}

interface DropoffInfo {
  locationName: string;
  address: Address;
  distanceKm: number;
  hours: string;
  instructions?: string;
}

interface Shipment {
  carrier: string;
  trackingNumber: string;
  currentLocation?: string;
  eta?: string;
  events: ReturnTrackingEvent[];
}

interface RefundBreakdown {
  productAmount: Money;
  couponAdjustment: Money;
  shippingAdjustment: Money;
  taxAdjustment: Money;
  fees: Money;
  storeCredit: Money;
  total: Money;
}

interface Refund {
  state: RefundState;
  method: RefundMethod;
  breakdown: RefundBreakdown;
  expectedBy?: string;
  completedAt?: string;
  reference?: string;
  failureReason?: string;
}

interface Replacement {
  productName: string;
  variant: ProductVariant;
  status:
    | "requested"
    | "approved"
    | "processing"
    | "packed"
    | "shipped"
    | "outForDelivery"
    | "delivered";
  trackingNumber?: string;
  eta?: string;
  priceDifference?: Money;
}

interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  status: ReturnStatus;
  reason: ReturnReason;
  reasonNote?: string;
  resolution: Resolution;
  itemIds: string[];
  sellerId: string;
  pickup?: PickupInfo;
  dropoff?: DropoffInfo;
  returnMethod: ReturnMethod;
  shipment?: Shipment;
  inspection: InspectionState;
  inspectionNote?: string;
  refund?: Refund;
  replacement?: Replacement;
  notes?: string;
}

type DateFilterPreset =
  | "last30"
  | "last90"
  | "last180"
  | "lastYear"
  | "custom"
  | "any";

type SortOption =
  | "newest"
  | "oldest"
  | "amountHigh"
  | "amountLow"
  | "recentlyUpdated"
  | "refundSoonest";

type ReturnFlowStep =
  | "items"
  | "reason"
  | "resolution"
  | "method"
  | "review"
  | "submitted";

interface FilterState {
  status: ReturnStatus[];
  reason: ReturnReason[];
  resolution: Resolution[];
  refundMethod: RefundMethod[];
  date: DateFilterPreset;
  amountMin?: number;
  amountMax?: number;
  eligibilityOnly: boolean;
}

/* ============================================================================
 * 3. ENUMS / LABEL MAPS (discriminated-union friendly constant records)
 * ========================================================================== */

type Tone = "success" | "info" | "warning" | "danger" | "neutral" | "pending";

const STATUS_META: Record<ReturnStatus, { label: string; tone: Tone; description: string }> = {
  eligible: { label: "Return eligible", tone: "neutral", description: "This order can still be returned." },
  requested: { label: "Requested", tone: "pending", description: "Your return request has been submitted." },
  underReview: { label: "Under review", tone: "pending", description: "We're reviewing your return request." },
  approved: { label: "Approved", tone: "success", description: "Your return has been approved." },
  pickupScheduled: { label: "Pickup scheduled", tone: "info", description: "A courier pickup has been scheduled." },
  pickupAttempted: { label: "Pickup attempted", tone: "warning", description: "The courier attempted pickup." },
  inTransit: { label: "In transit", tone: "info", description: "Your return is on its way to the seller." },
  received: { label: "Received", tone: "info", description: "The seller has received your return." },
  underInspection: { label: "Under inspection", tone: "warning", description: "Your item is being inspected." },
  approvedForRefund: { label: "Approved for refund", tone: "success", description: "Inspection passed — refund is being prepared." },
  approvedForReplacement: { label: "Approved for replacement", tone: "success", description: "Inspection passed — a replacement is being prepared." },
  refundPending: { label: "Refund pending", tone: "warning", description: "Your refund has been initiated and is processing." },
  partiallyRefunded: { label: "Partially refunded", tone: "warning", description: "Part of your refund has been completed." },
  refunded: { label: "Refunded", tone: "success", description: "Your refund is complete." },
  replacementProcessing: { label: "Replacement processing", tone: "info", description: "Your replacement is being prepared." },
  replacementShipped: { label: "Replacement shipped", tone: "info", description: "Your replacement is on its way." },
  replacementDelivered: { label: "Replacement delivered", tone: "success", description: "Your replacement has been delivered." },
  rejected: { label: "Rejected", tone: "danger", description: "This return did not meet the return conditions." },
  cancelled: { label: "Cancelled", tone: "neutral", description: "This return request was cancelled." },
  disputed: { label: "Issue reported", tone: "danger", description: "There's an open issue on this return." },
  failed: { label: "Failed", tone: "danger", description: "Something went wrong processing this return." },
};

const REASON_LABEL: Record<ReturnReason, string> = {
  damaged: "Damaged",
  defective: "Defective",
  wrongItem: "Wrong item",
  missingParts: "Missing parts",
  notAsDescribed: "Not as described",
  changedMind: "Changed mind",
  wrongSize: "Wrong size",
  wrongColor: "Wrong color",
  lateDelivery: "Late delivery",
  qualityIssue: "Quality issue",
  other: "Other",
};

const RESOLUTION_LABEL: Record<Resolution, string> = {
  refund: "Refund",
  replacement: "Replacement",
  exchange: "Exchange",
  storeCredit: "Store credit",
};

const REFUND_METHOD_LABEL: Record<RefundMethod, string> = {
  originalPayment: "Original payment method",
  wallet: "Wallet",
  storeCredit: "Store credit",
  bankTransfer: "Bank transfer",
};

const RETURN_METHOD_LABEL: Record<ReturnMethod, string> = {
  pickup: "Pickup",
  dropoff: "Drop-off",
  courier: "Courier return",
  selfShip: "Self ship",
};

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success-subtle text-success",
  info: "bg-info-subtle text-info",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  neutral: "bg-neutral-subtle text-neutral-foreground",
  pending: "bg-warning-subtle text-warning",
};

const STATUS_TABS: { key: "all" | ReturnStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "eligible", label: "Return eligible" },
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "pickupScheduled", label: "Pickup scheduled" },
  { key: "inTransit", label: "In transit" },
  { key: "received", label: "Received" },
  { key: "underInspection", label: "Under inspection" },
  { key: "approvedForReplacement", label: "Replacement" },
  { key: "refundPending", label: "Refund pending" },
  { key: "refunded", label: "Refunded" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
  { key: "disputed", label: "Issue" },
];

/* ============================================================================
 * 4. CONSTANTS
 * ========================================================================== */

const RETURN_REASONS: ReturnReason[] = [
  "damaged",
  "defective",
  "wrongItem",
  "missingParts",
  "notAsDescribed",
  "changedMind",
  "wrongSize",
  "wrongColor",
  "qualityIssue",
  "lateDelivery",
  "other",
];

const FLOW_STEPS: { key: ReturnFlowStep; label: string }[] = [
  { key: "items", label: "Select items" },
  { key: "reason", label: "Reason" },
  { key: "resolution", label: "Resolution" },
  { key: "method", label: "Return method" },
  { key: "review", label: "Review" },
  { key: "submitted", label: "Submitted" },
];

/* ============================================================================
 * 5–9. MOCK DATA (sellers, products/items, tracking, refunds, returns)
 * ========================================================================== */

const MOCK_SELLERS: Record<string, Seller> = {
  "sel-nova": { id: "sel-nova", name: "Nova Audio Co.", verified: true, rating: 4.7, returnWindowDays: 30 },
  "sel-atlas": { id: "sel-atlas", name: "Atlas Outdoor Supply", verified: true, rating: 4.5, returnWindowDays: 45 },
  "sel-kestrel": { id: "sel-kestrel", name: "Kestrel Home Goods", verified: false, rating: 4.1, returnWindowDays: 14 },
  "sel-linen": { id: "sel-linen", name: "Linen & Co.", verified: true, rating: 4.8, returnWindowDays: 30 },
};

const usd = (amountMinor: number): Money => ({ amountMinor, currency: "USD" });

const MOCK_ITEMS: Record<string, ReturnLineItem> = {
  "item-1": {
    id: "item-1",
    productName: "Wireless Over-Ear Headphones",
    brand: "Nova Audio",
    sku: "NVA-WH-BLK-01",
    variant: { color: "Black" },
    imageLabel: "WH",
    quantity: 1,
    unitPrice: usd(12999),
    refundableAmount: usd(12999),
    eligibility: { kind: "eligible", until: "2025-10-12" },
    itemStatus: "inspectionPending",
    sellerId: "sel-nova",
  },
  "item-2": {
    id: "item-2",
    productName: "USB-C Fast Charging Cable (2-Pack)",
    brand: "Nova Audio",
    sku: "NVA-CBL-2PK",
    variant: {},
    imageLabel: "CB",
    quantity: 1,
    unitPrice: usd(1499),
    refundableAmount: usd(0),
    eligibility: { kind: "finalSale" },
    itemStatus: "retained",
    sellerId: "sel-nova",
  },
  "item-3": {
    id: "item-3",
    productName: "3-Season Trail Backpack 32L",
    brand: "Atlas Outdoor",
    sku: "ATL-BP-32-GRN",
    variant: { color: "Forest Green" },
    imageLabel: "BP",
    quantity: 1,
    unitPrice: usd(8900),
    refundableAmount: usd(8900),
    eligibility: { kind: "eligible", until: "2025-11-02" },
    itemStatus: "refundApproved",
    sellerId: "sel-atlas",
  },
  "item-4": {
    id: "item-4",
    productName: "Ceramic Pour-Over Coffee Set",
    brand: "Kestrel Home",
    sku: "KST-CS-CER-04",
    variant: { color: "Sand" },
    imageLabel: "CS",
    quantity: 1,
    unitPrice: usd(4200),
    refundableAmount: usd(3780),
    eligibility: { kind: "windowExpired" },
    itemStatus: "rejected",
    sellerId: "sel-kestrel",
  },
  "item-5": {
    id: "item-5",
    productName: "Organic Cotton Bedsheet Set — Queen",
    brand: "Linen & Co.",
    sku: "LNC-BS-QN-WHT",
    variant: { color: "White", size: "Queen" },
    imageLabel: "BS",
    quantity: 1,
    unitPrice: usd(11000),
    refundableAmount: usd(11000),
    eligibility: { kind: "eligible", until: "2025-10-05" },
    itemStatus: "refundApproved",
    sellerId: "sel-linen",
  },
  "item-6": {
    id: "item-6",
    productName: "Running Jacket — Lightweight Shell",
    brand: "Atlas Outdoor",
    sku: "ATL-JK-LT-BLU-M",
    variant: { color: "Cobalt", size: "M" },
    imageLabel: "JK",
    quantity: 1,
    unitPrice: usd(9500),
    refundableAmount: usd(9500),
    eligibility: { kind: "eligible", until: "2025-10-20" },
    itemStatus: "pendingReturn",
    sellerId: "sel-atlas",
  },
  "item-7": {
    id: "item-7",
    productName: "Smart Home Hub, 2nd Gen",
    brand: "Kestrel Home",
    sku: "KST-HUB-G2",
    variant: {},
    imageLabel: "HB",
    quantity: 1,
    unitPrice: usd(6999),
    refundableAmount: usd(6999),
    eligibility: { kind: "warrantyRequired" },
    itemStatus: "inspectionPending",
    sellerId: "sel-kestrel",
  },
};

function trackingEvents(
  events: Array<Omit<ReturnTrackingEvent, "id">>,
): ReturnTrackingEvent[] {
  return events.map((e, i) => ({ ...e, id: `evt-${i}-${e.status}` }));
}

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000).toISOString();

const MOCK_RETURNS: ReturnRequest[] = [
  {
    id: "RET-482913",
    orderId: "ord-1",
    orderNumber: "ORD-482913",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(1),
    status: "underInspection",
    reason: "damaged",
    reasonNote: "The outer packaging was damaged and the left ear cup has a visible crack.",
    resolution: "refund",
    itemIds: ["item-1"],
    sellerId: "sel-nova",
    returnMethod: "pickup",
    pickup: {
      date: daysAgo(6),
      windowStart: "10:00",
      windowEnd: "14:00",
      address: { line1: "House 14, Jhamsikhel", city: "Kathmandu", countryCode: "NP" },
      instructions: "Ring the bell twice; package left with security if unavailable.",
    },
    shipment: {
      carrier: "SwiftLogistics",
      trackingNumber: "SWL9384710NP",
      currentLocation: "Regional Return Facility — Kathmandu",
      eta: daysFromNow(1),
      events: trackingEvents([
        { status: "requested", title: "Return requested", description: "You requested a return for this item.", timestamp: daysAgo(9), completed: true, current: false, exception: false },
        { status: "approved", title: "Return approved", description: "Nova Audio Co. approved your return.", timestamp: daysAgo(8), completed: true, current: false, exception: false },
        { status: "pickupScheduled", title: "Pickup scheduled", description: "Courier pickup scheduled.", timestamp: daysAgo(7), completed: true, current: false, exception: false },
        { status: "pickedUp", title: "Picked up", description: "Package picked up by SwiftLogistics.", location: "Kathmandu", timestamp: daysAgo(6), completed: true, current: false, exception: false },
        { status: "inTransit", title: "In transit", description: "Package is on its way to the return facility.", timestamp: daysAgo(4), completed: true, current: false, exception: false },
        { status: "received", title: "Received by seller", description: "Nova Audio Co. received your return.", location: "Regional Return Facility — Kathmandu", timestamp: daysAgo(2), completed: true, current: false, exception: false },
        { status: "inspection", title: "Inspection in progress", description: "Your item is being inspected.", timestamp: daysAgo(1), completed: false, current: true, exception: false },
        { status: "refund", title: "Refund", description: "Pending inspection outcome.", timestamp: "", completed: false, current: false, exception: false },
      ]),
    },
    inspection: "inProgress",
    inspectionNote: "Your returned item has been received. Inspection usually takes 1–2 business days.",
    refund: {
      state: "notStarted",
      method: "originalPayment",
      breakdown: {
        productAmount: usd(12999),
        couponAdjustment: usd(0),
        shippingAdjustment: usd(0),
        taxAdjustment: usd(0),
        fees: usd(0),
        storeCredit: usd(0),
        total: usd(12999),
      },
    },
  },
  {
    id: "RET-482935",
    orderId: "ord-2",
    orderNumber: "ORD-611820",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(0.3),
    status: "pickupScheduled",
    reason: "wrongSize",
    resolution: "exchange",
    itemIds: ["item-6"],
    sellerId: "sel-atlas",
    returnMethod: "pickup",
    pickup: {
      date: daysFromNow(1),
      windowStart: "10:00",
      windowEnd: "14:00",
      address: { line1: "Suite 4B, Baluwatar", city: "Kathmandu", countryCode: "NP" },
    },
    inspection: "notStarted",
    replacement: {
      productName: "Running Jacket — Lightweight Shell",
      variant: { color: "Cobalt", size: "L" },
      status: "requested",
      priceDifference: usd(0),
    },
  },
  {
    id: "RET-479102",
    orderId: "ord-3",
    orderNumber: "ORD-479102",
    createdAt: daysAgo(21),
    updatedAt: daysAgo(14),
    status: "refunded",
    reason: "notAsDescribed",
    reasonNote: "Bedsheet color did not match the listing photos.",
    resolution: "refund",
    itemIds: ["item-5"],
    sellerId: "sel-linen",
    returnMethod: "dropoff",
    dropoff: {
      locationName: "Linen & Co. Partner Drop-off — Patan",
      address: { line1: "Mangal Bazaar Rd", city: "Lalitpur", countryCode: "NP" },
      distanceKm: 3.2,
      hours: "9:00 AM – 7:00 PM",
      instructions: "Present the return QR code at the counter.",
    },
    inspection: "passed",
    refund: {
      state: "refunded",
      method: "originalPayment",
      breakdown: {
        productAmount: usd(11000),
        couponAdjustment: usd(-500),
        shippingAdjustment: usd(0),
        taxAdjustment: usd(0),
        fees: usd(0),
        storeCredit: usd(0),
        total: usd(10500),
      },
      completedAt: daysAgo(14),
      reference: "RF-77213890",
    },
  },
  {
    id: "RET-475588",
    orderId: "ord-4",
    orderNumber: "ORD-475588",
    createdAt: daysAgo(40),
    updatedAt: daysAgo(33),
    status: "rejected",
    reason: "qualityIssue",
    reasonNote: "Ceramic surface felt rough near the base.",
    resolution: "refund",
    itemIds: ["item-4"],
    sellerId: "sel-kestrel",
    returnMethod: "courier",
    inspection: "failed",
    inspectionNote: "Item showed signs of use beyond normal inspection and was outside the 14-day return window.",
    refund: {
      state: "failed",
      method: "originalPayment",
      breakdown: {
        productAmount: usd(0),
        couponAdjustment: usd(0),
        shippingAdjustment: usd(0),
        taxAdjustment: usd(0),
        fees: usd(0),
        storeCredit: usd(0),
        total: usd(0),
      },
      failureReason: "Return did not meet return conditions.",
    },
  },
  {
    id: "RET-488201",
    orderId: "ord-5",
    orderNumber: "ORD-488201",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0.1),
    status: "requested",
    reason: "changedMind",
    resolution: "storeCredit",
    itemIds: ["item-7"],
    sellerId: "sel-kestrel",
    returnMethod: "selfShip",
    inspection: "notStarted",
  },
  {
    id: "RET-460017",
    orderId: "ord-6",
    orderNumber: "ORD-460017",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
    status: "refundPending",
    reason: "defective",
    resolution: "refund",
    itemIds: ["item-3"],
    sellerId: "sel-atlas",
    returnMethod: "pickup",
    inspection: "passed",
    refund: {
      state: "pending",
      method: "originalPayment",
      breakdown: {
        productAmount: usd(8900),
        couponAdjustment: usd(0),
        shippingAdjustment: usd(-499),
        taxAdjustment: usd(0),
        fees: usd(0),
        storeCredit: usd(0),
        total: usd(8401),
      },
      expectedBy: daysFromNow(3),
      reference: "RF-90213771",
    },
  },
  {
    id: "RET-455002",
    orderId: "ord-7",
    orderNumber: "ORD-455002",
    createdAt: daysAgo(75),
    updatedAt: daysAgo(70),
    status: "cancelled",
    reason: "changedMind",
    resolution: "refund",
    itemIds: ["item-2"],
    sellerId: "sel-nova",
    returnMethod: "dropoff",
    inspection: "notStarted",
  },
  {
    id: "RET-491044",
    orderId: "ord-8",
    orderNumber: "ORD-491044",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(0.5),
    status: "disputed",
    reason: "missingParts",
    reasonNote: "Refund amount received was lower than expected.",
    resolution: "refund",
    itemIds: ["item-1"],
    sellerId: "sel-nova",
    returnMethod: "pickup",
    inspection: "passed",
    refund: {
      state: "partiallyRefunded",
      method: "originalPayment",
      breakdown: {
        productAmount: usd(12999),
        couponAdjustment: usd(0),
        shippingAdjustment: usd(-899),
        taxAdjustment: usd(0),
        fees: usd(-300),
        storeCredit: usd(0),
        total: usd(11800),
      },
      reference: "RF-88120044",
    },
    notes: "Customer disputes shipping + fee deduction amount.",
  },
];

/* ============================================================================
 * 10. MONEY UTILITIES
 * ========================================================================== */

function formatMoney(money: Money): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: 2,
  }).format(money.amountMinor / 100);
}

function addMoney(a: Money, b: Money): Money {
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

function sumMoney(items: Money[], currency = "USD"): Money {
  return items.reduce((acc, m) => addMoney(acc, m), usd(0));
}

/* ============================================================================
 * 11. DATE / TIME UTILITIES
 * ========================================================================== */

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function formatShortDate(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

function formatRelativeTime(iso: string): string {
  if (!iso) return "—";
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86400000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / 3600000);
    return rtf.format(diffHours, "hour");
  }
  return rtf.format(diffDays, "day");
}

function isWithinDatePreset(iso: string, preset: DateFilterPreset): boolean {
  if (preset === "any" || preset === "custom") return true;
  const days = { last30: 30, last90: 90, last180: 180, lastYear: 365 }[preset];
  const diffDays = (Date.now() - new Date(iso).getTime()) / 86400000;
  return diffDays <= days;
}

/* ============================================================================
 * 12. ELIGIBILITY UTILITIES
 * ========================================================================== */

function eligibilityLabel(e: ItemEligibility): { label: string; explanation: string; tone: Tone } {
  switch (e.kind) {
    case "eligible":
      return { label: `Eligible until ${formatShortDate(e.until)}`, explanation: "This item can be returned before the window closes.", tone: "success" };
    case "windowExpired":
      return { label: "Return window expired", explanation: "The return period for this item has passed.", tone: "neutral" };
    case "finalSale":
      return { label: "Final sale", explanation: "This item was marked final sale at checkout and cannot be returned.", tone: "neutral" };
    case "nonReturnableCategory":
      return { label: "Non-returnable category", explanation: "Items in this category cannot be returned for hygiene or safety reasons.", tone: "neutral" };
    case "warrantyRequired":
      return { label: "Warranty claim required", explanation: "This item is past the return window but may qualify for a manufacturer warranty claim.", tone: "warning" };
  }
}

function isItemReturnable(e: ItemEligibility): boolean {
  return e.kind === "eligible";
}

/* ============================================================================
 * 13. STATUS UTILITIES
 * ========================================================================== */

function statusMeta(status: ReturnStatus) {
  return STATUS_META[status];
}

function refundStateLabel(state: RefundState): { label: string; tone: Tone } {
  const map: Record<RefundState, { label: string; tone: Tone }> = {
    notStarted: { label: "Not started", tone: "neutral" },
    pending: { label: "Pending", tone: "warning" },
    processing: { label: "Processing", tone: "info" },
    partiallyRefunded: { label: "Partially refunded", tone: "warning" },
    refunded: { label: "Refunded", tone: "success" },
    failed: { label: "Failed", tone: "danger" },
    reversed: { label: "Reversed", tone: "danger" },
  };
  return map[state];
}

/* ============================================================================
 * 14. REDUX STORE / SLICES
 * ========================================================================== */

interface UiState {
  activeTab: "all" | ReturnStatus;
  selectedReturnId: string | null;
  isFilterDrawerOpen: boolean;
  isReturnFlowOpen: boolean;
  isCancelDialogOpen: boolean;
  isIssueDialogOpen: boolean;
}

interface ReturnFlowState {
  step: ReturnFlowStep;
  selectedItemIds: string[];
  reason: ReturnReason | null;
  reasonNote: string;
  resolution: Resolution | null;
  returnMethod: ReturnMethod | null;
  pickupDate: string | null;
  pickupWindow: string | null;
}

const initialFilters: FilterState = {
  status: [],
  reason: [],
  resolution: [],
  refundMethod: [],
  date: "any",
  eligibilityOnly: false,
};

const searchSlice = createSlice({
  name: "search",
  initialState: { query: "" },
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
  initialState: initialFilters,
  reducers: {
    setStatusFilter(state, action: PayloadAction<ReturnStatus[]>) {
      state.status = action.payload;
    },
    setReasonFilter(state, action: PayloadAction<ReturnReason[]>) {
      state.reason = action.payload;
    },
    setResolutionFilter(state, action: PayloadAction<Resolution[]>) {
      state.resolution = action.payload;
    },
    setRefundMethodFilter(state, action: PayloadAction<RefundMethod[]>) {
      state.refundMethod = action.payload;
    },
    setDateFilter(state, action: PayloadAction<DateFilterPreset>) {
      state.date = action.payload;
    },
    setAmountRange(state, action: PayloadAction<{ min?: number; max?: number }>) {
      state.amountMin = action.payload.min;
      state.amountMax = action.payload.max;
    },
    setEligibilityOnly(state, action: PayloadAction<boolean>) {
      state.eligibilityOnly = action.payload;
    },
    removeFilter(state, action: PayloadAction<{ group: keyof FilterState; value?: string }>) {
      const { group, value } = action.payload;
      if (group === "status" && value) state.status = state.status.filter((s) => s !== value);
      if (group === "reason" && value) state.reason = state.reason.filter((s) => s !== value);
      if (group === "resolution" && value) state.resolution = state.resolution.filter((s) => s !== value);
      if (group === "refundMethod" && value) state.refundMethod = state.refundMethod.filter((s) => s !== value);
      if (group === "date") state.date = "any";
      if (group === "eligibilityOnly") state.eligibilityOnly = false;
    },
    clearFilters() {
      return initialFilters;
    },
  },
});

const sortSlice = createSlice({
  name: "sort",
  initialState: { option: "newest" as SortOption },
  reducers: {
    setSort(state, action: PayloadAction<SortOption>) {
      state.option = action.payload;
    },
  },
});

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    activeTab: "all",
    selectedReturnId: null,
    isFilterDrawerOpen: false,
    isReturnFlowOpen: false,
    isCancelDialogOpen: false,
    isIssueDialogOpen: false,
  } as UiState,
  reducers: {
    setActiveTab(state, action: PayloadAction<"all" | ReturnStatus>) {
      state.activeTab = action.payload;
    },
    selectReturn(state, action: PayloadAction<string>) {
      state.selectedReturnId = action.payload;
    },
    clearSelectedReturn(state) {
      state.selectedReturnId = null;
    },
    openFilterDrawer(state) {
      state.isFilterDrawerOpen = true;
    },
    closeFilterDrawer(state) {
      state.isFilterDrawerOpen = false;
    },
    openReturnFlow(state) {
      state.isReturnFlowOpen = true;
    },
    closeReturnFlow(state) {
      state.isReturnFlowOpen = false;
    },
    openCancelDialog(state) {
      state.isCancelDialogOpen = true;
    },
    closeCancelDialog(state) {
      state.isCancelDialogOpen = false;
    },
    openIssueDialog(state) {
      state.isIssueDialogOpen = true;
    },
    closeIssueDialog(state) {
      state.isIssueDialogOpen = false;
    },
  },
});

const initialFlow: ReturnFlowState = {
  step: "items",
  selectedItemIds: [],
  reason: null,
  reasonNote: "",
  resolution: null,
  returnMethod: null,
  pickupDate: null,
  pickupWindow: null,
};

const flowSlice = createSlice({
  name: "flow",
  initialState: initialFlow,
  reducers: {
    setReturnStep(state, action: PayloadAction<ReturnFlowStep>) {
      state.step = action.payload;
    },
    selectReturnItem(state, action: PayloadAction<string>) {
      if (!state.selectedItemIds.includes(action.payload)) {
        state.selectedItemIds.push(action.payload);
      }
    },
    deselectReturnItem(state, action: PayloadAction<string>) {
      state.selectedItemIds = state.selectedItemIds.filter((id) => id !== action.payload);
    },
    toggleSelectAll(state, action: PayloadAction<string[]>) {
      state.selectedItemIds =
        state.selectedItemIds.length === action.payload.length ? [] : action.payload;
    },
    setReturnReason(state, action: PayloadAction<{ reason: ReturnReason; note?: string }>) {
      state.reason = action.payload.reason;
      state.reasonNote = action.payload.note ?? "";
    },
    setResolution(state, action: PayloadAction<Resolution>) {
      state.resolution = action.payload;
    },
    setReturnMethod(state, action: PayloadAction<ReturnMethod>) {
      state.returnMethod = action.payload;
    },
    setPickupDate(state, action: PayloadAction<string>) {
      state.pickupDate = action.payload;
    },
    setPickupWindow(state, action: PayloadAction<string>) {
      state.pickupWindow = action.payload;
    },
    resetFlow() {
      return initialFlow;
    },
  },
});

export const {
  setSearchQuery,
  clearSearch,
} = searchSlice.actions;
export const {
  setStatusFilter,
  setReasonFilter,
  setResolutionFilter,
  setRefundMethodFilter,
  setDateFilter,
  setAmountRange,
  setEligibilityOnly,
  removeFilter,
  clearFilters,
} = filtersSlice.actions;
export const { setSort } = sortSlice.actions;
export const {
  setActiveTab,
  selectReturn,
  clearSelectedReturn,
  openFilterDrawer,
  closeFilterDrawer,
  openReturnFlow,
  closeReturnFlow,
  openCancelDialog,
  closeCancelDialog,
  openIssueDialog,
  closeIssueDialog,
} = uiSlice.actions;
export const {
  setReturnStep,
  selectReturnItem,
  deselectReturnItem,
  toggleSelectAll,
  setReturnReason,
  setResolution,
  setReturnMethod,
  setPickupDate,
  setPickupWindow,
  resetFlow,
} = flowSlice.actions;

const store = configureStore({
  reducer: {
    search: searchSlice.reducer,
    filters: filtersSlice.reducer,
    sort: sortSlice.reducer,
    ui: uiSlice.reducer,
    flow: flowSlice.reducer,
  },
});

type AppDispatch = typeof store.dispatch;
type AppState = ReturnType<typeof store.getState>;
const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;

/* ============================================================================
 * 15. REDUX SELECTORS
 * ========================================================================== */

const selectSearchQuery = (s: AppState) => s.search.query;
const selectFilters = (s: AppState) => s.filters;
const selectSortOption = (s: AppState) => s.sort.option;
const selectActiveTab = (s: AppState) => s.ui.activeTab;
const selectSelectedReturnId = (s: AppState) => s.ui.selectedReturnId;
const selectFlow = (s: AppState) => s.flow;

const selectFilteredReturns = createSelector(
  [selectSearchQuery, selectFilters, selectActiveTab, () => MOCK_RETURNS],
  (query, filters, activeTab, allReturns) => {
    const q = query.trim().toLowerCase();
    return allReturns.filter((r) => {
      if (activeTab !== "all" && r.status !== activeTab) return false;
      if (filters.status.length && !filters.status.includes(r.status)) return false;
      if (filters.reason.length && !filters.reason.includes(r.reason)) return false;
      if (filters.resolution.length && !filters.resolution.includes(r.resolution)) return false;
      if (
        filters.refundMethod.length &&
        (!r.refund || !filters.refundMethod.includes(r.refund.method))
      )
        return false;
      if (!isWithinDatePreset(r.createdAt, filters.date)) return false;
      if (filters.eligibilityOnly && r.status !== "eligible") return false;

      const total = r.refund?.breakdown.total.amountMinor;
      if (filters.amountMin != null && (total == null || total < filters.amountMin * 100)) return false;
      if (filters.amountMax != null && (total == null || total > filters.amountMax * 100)) return false;

      if (q) {
        const items = r.itemIds.map((id) => MOCK_ITEMS[id]);
        const seller = MOCK_SELLERS[r.sellerId];
        const haystack = [
          r.id,
          r.orderNumber,
          seller?.name ?? "",
          ...items.map((i) => i.productName),
          ...items.map((i) => i.sku),
          r.shipment?.trackingNumber ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  },
);

const selectSortedReturns = createSelector(
  [selectFilteredReturns, selectSortOption],
  (returns, sort) => {
    const copy = [...returns];
    switch (sort) {
      case "newest":
        return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      case "oldest":
        return copy.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
      case "amountHigh":
        return copy.sort(
          (a, b) => (b.refund?.breakdown.total.amountMinor ?? 0) - (a.refund?.breakdown.total.amountMinor ?? 0),
        );
      case "amountLow":
        return copy.sort(
          (a, b) => (a.refund?.breakdown.total.amountMinor ?? 0) - (b.refund?.breakdown.total.amountMinor ?? 0),
        );
      case "recentlyUpdated":
        return copy.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
      case "refundSoonest":
        return copy.sort((a, b) => {
          const ea = a.refund?.expectedBy ? +new Date(a.refund.expectedBy) : Infinity;
          const eb = b.refund?.expectedBy ? +new Date(b.refund.expectedBy) : Infinity;
          return ea - eb;
        });
      default:
        return copy;
    }
  },
);

const selectReturnById = (id: string | null) => (allReturns: ReturnRequest[]) =>
  allReturns.find((r) => r.id === id) ?? null;

const selectSummary = createSelector([() => MOCK_RETURNS], (allReturns) => {
  const active = allReturns.filter((r) =>
    ["requested", "underReview", "approved", "pickupScheduled", "pickupAttempted", "inTransit", "received", "underInspection"].includes(
      r.status,
    ),
  ).length;
  const refundPending = allReturns.filter((r) => r.status === "refundPending" || r.status === "partiallyRefunded").length;
  const completed = allReturns.filter((r) => r.status === "refunded" || r.status === "replacementDelivered").length;
  return { active, refundPending, completed };
});

const selectActiveFilterCount = createSelector([selectFilters], (f) => {
  return (
    f.status.length +
    f.reason.length +
    f.resolution.length +
    f.refundMethod.length +
    (f.date !== "any" ? 1 : 0) +
    (f.eligibilityOnly ? 1 : 0) +
    (f.amountMin != null || f.amountMax != null ? 1 : 0)
  );
});

/* ============================================================================
 * 16. UI PRIMITIVES
 * ========================================================================== */

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm" };
  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
    ghost: "hover:bg-accent text-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
    outline: "border border-border text-foreground hover:bg-accent",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border border-border bg-card text-card-foreground shadow-xs ${className}`}>
      {children}
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-border bg-card p-6 shadow-lg sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="dialog-title" className="text-base font-semibold">
            {title}
          </h2>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ============================================================================
 * 17. ECOMMERCE HEADER
 * ========================================================================== */

function EcommerceHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <div className="hidden bg-primary py-1.5 text-center text-xs text-primary-foreground sm:block">
        Free returns on eligible items within 30 days of delivery
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <a href="#main-content" className="text-lg font-semibold tracking-tight">
          Meridian
        </a>
        <div className="hidden flex-1 items-center md:flex">
          <label htmlFor="global-search" className="sr-only">
            Search products
          </label>
          <input
            id="global-search"
            type="search"
            placeholder="Search products, brands and categories"
            className="w-full max-w-xl rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <nav aria-label="Account" className="ml-auto flex items-center gap-4 text-sm">
          <a href="#" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Orders
          </a>
          <a href="#" aria-current="page" className="font-medium text-foreground">
            Returns
          </a>
          <a href="#" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Cart
          </a>
        </nav>
      </div>
    </header>
  );
}

/* ============================================================================
 * 18. BREADCRUMBS
 * ========================================================================== */

function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-4 text-xs text-muted-foreground sm:px-6">
      <ol className="flex items-center gap-1.5">
        <li>
          <a href="#" className="hover:text-foreground">
            Account
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <a href="#" className="hover:text-foreground">
            Orders
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="font-medium text-foreground">
          Returns &amp; Refunds
        </li>
      </ol>
    </nav>
  );
}

/* ============================================================================
 * 19. RETURNS HEADER (title + summary + actions)
 * ========================================================================== */

function ReturnsHeader() {
  const dispatch = useAppDispatch();
  const summary = useAppSelector(() => selectSummary(store.getState()));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Returns &amp; Refunds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your returns, replacements and refunds
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-info-subtle px-2.5 py-1 font-medium text-info">
            {summary.active} active return{summary.active === 1 ? "" : "s"}
          </span>
          <span className="rounded-full bg-warning-subtle px-2.5 py-1 font-medium text-warning">
            {summary.refundPending} refund pending
          </span>
          <span className="rounded-full bg-success-subtle px-2.5 py-1 font-medium text-success">
            {summary.completed} completed
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm">
          View return policy
        </Button>
        <Button variant="outline" size="sm">
          Contact support
        </Button>
        <Button variant="primary" size="sm" onClick={() => dispatch(openReturnFlow())}>
          Start a return
        </Button>
      </div>
    </div>
  );
}

/* ============================================================================
 * 20. STATUS NAVIGATION
 * ========================================================================== */

function ReturnsNavigation() {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(selectActiveTab);

  const counts = useMemo(() => {
    const map: Partial<Record<"all" | ReturnStatus, number>> = { all: MOCK_RETURNS.length };
    for (const r of MOCK_RETURNS) {
      map[r.status] = (map[r.status] ?? 0) + 1;
    }
    return map;
  }, []);

  return (
    <div
      role="tablist"
      aria-label="Filter returns by status"
      className="scrollbar-none mx-auto mt-4 flex max-w-7xl gap-1 overflow-x-auto border-b border-border px-4 sm:px-6"
    >
      {STATUS_TABS.map((tab) => {
        const selected = activeTab === tab.key;
        const count = counts[tab.key];
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={selected}
            aria-current={selected ? "page" : undefined}
            onClick={() => dispatch(setActiveTab(tab.key))}
            className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              selected
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {!!count && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================================
 * 21. SEARCH / FILTER TOOLBAR
 * ========================================================================== */

function ReturnsToolbar() {
  const dispatch = useAppDispatch();
  const query = useAppSelector(selectSearchQuery);
  const sort = useAppSelector(selectSortOption);
  const filterCount = useAppSelector(selectActiveFilterCount);

  return (
    <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:px-6">
      <div className="relative flex-1">
        <label htmlFor="return-search" className="sr-only">
          Search returns and refunds
        </label>
        <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          id="return-search"
          type="search"
          value={query}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          placeholder="Order number, product or return ID"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        {query && (
          <button
            aria-label="Clear search"
            onClick={() => dispatch(clearSearch())}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch(openFilterDrawer())}
          aria-haspopup="dialog"
        >
          Filters
          {filterCount > 0 && (
            <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[11px] text-primary-foreground">
              {filterCount}
            </span>
          )}
        </Button>

        <label htmlFor="sort-select" className="sr-only">
          Sort returns
        </label>
        <select
          id="sort-select"
          value={sort}
          onChange={(e) => dispatch(setSort(e.target.value as SortOption))}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="amountHigh">Highest refund amount</option>
          <option value="amountLow">Lowest refund amount</option>
          <option value="recentlyUpdated">Recently updated</option>
          <option value="refundSoonest">Refund soonest</option>
        </select>
      </div>
    </div>
  );
}

function ActiveFilterChips() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);

  const chips: { label: string; onRemove: () => void }[] = [
    ...filters.status.map((s) => ({
      label: STATUS_META[s].label,
      onRemove: () => dispatch(removeFilter({ group: "status", value: s })),
    })),
    ...filters.reason.map((r) => ({
      label: REASON_LABEL[r],
      onRemove: () => dispatch(removeFilter({ group: "reason", value: r })),
    })),
    ...filters.resolution.map((r) => ({
      label: RESOLUTION_LABEL[r],
      onRemove: () => dispatch(removeFilter({ group: "resolution", value: r })),
    })),
    ...filters.refundMethod.map((r) => ({
      label: REFUND_METHOD_LABEL[r],
      onRemove: () => dispatch(removeFilter({ group: "refundMethod", value: r })),
    })),
    ...(filters.date !== "any"
      ? [{ label: filters.date, onRemove: () => dispatch(removeFilter({ group: "date" })) }]
      : []),
    ...(filters.eligibilityOnly
      ? [{ label: "Return eligible", onRemove: () => dispatch(removeFilter({ group: "eligibilityOnly" })) }]
      : []),
  ];

  if (!chips.length) return null;

  return (
    <div className="mx-auto mt-3 flex max-w-7xl flex-wrap items-center gap-2 px-4 sm:px-6">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
        >
          {chip.label}
          <button aria-label={`Remove ${chip.label} filter`} onClick={chip.onRemove} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </span>
      ))}
      <button
        onClick={() => dispatch(clearFilters())}
        className="text-xs font-medium text-primary hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}

/* ============================================================================
 * 22. FILTER DRAWER
 * ========================================================================== */

function FilterDrawer() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.ui.isFilterDrawerOpen);
  const filters = useAppSelector(selectFilters);

  if (!isOpen) return null;

  function toggleInArray<T extends string>(arr: T[], value: T): T[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-foreground/40" role="presentation" onClick={() => dispatch(closeFilterDrawer())}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filter returns"
        className="h-full w-full max-w-sm overflow-y-auto bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Filters</h2>
          <button aria-label="Close filters" onClick={() => dispatch(closeFilterDrawer())} className="rounded-md p-1 hover:bg-accent">
            ✕
          </button>
        </div>

        <FilterGroup title="Status">
          {(Object.keys(STATUS_META) as ReturnStatus[]).map((s) => (
            <FilterCheckbox
              key={s}
              label={STATUS_META[s].label}
              checked={filters.status.includes(s)}
              onChange={() => dispatch(setStatusFilter(toggleInArray(filters.status, s)))}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Date">
          <select
            value={filters.date}
            onChange={(e) => dispatch(setDateFilter(e.target.value as DateFilterPreset))}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="any">Any time</option>
            <option value="last30">Last 30 days</option>
            <option value="last90">Last 3 months</option>
            <option value="last180">Last 6 months</option>
            <option value="lastYear">Last year</option>
            <option value="custom">Custom range</option>
          </select>
        </FilterGroup>

        <FilterGroup title="Return reason">
          {RETURN_REASONS.map((r) => (
            <FilterCheckbox
              key={r}
              label={REASON_LABEL[r]}
              checked={filters.reason.includes(r)}
              onChange={() => dispatch(setReasonFilter(toggleInArray(filters.reason, r)))}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Resolution">
          {(Object.keys(RESOLUTION_LABEL) as Resolution[]).map((r) => (
            <FilterCheckbox
              key={r}
              label={RESOLUTION_LABEL[r]}
              checked={filters.resolution.includes(r)}
              onChange={() => dispatch(setResolutionFilter(toggleInArray(filters.resolution, r)))}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Refund method">
          {(Object.keys(REFUND_METHOD_LABEL) as RefundMethod[]).map((r) => (
            <FilterCheckbox
              key={r}
              label={REFUND_METHOD_LABEL[r]}
              checked={filters.refundMethod.includes(r)}
              onChange={() => dispatch(setRefundMethodFilter(toggleInArray(filters.refundMethod, r)))}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Refund amount">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.amountMin ?? ""}
              onChange={(e) =>
                dispatch(setAmountRange({ min: e.target.value ? Number(e.target.value) : undefined, max: filters.amountMax }))
              }
              className="w-1/2 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.amountMax ?? ""}
              onChange={(e) =>
                dispatch(setAmountRange({ min: filters.amountMin, max: e.target.value ? Number(e.target.value) : undefined }))
              }
              className="w-1/2 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </FilterGroup>

        <FilterGroup title="Eligibility">
          <FilterCheckbox
            label="Return eligible only"
            checked={filters.eligibilityOnly}
            onChange={() => dispatch(setEligibilityOnly(!filters.eligibilityOnly))}
          />
        </FilterGroup>

        <div className="sticky bottom-0 mt-6 flex gap-2 bg-card pt-2">
          <Button variant="outline" className="flex-1" onClick={() => dispatch(clearFilters())}>
            Clear all
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => dispatch(closeFilterDrawer())}>
            Show results
          </Button>
        </div>
      </aside>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-5 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-2 text-sm font-medium">{title}</legend>
      <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">{children}</div>
    </fieldset>
  );
}

function FilterCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-input accent-[var(--color-primary)]" />
      {label}
    </label>
  );
}

/* ============================================================================
 * 23–24. RETURN LIST + RETURN CARD
 * ========================================================================== */

function ReturnList({ returns, isLoading, error, onRetry }: { returns: ReturnRequest[]; isLoading: boolean; error: string | null; onRetry: () => void }) {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector(selectSelectedReturnId);
  const query = useAppSelector(selectSearchQuery);
  const filterCount = useAppSelector(selectActiveFilterCount);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading returns">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="mb-2 h-4 w-32" />
            <Skeleton className="mb-3 h-3 w-48" />
            <Skeleton className="h-16 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm font-medium">Unable to load returns</p>
        <p className="text-sm text-muted-foreground">Something went wrong while loading your returns.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </Card>
    );
  }

  if (!returns.length && (query || filterCount)) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm font-medium">No returns found</p>
        <p className="text-sm text-muted-foreground">Try another return ID, order number or product name.</p>
        <div className="flex gap-2">
          {query && (
            <Button variant="outline" size="sm" onClick={() => dispatch(clearSearch())}>
              Clear search
            </Button>
          )}
          {filterCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => dispatch(clearFilters())}>
              Clear filters
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (!returns.length) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-sm font-medium">No returns or refunds</p>
        <p className="text-sm text-muted-foreground">Your return and refund activity will appear here.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm">
            View orders
          </Button>
          <Button variant="outline" size="sm">
            Start shopping
          </Button>
          <Button variant="ghost" size="sm">
            View return policy
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-3" aria-label="Returns list">
      {returns.map((r) => (
        <li key={r.id}>
          <ReturnCard
            returnRequest={r}
            selected={r.id === selectedId}
            onSelect={() => dispatch(selectReturn(r.id))}
          />
        </li>
      ))}
    </ul>
  );
}

function ReturnCard({
  returnRequest,
  selected,
  onSelect,
}: {
  returnRequest: ReturnRequest;
  selected: boolean;
  onSelect: () => void;
}) {
  const dispatch = useAppDispatch();
  const meta = statusMeta(returnRequest.status);
  const items = returnRequest.itemIds.map((id) => MOCK_ITEMS[id]);
  const seller = MOCK_SELLERS[returnRequest.sellerId];
  const refundTotal = returnRequest.refund?.breakdown.total;

  const canCancel = ["requested", "underReview", "approved", "pickupScheduled"].includes(returnRequest.status);

  return (
    <Card
      className={`w-full cursor-pointer p-4 text-left transition-colors hover:border-primary/40 ${
        selected ? "border-primary ring-1 ring-primary" : ""
      }`}
    >
      <button className="w-full text-left" onClick={onSelect} aria-expanded={selected} aria-controls={`details-${returnRequest.id}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Return #{returnRequest.id}</p>
            <p className="text-xs text-muted-foreground">Order #{returnRequest.orderNumber}</p>
          </div>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
            {items[0]?.imageLabel}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{items[0]?.productName}</p>
            <p className="text-xs text-muted-foreground">
              {items.length > 1 ? `+${items.length - 1} more item${items.length - 1 === 1 ? "" : "s"} · ` : ""}
              {RESOLUTION_LABEL[returnRequest.resolution]} · {REASON_LABEL[returnRequest.reason]}
            </p>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
          <div>
            <dt className="sr-only">Return date</dt>
            <dd>{formatDate(returnRequest.createdAt)}</dd>
          </div>
          <div>
            <dt className="sr-only">Seller</dt>
            <dd>{seller?.name}</dd>
          </div>
          <div>
            <dt className="sr-only">Refund amount</dt>
            <dd className="font-medium text-foreground">{refundTotal ? formatMoney(refundTotal) : "—"}</dd>
          </div>
          <div>
            <dt className="sr-only">Last updated</dt>
            <dd>Updated {formatRelativeTime(returnRequest.updatedAt)}</dd>
          </div>
        </dl>
      </button>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        <Button size="sm" variant="outline" onClick={onSelect}>
          View details
        </Button>
        {returnRequest.shipment && (
          <Button size="sm" variant="ghost">
            Track return
          </Button>
        )}
        {returnRequest.refund && returnRequest.refund.state !== "notStarted" && (
          <Button size="sm" variant="ghost">
            View refund
          </Button>
        )}
        {canCancel && (
          <Button size="sm" variant="ghost" onClick={() => dispatch(openCancelDialog())}>
            Cancel return
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ============================================================================
 * 25–30. RETURN DETAILS (overview, items, tracking, inspection, refund, replacement)
 * ========================================================================== */

function ReturnDetailsPanel({ returnRequest }: { returnRequest: ReturnRequest | null }) {
  const dispatch = useAppDispatch();

  if (!returnRequest) {
    return (
      <Card className="hidden h-full min-h-[24rem] items-center justify-center p-8 text-center lg:flex">
        <p className="text-sm text-muted-foreground">Select a return to view its details.</p>
      </Card>
    );
  }

  const seller = MOCK_SELLERS[returnRequest.sellerId];

  return (
    <section id={`details-${returnRequest.id}`} aria-label={`Details for return ${returnRequest.id}`} className="flex flex-col gap-4">
      <ReturnOverview returnRequest={returnRequest} />
      <ReturnedItems returnRequest={returnRequest} />
      <ReturnReasonSection returnRequest={returnRequest} />
      {returnRequest.pickup && <PickupInformation pickup={returnRequest.pickup} />}
      {returnRequest.dropoff && <DropoffInformation dropoff={returnRequest.dropoff} />}
      {returnRequest.shipment && <ReturnTracking shipment={returnRequest.shipment} />}
      <InspectionStatus returnRequest={returnRequest} />
      {returnRequest.refund && <RefundSection refund={returnRequest.refund} />}
      {returnRequest.replacement && <ReplacementSection replacement={returnRequest.replacement} />}

      <Card className="p-4">
        <h3 className="mb-1 text-sm font-semibold">Seller</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">{seller?.name}</p>
            <p className="text-xs text-muted-foreground">
              {seller?.verified ? "Verified seller" : "Unverified seller"} · {seller?.rating.toFixed(1)} rating · {seller?.returnWindowDays}-day return window
            </p>
          </div>
          <Button size="sm" variant="outline">
            Contact seller
          </Button>
        </div>
      </Card>

      <Card className="flex flex-wrap gap-2 p-4">
        <Button size="sm" variant="outline">
          Upload information
        </Button>
        <Button size="sm" variant="outline" onClick={() => dispatch(openIssueDialog())}>
          Report an issue
        </Button>
        {["requested", "underReview", "approved", "pickupScheduled"].includes(returnRequest.status) && (
          <Button size="sm" variant="destructive" onClick={() => dispatch(openCancelDialog())}>
            Cancel return
          </Button>
        )}
      </Card>
    </section>
  );
}

function ReturnOverview({ returnRequest }: { returnRequest: ReturnRequest }) {
  const meta = statusMeta(returnRequest.status);
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Return #{returnRequest.id}</h2>
          <p className="text-xs text-muted-foreground">Order #{returnRequest.orderNumber} · Requested {formatDate(returnRequest.createdAt)}</p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{meta.description}</p>
    </Card>
  );
}

function ReturnedItems({ returnRequest }: { returnRequest: ReturnRequest }) {
  const items = returnRequest.itemIds.map((id) => MOCK_ITEMS[id]);
  const itemStatusMeta: Record<ItemStatus, { label: string; tone: Tone }> = {
    pendingReturn: { label: "Return pending", tone: "pending" },
    refundApproved: { label: "Refund approved", tone: "success" },
    inspectionPending: { label: "Inspection pending", tone: "warning" },
    rejected: { label: "Rejected", tone: "danger" },
    replacementIssued: { label: "Replacement issued", tone: "info" },
    retained: { label: "Not returned", tone: "neutral" },
  };

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Returned items</h3>
      <ul className="flex flex-col divide-y divide-border">
        {items.map((item) => {
          const status = itemStatusMeta[item.itemStatus];
          return (
            <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                {item.imageLabel}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.brand} · {[item.variant.color, item.variant.size, item.variant.storage].filter(Boolean).join(" · ")}
                  {item.variant.color || item.variant.size || item.variant.storage ? " · " : ""}
                  Qty {item.quantity}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">SKU {item.sku}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {isItemReturnable(item.eligibility) ? "Refund eligible" : eligibilityLabel(item.eligibility).label}
                  </span>
                </div>
              </div>
              <p className="shrink-0 text-sm font-medium">{formatMoney(item.refundableAmount)}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ReturnReasonSection({ returnRequest }: { returnRequest: ReturnRequest }) {
  return (
    <Card className="p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-semibold">Reason for return</h3>
          <p className="text-sm">{REASON_LABEL[returnRequest.reason]}</p>
          {returnRequest.reasonNote && (
            <p className="mt-1 rounded-md bg-muted p-2 text-xs italic text-muted-foreground">
              &ldquo;{returnRequest.reasonNote}&rdquo;
            </p>
          )}
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold">Resolution</h3>
          <p className="text-sm">{RESOLUTION_LABEL[returnRequest.resolution]}</p>
          <p className="text-xs text-muted-foreground">
            {returnRequest.resolution === "refund" && "Refund to original payment method"}
            {returnRequest.resolution === "replacement" && "New item will be shipped after inspection"}
            {returnRequest.resolution === "exchange" && "Item will be exchanged for the selected variant"}
            {returnRequest.resolution === "storeCredit" && "Value will be issued as store credit"}
          </p>
        </div>
      </div>
    </Card>
  );
}

function PickupInformation({ pickup }: { pickup: PickupInfo }) {
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-semibold">Pickup</h3>
      <p className="text-sm">
        {formatDate(pickup.date)} · {pickup.windowStart} – {pickup.windowEnd}
      </p>
      <p className="text-xs text-muted-foreground">{pickup.address.line1}, {pickup.address.city}</p>
      {pickup.instructions && <p className="mt-1 text-xs text-muted-foreground">{pickup.instructions}</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline">
          Reschedule
        </Button>
        <Button size="sm" variant="ghost">
          Cancel pickup
        </Button>
      </div>
    </Card>
  );
}

function DropoffInformation({ dropoff }: { dropoff: DropoffInfo }) {
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-semibold">Drop-off</h3>
      <p className="text-sm">{dropoff.locationName}</p>
      <p className="text-xs text-muted-foreground">
        {dropoff.address.line1}, {dropoff.address.city} · {dropoff.distanceKm} km away
      </p>
      <p className="text-xs text-muted-foreground">Open {dropoff.hours}</p>
      {dropoff.instructions && <p className="mt-1 text-xs text-muted-foreground">{dropoff.instructions}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline">
          View label
        </Button>
        <Button size="sm" variant="outline">
          Download label
        </Button>
        <Button size="sm" variant="ghost">
          Print label
        </Button>
      </div>
    </Card>
  );
}

function ReturnTracking({ shipment }: { shipment: Shipment }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Return tracking</h3>
        <p className="text-xs text-muted-foreground">
          {shipment.carrier} · {shipment.trackingNumber}
        </p>
      </div>
      {shipment.currentLocation && (
        <p className="mb-3 text-xs text-muted-foreground">
          Currently at {shipment.currentLocation}
          {shipment.eta && ` · Expected ${formatRelativeTime(shipment.eta)}`}
        </p>
      )}
      <ol className="flex flex-col gap-0" aria-label="Return tracking timeline">
        {shipment.events.map((event, i) => (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  event.exception
                    ? "bg-danger"
                    : event.completed
                      ? "bg-success"
                      : event.current
                        ? "bg-info"
                        : "bg-border"
                }`}
              />
              {i < shipment.events.length - 1 && <span aria-hidden="true" className="w-px flex-1 bg-border" />}
            </div>
            <div className={`pb-4 ${event.completed || event.current ? "" : "opacity-50"}`}>
              <p className="text-sm font-medium">
                {event.title}
                {event.current && (
                  <span className="ml-2 align-middle text-xs font-normal text-info" aria-live="polite">
                    In progress
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{event.description}</p>
              {event.location && <p className="text-xs text-muted-foreground">{event.location}</p>}
              {event.timestamp && <p className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function InspectionStatus({ returnRequest }: { returnRequest: ReturnRequest }) {
  const stateMeta: Record<InspectionState, { label: string; tone: Tone; description: string }> = {
    notStarted: { label: "Not started", tone: "neutral", description: "Inspection will begin once the item is received." },
    pending: { label: "Pending", tone: "warning", description: "Your item is waiting to be inspected." },
    inProgress: { label: "In progress", tone: "warning", description: returnRequest.inspectionNote ?? "Your returned item has been received. Inspection usually takes 1–2 business days." },
    passed: { label: "Passed", tone: "success", description: "Your item passed inspection." },
    partiallyApproved: { label: "Partially approved", tone: "warning", description: "Part of your return was approved after inspection." },
    failed: { label: "Not approved", tone: "danger", description: returnRequest.inspectionNote ?? "The item did not meet the return conditions." },
  };
  const meta = stateMeta[returnRequest.inspection];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Inspection</h3>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{meta.description}</p>
      {returnRequest.inspection === "failed" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline">
            View reason
          </Button>
          <Button size="sm" variant="ghost">
            Contact support
          </Button>
        </div>
      )}
    </Card>
  );
}

function RefundSection({ refund }: { refund: Refund }) {
  const meta = refundStateLabel(refund.state);
  const b = refund.breakdown;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Refund</h3>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <p className="mt-2 text-2xl font-semibold">{formatMoney(b.total)}</p>
      <p className="text-sm text-muted-foreground">{REFUND_METHOD_LABEL[refund.method]}</p>
      {refund.expectedBy && <p className="text-xs text-muted-foreground">Expected by {formatDate(refund.expectedBy)}</p>}
      {refund.completedAt && <p className="text-xs text-muted-foreground">Completed {formatDate(refund.completedAt)}</p>}
      {refund.reference && <p className="text-xs text-muted-foreground">Reference {refund.reference}</p>}

      {refund.state === "failed" && (
        <div className="mt-3 rounded-md bg-danger-subtle p-3">
          <p className="text-sm font-medium text-danger">Refund couldn&apos;t be completed</p>
          <p className="mt-0.5 text-xs text-danger">
            {refund.failureReason ?? "We couldn't send the refund to your original payment method."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              Try again
            </Button>
            <Button size="sm" variant="outline">
              Choose another method
            </Button>
            <Button size="sm" variant="ghost">
              Contact support
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Refund breakdown
        </h4>
        <dl className="flex flex-col gap-1.5 text-sm">
          <BreakdownRow label="Product amount" value={b.productAmount} />
          {b.couponAdjustment.amountMinor !== 0 && <BreakdownRow label="Coupon adjustment" value={b.couponAdjustment} />}
          {b.shippingAdjustment.amountMinor !== 0 && (
            <BreakdownRow label="Non-refundable shipping" value={b.shippingAdjustment} />
          )}
          {b.taxAdjustment.amountMinor !== 0 && <BreakdownRow label="Tax adjustment" value={b.taxAdjustment} />}
          {b.fees.amountMinor !== 0 && <BreakdownRow label="Fees" value={b.fees} />}
          {b.storeCredit.amountMinor !== 0 && <BreakdownRow label="Store credit" value={b.storeCredit} />}
          <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 font-medium">
            <dt>Refund total</dt>
            <dd>{formatMoney(b.total)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

function BreakdownRow({ label, value }: { label: string; value: Money }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className={value.amountMinor < 0 ? "text-danger" : ""}>{formatMoney(value)}</dd>
    </div>
  );
}

function ReplacementSection({ replacement }: { replacement: Replacement }) {
  const statusLabel: Record<Replacement["status"], string> = {
    requested: "Requested",
    approved: "Approved",
    processing: "Processing",
    packed: "Packed",
    shipped: "Shipped",
    outForDelivery: "Out for delivery",
    delivered: "Delivered",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Replacement</h3>
        <Badge tone={replacement.status === "delivered" ? "success" : "info"}>{statusLabel[replacement.status]}</Badge>
      </div>
      <p className="mt-2 text-sm">{replacement.productName}</p>
      <p className="text-xs text-muted-foreground">
        {[replacement.variant.color, replacement.variant.size, replacement.variant.storage].filter(Boolean).join(" · ")}
      </p>
      {replacement.trackingNumber && <p className="mt-1 text-xs text-muted-foreground">Tracking {replacement.trackingNumber}</p>}
      {replacement.eta && <p className="text-xs text-muted-foreground">Estimated delivery {formatDate(replacement.eta)}</p>}
      {replacement.priceDifference && replacement.priceDifference.amountMinor !== 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Price difference: {formatMoney(replacement.priceDifference)}
        </p>
      )}
    </Card>
  );
}

/* ============================================================================
 * 31. RETURN INITIATION FLOW (multi-step dialog)
 * ========================================================================== */

const ELIGIBLE_ITEM_IDS = Object.values(MOCK_ITEMS)
  .filter((i) => isItemReturnable(i.eligibility))
  .map((i) => i.id);

function ReturnInitiationFlow() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.ui.isReturnFlowOpen);
  const flow = useAppSelector(selectFlow);
  const [otherReasonText, setOtherReasonText] = useState("");

  const close = useCallback(() => {
    dispatch(closeReturnFlow());
    dispatch(resetFlow());
    setOtherReasonText("");
  }, [dispatch]);

  if (!isOpen) return null;

  const stepIndex = FLOW_STEPS.findIndex((s) => s.key === flow.step);
  const selectedItems = flow.selectedItemIds.map((id) => MOCK_ITEMS[id]);
  const refundEstimate = sumMoney(selectedItems.map((i) => i.refundableAmount));

  function goNext() {
    const order: ReturnFlowStep[] = ["items", "reason", "resolution", "method", "review", "submitted"];
    const idx = order.indexOf(flow.step);
    if (idx < order.length - 1) dispatch(setReturnStep(order[idx + 1]));
  }
  function goBack() {
    const order: ReturnFlowStep[] = ["items", "reason", "resolution", "method", "review", "submitted"];
    const idx = order.indexOf(flow.step);
    if (idx > 0) dispatch(setReturnStep(order[idx - 1]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center" role="presentation" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-lg border border-border bg-card shadow-lg sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 id="flow-title" className="text-base font-semibold">
            Start a return
          </h2>
          <button aria-label="Close" onClick={close} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <ol className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Return steps">
            {FLOW_STEPS.slice(0, 5).map((s, i) => (
              <li key={s.key} className={`flex items-center gap-1 ${i <= stepIndex ? "font-medium text-foreground" : ""}`}>
                {s.label}
                {i < 4 && <span aria-hidden="true">→</span>}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {flow.step === "items" && (
            <fieldset>
              <legend className="mb-3 text-sm font-medium">Select items to return</legend>
              <div className="mb-3 flex items-center justify-between">
                <button
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => dispatch(toggleSelectAll(ELIGIBLE_ITEM_IDS))}
                >
                  Select all eligible
                </button>
              </div>
              <ul className="flex flex-col gap-2">
                {Object.values(MOCK_ITEMS).map((item) => {
                  const eligible = isItemReturnable(item.eligibility);
                  const checked = flow.selectedItemIds.includes(item.id);
                  return (
                    <li key={item.id} className={`flex items-center gap-3 rounded-md border border-border p-3 ${!eligible ? "opacity-60" : ""}`}>
                      <input
                        type="checkbox"
                        disabled={!eligible}
                        checked={checked}
                        onChange={() =>
                          dispatch(checked ? deselectReturnItem(item.id) : selectReturnItem(item.id))
                        }
                        aria-describedby={`elig-${item.id}`}
                        className="h-4 w-4 rounded border-input accent-[var(--color-primary)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.productName}</p>
                        <p id={`elig-${item.id}`} className="text-xs text-muted-foreground">
                          {eligible ? "Return eligible" : eligibilityLabel(item.eligibility).label}
                        </p>
                      </div>
                      <p className="text-sm">{formatMoney(item.refundableAmount)}</p>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          )}

          {flow.step === "reason" && (
            <fieldset>
              <legend className="mb-3 text-sm font-medium">Why are you returning these items?</legend>
              <div className="grid grid-cols-2 gap-2">
                {RETURN_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`cursor-pointer rounded-md border p-2.5 text-sm ${
                      flow.reason === r ? "border-primary bg-accent" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      className="sr-only"
                      checked={flow.reason === r}
                      onChange={() => dispatch(setReturnReason({ reason: r, note: flow.reasonNote }))}
                    />
                    {REASON_LABEL[r]}
                  </label>
                ))}
              </div>
              {flow.reason === "other" && (
                <div className="mt-3">
                  <label htmlFor="other-reason" className="mb-1 block text-xs font-medium">
                    Please describe the issue
                  </label>
                  <textarea
                    id="other-reason"
                    value={otherReasonText}
                    onChange={(e) => {
                      setOtherReasonText(e.target.value);
                      dispatch(setReturnReason({ reason: "other", note: e.target.value }));
                    }}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              )}
              <div className="mt-4">
                <p className="mb-1 text-xs font-medium">Add photos (optional)</p>
                <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  Add photos · Maximum 5 · JPG or PNG
                </div>
              </div>
            </fieldset>
          )}

          {flow.step === "resolution" && (
            <fieldset>
              <legend className="mb-3 text-sm font-medium">Choose your resolution</legend>
              <div className="flex flex-col gap-2">
                {(Object.keys(RESOLUTION_LABEL) as Resolution[]).map((r) => (
                  <label
                    key={r}
                    className={`flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm ${
                      flow.resolution === r ? "border-primary bg-accent" : "border-border"
                    }`}
                  >
                    <span>
                      <input
                        type="radio"
                        name="resolution"
                        className="sr-only"
                        checked={flow.resolution === r}
                        onChange={() => dispatch(setResolution(r))}
                      />
                      <span className="font-medium">{RESOLUTION_LABEL[r]}</span>
                      <span className="block text-xs text-muted-foreground">
                        {r === "refund" && "Usually 3–5 business days"}
                        {r === "replacement" && "Ships after inspection"}
                        {r === "exchange" && "Subject to variant availability"}
                        {r === "storeCredit" && "Available immediately after approval"}
                      </span>
                    </span>
                    {r === "refund" && <span className="text-sm font-medium">{formatMoney(refundEstimate)}</span>}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {flow.step === "method" && (
            <fieldset>
              <legend className="mb-3 text-sm font-medium">Choose a return method</legend>
              <div className="flex flex-col gap-2">
                {(["pickup", "dropoff", "courier", "selfShip"] as ReturnMethod[]).map((m) => (
                  <label
                    key={m}
                    className={`flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm ${
                      flow.returnMethod === m ? "border-primary bg-accent" : "border-border"
                    }`}
                  >
                    <span>
                      <input
                        type="radio"
                        name="method"
                        className="sr-only"
                        checked={flow.returnMethod === m}
                        onChange={() => dispatch(setReturnMethod(m))}
                      />
                      <span className="font-medium">{RETURN_METHOD_LABEL[m]}</span>
                      <span className="block text-xs text-muted-foreground">
                        {m === "pickup" && "Free pickup · Tomorrow, 10 AM – 2 PM"}
                        {m === "dropoff" && "Nearest partner location · 3.2 km away"}
                        {m === "courier" && "Prepaid courier label provided"}
                        {m === "selfShip" && "Ship at your own cost, reimbursed on approval"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {flow.returnMethod === "pickup" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-xs">
                    Pickup date
                    <input
                      type="date"
                      className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
                      onChange={(e) => dispatch(setPickupDate(e.target.value))}
                    />
                  </label>
                  <label className="text-xs">
                    Time window
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm"
                      onChange={(e) => dispatch(setPickupWindow(e.target.value))}
                    >
                      <option value="10-14">10:00 AM – 2:00 PM</option>
                      <option value="14-18">2:00 PM – 6:00 PM</option>
                    </select>
                  </label>
                </div>
              )}
            </fieldset>
          )}

          {flow.step === "review" && (
            <div className="flex flex-col gap-3 text-sm">
              <h3 className="text-sm font-medium">Review your request</h3>
              <ReviewRow label="Items" value={`${flow.selectedItemIds.length} item(s)`} />
              <ReviewRow label="Reason" value={flow.reason ? REASON_LABEL[flow.reason] : "—"} />
              <ReviewRow label="Resolution" value={flow.resolution ? RESOLUTION_LABEL[flow.resolution] : "—"} />
              <ReviewRow label="Return method" value={flow.returnMethod ? RETURN_METHOD_LABEL[flow.returnMethod] : "—"} />
              <ReviewRow label="Estimated refund" value={formatMoney(refundEstimate)} />
            </div>
          )}

          {flow.step === "submitted" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-subtle text-success" aria-hidden="true">
                ✓
              </div>
              <h3 className="text-base font-semibold">Return request submitted</h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ve emailed you a confirmation. You can track this return from the Returns &amp; Refunds page.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 border-t border-border p-4">
          {flow.step !== "items" && flow.step !== "submitted" ? (
            <Button variant="outline" onClick={goBack}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {flow.step === "review" && (
            <Button variant="primary" onClick={goNext}>
              Submit request
            </Button>
          )}
          {flow.step === "submitted" ? (
            <Button variant="primary" onClick={close}>
              Done
            </Button>
          ) : (
            flow.step !== "review" && (
              <Button
                variant="primary"
                onClick={goNext}
                disabled={
                  (flow.step === "items" && flow.selectedItemIds.length === 0) ||
                  (flow.step === "reason" && !flow.reason) ||
                  (flow.step === "resolution" && !flow.resolution) ||
                  (flow.step === "method" && !flow.returnMethod)
                }
              >
                Continue
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/* ============================================================================
 * 32. RETURN POLICY
 * ========================================================================== */

function ReturnPolicySection() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const sections = [
    { key: "window", title: "Return window", body: "Most items can be returned within 30 days of delivery. Some sellers offer extended windows up to 45 days." },
    { key: "condition", title: "Eligible conditions", body: "Items must be unused, in original packaging, with tags attached, unless the item arrived damaged or defective." },
    { key: "nonreturnable", title: "Non-returnable categories", body: "Personal care items, perishable goods, gift cards and final sale items cannot be returned." },
    { key: "timeline", title: "Refund timeline", body: "Refunds are issued within 3–5 business days after inspection is completed, depending on your payment method." },
    { key: "replacement", title: "Replacement rules", body: "Replacements ship once the original item passes inspection, or immediately for confirmed defective items." },
  ];

  return (
    <Card className="p-4">
      <h3 className="mb-1 text-sm font-semibold">Return policy</h3>
      <p className="mb-3 text-xs text-muted-foreground">30-day returns · Free pickup · Refund after inspection</p>
      <div className="flex flex-col divide-y divide-border">
        {sections.map((s) => (
          <div key={s.key} className="py-2">
            <button
              className="flex w-full items-center justify-between text-left text-sm font-medium"
              aria-expanded={expanded === s.key}
              onClick={() => setExpanded(expanded === s.key ? null : s.key)}
            >
              {s.title}
              <span aria-hidden="true">{expanded === s.key ? "−" : "+"}</span>
            </button>
            {expanded === s.key && <p className="mt-1.5 text-xs text-muted-foreground">{s.body}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================================
 * 33. SUPPORT
 * ========================================================================== */

function HelpSection() {
  const topics = [
    "Return not picked up",
    "Refund delayed",
    "Return rejected",
    "Wrong refund amount",
    "Replacement issue",
    "Other issue",
  ];
  return (
    <Card className="p-4">
      <h3 className="mb-1 text-sm font-semibold">Need help with your return?</h3>
      <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
        {topics.map((t) => (
          <li key={t}>
            <button className="w-full rounded-md border border-border px-3 py-2 text-left text-muted-foreground hover:border-primary/40 hover:text-foreground">
              {t}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" size="sm">
          Contact support
        </Button>
        <Button variant="outline" size="sm">
          Report an issue
        </Button>
      </div>
    </Card>
  );
}

/* ============================================================================
 * 34. LOADING / EMPTY / ERROR primitives already implemented inline in ReturnList
 * ========================================================================== */

function DetailsPanelSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading return details">
      <Card className="p-4">
        <Skeleton className="mb-2 h-5 w-40" />
        <Skeleton className="h-3 w-64" />
      </Card>
      <Card className="p-4">
        <Skeleton className="h-24 w-full" />
      </Card>
    </div>
  );
}

/* ============================================================================
 * 35. RECOMMENDATIONS
 * ========================================================================== */

function Recommendations() {
  const picks = [
    { name: "Insulated Travel Mug 16oz", price: usd(2400) },
    { name: "Merino Wool Crew Socks (3-Pack)", price: usd(1800) },
    { name: "Compact Umbrella — Windproof", price: usd(2900) },
  ];
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">You might also like</h3>
      <div className="grid grid-cols-3 gap-3">
        {picks.map((p) => (
          <div key={p.name} className="text-center">
            <div className="mb-2 flex h-20 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
              Product
            </div>
            <p className="line-clamp-2 text-xs">{p.name}</p>
            <p className="text-xs font-medium">{formatMoney(p.price)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================================
 * 36. TRUST SECTION
 * ========================================================================== */

function TrustSection() {
  const points = [
    { title: "Buyer protection", body: "Every eligible order is covered from delivery to return." },
    { title: "Verified sellers", body: "Marketplace sellers are reviewed and rated by real customers." },
    { title: "Secure refunds", body: "Refunds are processed through encrypted payment channels." },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {points.map((p) => (
        <Card key={p.title} className="p-4">
          <p className="text-sm font-medium">{p.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{p.body}</p>
        </Card>
      ))}
    </div>
  );
}

/* ============================================================================
 * 37. FOOTER
 * ========================================================================== */

function EcommerceFooter() {
  return (
    <footer className="mt-10 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-8 text-xs text-muted-foreground sm:px-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <p className="mb-2 font-medium text-foreground">Shop</p>
            <ul className="flex flex-col gap-1.5">
              <li><a href="#" className="hover:text-foreground">Categories</a></li>
              <li><a href="#" className="hover:text-foreground">Deals</a></li>
              <li><a href="#" className="hover:text-foreground">New arrivals</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground">Support</p>
            <ul className="flex flex-col gap-1.5">
              <li><a href="#" className="hover:text-foreground">Returns &amp; refunds</a></li>
              <li><a href="#" className="hover:text-foreground">Shipping info</a></li>
              <li><a href="#" className="hover:text-foreground">Contact us</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground">Company</p>
            <ul className="flex flex-col gap-1.5">
              <li><a href="#" className="hover:text-foreground">About</a></li>
              <li><a href="#" className="hover:text-foreground">Careers</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground">Legal</p>
            <ul className="flex flex-col gap-1.5">
              <li><a href="#" className="hover:text-foreground">Terms</a></li>
              <li><a href="#" className="hover:text-foreground">Privacy</a></li>
            </ul>
          </div>
        </div>
        <p className="mt-6 border-t border-border pt-4">© {new Date().getFullYear()} Meridian, Inc.</p>
      </div>
    </footer>
  );
}

/* ============================================================================
 * DIALOGS: Cancel return / Report an issue
 * ========================================================================== */

function CancelReturnDialog() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.isCancelDialogOpen);
  return (
    <Dialog open={open} onClose={() => dispatch(closeCancelDialog())} title="Cancel return?">
      <p className="text-sm text-muted-foreground">
        Your return has not yet been picked up. Cancelling will stop the return process for this request.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => dispatch(closeCancelDialog())}>
          Keep return
        </Button>
        <Button variant="destructive" onClick={() => dispatch(closeCancelDialog())}>
          Cancel return
        </Button>
      </div>
    </Dialog>
  );
}

function ReportIssueDialog() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.isIssueDialogOpen);
  const [issue, setIssue] = useState("");
  return (
    <Dialog open={open} onClose={() => dispatch(closeIssueDialog())} title="Report an issue">
      <label htmlFor="issue-desc" className="mb-1 block text-xs font-medium">
        What went wrong?
      </label>
      <textarea
        id="issue-desc"
        rows={4}
        value={issue}
        onChange={(e) => setIssue(e.target.value)}
        placeholder="Describe the issue with your return or refund"
        className="w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => dispatch(closeIssueDialog())}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => dispatch(closeIssueDialog())}>
          Submit
        </Button>
      </div>
    </Dialog>
  );
}

/* ============================================================================
 * 38. MAIN PAGE COMPOSITION
 * ========================================================================== */

function ReturnsRefundsContent() {
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const sortedReturns = useAppSelector(selectSortedReturns);
  const selectedId = useAppSelector(selectSelectedReturnId);
  const selectedReturn = useMemo(() => selectReturnById(selectedId)(MOCK_RETURNS), [selectedId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EcommerceHeader />
      <Breadcrumbs />
      <main id="main-content">
        <ReturnsHeader />
        <ReturnsNavigation />
        <ReturnsToolbar />
        <ActiveFilterChips />

        <div className="mx-auto mt-4 grid max-w-7xl grid-cols-1 gap-4 px-4 pb-10 sm:px-6 lg:grid-cols-[380px_1fr]">
          <div>
            <ReturnList returns={sortedReturns} isLoading={isLoading} error={error} onRetry={() => {}} />
          </div>
          <div>
            {selectedReturn ? (
              <ReturnDetailsPanel returnRequest={selectedReturn} />
            ) : isLoading ? (
              <DetailsPanelSkeleton />
            ) : (
              <ReturnDetailsPanel returnRequest={null} />
            )}
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-10 sm:px-6">
          <ReturnPolicySection />
          <HelpSection />
          <Recommendations />
          <TrustSection />
        </div>
      </main>
      <EcommerceFooter />

      <FilterDrawer />
      <ReturnInitiationFlow />
      <CancelReturnDialog />
      <ReportIssueDialog />
    </div>
  );
}

/* ============================================================================
 * 39. EXPORT
 * ========================================================================== */

export default function ReturnsRefundsPage() {
  return (
    <Provider store={store}>
      <ReturnsRefundsContent />
    </Provider>
  );
}