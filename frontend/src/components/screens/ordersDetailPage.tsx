'use client';

/* ════════════════════════════════════════════════════════════════════════
   OrdersDetailPage.tsx
   Enterprise Order Details / Tracking experience — single-file architecture
   Next.js App Router · React · TypeScript · Redux Toolkit · Tailwind v4
   ════════════════════════════════════════════════════════════════════════ */

import React, {
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react';
import {
  configureStore,
  createSlice,
  createSelector,
  PayloadAction,
} from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector } from 'react-redux';

/* ════════════════════════════════════════════════════════════════════════
   2. TYPE DEFINITIONS
   ════════════════════════════════════════════════════════════════════════ */

interface Money {
  amountMinor: number; // integer minor units — never float
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY';
}

type OrderStatus =
  | 'pending' | 'confirmed' | 'processing' | 'packed' | 'shipped'
  | 'outForDelivery' | 'delivered' | 'cancelled' | 'partiallyCancelled'
  | 'returnRequested' | 'returnApproved' | 'returnInTransit' | 'returned'
  | 'refundPending' | 'partiallyRefunded' | 'refunded' | 'failed';

type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded' | 'partiallyRefunded';
type FulfillmentType = 'seller' | 'platform' | 'thirdParty';
type ItemLifecycle = 'processing' | 'shipped' | 'inTransit' | 'delivered' | 'cancelled' | 'returned';
type ReturnEligibility = 'eligible' | 'finalSale' | 'expired' | 'ineligibleItem';
type ReviewState = 'notEligible' | 'pending' | 'submitted';
type TrackingEventStatus = 'completed' | 'current' | 'upcoming' | 'failed' | 'delayed' | 'exception';
type ShipmentStatus = 'processing' | 'shipped' | 'inTransit' | 'outForDelivery' | 'delivered' | 'delayed' | 'exception';

interface TrackingEvent {
  id: string;
  status: TrackingEventStatus;
  title: string;
  description?: string;
  location?: string;
  timestamp?: string;
  completed: boolean;
  current: boolean;
  exception: boolean;
}

interface ProductRef {
  id: string;
  brand: string;
  name: string;
  sku: string;
  variant: string;
  image: string;
  currentPrice: Money;
  originalPrice?: Money;
  discontinued: boolean;
}

interface OrderItem {
  id: string;
  productId: string;
  sellerId: string;
  shipmentId: string;
  quantity: number;
  lineTotal: Money;
  lifecycle: ItemLifecycle;
  returnEligibility: ReturnEligibility;
  returnWindowEnds?: string;
  reviewState: ReviewState;
  reviewRating?: number;
}

interface Seller {
  id: string;
  name: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  responseRate: number;
  fulfillmentRating: number;
  fulfillmentType: FulfillmentType;
}

interface Shipment {
  id: string;
  label: string;
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  eta: string;
  currentLocation?: string;
  lastUpdateAt?: string;
  delayReason?: string;
  itemIds: string[];
}

interface ReturnCase {
  id: string;
  itemIds: string[];
  status: 'requested' | 'approved' | 'inTransit' | 'returned' | 'refundPending' | 'refunded';
  requestedAt: string;
  approvedBy?: string;
  sendBackBy?: string;
  trackingNumber?: string;
  refundAmount?: Money;
  refundMethod?: string;
  refundedAt?: string;
}

interface Address {
  recipient: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  phoneMasked: string;
}

interface PaymentInfo {
  method: string;
  last4?: string;
  status: PaymentStatus;
  paidAt?: string;
  amountPaid: Money;
  transactionRef?: string;
}

interface PriceBreakdown {
  itemsSubtotal: Money;
  productDiscounts: Money;
  sellerDiscounts: Money;
  couponDiscount: Money;
  shipping: Money;
  tax: Money;
  serviceFee: Money;
  rewardsApplied: Money;
  giftWrap: Money;
  grandTotal: Money;
}

interface Coupon {
  code: string;
  discount: Money;
}

interface RewardsInfo {
  pointsApplied?: number;
  pointsValue?: Money;
  storeCreditApplied?: Money;
  pointsEarned?: number;
}

interface Order {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  itemIds: string[];
  shipmentIds: string[];
  sellerIds: string[];
  address: Address;
  payment: PaymentInfo;
  priceBreakdown: PriceBreakdown;
  coupon?: Coupon;
  rewards?: RewardsInfo;
  notes?: string;
}

type OrderAction = 'cancel' | 'return' | 'support' | 'invoice' | 'share' | null;
type SectionId = 'items' | 'delivery' | 'payment' | 'returns' | 'support';
type AccessState = 'authorized' | 'unauthorized' | 'sessionExpired' | 'notFound' | 'accessDenied';
type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

/* ════════════════════════════════════════════════════════════════════════
   3. CONSTANTS
   ════════════════════════════════════════════════════════════════════════ */

const ORDER_STATUS_META: Record<OrderStatus, { label: string; explanation: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }> = {
  pending:             { label: 'Pending',              explanation: 'Waiting for payment confirmation.',            tone: 'neutral' },
  confirmed:           { label: 'Confirmed',            explanation: 'Your order has been confirmed.',               tone: 'info' },
  processing:          { label: 'Processing',           explanation: 'The seller is preparing your items.',          tone: 'info' },
  packed:              { label: 'Packed',               explanation: 'Your order has been packed for shipment.',     tone: 'info' },
  shipped:             { label: 'Shipped',              explanation: 'Your order is on its way.',                    tone: 'info' },
  outForDelivery:      { label: 'Out for delivery',     explanation: 'Your order is out for delivery today.',        tone: 'info' },
  delivered:           { label: 'Delivered',            explanation: 'Your order has been delivered.',               tone: 'success' },
  cancelled:           { label: 'Cancelled',            explanation: 'This order was cancelled.',                    tone: 'neutral' },
  partiallyCancelled:  { label: 'Partially cancelled',  explanation: 'Some items in this order were cancelled.',     tone: 'warning' },
  returnRequested:     { label: 'Return requested',     explanation: 'Your return request is being reviewed.',       tone: 'warning' },
  returnApproved:      { label: 'Return approved',      explanation: 'Send your item back by the date shown.',       tone: 'warning' },
  returnInTransit:     { label: 'Return in transit',    explanation: 'Your returned item is on its way back.',       tone: 'warning' },
  returned:            { label: 'Returned',             explanation: 'Your returned item has been received.',        tone: 'neutral' },
  refundPending:       { label: 'Refund pending',       explanation: 'Your refund is being processed.',              tone: 'warning' },
  partiallyRefunded:   { label: 'Partially refunded',   explanation: 'Part of this order has been refunded.',        tone: 'warning' },
  refunded:            { label: 'Refunded',             explanation: 'This order has been fully refunded.',          tone: 'success' },
  failed:              { label: 'Failed',               explanation: 'This order could not be completed.',          tone: 'danger' },
};

const ITEM_LIFECYCLE_META: Record<ItemLifecycle, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }> = {
  processing: { label: 'Processing', tone: 'info' },
  shipped:    { label: 'Shipped',    tone: 'info' },
  inTransit:  { label: 'In transit', tone: 'info' },
  delivered:  { label: 'Delivered',  tone: 'success' },
  cancelled:  { label: 'Cancelled',  tone: 'neutral' },
  returned:   { label: 'Returned',   tone: 'warning' },
};

const RETURN_ELIGIBILITY_META: Record<ReturnEligibility, string> = {
  eligible:       'Return eligible',
  finalSale:      'Final sale — not returnable',
  expired:        'Return window expired',
  ineligibleItem: 'Not eligible for return',
};

const CURRENCY_SYMBOL: Record<Money['currency'], string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

/* ════════════════════════════════════════════════════════════════════════
   4–8. MOCK DATA — order, shipments, tracking, sellers, products
   Demonstrates: multi-shipment, multi-seller, partial return, delay,
   cancelled item, review pending, buy-again.
   ════════════════════════════════════════════════════════════════════════ */

const money = (amountMinor: number, currency: Money['currency'] = 'USD'): Money => ({ amountMinor, currency });

const PRODUCTS: Record<string, ProductRef> = {
  prod_headphones: {
    id: 'prod_headphones', brand: 'Aurora Audio', name: 'Wireless Noise-Cancelling Headphones',
    sku: 'AUR-WH-BLK-01', variant: 'Midnight Black', image: '🎧',
    currentPrice: money(24900), originalPrice: money(29900), discontinued: false,
  },
  prod_watch: {
    id: 'prod_watch', brand: 'Solace', name: 'Fitness Tracker Watch — Series 4',
    sku: 'SOL-FT4-42-SL', variant: '42mm · Silver', image: '⌚',
    currentPrice: money(18900), discontinued: false,
  },
  prod_bottle: {
    id: 'prod_bottle', brand: 'Terra Home', name: 'Insulated Steel Water Bottle 750ml',
    sku: 'TH-BTL-750-GRN', variant: 'Forest Green', image: '🧴',
    currentPrice: money(3200), discontinued: false,
  },
  prod_backpack: {
    id: 'prod_backpack', brand: 'Northfield', name: 'Weatherproof Commuter Backpack',
    sku: 'NF-BP-22L-CHR', variant: '22L · Charcoal', image: '🎒',
    currentPrice: money(8900), originalPrice: money(10900), discontinued: true,
  },
};

const SELLERS: Record<string, Seller> = {
  seller_auroraaudio: {
    id: 'seller_auroraaudio', name: 'Aurora Audio Official', verified: true,
    rating: 4.8, reviewCount: 34210, responseRate: 98, fulfillmentRating: 97, fulfillmentType: 'seller',
  },
  seller_marketplace: {
    id: 'seller_marketplace', name: 'Northgate Trading Co.', verified: true,
    rating: 4.5, reviewCount: 8420, responseRate: 91, fulfillmentRating: 89, fulfillmentType: 'thirdParty',
  },
};

const TRACKING_EVENTS_SHIPMENT_A: TrackingEvent[] = [
  { id: 'te1', status: 'completed', title: 'Order confirmed',     description: 'Payment confirmed',            timestamp: '2026-09-12T10:42:00Z', completed: true,  current: false, exception: false },
  { id: 'te2', status: 'completed', title: 'Packed',              description: 'Handed to carrier',            timestamp: '2026-09-13T08:15:00Z', completed: true,  current: false, exception: false },
  { id: 'te3', status: 'completed', title: 'Shipped',             description: 'Departed origin facility',     timestamp: '2026-09-13T16:30:00Z', completed: true,  current: false, exception: false },
  { id: 'te4', status: 'current',   title: 'In transit',          location: 'Kathmandu Distribution Center',   timestamp: '2026-09-16T09:05:00Z', completed: false, current: true,  exception: false },
  { id: 'te5', status: 'upcoming',  title: 'Out for delivery',    completed: false, current: false, exception: false },
  { id: 'te6', status: 'upcoming',  title: 'Delivered',           completed: false, current: false, exception: false },
];

const TRACKING_EVENTS_SHIPMENT_B: TrackingEvent[] = [
  { id: 'te7',  status: 'completed', title: 'Order confirmed',  timestamp: '2026-09-12T10:42:00Z', completed: true,  current: false, exception: false },
  { id: 'te8',  status: 'completed', title: 'Packed',           timestamp: '2026-09-12T18:20:00Z', completed: true,  current: false, exception: false },
  { id: 'te9',  status: 'completed', title: 'Shipped',          timestamp: '2026-09-13T07:00:00Z', completed: true,  current: false, exception: false },
  { id: 'te10', status: 'delayed',   title: 'Delivery delayed', description: 'Carrier delay in transit hub', location: 'Regional Hub — Biratnagar', timestamp: '2026-09-15T14:00:00Z', completed: false, current: true, exception: true },
  { id: 'te11', status: 'upcoming',  title: 'Out for delivery', completed: false, current: false, exception: false },
  { id: 'te12', status: 'upcoming',  title: 'Delivered',        completed: false, current: false, exception: false },
];

const SHIPMENTS: Record<string, Shipment> = {
  ship_a: {
    id: 'ship_a', label: 'Shipment 1', carrier: 'Express Logistics', trackingNumber: 'TRK-8392014',
    status: 'inTransit', eta: '2026-09-18', currentLocation: 'Kathmandu Distribution Center',
    lastUpdateAt: '2026-09-16T09:05:00Z', itemIds: ['item_1', 'item_2'],
  },
  ship_b: {
    id: 'ship_b', label: 'Shipment 2', carrier: 'Northgate Freight', trackingNumber: 'TRK-5510237',
    status: 'delayed', eta: '2026-09-20', currentLocation: 'Regional Hub — Biratnagar',
    lastUpdateAt: '2026-09-15T14:00:00Z', delayReason: 'Carrier delay in transit hub', itemIds: ['item_3'],
  },
};

const SHIPMENT_TRACKING: Record<string, TrackingEvent[]> = {
  ship_a: TRACKING_EVENTS_SHIPMENT_A,
  ship_b: TRACKING_EVENTS_SHIPMENT_B,
};

const ORDER_ITEMS: Record<string, OrderItem> = {
  item_1: {
    id: 'item_1', productId: 'prod_headphones', sellerId: 'seller_auroraaudio', shipmentId: 'ship_a',
    quantity: 1, lineTotal: money(24900), lifecycle: 'inTransit',
    returnEligibility: 'eligible', returnWindowEnds: '2026-09-28', reviewState: 'notEligible',
  },
  item_2: {
    id: 'item_2', productId: 'prod_bottle', sellerId: 'seller_auroraaudio', shipmentId: 'ship_a',
    quantity: 2, lineTotal: money(6400), lifecycle: 'inTransit',
    returnEligibility: 'eligible', returnWindowEnds: '2026-09-28', reviewState: 'notEligible',
  },
  item_3: {
    id: 'item_3', productId: 'prod_watch', sellerId: 'seller_marketplace', shipmentId: 'ship_b',
    quantity: 1, lineTotal: money(18900), lifecycle: 'inTransit',
    returnEligibility: 'eligible', returnWindowEnds: '2026-09-30', reviewState: 'notEligible',
  },
  item_4: {
    id: 'item_4', productId: 'prod_backpack', sellerId: 'seller_marketplace', shipmentId: 'ship_b',
    quantity: 1, lineTotal: money(8900), lifecycle: 'cancelled',
    returnEligibility: 'ineligibleItem', reviewState: 'notEligible',
  },
};

const ORDER: Order = {
  id: 'order_482913',
  orderNumber: 'ORD-482913',
  invoiceNumber: 'INV-82931',
  placedAt: '2026-09-12T10:42:00Z',
  status: 'partiallyCancelled',
  paymentStatus: 'paid',
  itemIds: ['item_1', 'item_2', 'item_3', 'item_4'],
  shipmentIds: ['ship_a', 'ship_b'],
  sellerIds: ['seller_auroraaudio', 'seller_marketplace'],
  address: {
    recipient: 'Samir Das', line1: 'Baneshwor Chowk, House 14',
    city: 'Kathmandu', region: 'Bagmati Province', postalCode: '44600',
    phoneMasked: '+977 98•• ••• 214',
  },
  payment: {
    method: 'Visa', last4: '4242', status: 'paid',
    paidAt: '2026-09-12T10:43:00Z', amountPaid: money(53300), transactionRef: 'TXN-77281940',
  },
  priceBreakdown: {
    itemsSubtotal:    money(59100),
    productDiscounts: money(-5000),
    sellerDiscounts:  money(-1500),
    couponDiscount:   money(-2000),
    shipping:         money(999),
    tax:              money(3200),
    serviceFee:       money(500),
    rewardsApplied:   money(-1000),
    giftWrap:         money(0),
    grandTotal:       money(53300),
  },
  coupon: { code: 'WELCOME20', discount: money(-2000) },
  rewards: { pointsApplied: 240, pointsValue: money(-1000), pointsEarned: 320 },
};

/* ════════════════════════════════════════════════════════════════════════
   9. MONEY UTILITIES — integer minor-unit safe arithmetic
   ════════════════════════════════════════════════════════════════════════ */

function formatMoney(m: Money): string {
  const symbol = CURRENCY_SYMBOL[m.currency];
  const sign = m.amountMinor < 0 ? '-' : '';
  const abs = Math.abs(m.amountMinor);
  const major = Math.floor(abs / 100);
  const minor = String(abs % 100).padStart(2, '0');
  return `${sign}${symbol}${major.toLocaleString('en-US')}.${minor}`;
}

function sumMoney(items: Money[], currency: Money['currency'] = 'USD'): Money {
  return money(items.reduce((sum, m) => sum + m.amountMinor, 0), currency);
}

/* ════════════════════════════════════════════════════════════════════════
   10. DATE / TIME UTILITIES
   ════════════════════════════════════════════════════════════════════════ */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function formatRelative(iso: string): string {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 3600) return RELATIVE.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return RELATIVE.format(Math.round(diffSec / 3600), 'hour');
  return RELATIVE.format(Math.round(diffSec / 86400), 'day');
}

/* ════════════════════════════════════════════════════════════════════════
   11. STATUS UTILITIES
   ════════════════════════════════════════════════════════════════════════ */

function getAvailableOrderActions(status: OrderStatus): OrderAction[] {
  switch (status) {
    case 'pending':
    case 'confirmed':
    case 'processing':
      return ['cancel', 'support', 'invoice'];
    case 'packed':
    case 'shipped':
    case 'outForDelivery':
    case 'partiallyCancelled':
      return ['support', 'invoice', 'share'];
    case 'delivered':
      return ['return', 'support', 'invoice', 'share'];
    case 'returnRequested':
    case 'returnApproved':
    case 'returnInTransit':
    case 'returned':
    case 'refundPending':
    case 'partiallyRefunded':
    case 'refunded':
      return ['support', 'invoice'];
    case 'cancelled':
    case 'failed':
      return ['invoice', 'support'];
    default:
      return ['support'];
  }
}

function toneClasses(tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'): string {
  switch (tone) {
    case 'success': return 'status-pill status-pill-success';
    case 'warning': return 'status-pill status-pill-warning';
    case 'danger':  return 'status-pill status-pill-danger';
    case 'info':    return 'status-pill status-pill-info';
    default:        return 'status-pill status-pill-neutral';
  }
}

/* ════════════════════════════════════════════════════════════════════════
   12. REDUX STORE / SLICES
   ════════════════════════════════════════════════════════════════════════ */

interface UiState {
  selectedShipmentId: string;
  activeOrderAction: OrderAction;
  expandedSections: Partial<Record<SectionId, boolean>>;
  copiedField: 'order' | 'tracking' | null;
  supportIssue: string | null;
}

const initialUiState: UiState = {
  selectedShipmentId: ORDER.shipmentIds[0],
  activeOrderAction: null,
  expandedSections: { items: true, delivery: true, payment: true, returns: true, support: false },
  copiedField: null,
  supportIssue: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: initialUiState,
  reducers: {
    setSelectedShipment(state, action: PayloadAction<string>) {
      state.selectedShipmentId = action.payload;
    },
    openOrderAction(state, action: PayloadAction<OrderAction>) {
      state.activeOrderAction = action.payload;
    },
    closeOrderAction(state) {
      state.activeOrderAction = null;
    },
    toggleSection(state, action: PayloadAction<SectionId>) {
      const id = action.payload;
      state.expandedSections[id] = !state.expandedSections[id];
    },
    setCopiedField(state, action: PayloadAction<'order' | 'tracking' | null>) {
      state.copiedField = action.payload;
    },
    setSupportIssue(state, action: PayloadAction<string | null>) {
      state.supportIssue = action.payload;
    },
  },
});

const {
  setSelectedShipment, openOrderAction, closeOrderAction,
  toggleSection, setCopiedField, setSupportIssue,
} = uiSlice.actions;

const store = configureStore({ reducer: { ui: uiSlice.reducer } });
type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
const useAppDispatch = () => useDispatch<AppDispatch>();
const useAppSelector = <T,>(selector: (s: RootState) => T) => useSelector(selector);

/* ════════════════════════════════════════════════════════════════════════
   13. REDUX SELECTORS
   ════════════════════════════════════════════════════════════════════════ */

const selUi = (s: RootState) => s.ui;
const selSelectedShipmentId = createSelector(selUi, (u) => u.selectedShipmentId);
const selActiveOrderAction  = createSelector(selUi, (u) => u.activeOrderAction);
const selExpandedSections   = createSelector(selUi, (u) => u.expandedSections);
const selCopiedField        = createSelector(selUi, (u) => u.copiedField);

/* ════════════════════════════════════════════════════════════════════════
   14. UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════════ */

function StatusPill({ tone, children }: { tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; children: React.ReactNode }) {
  return <span className={toneClasses(tone)}><span className="status-dot" aria-hidden="true" />{children}</span>;
}

function IconButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="icon-btn">
      {children}
    </button>
  );
}

function SectionCard({ title, subtitle, id, actions, children, defaultOpen = true, collapsible = false }: {
  title: string; subtitle?: string; id?: SectionId; actions?: React.ReactNode;
  children: React.ReactNode; defaultOpen?: boolean; collapsible?: boolean;
}) {
  const dispatch = useAppDispatch();
  const expanded = useAppSelector(selExpandedSections);
  const isOpen = id ? (expanded[id] ?? defaultOpen) : true;

  return (
    <section className="section-card" aria-labelledby={id ? `${id}-heading` : undefined}>
      <div className="section-card-head">
        <div className="min-w-0">
          <h2 id={id ? `${id}-heading` : undefined} className="section-card-title">{title}</h2>
          {subtitle && <p className="section-card-subtitle">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
          {collapsible && id && (
            <button
              type="button" onClick={() => dispatch(toggleSection(id))}
              aria-expanded={isOpen} aria-controls={`${id}-panel`}
              className="section-toggle-btn"
            >
              <ChevronIcon open={isOpen} />
            </button>
          )}
        </div>
      </div>
      {isOpen && <div id={id ? `${id}-panel` : undefined}>{children}</div>}
    </section>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SkeletonBlock({ h = 16, w = '100%' }: { h?: number; w?: string | number }) {
  return <div className="skeleton-block" style={{ height: h, width: w }} aria-hidden="true" />;
}

function ErrorPanel({ title, onRetry }: { title: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="error-panel">
      <p className="error-panel-title">{title}</p>
      <div className="flex gap-2 mt-2">
        {onRetry && <button onClick={onRetry} className="btn-ghost-sm">Try again</button>}
        <button className="btn-ghost-sm">Contact support</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   15. ECOMMERCE HEADER
   ════════════════════════════════════════════════════════════════════════ */

function AnnouncementBar() {
  return (
    <div className="announcement-bar">
      Free returns on eligible items within 30 days · <a href="#" className="announcement-link">Learn more</a>
    </div>
  );
}

function SearchBar() {
  return (
    <div className="header-search">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="header-search-icon">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input type="search" placeholder="Search products, brands, orders" aria-label="Search" className="header-search-input" />
    </div>
  );
}

function HeaderActions() {
  return (
    <div className="header-actions">
      <button className="header-action-btn" aria-label="Account">
        <span aria-hidden="true">◉</span>
      </button>
      <button className="header-action-btn" aria-label="Wishlist">
        <span aria-hidden="true">♡</span>
      </button>
      <button className="header-action-btn" aria-label="Cart, 0 items">
        <span aria-hidden="true">🛍</span>
      </button>
    </div>
  );
}

function CategoryNavigation() {
  const cats = ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Sports', 'Books', 'Deals'];
  return (
    <nav aria-label="Product categories" className="category-nav">
      {cats.map((c) => <a key={c} href="#" className="category-nav-link">{c}</a>)}
    </nav>
  );
}

function EcommerceHeader() {
  return (
    <header className="ecommerce-header">
      <AnnouncementBar />
      <div className="main-header">
        <a href="#" className="header-logo" aria-label="Marketplace home">market<strong>hub</strong></a>
        <SearchBar />
        <HeaderActions />
      </div>
      <CategoryNavigation />
    </header>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   16. BREADCRUMBS
   ════════════════════════════════════════════════════════════════════════ */

function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol className="breadcrumbs-list">
        <li><a href="#" className="breadcrumb-link">Account</a></li>
        <li aria-hidden="true">/</li>
        <li><a href="#" className="breadcrumb-link">Orders</a></li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="breadcrumb-current">{ORDER.orderNumber}</li>
      </ol>
    </nav>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   17. ORDER HEADER
   ════════════════════════════════════════════════════════════════════════ */

function CopyButton({ field, value }: { field: 'order' | 'tracking'; value: string }) {
  const dispatch = useAppDispatch();
  const copied = useAppSelector(selCopiedField);
  const isCopied = copied === field;

  const handleCopy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    dispatch(setCopiedField(field));
    window.setTimeout(() => dispatch(setCopiedField(null)), 1800);
  }, [dispatch, field, value]);

  return (
    <button type="button" onClick={handleCopy} className="copy-btn" aria-live="polite">
      {isCopied ? 'Copied' : `Copy ${field === 'order' ? 'order number' : 'tracking number'}`}
    </button>
  );
}

function OrderHeader() {
  const dispatch = useAppDispatch();
  const meta = ORDER_STATUS_META[ORDER.status];
  const actions = getAvailableOrderActions(ORDER.status);

  const actionLabels: Record<Exclude<OrderAction, null>, string> = {
    cancel: 'Cancel order', return: 'Return items', support: 'Get help',
    invoice: 'View invoice', share: 'Share order',
  };

  return (
    <div className="order-header">
      <a href="#" className="back-to-orders">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M8.5 2.5L3.5 7l5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to orders
      </a>

      <div className="order-header-row">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="order-title">Order {ORDER.orderNumber}</h1>
            <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
          </div>
          <p className="order-subtitle">
            Placed {formatDate(ORDER.placedAt)} · <CopyButton field="order" value={ORDER.orderNumber} />
          </p>
        </div>

        <div className="order-actions" role="group" aria-label="Order actions">
          {actions.map((a) =>
            a ? (
              <button
                key={a} type="button"
                onClick={() => dispatch(openOrderAction(a))}
                className={a === 'cancel' ? 'btn-outline-danger' : 'btn-outline'}
              >
                {actionLabels[a]}
              </button>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   18. ORDER OVERVIEW
   ════════════════════════════════════════════════════════════════════════ */

function OrderOverview() {
  const meta = ORDER_STATUS_META[ORDER.status];
  const primaryShipment = SHIPMENTS[ORDER.shipmentIds[0]];

  return (
    <div className="overview-grid">
      <div className="overview-cell">
        <p className="overview-label">Status</p>
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
      </div>
      <div className="overview-cell">
        <p className="overview-label">Estimated delivery</p>
        <p className="overview-value">{formatShortDate(primaryShipment.eta)}</p>
      </div>
      <div className="overview-cell">
        <p className="overview-label">Items · sellers</p>
        <p className="overview-value">{ORDER.itemIds.length} items · {ORDER.sellerIds.length} sellers</p>
      </div>
      <div className="overview-cell">
        <p className="overview-label">Payment</p>
        <p className="overview-value">Paid · {formatMoney(ORDER.priceBreakdown.grandTotal)}</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   19–21. TRACKING SECTION — hero, timeline, shipment selector
   ════════════════════════════════════════════════════════════════════════ */

const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  processing: 'Processing', shipped: 'Shipped', inTransit: 'In transit',
  outForDelivery: 'Out for delivery', delivered: 'Delivered',
  delayed: 'Delayed', exception: 'Delivery exception',
};

function ShipmentSelector() {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector(selSelectedShipmentId);

  return (
    <div role="tablist" aria-label="Shipments in this order" className="shipment-selector">
      {ORDER.shipmentIds.map((sid) => {
        const s = SHIPMENTS[sid];
        const isSelected = sid === selectedId;
        const itemCount = s.itemIds.length;
        return (
          <button
            key={sid} role="tab" aria-selected={isSelected} aria-controls="tracking-panel"
            onClick={() => dispatch(setSelectedShipment(sid))}
            className={`shipment-tab${isSelected ? ' shipment-tab-active' : ''}`}
          >
            <span className="shipment-tab-label">{s.label}</span>
            <span className="shipment-tab-meta">
              {itemCount} item{itemCount > 1 ? 's' : ''} · {s.status === 'delayed' ? 'Delayed' : `Arriving ${formatShortDate(s.eta)}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DelayException({ shipment }: { shipment: Shipment }) {
  return (
    <div className="exception-panel" role="status">
      <p className="exception-title">Delivery delayed</p>
      <p className="exception-body">
        Your package is experiencing a carrier delay. New estimated delivery: {formatShortDate(shipment.eta)}.
      </p>
      <div className="flex gap-2 mt-3 flex-wrap">
        <button className="btn-outline-sm">Update delivery instructions</button>
        <button className="btn-outline-sm">Contact carrier</button>
        <button className="btn-outline-sm">Contact support</button>
      </div>
    </div>
  );
}

function TrackingHero({ shipment }: { shipment: Shipment }) {
  const isDelayed = shipment.status === 'delayed' || shipment.status === 'exception';
  const headline = shipment.status === 'delivered'
    ? 'Delivered'
    : isDelayed ? 'Delivery delayed'
    : shipment.status === 'outForDelivery' ? 'Arriving today'
    : 'In transit';

  return (
    <div className="tracking-hero">
      <div className="tracking-hero-top">
        <div>
          <p className="tracking-hero-headline">{headline}</p>
          <p className="tracking-hero-eta">Express Delivery · Expected {formatShortDate(shipment.eta)}</p>
        </div>
        <StatusPill tone={isDelayed ? 'warning' : 'info'}>{SHIPMENT_STATUS_LABEL[shipment.status]}</StatusPill>
      </div>

      <dl className="tracking-hero-details">
        <div>
          <dt>Carrier</dt>
          <dd>{shipment.carrier}</dd>
        </div>
        <div>
          <dt>Tracking number</dt>
          <dd className="flex items-center gap-2 flex-wrap">
            <span className="mono-text">{shipment.trackingNumber}</span>
            <CopyButton field="tracking" value={shipment.trackingNumber} />
          </dd>
        </div>
        <div>
          <dt>Current location</dt>
          <dd>{shipment.currentLocation ?? '—'}</dd>
        </div>
        <div>
          <dt>Last update</dt>
          <dd>{shipment.lastUpdateAt ? formatRelative(shipment.lastUpdateAt) : '—'}</dd>
        </div>
      </dl>

      {isDelayed && <DelayException shipment={shipment} />}

      <button className="btn-primary mt-3">Track package</button>
    </div>
  );
}

function TrackingTimelineItem({ event, isLast }: { event: TrackingEvent; isLast: boolean }) {
  const stateClass = event.exception ? 'timeline-node-exception'
    : event.completed ? 'timeline-node-completed'
    : event.current ? 'timeline-node-current'
    : 'timeline-node-upcoming';

  const marker = event.exception ? '!' : event.completed ? '✓' : event.current ? '' : '';

  return (
    <li className="timeline-item">
      <div className="timeline-marker-col">
        <span className={`timeline-node ${stateClass}`} aria-hidden="true">
          {event.current && !event.exception ? <span className="timeline-node-pulse" /> : marker}
        </span>
        {!isLast && <span className="timeline-connector" aria-hidden="true" />}
      </div>
      <div className="timeline-content">
        <p className={`timeline-title${event.current ? ' timeline-title-current' : ''}`}>
          {event.title}
          {event.current && <span className="sr-only"> — current status</span>}
        </p>
        {event.description && <p className="timeline-desc">{event.description}</p>}
        {event.location && <p className="timeline-desc">{event.location}</p>}
        {event.timestamp && <time dateTime={event.timestamp} className="timeline-time">{formatDateTime(event.timestamp)}</time>}
      </div>
    </li>
  );
}

function ShipmentTimeline({ events }: { events: TrackingEvent[] }) {
  return (
    <ol className="timeline-list" aria-label="Shipment tracking timeline">
      {events.map((ev, i) => <TrackingTimelineItem key={ev.id} event={ev} isLast={i === events.length - 1} />)}
    </ol>
  );
}

function TrackingSection() {
  const selectedId = useAppSelector(selSelectedShipmentId);
  const shipment = SHIPMENTS[selectedId];
  const events = SHIPMENT_TRACKING[selectedId];
  const hasMultiple = ORDER.shipmentIds.length > 1;

  return (
    <SectionCard title="Tracking" subtitle={hasMultiple ? `${ORDER.shipmentIds.length} shipments in this order` : undefined}>
      {hasMultiple && <ShipmentSelector />}
      <div id="tracking-panel" role={hasMultiple ? 'tabpanel' : undefined}>
        <TrackingHero shipment={shipment} />
        <div className="mt-5">
          <ShipmentTimeline events={events} />
        </div>
      </div>
    </SectionCard>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   22. ORDER ITEMS — seller groups, item cards
   ════════════════════════════════════════════════════════════════════════ */

function ReturnEligibilityNote({ eligibility, windowEnds }: { eligibility: ReturnEligibility; windowEnds?: string }) {
  if (eligibility === 'eligible' && windowEnds) {
    return <p className="item-meta-line item-meta-positive">Return until {formatShortDate(windowEnds)}</p>;
  }
  return <p className="item-meta-line item-meta-muted">{RETURN_ELIGIBILITY_META[eligibility]}</p>;
}

function ItemActions({ item }: { item: OrderItem }) {
  const product = PRODUCTS[item.productId];
  const actions: string[] = ['View product'];
  if (item.lifecycle === 'delivered') actions.push('Buy again');
  if (item.lifecycle === 'delivered' && item.returnEligibility === 'eligible') actions.push('Return');
  if (item.lifecycle === 'delivered' && item.reviewState === 'pending') actions.push('Write a review');
  if (item.lifecycle !== 'cancelled') actions.push('Contact seller');

  return (
    <div className="item-actions">
      {actions.map((a) => (
        <button key={a} className="btn-ghost-sm" disabled={product.discontinued && a === 'Buy again'}>
          {a}
        </button>
      ))}
    </div>
  );
}

function OrderItemRow({ item }: { item: OrderItem }) {
  const product = PRODUCTS[item.productId];
  const lifecycle = ITEM_LIFECYCLE_META[item.lifecycle];
  const hasDiscount = product.originalPrice && product.originalPrice.amountMinor > product.currentPrice.amountMinor;

  return (
    <li className="order-item-row">
      <div className="order-item-image" aria-hidden="true">{product.image}</div>
      <div className="order-item-body">
        <p className="order-item-brand">{product.brand}</p>
        <p className="order-item-name">{product.name}</p>
        <p className="item-meta-line item-meta-muted">SKU {product.sku} · {product.variant} · Qty {item.quantity}</p>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <StatusPill tone={lifecycle.tone}>{lifecycle.label}</StatusPill>
          {product.discontinued && <span className="item-meta-line item-meta-muted">Discontinued</span>}
        </div>

        {item.lifecycle !== 'cancelled' && (
          <ReturnEligibilityNote eligibility={item.returnEligibility} windowEnds={item.returnWindowEnds} />
        )}

        <ItemActions item={item} />
      </div>
      <div className="order-item-price">
        <p className="order-item-price-current">{formatMoney(item.lineTotal)}</p>
        {hasDiscount && product.originalPrice && (
          <p className="order-item-price-original">{formatMoney(money(product.originalPrice.amountMinor * item.quantity))}</p>
        )}
      </div>
    </li>
  );
}

function SellerGroup({ sellerId, itemIds }: { sellerId: string; itemIds: string[] }) {
  const seller = SELLERS[sellerId];
  const shipmentIds = Array.from(new Set(itemIds.map((id) => ORDER_ITEMS[id].shipmentId)));

  return (
    <div className="seller-group">
      <div className="seller-group-head">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="seller-name">{seller.name}</p>
          {seller.verified && <span className="verified-badge" aria-label="Verified seller">✓</span>}
        </div>
        <p className="seller-meta">
          {seller.rating.toFixed(1)} ★ · {seller.responseRate}% response rate
        </p>
      </div>
      <ul className="order-item-list">
        {itemIds.map((id) => <OrderItemRow key={id} item={ORDER_ITEMS[id]} />)}
      </ul>
    </div>
  );
}

function OrderItemsSection() {
  const bySeller = useMemo(() => {
    const map = new Map<string, string[]>();
    ORDER.itemIds.forEach((id) => {
      const sellerId = ORDER_ITEMS[id].sellerId;
      if (!map.has(sellerId)) map.set(sellerId, []);
      map.get(sellerId)!.push(id);
    });
    return map;
  }, []);

  return (
    <SectionCard id="items" title="Items" subtitle={`${ORDER.itemIds.length} items from ${ORDER.sellerIds.length} sellers`} collapsible>
      {Array.from(bySeller.entries()).map(([sellerId, itemIds]) => (
        <SellerGroup key={sellerId} sellerId={sellerId} itemIds={itemIds} />
      ))}
    </SectionCard>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   23. DELIVERY ADDRESS + SHIPPING METHOD
   ════════════════════════════════════════════════════════════════════════ */

function DeliveryAddressSection() {
  const a = ORDER.address;
  return (
    <SectionCard id="delivery" title="Delivered to" collapsible>
      <address className="address-block">
        <p className="address-name">{a.recipient}</p>
        <p>{a.line1}</p>
        <p>{a.city}, {a.region} {a.postalCode}</p>
        <p className="item-meta-muted">{a.phoneMasked}</p>
      </address>
    </SectionCard>
  );
}

function ShippingMethodSection() {
  const shipment = SHIPMENTS[ORDER.shipmentIds[0]];
  return (
    <div className="info-block">
      <p className="info-block-title">Shipping method</p>
      <dl className="info-dl">
        <div><dt>Method</dt><dd>Express Delivery</dd></div>
        <div><dt>Carrier</dt><dd>{shipment.carrier}</dd></div>
        <div><dt>Estimated</dt><dd>{formatShortDate(shipment.eta)}</dd></div>
        <div><dt>Shipping fee</dt><dd>{formatMoney(ORDER.priceBreakdown.shipping)}</dd></div>
      </dl>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   24. PAYMENT SECTION
   ════════════════════════════════════════════════════════════════════════ */

function PaymentSection() {
  const p = ORDER.payment;
  return (
    <SectionCard id="payment" title="Payment" collapsible>
      <div className="info-block">
        <p className="payment-method-line">
          {p.method}{p.last4 ? ` •••• ${p.last4}` : ''}
        </p>
        <p className="item-meta-muted">
          {p.status === 'paid' && p.paidAt ? `Paid ${formatDate(p.paidAt)}` : ORDER_STATUS_META.pending.label}
        </p>
        <dl className="info-dl mt-2">
          <div><dt>Amount paid</dt><dd>{formatMoney(p.amountPaid)}</dd></div>
          {p.transactionRef && <div><dt>Reference</dt><dd className="mono-text">{p.transactionRef}</dd></div>}
        </dl>
      </div>
    </SectionCard>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   26. PRICE BREAKDOWN + COUPON + REWARDS
   ════════════════════════════════════════════════════════════════════════ */

function PriceRow({ label, value, muted = false, emphasis = false }: { label: string; value: Money; muted?: boolean; emphasis?: boolean }) {
  if (value.amountMinor === 0) return null;
  return (
    <div className={`price-row${emphasis ? ' price-row-emphasis' : ''}`}>
      <span className={muted ? 'price-row-label-muted' : 'price-row-label'}>{label}</span>
      <span className={muted ? 'price-row-value-muted' : 'price-row-value'}>{formatMoney(value)}</span>
    </div>
  );
}

function PriceBreakdownSection() {
  const b = ORDER.priceBreakdown;
  const totalSavings = sumMoney([b.productDiscounts, b.sellerDiscounts, b.couponDiscount, b.rewardsApplied]);

  return (
    <div className="summary-card">
      <p className="summary-card-title">Price details</p>
      <div className="price-rows">
        <PriceRow label="Items subtotal" value={b.itemsSubtotal} />
        <PriceRow label="Product discounts" value={b.productDiscounts} muted />
        <PriceRow label="Seller discounts" value={b.sellerDiscounts} muted />
        {ORDER.coupon && <PriceRow label={`Coupon · ${ORDER.coupon.code}`} value={b.couponDiscount} muted />}
        <PriceRow label="Shipping" value={b.shipping} />
        <PriceRow label="Tax" value={b.tax} />
        <PriceRow label="Platform fee" value={b.serviceFee} />
        {ORDER.rewards?.pointsApplied && (
          <PriceRow label={`Rewards · ${ORDER.rewards.pointsApplied} pts`} value={b.rewardsApplied} muted />
        )}
        <PriceRow label="Gift wrap" value={b.giftWrap} muted />
      </div>
      <div className="summary-divider" />
      {totalSavings.amountMinor !== 0 && (
        <div className="price-row price-row-savings">
          <span>Total savings</span>
          <span>{formatMoney(money(Math.abs(totalSavings.amountMinor), totalSavings.currency))}</span>
        </div>
      )}
      <div className="price-row price-row-total">
        <span>Total</span>
        <span>{formatMoney(b.grandTotal)}</span>
      </div>
      {ORDER.rewards?.pointsEarned && (
        <p className="rewards-earned-note">You earned {ORDER.rewards.pointsEarned} points on this order</p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   27. RETURNS & REFUNDS
   ════════════════════════════════════════════════════════════════════════ */

const RETURN_CASES: ReturnCase[] = [
  {
    id: 'ret_1', itemIds: ['item_4'], status: 'refunded',
    requestedAt: '2026-09-13T09:00:00Z', refundAmount: money(8900), refundMethod: 'Original payment method',
    refundedAt: '2026-09-15T12:00:00Z',
  },
];

function ReturnCaseCard({ rc }: { rc: ReturnCase }) {
  const items = rc.itemIds.map((id) => PRODUCTS[ORDER_ITEMS[id].productId]);
  return (
    <div className="return-case">
      <p className="return-case-title">
        {items.map((p) => p.name).join(', ')}
      </p>
      {rc.status === 'refunded' && rc.refundAmount && (
        <>
          <StatusPill tone="success">Refunded</StatusPill>
          <dl className="info-dl mt-2">
            <div><dt>Refund amount</dt><dd>{formatMoney(rc.refundAmount)}</dd></div>
            <div><dt>Refund method</dt><dd>{rc.refundMethod}</dd></div>
            {rc.refundedAt && <div><dt>Refunded on</dt><dd>{formatDate(rc.refundedAt)}</dd></div>}
          </dl>
        </>
      )}
      {rc.status === 'refundPending' && (
        <>
          <StatusPill tone="warning">Refund pending</StatusPill>
          <p className="item-meta-muted mt-1">Refund expected within 3–5 business days</p>
        </>
      )}
    </div>
  );
}

function ReturnEligibilitySummary() {
  return (
    <ul className="eligibility-list">
      {ORDER.itemIds.map((id) => {
        const item = ORDER_ITEMS[id];
        if (item.lifecycle === 'cancelled') return null;
        const product = PRODUCTS[item.productId];
        return (
          <li key={id} className="eligibility-row">
            <span className="eligibility-name">{product.name}</span>
            <span className={item.returnEligibility === 'eligible' ? 'item-meta-positive' : 'item-meta-muted'}>
              {RETURN_ELIGIBILITY_META[item.returnEligibility]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ReturnsRefundsSection() {
  const dispatch = useAppDispatch();
  return (
    <SectionCard id="returns" title="Returns & refunds" collapsible>
      {RETURN_CASES.map((rc) => <ReturnCaseCard key={rc.id} rc={rc} />)}
      <div className="mt-3">
        <p className="info-block-title mb-2">Return eligibility by item</p>
        <ReturnEligibilitySummary />
      </div>
      <button onClick={() => dispatch(openOrderAction('return'))} className="btn-outline-sm mt-3">
        Start a return
      </button>
    </SectionCard>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   28. INVOICE
   ════════════════════════════════════════════════════════════════════════ */

function InvoiceSection() {
  return (
    <div className="info-block">
      <p className="info-block-title">Invoice</p>
      <p className="item-meta-muted">Invoice {ORDER.invoiceNumber} · Issued {formatDate(ORDER.placedAt)}</p>
      <div className="flex gap-2 mt-2">
        <button className="btn-outline-sm">View invoice</button>
        <button className="btn-outline-sm">Download</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   29. SELLER SECTION
   ════════════════════════════════════════════════════════════════════════ */

function SellerSection() {
  return (
    <div className="summary-card">
      <p className="summary-card-title">Sellers</p>
      {ORDER.sellerIds.map((id) => {
        const s = SELLERS[id];
        return (
          <div key={id} className="seller-summary-row">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="seller-name">{s.name}</p>
                {s.verified && <span className="verified-badge" aria-label="Verified seller">✓</span>}
              </div>
              <p className="seller-meta">{s.rating.toFixed(1)} ★ · {s.fulfillmentRating}% positive</p>
            </div>
            <button className="btn-ghost-sm">Contact</button>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   30. CUSTOMER SUPPORT
   ════════════════════════════════════════════════════════════════════════ */

const SUPPORT_ISSUES = [
  'Order not received', 'Wrong item', 'Damaged item', 'Missing item',
  'Payment issue', 'Refund issue', 'Delivery issue',
];

function SupportSection() {
  const dispatch = useAppDispatch();
  return (
    <SectionCard id="support" title="Need help with this order?" collapsible defaultOpen={false}>
      <div className="support-issue-grid">
        {SUPPORT_ISSUES.map((issue) => (
          <button key={issue} className="support-issue-btn" onClick={() => dispatch(setSupportIssue(issue))}>
            {issue}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button className="btn-outline-sm">Contact support</button>
        <button className="btn-outline-sm">Report an issue</button>
      </div>
    </SectionCard>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   31. REVIEW SECTION
   ════════════════════════════════════════════════════════════════════════ */

function ReviewSection() {
  const deliveredItems = ORDER.itemIds
    .map((id) => ORDER_ITEMS[id])
    .filter((item) => item.lifecycle === 'delivered');

  if (deliveredItems.length === 0) return null;

  return (
    <div className="info-block">
      <p className="info-block-title">How was your purchase?</p>
      {deliveredItems.map((item) => {
        const product = PRODUCTS[item.productId];
        return (
          <div key={item.id} className="review-row">
            <span className="review-product-name">{product.name}</span>
            {item.reviewState === 'submitted' ? (
              <span className="item-meta-positive">Reviewed · {item.reviewRating}★</span>
            ) : (
              <button className="btn-ghost-sm">Write a review</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   32. REORDER SECTION
   ════════════════════════════════════════════════════════════════════════ */

function ReorderSection() {
  const available = ORDER.itemIds.filter((id) => !PRODUCTS[ORDER_ITEMS[id].productId].discontinued);
  return (
    <div className="info-block">
      <p className="info-block-title">Buy again</p>
      <p className="item-meta-muted">
        {available.length} of {ORDER.itemIds.length} items are currently available
      </p>
      <button className="btn-outline-sm mt-2">Add available items to cart</button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   33. RELATED RECOMMENDATIONS
   ════════════════════════════════════════════════════════════════════════ */

function RelatedRecommendations() {
  const items = Object.values(PRODUCTS).slice(0, 4);
  return (
    <section aria-labelledby="recs-heading" className="recs-section">
      <h2 id="recs-heading" className="recs-heading">You might also like</h2>
      <div className="recs-grid">
        {items.map((p) => (
          <div key={p.id} className="rec-card">
            <div className="rec-card-image" aria-hidden="true">{p.image}</div>
            <p className="rec-card-brand">{p.brand}</p>
            <p className="rec-card-name">{p.name}</p>
            <p className="rec-card-price">{formatMoney(p.currentPrice)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   34. TRUST SECTION
   ════════════════════════════════════════════════════════════════════════ */

function TrustSection() {
  const items = [
    { icon: '🛡', label: 'Buyer protection' },
    { icon: '🔒', label: 'Secure payments' },
    { icon: '↩', label: 'Easy returns' },
    { icon: '☎', label: '24/7 support' },
  ];
  return (
    <div className="trust-row">
      {items.map((t) => (
        <div key={t.label} className="trust-item">
          <span aria-hidden="true">{t.icon}</span>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   35. FOOTER
   ════════════════════════════════════════════════════════════════════════ */

function EcommerceFooter() {
  return (
    <footer className="ecommerce-footer">
      <p>© 2026 MarketHub, Inc. All rights reserved.</p>
      <nav aria-label="Footer" className="footer-nav">
        <a href="#">Help Center</a>
        <a href="#">Returns</a>
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
      </nav>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ORDER ACTION DIALOG (share/cancel/return/support/invoice)
   ════════════════════════════════════════════════════════════════════════ */

function OrderActionDialog() {
  const dispatch = useAppDispatch();
  const action = useAppSelector(selActiveOrderAction);
  if (!action) return null;

  const titles: Record<Exclude<OrderAction, null>, string> = {
    cancel: 'Cancel this order?', return: 'Start a return', support: 'Get help',
    invoice: 'Invoice', share: 'Share order',
  };

  return (
    <div className="dialog-overlay" role="presentation" onClick={() => dispatch(closeOrderAction())}>
      <div
        role="dialog" aria-modal="true" aria-labelledby="dialog-title"
        className="dialog-panel" onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title" className="dialog-title">{titles[action]}</h2>
        <p className="dialog-body">
          {action === 'cancel' && 'This will cancel the remaining items in your order. This action cannot be undone.'}
          {action === 'return' && 'Select the items you want to return and a reason to continue.'}
          {action === 'support' && 'Choose a topic and we will connect you with support.'}
          {action === 'invoice' && `Invoice ${ORDER.invoiceNumber} for order ${ORDER.orderNumber}.`}
          {action === 'share' && 'Share your order number with someone who is helping with this purchase.'}
        </p>
        <div className="dialog-actions">
          <button className="btn-ghost-sm" onClick={() => dispatch(closeOrderAction())}>Close</button>
          {action === 'cancel'
            ? <button className="btn-solid-danger">Confirm cancellation</button>
            : <button className="btn-primary">Continue</button>}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   36. MAIN PAGE COMPOSITION
   ════════════════════════════════════════════════════════════════════════ */

function OrdersDetailPageContent() {
  return (
    <div className="page-shell">
      <a href="#main-content" className="skip-link">Skip to order details</a>
      <EcommerceHeader />

      <div className="page-container">
        <Breadcrumbs />

        <main id="main-content">
          <OrderHeader />
          <OrderOverview />

          <div className="page-layout">
            <div className="page-main">
              <TrackingSection />
              <OrderItemsSection />
              <div className="two-col-block">
                <DeliveryAddressSection />
                <SectionCard title="Shipping" collapsible={false}>
                  <ShippingMethodSection />
                </SectionCard>
              </div>
              <PaymentSection />
              <ReturnsRefundsSection />
              <SupportSection />
            </div>

            <aside className="page-rail" aria-label="Order summary">
              <PriceBreakdownSection />
              <SellerSection />
              <InvoiceSection />
              <ReviewSection />
              <ReorderSection />
            </aside>
          </div>

          <RelatedRecommendations />
          <TrustSection />
        </main>
      </div>

      <EcommerceFooter />
      <OrderActionDialog />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   37. EXPORT — wrapped in Redux Provider
   ════════════════════════════════════════════════════════════════════════ */

export default function OrdersDetailPage() {
  return (
    <Provider store={store}>
      <OrdersDetailPageContent />
    </Provider>
  );
}