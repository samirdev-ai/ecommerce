"use client";

/**
 * CheckoutPage.tsx
 * ---------------------------------------------------------------------------
 * Enterprise single-page checkout experience.
 *
 * File map (search these section markers):
 *   1. Imports
 *   2. Type definitions
 *   3. Enums / discriminated unions
 *   4. Constants
 *   5. Mock data
 *   6. Financial utilities
 *   7. Validation utilities
 *   8. Redux slices
 *   9. Store + typed hooks + selectors
 *  10. Shared UI primitives
 *  11. Checkout header
 *  12. Progress components
 *  13. Contact components
 *  14. Address components
 *  15. Delivery components
 *  16. Payment components
 *  17. Billing components
 *  18. Coupon components
 *  19. Gift / rewards components
 *  20. Order review components
 *  21. Price summary components
 *  22. Place-order components
 *  23. Loading / error / success states
 *  24. Trust components
 *  25. Footer
 *  26. Main CheckoutPage composition
 *  27. Export
 * ---------------------------------------------------------------------------
 */

// =============================================================================
// 1. Imports
// =============================================================================

import {
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
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  Provider,
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";

// =============================================================================
// 2. Type definitions
// =============================================================================

/** All money values are integer minor units (cents) to avoid float drift. */
interface Money {
  amountMinor: number;
  currency: "USD";
}

type AddressType = "home" | "work" | "other";

interface Address {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  district?: string;
  postalCode: string;
  line1: string;
  line2?: string;
  landmark?: string;
  type: AddressType;
  isDefault: boolean;
}

type DeliveryAvailability = "available" | "unavailable";
type DeliveryTag = "recommended" | "fastest" | "free";

interface DeliveryOption {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  carrier?: string;
  etaLabel: string;
  dateLabel: string;
  priceMinor: number;
  availability: DeliveryAvailability;
  tags: DeliveryTag[];
}

interface CartItem {
  id: string;
  sellerId: string;
  productName: string;
  brand: string;
  variant?: string;
  swatch: string;
  initials: string;
  unitPriceMinor: number;
  originalUnitPriceMinor?: number;
  quantity: number;
}

interface Seller {
  id: string;
  name: string;
  fulfillment: string;
  isOfficialStore: boolean;
}

type CardBrand = "visa" | "mastercard" | "amex" | "discover";

type PaymentMethod =
  | {
      kind: "card";
      id: string;
      brand: CardBrand;
      last4: string;
      expMonth: number;
      expYear: number;
      isDefault: boolean;
    }
  | {
      kind: "wallet";
      id: string;
      label: string;
      description: string;
    }
  | {
      kind: "bank-transfer";
      id: string;
      bankName: string;
    }
  | {
      kind: "cash-on-delivery";
      id: string;
    }
  | {
      kind: "bnpl";
      id: string;
      provider: string;
      installments: number;
    }
  | {
      kind: "gift-card";
      id: string;
      label: string;
      balanceMinor: number;
    };

type PaymentMethodKind = PaymentMethod["kind"];

type DiscountKind = "percentage" | "fixed";

interface Coupon {
  code: string;
  description: string;
  discountKind: DiscountKind;
  discountValue: number; // percentage points, or fixed minor units
  maxDiscountMinor?: number;
  minimumOrderMinor: number;
  expiresOnLabel: string;
  sellerId?: string;
  eligible: boolean;
}

type CouponState =
  | { status: "idle" }
  | { status: "applying"; code: string }
  | { status: "applied"; coupon: Coupon }
  | { status: "invalid"; code: string; message: string }
  | { status: "expired"; code: string; message: string }
  | {
      status: "minimum-not-met";
      code: string;
      message: string;
      minimumMinor: number;
    }
  | { status: "not-eligible"; code: string; message: string };

type OrderFailureReason =
  | "payment-failed"
  | "inventory-changed"
  | "price-changed"
  | "delivery-unavailable"
  | "session-expired"
  | "service-issue";

type OrderStatus =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "processing"; stepIndex: number }
  | {
      status: "success";
      orderNumber: string;
      estimatedDeliveryLabel: string;
      totalMinor: number;
    }
  | { status: "failure"; reason: OrderFailureReason };

interface ValidationErrors {
  email?: string;
  phone?: string;
  address?: string;
  delivery?: string;
  payment?: string;
  billing?: string;
  terms?: string;
}

interface AddressDraft {
  fullName: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  district: string;
  postalCode: string;
  line1: string;
  line2: string;
  landmark: string;
  type: AddressType;
}

// =============================================================================
// 3. Enums / discriminated unions (checkout stage progress)
// =============================================================================

const CHECKOUT_STEPS = ["Cart", "Delivery", "Payment", "Review"] as const;
type CheckoutStepLabel = (typeof CHECKOUT_STEPS)[number];

// =============================================================================
// 4. Constants
// =============================================================================

const CURRENCY_SYMBOL = "$";
const TAX_RATE = 0.0825; // mock estimated rate — final tax calculated at checkout
const FREE_SHIPPING_THRESHOLD_MINOR = 7500;
const ORDER_NOTE_MAX_LENGTH = 240;
const GIFT_MESSAGE_MAX_LENGTH = 180;
const GIFT_WRAP_FEE_MINOR = 499;
const POINTS_TO_MINOR_RATE = 0.01; // 100 points = $1.00

const PROCESSING_MESSAGES = [
  "Confirming inventory…",
  "Calculating final total…",
  "Processing payment…",
  "Securing your order…",
] as const;

// =============================================================================
// 5. Mock data
// =============================================================================

const MOCK_SELLERS: Seller[] = [
  {
    id: "seller-nova",
    name: "Nova Electronics",
    fulfillment: "Fulfilled by Nova Electronics",
    isOfficialStore: true,
  },
  {
    id: "seller-summit",
    name: "Summit Outdoor Co.",
    fulfillment: "Ships from Summit Outdoor Co.",
    isOfficialStore: false,
  },
  {
    id: "seller-hearth",
    name: "Hearth & Table",
    fulfillment: "Fulfilled by platform logistics",
    isOfficialStore: true,
  },
];

const MOCK_CART_ITEMS: CartItem[] = [
  {
    id: "item-headphones",
    sellerId: "seller-nova",
    productName: "WH-1000XM5 Wireless Headphones",
    brand: "Sony",
    variant: "Midnight Black",
    swatch: "oklch(0.28 0.02 264)",
    initials: "WH",
    unitPriceMinor: 34800,
    originalUnitPriceMinor: 39900,
    quantity: 1,
  },
  {
    id: "item-charger",
    sellerId: "seller-nova",
    productName: "140W GaN Fast Charger, 3-Port",
    brand: "Anker",
    variant: "US Plug",
    swatch: "oklch(0.6 0.13 250)",
    initials: "GC",
    unitPriceMinor: 5499,
    quantity: 2,
  },
  {
    id: "item-runners",
    sellerId: "seller-summit",
    productName: "Air Zoom Pegasus 40 Running Shoes",
    brand: "Nike",
    variant: "Size US 10 / Storm Grey",
    swatch: "oklch(0.7 0.03 240)",
    initials: "PZ",
    unitPriceMinor: 12995,
    quantity: 1,
  },
  {
    id: "item-dutchoven",
    sellerId: "seller-hearth",
    productName: "Signature Round Dutch Oven, 5.5 Qt",
    brand: "Le Creuset",
    variant: "Flame",
    swatch: "oklch(0.62 0.19 35)",
    initials: "DO",
    unitPriceMinor: 36995,
    quantity: 1,
  },
];

const MOCK_DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: "del-nova-standard",
    sellerId: "seller-nova",
    name: "Standard Delivery",
    description: "Reliable ground shipping",
    carrier: "GlobalPost",
    etaLabel: "3–5 business days",
    dateLabel: "Sep 18–20",
    priceMinor: 0,
    availability: "available",
    tags: ["free"],
  },
  {
    id: "del-nova-express",
    sellerId: "seller-nova",
    name: "Express Delivery",
    description: "Priority handling and transit",
    carrier: "GlobalPost Express",
    etaLabel: "1–2 business days",
    dateLabel: "Sep 16–17",
    priceMinor: 999,
    availability: "available",
    tags: ["recommended"],
  },
  {
    id: "del-nova-sameday",
    sellerId: "seller-nova",
    name: "Same-Day Delivery",
    description: "Arrives today if ordered before 2 PM",
    carrier: "Metro Courier",
    etaLabel: "Today, by 9 PM",
    dateLabel: "Today",
    priceMinor: 1499,
    availability: "available",
    tags: ["fastest"],
  },
  {
    id: "del-summit-standard",
    sellerId: "seller-summit",
    name: "Standard Delivery",
    description: "Reliable ground shipping",
    carrier: "GlobalPost",
    etaLabel: "4–6 business days",
    dateLabel: "Sep 19–21",
    priceMinor: 599,
    availability: "available",
    tags: [],
  },
  {
    id: "del-summit-express",
    sellerId: "seller-summit",
    name: "Express Delivery",
    description: "Priority handling and transit",
    carrier: "GlobalPost Express",
    etaLabel: "2 business days",
    dateLabel: "Sep 17",
    priceMinor: 1299,
    availability: "available",
    tags: ["recommended"],
  },
  {
    id: "del-hearth-standard",
    sellerId: "seller-hearth",
    name: "Standard Freight",
    description: "Ground shipping — heavier item",
    carrier: "FreightLine",
    etaLabel: "5–7 business days",
    dateLabel: "Sep 20–22",
    priceMinor: 1899,
    availability: "available",
    tags: [],
  },
  {
    id: "del-hearth-express",
    sellerId: "seller-hearth",
    name: "Express Delivery",
    description: "Not available for this item's weight class",
    carrier: "FreightLine Express",
    etaLabel: "Unavailable",
    dateLabel: "—",
    priceMinor: 2999,
    availability: "unavailable",
    tags: [],
  },
];

const MOCK_ADDRESSES: Address[] = [
  {
    id: "addr-home",
    fullName: "Sabina Karki",
    phone: "+1 (415) 555-0148",
    country: "United States",
    state: "California",
    city: "San Francisco",
    district: "Mission District",
    postalCode: "94110",
    line1: "482 Valencia Street, Apt 3B",
    line2: "",
    landmark: "Near Dolores Park",
    type: "home",
    isDefault: true,
  },
  {
    id: "addr-work",
    fullName: "Sabina Karki",
    phone: "+1 (415) 555-0199",
    country: "United States",
    state: "California",
    city: "San Francisco",
    district: "SoMa",
    postalCode: "94103",
    line1: "1 Tower Place, Floor 12",
    line2: "Meridian Labs",
    landmark: "",
    type: "work",
    isDefault: false,
  },
];

const MOCK_SAVED_PAYMENT_METHODS: PaymentMethod[] = [
  {
    kind: "card",
    id: "pm-visa",
    brand: "visa",
    last4: "4242",
    expMonth: 8,
    expYear: 29,
    isDefault: true,
  },
  {
    kind: "card",
    id: "pm-mastercard",
    brand: "mastercard",
    last4: "8890",
    expMonth: 3,
    expYear: 27,
    isDefault: false,
  },
  {
    kind: "wallet",
    id: "pm-wallet",
    label: "Digital Wallet",
    description: "Pay with your device's secure wallet",
  },
  {
    kind: "bank-transfer",
    id: "pm-bank",
    bankName: "Direct Bank Transfer (ACH)",
  },
  {
    kind: "cash-on-delivery",
    id: "pm-cod",
  },
  {
    kind: "bnpl",
    id: "pm-bnpl",
    provider: "PayIn4",
    installments: 4,
  },
  {
    kind: "gift-card",
    id: "pm-giftcard",
    label: "Store Gift Card",
    balanceMinor: 0,
  },
];

const AVAILABLE_COUPONS: Coupon[] = [
  {
    code: "WELCOME10",
    description: "10% off your order, up to $20",
    discountKind: "percentage",
    discountValue: 10,
    maxDiscountMinor: 2000,
    minimumOrderMinor: 5000,
    expiresOnLabel: "Sep 30, 2026",
    eligible: true,
  },
  {
    code: "FREESHIP",
    description: "Free standard shipping on this order",
    discountKind: "fixed",
    discountValue: 0,
    minimumOrderMinor: 0,
    expiresOnLabel: "Oct 15, 2026",
    eligible: true,
  },
  {
    code: "SAVE25",
    description: "$25 off orders over $150",
    discountKind: "fixed",
    discountValue: 2500,
    minimumOrderMinor: 15000,
    expiresOnLabel: "Sep 20, 2026",
    eligible: true,
  },
  {
    code: "TECHSAVE",
    description: "15% off Nova Electronics items only",
    discountKind: "percentage",
    discountValue: 15,
    maxDiscountMinor: 5000,
    minimumOrderMinor: 0,
    expiresOnLabel: "Sep 14, 2026",
    sellerId: "seller-nova",
    eligible: true,
  },
];

const REWARDS_POINTS_AVAILABLE = 1240;
const STORE_CREDIT_AVAILABLE_MINOR = 1500;

const COUNTRY_OPTIONS = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "Singapore",
  "Australia",
] as const;

// =============================================================================
// 6. Financial utilities (integer minor-unit arithmetic only)
// =============================================================================

function formatMoney(amountMinor: number, currency: string = "USD"): string {
  const sign = amountMinor < 0 ? "-" : "";
  const abs = Math.abs(amountMinor);
  const symbol = currency === "USD" ? CURRENCY_SYMBOL : currency + " ";
  return `${sign}${symbol}${(abs / 100).toFixed(2)}`;
}

function lineTotalMinor(item: CartItem): number {
  return item.unitPriceMinor * item.quantity;
}

function lineOriginalTotalMinor(item: CartItem): number {
  return (item.originalUnitPriceMinor ?? item.unitPriceMinor) * item.quantity;
}

function calcSubtotalMinor(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + lineTotalMinor(item), 0);
}

function calcProductDiscountMinor(items: CartItem[]): number {
  return items.reduce(
    (sum, item) => sum + (lineOriginalTotalMinor(item) - lineTotalMinor(item)),
    0,
  );
}

function calcCouponDiscountMinor(
  coupon: Coupon | null,
  items: CartItem[],
  subtotalMinor: number,
): number {
  if (!coupon) return 0;
  const eligibleBaseMinor = coupon.sellerId
    ? calcSubtotalMinor(items.filter((item) => item.sellerId === coupon.sellerId))
    : subtotalMinor;
  if (eligibleBaseMinor <= 0) return 0;
  let discount =
    coupon.discountKind === "percentage"
      ? Math.round((eligibleBaseMinor * coupon.discountValue) / 100)
      : coupon.discountValue;
  if (coupon.maxDiscountMinor !== undefined) {
    discount = Math.min(discount, coupon.maxDiscountMinor);
  }
  return Math.min(discount, eligibleBaseMinor);
}

function calcShippingMinor(
  selectedOptions: DeliveryOption[],
  coupon: Coupon | null,
): number {
  const base = selectedOptions.reduce((sum, opt) => sum + opt.priceMinor, 0);
  if (coupon?.code === "FREESHIP") return 0;
  return base;
}

function calcFreeShippingSavingsMinor(
  selectedOptions: DeliveryOption[],
  subtotalAfterDiscountsMinor: number,
  coupon: Coupon | null,
): number {
  const base = selectedOptions.reduce((sum, opt) => sum + opt.priceMinor, 0);
  if (coupon?.code === "FREESHIP") return base;
  if (subtotalAfterDiscountsMinor >= FREE_SHIPPING_THRESHOLD_MINOR) return base;
  return 0;
}

function calcTaxMinor(taxableBaseMinor: number): number {
  return Math.max(0, Math.round(taxableBaseMinor * TAX_RATE));
}

function calcRewardsAppliedMinor(pointsApplied: number): number {
  return Math.round(pointsApplied * POINTS_TO_MINOR_RATE);
}

interface PricingBreakdown {
  subtotalMinor: number;
  productDiscountMinor: number;
  couponDiscountMinor: number;
  shippingMinor: number;
  freeShippingSavingsMinor: number;
  giftWrapFeeMinor: number;
  taxMinor: number;
  rewardsAppliedMinor: number;
  storeCreditAppliedMinor: number;
  totalSavingsMinor: number;
  grandTotalMinor: number;
}

function calcPricing(input: {
  items: CartItem[];
  selectedDeliveryOptions: DeliveryOption[];
  appliedCoupon: Coupon | null;
  giftWrapEnabled: boolean;
  pointsApplied: number;
  storeCreditAppliedMinor: number;
}): PricingBreakdown {
  const subtotalMinor = calcSubtotalMinor(input.items);
  const productDiscountMinor = calcProductDiscountMinor(input.items);
  const subtotalAfterProductDiscounts = subtotalMinor - productDiscountMinor;
  const couponDiscountMinor = calcCouponDiscountMinor(
    input.appliedCoupon,
    input.items,
    subtotalAfterProductDiscounts,
  );
  const shippingMinor = calcShippingMinor(
    input.selectedDeliveryOptions,
    input.appliedCoupon,
  );
  const freeShippingSavingsMinor = calcFreeShippingSavingsMinor(
    input.selectedDeliveryOptions,
    subtotalAfterProductDiscounts - couponDiscountMinor,
    input.appliedCoupon,
  );
  const giftWrapFeeMinor = input.giftWrapEnabled ? GIFT_WRAP_FEE_MINOR : 0;
  const taxableBaseMinor = Math.max(
    0,
    subtotalAfterProductDiscounts - couponDiscountMinor,
  );
  const taxMinor = calcTaxMinor(taxableBaseMinor);
  const rewardsAppliedMinor = calcRewardsAppliedMinor(input.pointsApplied);
  const storeCreditAppliedMinor = input.storeCreditAppliedMinor;

  const preRewardsTotal =
    subtotalAfterProductDiscounts -
    couponDiscountMinor +
    shippingMinor -
    freeShippingSavingsMinor +
    giftWrapFeeMinor +
    taxMinor;

  const grandTotalMinor = Math.max(
    0,
    preRewardsTotal - rewardsAppliedMinor - storeCreditAppliedMinor,
  );

  const totalSavingsMinor =
    productDiscountMinor + couponDiscountMinor + freeShippingSavingsMinor;

  return {
    subtotalMinor,
    productDiscountMinor,
    couponDiscountMinor,
    shippingMinor,
    freeShippingSavingsMinor,
    giftWrapFeeMinor,
    taxMinor,
    rewardsAppliedMinor,
    storeCreditAppliedMinor,
    totalSavingsMinor,
    grandTotalMinor,
  };
}

// =============================================================================
// 7. Validation utilities
// =============================================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+]?[\d\s().-]{7,}$/;

function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Email is required.";
  if (!EMAIL_PATTERN.test(value)) return "Enter a valid email address.";
  return undefined;
}

function validatePhone(value: string): string | undefined {
  if (!value.trim()) return "Phone number is required.";
  if (!PHONE_PATTERN.test(value)) return "Enter a valid phone number.";
  return undefined;
}

function validateAddressDraft(draft: AddressDraft): Partial<Record<keyof AddressDraft, string>> {
  const errors: Partial<Record<keyof AddressDraft, string>> = {};
  if (!draft.fullName.trim()) errors.fullName = "Full name is required.";
  if (!draft.phone.trim() || !PHONE_PATTERN.test(draft.phone)) {
    errors.phone = "Enter a valid phone number.";
  }
  if (!draft.country.trim()) errors.country = "Select a country.";
  if (!draft.state.trim()) errors.state = "State / province is required.";
  if (!draft.city.trim()) errors.city = "City is required.";
  if (!draft.postalCode.trim()) errors.postalCode = "Postal code is required.";
  if (!draft.line1.trim()) errors.line1 = "Address line 1 is required.";
  return errors;
}

function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\s+/g, "");
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function detectCardBrand(cardNumber: string): CardBrand | null {
  const digits = cardNumber.replace(/\s+/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(011|5)/.test(digits)) return "discover";
  return null;
}

interface NewCardFormState {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  securityCode: string;
  saveCard: boolean;
}

function validateNewCardForm(
  form: NewCardFormState,
): Partial<Record<keyof NewCardFormState, string>> {
  const errors: Partial<Record<keyof NewCardFormState, string>> = {};
  if (!form.cardholderName.trim()) {
    errors.cardholderName = "Cardholder name is required.";
  }
  if (!luhnCheck(form.cardNumber)) {
    errors.cardNumber = "Enter a valid card number.";
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry.trim())) {
    errors.expiry = "Use MM/YY format.";
  } else {
    const [monthStr, yearStr] = form.expiry.trim().split("/");
    const month = Number(monthStr);
    const year = 2000 + Number(yearStr);
    const now = new Date();
    const expiryDate = new Date(year, month, 0);
    if (expiryDate < now) errors.expiry = "This card has expired.";
  }
  if (!/^\d{3,4}$/.test(form.securityCode.trim())) {
    errors.securityCode = "Enter a valid security code.";
  }
  return errors;
}

function validateCouponAgainstOrder(
  coupon: Coupon,
  subtotalMinor: number,
  isExpired: boolean,
): CouponState {
  if (!coupon.eligible) {
    return {
      status: "not-eligible",
      code: coupon.code,
      message: "This coupon isn't eligible for the items in your cart.",
    };
  }
  if (isExpired) {
    return {
      status: "expired",
      code: coupon.code,
      message: `${coupon.code} expired on ${coupon.expiresOnLabel}.`,
    };
  }
  if (subtotalMinor < coupon.minimumOrderMinor) {
    return {
      status: "minimum-not-met",
      code: coupon.code,
      message: `Spend ${formatMoney(coupon.minimumOrderMinor)} or more to use this code.`,
      minimumMinor: coupon.minimumOrderMinor,
    };
  }
  return { status: "applied", coupon };
}

// =============================================================================
// 8. Redux slices
// =============================================================================

const RESET_CHECKOUT_ACTION = "checkout/resetCheckout";

type ContactMode = "guest" | "signed-in";

interface ContactState {
  email: string;
  phone: string;
  mode: ContactMode;
  marketingOptIn: boolean;
}

const contactSlice = createSlice({
  name: "contact",
  initialState: {
    email: "",
    phone: "",
    mode: "guest",
    marketingOptIn: false,
  } as ContactState,
  reducers: {
    setContactInformation(
      state,
      action: PayloadAction<{ email?: string; phone?: string }>,
    ) {
      if (action.payload.email !== undefined) state.email = action.payload.email;
      if (action.payload.phone !== undefined) state.phone = action.payload.phone;
    },
    setContactMode(state, action: PayloadAction<ContactMode>) {
      state.mode = action.payload;
    },
    setMarketingOptIn(state, action: PayloadAction<boolean>) {
      state.marketingOptIn = action.payload;
    },
  },
});

interface AddressesState {
  items: Address[];
  selectedAddressId: string | null;
}

let addressIdCounter = 0;

const addressesSlice = createSlice({
  name: "addresses",
  initialState: {
    items: MOCK_ADDRESSES,
    selectedAddressId:
      MOCK_ADDRESSES.find((address) => address.isDefault)?.id ??
      MOCK_ADDRESSES[0]?.id ??
      null,
  } as AddressesState,
  reducers: {
    selectAddress(state, action: PayloadAction<string>) {
      state.selectedAddressId = action.payload;
    },
    addAddress(state, action: PayloadAction<AddressDraft>) {
      addressIdCounter += 1;
      const newAddress: Address = {
        id: `addr-new-${addressIdCounter}`,
        fullName: action.payload.fullName,
        phone: action.payload.phone,
        country: action.payload.country,
        state: action.payload.state,
        city: action.payload.city,
        district: action.payload.district || undefined,
        postalCode: action.payload.postalCode,
        line1: action.payload.line1,
        line2: action.payload.line2 || undefined,
        landmark: action.payload.landmark || undefined,
        type: action.payload.type,
        isDefault: state.items.length === 0,
      };
      state.items.push(newAddress);
      state.selectedAddressId = newAddress.id;
    },
    updateAddress(
      state,
      action: PayloadAction<{ id: string; draft: AddressDraft }>,
    ) {
      const address = state.items.find((item) => item.id === action.payload.id);
      if (!address) return;
      Object.assign(address, {
        fullName: action.payload.draft.fullName,
        phone: action.payload.draft.phone,
        country: action.payload.draft.country,
        state: action.payload.draft.state,
        city: action.payload.draft.city,
        district: action.payload.draft.district || undefined,
        postalCode: action.payload.draft.postalCode,
        line1: action.payload.draft.line1,
        line2: action.payload.draft.line2 || undefined,
        landmark: action.payload.draft.landmark || undefined,
        type: action.payload.draft.type,
      });
    },
    removeAddress(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
      if (state.selectedAddressId === action.payload) {
        state.selectedAddressId =
          state.items.find((item) => item.isDefault)?.id ??
          state.items[0]?.id ??
          null;
      }
    },
  },
});

interface DeliveryState {
  selectedBySeller: Record<string, string>;
}

function defaultDeliverySelection(): Record<string, string> {
  const bySeller: Record<string, string> = {};
  for (const seller of MOCK_SELLERS) {
    const options = MOCK_DELIVERY_OPTIONS.filter(
      (opt) => opt.sellerId === seller.id && opt.availability === "available",
    );
    const recommended = options.find((opt) => opt.tags.includes("recommended"));
    const chosen = recommended ?? options[0];
    if (chosen) bySeller[seller.id] = chosen.id;
  }
  return bySeller;
}

const deliverySlice = createSlice({
  name: "delivery",
  initialState: {
    selectedBySeller: defaultDeliverySelection(),
  } as DeliveryState,
  reducers: {
    selectDeliveryMethod(
      state,
      action: PayloadAction<{ sellerId: string; optionId: string }>,
    ) {
      state.selectedBySeller[action.payload.sellerId] = action.payload.optionId;
    },
  },
});

interface PaymentState {
  savedMethods: PaymentMethod[];
  selectedMethodId: string | null;
}

let paymentIdCounter = 0;

const paymentSlice = createSlice({
  name: "payment",
  initialState: {
    savedMethods: MOCK_SAVED_PAYMENT_METHODS,
    selectedMethodId:
      MOCK_SAVED_PAYMENT_METHODS.find(
        (method) => method.kind === "card" && method.isDefault,
      )?.id ?? null,
  } as PaymentState,
  reducers: {
    selectPaymentMethod(state, action: PayloadAction<string>) {
      state.selectedMethodId = action.payload;
    },
    addPaymentMethod(
      state,
      action: PayloadAction<{ brand: CardBrand; last4: string; expMonth: number; expYear: number }>,
    ) {
      paymentIdCounter += 1;
      const newMethod: PaymentMethod = {
        kind: "card",
        id: `pm-new-${paymentIdCounter}`,
        brand: action.payload.brand,
        last4: action.payload.last4,
        expMonth: action.payload.expMonth,
        expYear: action.payload.expYear,
        isDefault: false,
      };
      state.savedMethods.push(newMethod);
      state.selectedMethodId = newMethod.id;
    },
    removePaymentMethod(state, action: PayloadAction<string>) {
      state.savedMethods = state.savedMethods.filter(
        (method) => method.id !== action.payload,
      );
      if (state.selectedMethodId === action.payload) {
        state.selectedMethodId = state.savedMethods[0]?.id ?? null;
      }
    },
  },
});

interface BillingState {
  sameAsShipping: boolean;
  address: Address | null;
}

const billingSlice = createSlice({
  name: "billing",
  initialState: { sameAsShipping: true, address: null } as BillingState,
  reducers: {
    setBillingSameAsShipping(state, action: PayloadAction<boolean>) {
      state.sameAsShipping = action.payload;
    },
    setBillingAddress(state, action: PayloadAction<AddressDraft>) {
      state.address = {
        id: "addr-billing",
        fullName: action.payload.fullName,
        phone: action.payload.phone,
        country: action.payload.country,
        state: action.payload.state,
        city: action.payload.city,
        district: action.payload.district || undefined,
        postalCode: action.payload.postalCode,
        line1: action.payload.line1,
        line2: action.payload.line2 || undefined,
        landmark: action.payload.landmark || undefined,
        type: action.payload.type,
        isDefault: false,
      };
    },
  },
});

const couponSlice = createSlice({
  name: "coupon",
  initialState: { status: "idle" } as CouponState,
  reducers: {
    setCouponApplying(state, action: PayloadAction<string>) {
      return { status: "applying", code: action.payload };
    },
    setCouponResult(_state, action: PayloadAction<CouponState>) {
      return action.payload;
    },
    removeCoupon() {
      return { status: "idle" };
    },
  },
});

interface GiftState {
  wrapEnabled: boolean;
  message: string;
  includeReceipt: boolean;
  hidePrice: boolean;
}

const giftSlice = createSlice({
  name: "gift",
  initialState: {
    wrapEnabled: false,
    message: "",
    includeReceipt: false,
    hidePrice: false,
  } as GiftState,
  reducers: {
    setGiftOptions(state, action: PayloadAction<Partial<GiftState>>) {
      Object.assign(state, action.payload);
    },
  },
});

interface OrderNoteState {
  text: string;
}

const orderNoteSlice = createSlice({
  name: "orderNote",
  initialState: { text: "" } as OrderNoteState,
  reducers: {
    setOrderNote(state, action: PayloadAction<string>) {
      state.text = action.payload.slice(0, ORDER_NOTE_MAX_LENGTH);
    },
  },
});

interface RewardsState {
  pointsApplied: number;
  storeCreditAppliedMinor: number;
}

const rewardsSlice = createSlice({
  name: "rewards",
  initialState: { pointsApplied: 0, storeCreditAppliedMinor: 0 } as RewardsState,
  reducers: {
    applyRewards(
      state,
      action: PayloadAction<{ points: number; storeCreditMinor: number }>,
    ) {
      state.pointsApplied = action.payload.points;
      state.storeCreditAppliedMinor = action.payload.storeCreditMinor;
    },
    removeRewards(state) {
      state.pointsApplied = 0;
      state.storeCreditAppliedMinor = 0;
    },
  },
});

interface OrderSliceState {
  status: OrderStatus;
  termsAccepted: boolean;
}

const orderSlice = createSlice({
  name: "order",
  initialState: {
    status: { status: "idle" },
    termsAccepted: false,
  } as OrderSliceState,
  reducers: {
    setTermsAccepted(state, action: PayloadAction<boolean>) {
      state.termsAccepted = action.payload;
    },
    startOrderPlacement(state) {
      state.status = { status: "validating" };
    },
    setOrderProcessing(state, action: PayloadAction<number>) {
      state.status = { status: "processing", stepIndex: action.payload };
    },
    setOrderSuccess(
      state,
      action: PayloadAction<{
        orderNumber: string;
        estimatedDeliveryLabel: string;
        totalMinor: number;
      }>,
    ) {
      state.status = { status: "success", ...action.payload };
    },
    setOrderFailure(state, action: PayloadAction<OrderFailureReason>) {
      state.status = { status: "failure", reason: action.payload };
    },
    resetOrderStatus(state) {
      state.status = { status: "idle" };
    },
  },
});

interface UiState {
  submitAttempted: boolean;
}

const uiSlice = createSlice({
  name: "ui",
  initialState: { submitAttempted: false } as UiState,
  reducers: {
    setSubmitAttempted(state, action: PayloadAction<boolean>) {
      state.submitAttempted = action.payload;
    },
  },
});

export const {
  setContactInformation,
  setContactMode,
  setMarketingOptIn,
} = contactSlice.actions;
export const { selectAddress, addAddress, updateAddress, removeAddress } =
  addressesSlice.actions;
export const { selectDeliveryMethod } = deliverySlice.actions;
export const { selectPaymentMethod, addPaymentMethod, removePaymentMethod } =
  paymentSlice.actions;
export const { setBillingSameAsShipping, setBillingAddress } =
  billingSlice.actions;
export const { setCouponApplying, setCouponResult, removeCoupon } =
  couponSlice.actions;
export const { setGiftOptions } = giftSlice.actions;
export const { setOrderNote } = orderNoteSlice.actions;
export const { applyRewards, removeRewards } = rewardsSlice.actions;
export const {
  setTermsAccepted,
  startOrderPlacement,
  setOrderProcessing,
  setOrderSuccess,
  setOrderFailure,
  resetOrderStatus,
} = orderSlice.actions;
export const { setSubmitAttempted } = uiSlice.actions;

function resetCheckout() {
  return { type: RESET_CHECKOUT_ACTION } as const;
}

// =============================================================================
// 9. Store + typed hooks + selectors
// =============================================================================

const sliceReducers = {
  contact: contactSlice.reducer,
  addresses: addressesSlice.reducer,
  delivery: deliverySlice.reducer,
  payment: paymentSlice.reducer,
  billing: billingSlice.reducer,
  coupon: couponSlice.reducer,
  gift: giftSlice.reducer,
  orderNote: orderNoteSlice.reducer,
  rewards: rewardsSlice.reducer,
  order: orderSlice.reducer,
  ui: uiSlice.reducer,
};

type SliceReducers = typeof sliceReducers;
type RootState = { [K in keyof SliceReducers]: ReturnType<SliceReducers[K]> };

function rootReducer(
  state: RootState | undefined,
  action: Parameters<SliceReducers["ui"]>[1],
): RootState {
  const nextState = action.type === RESET_CHECKOUT_ACTION ? undefined : state;
  return {
    contact: contactSlice.reducer(nextState?.contact, action),
    addresses: addressesSlice.reducer(nextState?.addresses, action),
    delivery: deliverySlice.reducer(nextState?.delivery, action),
    payment: paymentSlice.reducer(nextState?.payment, action),
    billing: billingSlice.reducer(nextState?.billing, action),
    coupon: couponSlice.reducer(nextState?.coupon, action),
    gift: giftSlice.reducer(nextState?.gift, action),
    orderNote: orderNoteSlice.reducer(nextState?.orderNote, action),
    rewards: rewardsSlice.reducer(nextState?.rewards, action),
    order: orderSlice.reducer(nextState?.order, action),
    ui: uiSlice.reducer(nextState?.ui, action),
  };
}

function createCheckoutStore() {
  return configureStore({ reducer: rootReducer });
}

type AppStore = ReturnType<typeof createCheckoutStore>;
type AppDispatch = AppStore["dispatch"];

const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// --- Simple selectors (single slice, cheap) ---
const selectContact = (state: RootState) => state.contact;
const selectAddressesState = (state: RootState) => state.addresses;
const selectDeliveryState = (state: RootState) => state.delivery;
const selectPaymentState = (state: RootState) => state.payment;
const selectBillingState = (state: RootState) => state.billing;
const selectCouponState = (state: RootState) => state.coupon;
const selectGiftState = (state: RootState) => state.gift;
const selectOrderNoteState = (state: RootState) => state.orderNote;
const selectRewardsState = (state: RootState) => state.rewards;
const selectOrderState = (state: RootState) => state.order;
const selectUiState = (state: RootState) => state.ui;

// --- Derived (light) selectors ---
function selectSelectedAddress(state: RootState): Address | null {
  return (
    state.addresses.items.find(
      (item) => item.id === state.addresses.selectedAddressId,
    ) ?? null
  );
}

function selectSelectedPaymentMethod(state: RootState): PaymentMethod | null {
  return (
    state.payment.savedMethods.find(
      (method) => method.id === state.payment.selectedMethodId,
    ) ?? null
  );
}

function selectAppliedCoupon(state: RootState): Coupon | null {
  return state.coupon.status === "applied" ? state.coupon.coupon : null;
}

// =============================================================================
// 10. Shared UI primitives
// =============================================================================

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50",
  secondary:
    "bg-secondary text-secondary-foreground border border-border hover:bg-muted disabled:opacity-50",
  ghost: "text-foreground hover:bg-muted disabled:opacity-50",
  destructive:
    "bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50",
};

const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

function Button({
  variant = "primary",
  size = "md",
  className = "",
  isLoading = false,
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  isLoading?: boolean;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${BUTTON_VARIANT_CLASSES[variant]} ${BUTTON_SIZE_CLASSES[size]} ${className}`}
      aria-busy={isLoading || undefined}
      disabled={isLoading || rest.disabled}
      {...rest}
    >
      {isLoading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}

function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "info" | "accent";
  children: ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    info: "bg-info/15 text-info",
    accent: "bg-accent/20 text-accent-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

function SectionCard({
  title,
  description,
  step,
  isComplete,
  headerAction,
  children,
  cardRef,
}: {
  title: string;
  description?: string;
  step: number;
  isComplete?: boolean;
  headerAction?: ReactNode;
  children: ReactNode;
  cardRef?: React.Ref<HTMLElement>;
}) {
  return (
    <section
      ref={cardRef}
      tabIndex={-1}
      aria-labelledby={`section-heading-${step}`}
      className="scroll-mt-24 rounded-lg border border-border bg-card p-5 sm:p-6 focus:outline-none"
    >
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              isComplete
                ? "bg-success/15 text-success"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {isComplete ? "✓" : step}
          </span>
          <div>
            <h2
              id={`section-heading-${step}`}
              className="text-base font-semibold text-card-foreground"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {headerAction}
      </header>
      {children}
    </section>
  );
}

function FieldShell({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1 text-xs text-destructive">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
}

const inputBaseClasses =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50";

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  required,
  type = "text",
  autoComplete,
  placeholder,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={inputBaseClasses}
      />
    </FieldShell>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  error,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  error?: string;
  required?: boolean;
}) {
  return (
    <FieldShell id={id} label={label} error={error} required={required}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputBaseClasses}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

function Checkbox({
  id,
  label,
  checked,
  onChange,
  description,
}: {
  id: string;
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      />
      <label htmlFor={id} className="text-sm text-foreground">
        {label}
        {description && (
          <span className="block text-xs text-muted-foreground">{description}</span>
        )}
      </label>
    </div>
  );
}

function SelectableCard({
  id,
  name,
  selected,
  onSelect,
  disabled,
  children,
}: {
  id: string;
  name: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-colors ${
        disabled
          ? "cursor-not-allowed border-border bg-muted/50 opacity-60"
          : selected
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "border-border hover:border-muted-foreground/40"
      }`}
    >
      <input
        type="radio"
        id={id}
        name={name}
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        className="mt-0.5 h-4 w-4 shrink-0 border-input text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      />
      <div className="flex-1">{children}</div>
    </label>
  );
}

function InlineAlert({
  tone,
  children,
}: {
  tone: "destructive" | "warning" | "info" | "success";
  children: ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
    warning: "border-warning/40 bg-warning/15 text-warning-foreground",
    info: "border-info/30 bg-info/10 text-info",
    success: "border-success/30 bg-success/10 text-success",
  };
  return (
    <div
      role={tone === "destructive" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${toneClasses[tone]}`}
    >
      {children}
    </div>
  );
}

function CardBrandMark({ brand }: { brand: CardBrand }) {
  const labels: Record<CardBrand, string> = {
    visa: "VISA",
    mastercard: "MC",
    amex: "AMEX",
    discover: "DISC",
  };
  return (
    <span className="flex h-6 w-10 shrink-0 items-center justify-center rounded border border-border bg-secondary text-[10px] font-bold tracking-wide text-secondary-foreground">
      {labels[brand]}
    </span>
  );
}

// =============================================================================
// 11. Checkout header
// =============================================================================

function CheckoutLogo() {
  return (
    <a href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
      >
        M
      </span>
      Meridian
    </a>
  );
}

function SecureCheckoutIndicator() {
  return (
    <span className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground sm:flex">
      <span aria-hidden="true">🔒</span> Secure Checkout
    </span>
  );
}

function CheckoutHeader({ currentStepIndex }: { currentStepIndex: number }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CheckoutLogo />
            <a
              href="/cart"
              className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              ← Back to cart
            </a>
          </div>
          <div className="flex items-center gap-4">
            <SecureCheckoutIndicator />
            <a
              href="/support"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Help
            </a>
          </div>
        </div>
        <CheckoutProgress currentStepIndex={currentStepIndex} />
      </div>
    </header>
  );
}

// =============================================================================
// 12. Progress components
// =============================================================================

function CheckoutProgress({ currentStepIndex }: { currentStepIndex: number }) {
  return (
    <ol
      aria-label="Checkout progress"
      className="flex items-center gap-2 text-sm"
    >
      {CHECKOUT_STEPS.map((label, index) => {
        const isCurrent = index === currentStepIndex;
        const isDone = index < currentStepIndex;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={`flex items-center gap-1.5 font-medium ${
                isCurrent
                  ? "text-primary"
                  : isDone
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  isDone
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-2 border-primary"
                      : "border border-border"
                }`}
              >
                {isDone ? "✓" : index + 1}
              </span>
              {label}
            </span>
            {index < CHECKOUT_STEPS.length - 1 && (
              <span aria-hidden="true" className="h-px w-6 bg-border sm:w-10" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// =============================================================================
// 13. Contact components
// =============================================================================

function AccountBenefits() {
  return (
    <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
      <li>• Track orders in one place</li>
      <li>• Faster checkout next time</li>
      <li>• Save addresses &amp; payment methods</li>
      <li>• Early access to member pricing</li>
    </ul>
  );
}

function ContactInformationSection({
  submitAttempted,
  sectionRef,
}: {
  submitAttempted: boolean;
  sectionRef?: React.Ref<HTMLElement>;
}) {
  const dispatch = useAppDispatch();
  const contact = useAppSelector(selectContact);
  const emailError = submitAttempted ? validateEmail(contact.email) : undefined;
  const phoneError = submitAttempted ? validatePhone(contact.phone) : undefined;

  return (
    <SectionCard
      step={1}
      title="Contact information"
      description="We'll send your order confirmation and delivery updates here."
      isComplete={!validateEmail(contact.email) && !validatePhone(contact.phone)}
      cardRef={sectionRef}
    >
      {contact.mode === "guest" ? (
        <div className="mb-4 flex flex-col gap-2 rounded-md bg-muted p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Checking out as a guest.{" "}
            <button
              type="button"
              onClick={() => dispatch(setContactMode("signed-in"))}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Sign in
            </button>{" "}
            for faster checkout.
          </p>
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between rounded-md border border-success/30 bg-success/10 p-3">
          <p className="text-sm text-success">
            Signed in — order will be added to your account.
          </p>
          <button
            type="button"
            onClick={() => dispatch(setContactMode("guest"))}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Not you?
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="contact-email"
          label="Email address"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={contact.email}
          error={emailError}
          onChange={(value) => dispatch(setContactInformation({ email: value }))}
        />
        <TextField
          id="contact-phone"
          label="Phone number"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+1 (555) 123-4567"
          value={contact.phone}
          error={phoneError}
          onChange={(value) => dispatch(setContactInformation({ phone: value }))}
        />
      </div>

      <div className="mt-4">
        <Checkbox
          id="marketing-opt-in"
          checked={contact.marketingOptIn}
          onChange={(checked) => dispatch(setMarketingOptIn(checked))}
          label="Send me order updates and occasional offers"
        />
      </div>

      {contact.mode === "guest" && <AccountBenefits />}
    </SectionCard>
  );
}

// =============================================================================
// 14. Address components
// =============================================================================

const ADDRESS_TYPE_LABEL: Record<AddressType, string> = {
  home: "Home",
  work: "Work",
  other: "Other",
};

const EMPTY_ADDRESS_DRAFT: AddressDraft = {
  fullName: "",
  phone: "",
  country: COUNTRY_OPTIONS[0],
  state: "",
  city: "",
  district: "",
  postalCode: "",
  line1: "",
  line2: "",
  landmark: "",
  type: "home",
};

function addressToDraft(address: Address): AddressDraft {
  return {
    fullName: address.fullName,
    phone: address.phone,
    country: address.country,
    state: address.state,
    city: address.city,
    district: address.district ?? "",
    postalCode: address.postalCode,
    line1: address.line1,
    line2: address.line2 ?? "",
    landmark: address.landmark ?? "",
    type: address.type,
  };
}

function AddressForm({
  initialDraft,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  initialDraft: AddressDraft;
  onCancel: () => void;
  onSubmit: (draft: AddressDraft) => void;
  submitLabel: string;
}) {
  const formId = useId();
  const [draft, setDraft] = useState<AddressDraft>(initialDraft);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressDraft, string>>>({});

  function updateField<K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateAddressDraft(draft);
    setErrors(validation);
    if (Object.keys(validation).length === 0) {
      onSubmit(draft);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-col gap-4 rounded-md border border-border bg-muted/40 p-4"
      aria-label="Address form"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`${formId}-fullName`}
          label="Full name"
          required
          value={draft.fullName}
          error={errors.fullName}
          onChange={(value) => updateField("fullName", value)}
        />
        <TextField
          id={`${formId}-phone`}
          label="Phone"
          type="tel"
          required
          value={draft.phone}
          error={errors.phone}
          onChange={(value) => updateField("phone", value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id={`${formId}-country`}
          label="Country"
          required
          value={draft.country}
          options={COUNTRY_OPTIONS}
          error={errors.country}
          onChange={(value) => updateField("country", value)}
        />
        <TextField
          id={`${formId}-state`}
          label="State / province"
          required
          value={draft.state}
          error={errors.state}
          onChange={(value) => updateField("state", value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`${formId}-city`}
          label="City"
          required
          value={draft.city}
          error={errors.city}
          onChange={(value) => updateField("city", value)}
        />
        <TextField
          id={`${formId}-district`}
          label="District / region"
          value={draft.district}
          onChange={(value) => updateField("district", value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`${formId}-postalCode`}
          label="Postal code"
          required
          value={draft.postalCode}
          error={errors.postalCode}
          onChange={(value) => updateField("postalCode", value)}
        />
        <FieldShell id={`${formId}-type`} label="Address type">
          <div className="flex gap-2">
            {(Object.keys(ADDRESS_TYPE_LABEL) as AddressType[]).map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={draft.type === type}
                onClick={() => updateField("type", type)}
                className={`h-10 flex-1 rounded-md border text-sm font-medium transition-colors ${
                  draft.type === type
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:border-muted-foreground/40"
                }`}
              >
                {ADDRESS_TYPE_LABEL[type]}
              </button>
            ))}
          </div>
        </FieldShell>
      </div>
      <TextField
        id={`${formId}-line1`}
        label="Address line 1"
        required
        value={draft.line1}
        error={errors.line1}
        onChange={(value) => updateField("line1", value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`${formId}-line2`}
          label="Address line 2 (optional)"
          value={draft.line2}
          onChange={(value) => updateField("line2", value)}
        />
        <TextField
          id={`${formId}-landmark`}
          label="Landmark (optional)"
          value={draft.landmark}
          onChange={(value) => updateField("landmark", value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function AddressCard({
  address,
  selected,
  onSelect,
  onEdit,
  onRemove,
}: {
  address: Address;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <SelectableCard
      id={`address-${address.id}`}
      name="shipping-address"
      selected={selected}
      onSelect={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
            {address.fullName}
            <Badge tone="neutral">{ADDRESS_TYPE_LABEL[address.type]}</Badge>
            {address.isDefault && <Badge tone="info">Default</Badge>}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
            {address.state} {address.postalCode}
          </p>
          <p className="text-sm text-muted-foreground">{address.phone}</p>
        </div>
        <div className="flex shrink-0 gap-3 text-sm">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onEdit();
            }}
            className="font-medium text-primary hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onRemove();
            }}
            className="font-medium text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        </div>
      </div>
    </SelectableCard>
  );
}

function ShippingAddressSection({
  submitAttempted,
  sectionRef,
}: {
  submitAttempted: boolean;
  sectionRef?: React.Ref<HTMLElement>;
}) {
  const dispatch = useAppDispatch();
  const { items, selectedAddressId } = useAppSelector(selectAddressesState);
  const [mode, setMode] = useState<{ type: "list" } | { type: "add" } | { type: "edit"; id: string }>(
    { type: "list" },
  );

  const hasSelection = Boolean(selectedAddressId);
  const showError = submitAttempted && !hasSelection;

  return (
    <SectionCard
      step={2}
      title="Shipping address"
      description="Choose where your order should be delivered."
      isComplete={hasSelection}
      cardRef={sectionRef}
    >
      {items.length === 0 && (
        <p className="mb-3 text-sm text-muted-foreground">
          You don't have any saved addresses yet.
        </p>
      )}

      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Shipping address">
        {items.map((address) =>
          mode.type === "edit" && mode.id === address.id ? (
            <AddressForm
              key={address.id}
              initialDraft={addressToDraft(address)}
              submitLabel="Save address"
              onCancel={() => setMode({ type: "list" })}
              onSubmit={(draft) => {
                dispatch(updateAddress({ id: address.id, draft }));
                setMode({ type: "list" });
              }}
            />
          ) : (
            <AddressCard
              key={address.id}
              address={address}
              selected={address.id === selectedAddressId}
              onSelect={() => dispatch(selectAddress(address.id))}
              onEdit={() => setMode({ type: "edit", id: address.id })}
              onRemove={() => dispatch(removeAddress(address.id))}
            />
          ),
        )}
      </div>

      {showError && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          Select or add a shipping address to continue.
        </p>
      )}

      {mode.type === "add" ? (
        <AddressForm
          initialDraft={EMPTY_ADDRESS_DRAFT}
          submitLabel="Add address"
          onCancel={() => setMode({ type: "list" })}
          onSubmit={(draft) => {
            dispatch(addAddress(draft));
            setMode({ type: "list" });
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setMode({ type: "add" })}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          + Add a new address
        </button>
      )}
    </SectionCard>
  );
}

// =============================================================================
// 15. Delivery components
// =============================================================================

interface SellerGroup {
  seller: Seller;
  items: CartItem[];
  options: DeliveryOption[];
}

function buildSellerGroups(items: CartItem[], sellers: Seller[]): SellerGroup[] {
  return sellers
    .map((seller) => ({
      seller,
      items: items.filter((item) => item.sellerId === seller.id),
      options: MOCK_DELIVERY_OPTIONS.filter((opt) => opt.sellerId === seller.id),
    }))
    .filter((group) => group.items.length > 0);
}

const DELIVERY_TAG_LABEL: Record<DeliveryTag, string> = {
  recommended: "Recommended",
  fastest: "Fastest",
  free: "Free",
};

function DeliveryOptionRow({
  option,
  selected,
  onSelect,
}: {
  option: DeliveryOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const isUnavailable = option.availability === "unavailable";
  return (
    <SelectableCard
      id={`delivery-${option.id}`}
      name={`delivery-${option.sellerId}`}
      selected={selected}
      disabled={isUnavailable}
      onSelect={onSelect}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
            {option.name}
            {option.tags.map((tag) => (
              <Badge key={tag} tone={tag === "free" ? "success" : "accent"}>
                {DELIVERY_TAG_LABEL[tag]}
              </Badge>
            ))}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {option.description}
            {option.carrier ? ` · ${option.carrier}` : ""}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isUnavailable ? "Not available for this address" : `Arrives ${option.dateLabel} · ${option.etaLabel}`}
          </p>
        </div>
        <p className="whitespace-nowrap text-sm font-semibold text-foreground">
          {isUnavailable
            ? "—"
            : option.priceMinor === 0
              ? "FREE"
              : formatMoney(option.priceMinor)}
        </p>
      </div>
    </SelectableCard>
  );
}

function SellerDeliveryGroup({
  group,
  selectedOptionId,
}: {
  group: SellerGroup;
  selectedOptionId: string | undefined;
}) {
  const dispatch = useAppDispatch();
  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{group.seller.name}</p>
          <p className="text-xs text-muted-foreground">{group.seller.fulfillment}</p>
        </div>
        {group.seller.isOfficialStore && <Badge tone="info">Official Store</Badge>}
      </div>
      <ul className="mb-3 flex flex-col gap-1 text-sm text-muted-foreground">
        {group.items.map((item) => (
          <li key={item.id}>
            {item.productName} × {item.quantity}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        {group.options.map((option) => (
          <DeliveryOptionRow
            key={option.id}
            option={option}
            selected={option.id === selectedOptionId}
            onSelect={() =>
              dispatch(
                selectDeliveryMethod({ sellerId: group.seller.id, optionId: option.id }),
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function DeliveryMethodSection({
  sellerGroups,
  submitAttempted,
  sectionRef,
}: {
  sellerGroups: SellerGroup[];
  submitAttempted: boolean;
  sectionRef?: React.Ref<HTMLElement>;
}) {
  const selectedBySeller = useAppSelector(
    (state) => selectDeliveryState(state).selectedBySeller,
  );
  const allSelected = sellerGroups.every((group) => selectedBySeller[group.seller.id]);
  return (
    <SectionCard
      step={3}
      title="Delivery method"
      description="Shipping options vary by seller. Choose one for each."
      isComplete={allSelected}
      cardRef={sectionRef}
    >
      <div className="flex flex-col gap-4">
        {sellerGroups.map((group) => (
          <SellerDeliveryGroup
            key={group.seller.id}
            group={group}
            selectedOptionId={selectedBySeller[group.seller.id]}
          />
        ))}
      </div>
      {submitAttempted && !allSelected && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          Choose a delivery method for every seller in your order.
        </p>
      )}
    </SectionCard>
  );
}

// =============================================================================
// 16. Payment components
// =============================================================================

function SavedCardRow({
  method,
  selected,
  onSelect,
  onRemove,
}: {
  method: Extract<PaymentMethod, { kind: "card" }>;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const expiryLabel = `${String(method.expMonth).padStart(2, "0")}/${method.expYear}`;
  return (
    <SelectableCard
      id={`payment-${method.id}`}
      name="payment-method"
      selected={selected}
      onSelect={onSelect}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CardBrandMark brand={method.brand} />
          <div>
            <p className="text-sm font-medium text-foreground">
              {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
            </p>
            <p className="text-xs text-muted-foreground">Expires {expiryLabel}</p>
          </div>
          {method.isDefault && <Badge tone="neutral">Default</Badge>}
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onRemove();
          }}
          className="text-sm font-medium text-muted-foreground hover:text-destructive"
        >
          Remove
        </button>
      </div>
    </SelectableCard>
  );
}

function GenericMethodRow({
  method,
  selected,
  onSelect,
  label,
  description,
}: {
  method: PaymentMethod;
  selected: boolean;
  onSelect: () => void;
  label: string;
  description: string;
}) {
  return (
    <SelectableCard
      id={`payment-${method.id}`}
      name="payment-method"
      selected={selected}
      onSelect={onSelect}
    >
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </SelectableCard>
  );
}

function NewCardForm({ onAdded }: { onAdded: () => void }) {
  const dispatch = useAppDispatch();
  const formId = useId();
  const [form, setForm] = useState<NewCardFormState>({
    cardholderName: "",
    cardNumber: "",
    expiry: "",
    securityCode: "",
    saveCard: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof NewCardFormState, string>>>({});

  function updateField<K extends keyof NewCardFormState>(key: K, value: NewCardFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateNewCardForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    const brand = detectCardBrand(form.cardNumber) ?? "visa";
    const last4 = form.cardNumber.replace(/\s+/g, "").slice(-4);
    const [monthStr, yearStr] = form.expiry.trim().split("/");
    dispatch(
      addPaymentMethod({
        brand,
        last4,
        expMonth: Number(monthStr),
        expYear: Number(yearStr),
      }),
    );
    onAdded();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-md border border-border bg-muted/40 p-4"
      aria-label="Add new card"
    >
      <TextField
        id={`${formId}-name`}
        label="Cardholder name"
        required
        autoComplete="cc-name"
        value={form.cardholderName}
        error={errors.cardholderName}
        onChange={(value) => updateField("cardholderName", value)}
      />
      <TextField
        id={`${formId}-number`}
        label="Card number"
        required
        autoComplete="cc-number"
        placeholder="1234 1234 1234 1234"
        value={form.cardNumber}
        error={errors.cardNumber}
        onChange={(value) => updateField("cardNumber", value)}
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField
          id={`${formId}-expiry`}
          label="Expiry date"
          required
          autoComplete="cc-exp"
          placeholder="MM/YY"
          value={form.expiry}
          error={errors.expiry}
          onChange={(value) => updateField("expiry", value)}
        />
        <TextField
          id={`${formId}-cvc`}
          label="Security code"
          required
          type="password"
          autoComplete="cc-csc"
          placeholder="•••"
          value={form.securityCode}
          error={errors.securityCode}
          onChange={(value) => updateField("securityCode", value)}
        />
      </div>
      <Checkbox
        id={`${formId}-save`}
        checked={form.saveCard}
        onChange={(checked) => updateField("saveCard", checked)}
        label="Save this card for future purchases"
      />
      <p className="text-xs text-muted-foreground">
        Card details are encrypted and sent directly to our payment processor —
        never stored on this device.
      </p>
      <div className="flex justify-end">
        <Button type="submit" size="sm">
          Add card
        </Button>
      </div>
    </form>
  );
}

function PaymentSecurity() {
  return (
    <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden="true">🔒</span> Your payment information is encrypted
      and processed securely.
    </p>
  );
}

function PaymentSection({
  submitAttempted,
  sectionRef,
}: {
  submitAttempted: boolean;
  sectionRef?: React.Ref<HTMLElement>;
}) {
  const dispatch = useAppDispatch();
  const { savedMethods, selectedMethodId } = useAppSelector(selectPaymentState);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const hasSelection = Boolean(selectedMethodId);

  return (
    <SectionCard
      step={4}
      title="Payment method"
      description="Choose how you'd like to pay. No payment is processed until you place your order."
      isComplete={hasSelection}
      cardRef={sectionRef}
    >
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Payment method">
        {savedMethods.map((method) => {
          const selected = method.id === selectedMethodId;
          const onSelect = () => dispatch(selectPaymentMethod(method.id));
          switch (method.kind) {
            case "card":
              return (
                <SavedCardRow
                  key={method.id}
                  method={method}
                  selected={selected}
                  onSelect={onSelect}
                  onRemove={() => dispatch(removePaymentMethod(method.id))}
                />
              );
            case "wallet":
              return (
                <GenericMethodRow
                  key={method.id}
                  method={method}
                  selected={selected}
                  onSelect={onSelect}
                  label={method.label}
                  description={method.description}
                />
              );
            case "bank-transfer":
              return (
                <GenericMethodRow
                  key={method.id}
                  method={method}
                  selected={selected}
                  onSelect={onSelect}
                  label={method.bankName}
                  description="Funds typically clear in 1–3 business days."
                />
              );
            case "cash-on-delivery":
              return (
                <GenericMethodRow
                  key={method.id}
                  method={method}
                  selected={selected}
                  onSelect={onSelect}
                  label="Cash on Delivery"
                  description="Pay in cash when your order arrives."
                />
              );
            case "bnpl":
              return (
                <GenericMethodRow
                  key={method.id}
                  method={method}
                  selected={selected}
                  onSelect={onSelect}
                  label={`${method.provider} — ${method.installments} interest-free payments`}
                  description="Approval is instant and doesn't affect your credit score."
                />
              );
            case "gift-card":
              return (
                <GenericMethodRow
                  key={method.id}
                  method={method}
                  selected={selected}
                  onSelect={onSelect}
                  label={method.label}
                  description={
                    method.balanceMinor > 0
                      ? `Balance: ${formatMoney(method.balanceMinor)}`
                      : "No gift card balance on this account"
                  }
                />
              );
            default:
              return null;
          }
        })}
      </div>

      {showNewCardForm ? (
        <div className="mt-3">
          <NewCardForm onAdded={() => setShowNewCardForm(false)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewCardForm(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          + Add a new card
        </button>
      )}

      {submitAttempted && !hasSelection && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          Select a payment method to continue.
        </p>
      )}

      <PaymentSecurity />
    </SectionCard>
  );
}

// =============================================================================
// 17. Billing components
// =============================================================================

function BillingAddressSection({
  shippingAddress,
}: {
  shippingAddress: Address | null;
}) {
  const dispatch = useAppDispatch();
  const billing = useAppSelector(selectBillingState);
  const [showForm, setShowForm] = useState(false);

  return (
    <SectionCard step={5} title="Billing address" isComplete>
      <Checkbox
        id="billing-same-as-shipping"
        checked={billing.sameAsShipping}
        onChange={(checked) => {
          dispatch(setBillingSameAsShipping(checked));
          setShowForm(!checked);
        }}
        label="Same as shipping address"
      />

      {billing.sameAsShipping ? (
        shippingAddress && (
          <p className="mt-3 text-sm text-muted-foreground">
            {shippingAddress.line1}, {shippingAddress.city}, {shippingAddress.state}{" "}
            {shippingAddress.postalCode}
          </p>
        )
      ) : showForm || !billing.address ? (
        <AddressForm
          initialDraft={billing.address ? addressToDraft(billing.address) : EMPTY_ADDRESS_DRAFT}
          submitLabel="Save billing address"
          onCancel={() => {
            dispatch(setBillingSameAsShipping(true));
            setShowForm(false);
          }}
          onSubmit={(draft) => {
            dispatch(setBillingAddress(draft));
            setShowForm(false);
          }}
        />
      ) : (
        <div className="mt-3 flex items-center justify-between rounded-md border border-border p-3">
          <p className="text-sm text-muted-foreground">
            {billing.address.line1}, {billing.address.city}, {billing.address.state}{" "}
            {billing.address.postalCode}
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Edit
          </button>
        </div>
      )}
    </SectionCard>
  );
}

// =============================================================================
// 18. Coupon components
// =============================================================================

function couponIsExpiredMock(coupon: Coupon): boolean {
  // TECHSAVE is seeded as expired for demonstration of the "expired" state.
  return coupon.code === "TECHSAVE-EXPIRED";
}

function CouponSection({ subtotalMinor }: { subtotalMinor: number }) {
  const dispatch = useAppDispatch();
  const couponState = useAppSelector(selectCouponState);
  const [codeInput, setCodeInput] = useState("");

  function handleApply(codeToApply: string) {
    const trimmed = codeToApply.trim().toUpperCase();
    if (!trimmed) return;
    dispatch(setCouponApplying(trimmed));
    const coupon = AVAILABLE_COUPONS.find((item) => item.code === trimmed);
    if (!coupon) {
      dispatch(
        setCouponResult({
          status: "invalid",
          code: trimmed,
          message: "We couldn't find that coupon code.",
        }),
      );
      return;
    }
    const result = validateCouponAgainstOrder(
      coupon,
      subtotalMinor,
      couponIsExpiredMock(coupon),
    );
    dispatch(setCouponResult(result));
  }

  return (
    <SectionCard step={6} title="Coupon &amp; promo code" isComplete>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="coupon-code" className="sr-only">
            Coupon code
          </label>
          <input
            id="coupon-code"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder="Enter coupon code"
            className={inputBaseClasses}
            aria-describedby="coupon-status"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          isLoading={couponState.status === "applying"}
          onClick={() => handleApply(codeInput)}
        >
          Apply
        </Button>
      </div>

      <div id="coupon-status" aria-live="polite" className="mt-3">
        {couponState.status === "applied" && (
          <InlineAlert tone="success">
            <div className="flex w-full items-center justify-between gap-2">
              <span>
                <strong>{couponState.coupon.code}</strong> applied —{" "}
                {couponState.coupon.description}
              </span>
              <button
                type="button"
                onClick={() => dispatch(removeCoupon())}
                className="font-medium underline-offset-2 hover:underline"
              >
                Remove
              </button>
            </div>
          </InlineAlert>
        )}
        {(couponState.status === "invalid" ||
          couponState.status === "expired" ||
          couponState.status === "not-eligible") && (
          <InlineAlert tone="destructive">{couponState.message}</InlineAlert>
        )}
        {couponState.status === "minimum-not-met" && (
          <InlineAlert tone="warning">{couponState.message}</InlineAlert>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Available offers</p>
        {AVAILABLE_COUPONS.map((coupon) => (
          <button
            key={coupon.code}
            type="button"
            onClick={() => {
              setCodeInput(coupon.code);
              handleApply(coupon.code);
            }}
            className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-left text-sm hover:border-primary/50"
          >
            <span>
              <span className="font-semibold text-foreground">{coupon.code}</span>{" "}
              <span className="text-muted-foreground">— {coupon.description}</span>
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              Exp {coupon.expiresOnLabel}
            </span>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

// =============================================================================
// 19. Gift / rewards components
// =============================================================================

function GiftOptionsSection() {
  const dispatch = useAppDispatch();
  const gift = useAppSelector(selectGiftState);
  const remaining = GIFT_MESSAGE_MAX_LENGTH - gift.message.length;

  return (
    <SectionCard step={7} title="Gift options" isComplete>
      <Checkbox
        id="gift-wrap"
        checked={gift.wrapEnabled}
        onChange={(checked) => dispatch(setGiftOptions({ wrapEnabled: checked }))}
        label={`Add gift wrapping (${formatMoney(GIFT_WRAP_FEE_MINOR)})`}
      />
      {gift.wrapEnabled && (
        <div className="mt-3 flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-3">
          <FieldShell id="gift-message" label="Gift message (optional)">
            <textarea
              id="gift-message"
              value={gift.message}
              maxLength={GIFT_MESSAGE_MAX_LENGTH}
              onChange={(event) =>
                dispatch(setGiftOptions({ message: event.target.value }))
              }
              rows={2}
              className="w-full rounded-md border border-input bg-background p-3 text-sm text-foreground focus-visible:border-ring"
            />
          </FieldShell>
          <p className="-mt-2 text-right text-xs text-muted-foreground">
            {remaining} characters remaining
          </p>
          <Checkbox
            id="gift-receipt"
            checked={gift.includeReceipt}
            onChange={(checked) => dispatch(setGiftOptions({ includeReceipt: checked }))}
            label="Include a gift receipt (no prices shown)"
          />
          <Checkbox
            id="gift-hide-price"
            checked={gift.hidePrice}
            onChange={(checked) => dispatch(setGiftOptions({ hidePrice: checked }))}
            label="Hide prices on the packing slip"
          />
        </div>
      )}
    </SectionCard>
  );
}

function RewardsSection({
  maxApplicableMinor,
}: {
  maxApplicableMinor: number;
}) {
  const dispatch = useAppDispatch();
  const rewards = useAppSelector(selectRewardsState);
  const pointsValueMinor = calcRewardsAppliedMinor(REWARDS_POINTS_AVAILABLE);
  const isApplied = rewards.pointsApplied > 0 || rewards.storeCreditAppliedMinor > 0;

  function handleToggle(checked: boolean) {
    if (!checked) {
      dispatch(removeRewards());
      return;
    }
    const pointsMinor = Math.min(pointsValueMinor, maxApplicableMinor);
    const remainingAfterPoints = Math.max(0, maxApplicableMinor - pointsMinor);
    const storeCreditMinor = Math.min(STORE_CREDIT_AVAILABLE_MINOR, remainingAfterPoints);
    dispatch(
      applyRewards({
        points:
          pointsMinor === pointsValueMinor
            ? REWARDS_POINTS_AVAILABLE
            : Math.round(pointsMinor / POINTS_TO_MINOR_RATE),
        storeCreditMinor,
      }),
    );
  }

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <Checkbox
        id="rewards-toggle"
        checked={isApplied}
        onChange={handleToggle}
        label={`Use rewards &amp; store credit`}
        description={`${REWARDS_POINTS_AVAILABLE.toLocaleString()} points (${formatMoney(pointsValueMinor)}) · ${formatMoney(STORE_CREDIT_AVAILABLE_MINOR)} store credit available`}
      />
      {isApplied && (
        <p className="mt-2 pl-6 text-xs text-success">
          Applying {formatMoney(
            calcRewardsAppliedMinor(rewards.pointsApplied) + rewards.storeCreditAppliedMinor,
          )}{" "}
          to this order.
        </p>
      )}
    </div>
  );
}

// =============================================================================
// 20. Order review / notes components
// =============================================================================

function OrderNotesSection() {
  const dispatch = useAppDispatch();
  const note = useAppSelector(selectOrderNoteState);
  const remaining = ORDER_NOTE_MAX_LENGTH - note.text.length;

  return (
    <SectionCard step={8} title="Order notes" isComplete>
      <FieldShell id="order-note" label="Delivery or special instructions (optional)">
        <textarea
          id="order-note"
          value={note.text}
          maxLength={ORDER_NOTE_MAX_LENGTH}
          onChange={(event) => dispatch(setOrderNote(event.target.value))}
          rows={3}
          placeholder="e.g. Leave with the front desk, ring the bell twice…"
          className="w-full rounded-md border border-input bg-background p-3 text-sm text-foreground focus-visible:border-ring"
        />
      </FieldShell>
      <p className="mt-1 text-right text-xs text-muted-foreground">
        {remaining} characters remaining
      </p>
    </SectionCard>
  );
}

function TermsSection({
  submitAttempted,
}: {
  submitAttempted: boolean;
}) {
  const dispatch = useAppDispatch();
  const order = useAppSelector(selectOrderState);
  const showError = submitAttempted && !order.termsAccepted;
  return (
    <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <Checkbox
        id="terms-accepted"
        checked={order.termsAccepted}
        onChange={(checked) => dispatch(setTermsAccepted(checked))}
        label={
          <>
            I agree to the{" "}
            <a href="/terms" className="font-medium text-primary hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </a>
            .
          </>
        }
      />
      {showError && (
        <p className="mt-2 pl-6 text-xs text-destructive" role="alert">
          You must accept the terms to place your order.
        </p>
      )}
    </div>
  );
}

// =============================================================================
// 20b. Order review component (compact pre-submit summary with edit links)
// =============================================================================

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: ReactNode;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5 text-sm text-foreground">{value}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-sm font-medium text-primary hover:underline"
      >
        Edit
      </button>
    </div>
  );
}

function OrderReviewSection({
  contact,
  address,
  sellerGroups,
  selectedBySeller,
  paymentSummaryLabel,
  itemCount,
  sectionRefs,
}: {
  contact: ContactState;
  address: Address | null;
  sellerGroups: SellerGroup[];
  selectedBySeller: Record<string, string>;
  paymentSummaryLabel: string;
  itemCount: number;
  sectionRefs: Record<string, React.RefObject<HTMLElement>>;
}) {
  function scrollTo(key: string) {
    sectionRefs[key]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    sectionRefs[key]?.current?.focus({ preventScroll: true });
  }

  const deliverySummary = sellerGroups.map((group) => {
    const optionId = selectedBySeller[group.seller.id];
    const option = group.options.find((item) => item.id === optionId);
    return `${group.seller.name}: ${option ? option.dateLabel : "Not selected"}`;
  });

  return (
    <SectionCard step={9} title="Review your order" isComplete>
      <div className="divide-y divide-border">
        <ReviewRow
          label="Contact"
          value={contact.email || "No email provided"}
          onEdit={() => scrollTo("contact")}
        />
        <ReviewRow
          label="Shipping address"
          value={
            address
              ? `${address.fullName} · ${address.line1}, ${address.city}, ${address.state} ${address.postalCode}`
              : "No address selected"
          }
          onEdit={() => scrollTo("address")}
        />
        <ReviewRow
          label="Delivery"
          value={deliverySummary.join(" · ")}
          onEdit={() => scrollTo("delivery")}
        />
        <ReviewRow
          label="Payment"
          value={paymentSummaryLabel}
          onEdit={() => scrollTo("payment")}
        />
        <ReviewRow
          label="Items"
          value={`${itemCount} item${itemCount === 1 ? "" : "s"} across ${sellerGroups.length} seller${sellerGroups.length === 1 ? "" : "s"}`}
          onEdit={() => scrollTo("address")}
        />
      </div>
    </SectionCard>
  );
}

// =============================================================================
// 21. Price summary components
// =============================================================================

function ItemThumbnail({ item }: { item: CartItem }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-white"
      style={{ backgroundColor: item.swatch }}
    >
      {item.initials}
    </span>
  );
}

function CartLineItem({ item }: { item: CartItem }) {
  const hasDiscount =
    item.originalUnitPriceMinor !== undefined &&
    item.originalUnitPriceMinor > item.unitPriceMinor;
  return (
    <li className="flex gap-3 py-3">
      <ItemThumbnail item={item} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.brand} {item.productName}
        </p>
        {item.variant && (
          <p className="text-xs text-muted-foreground">{item.variant}</p>
        )}
        <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium text-foreground tabular-nums">
          {formatMoney(lineTotalMinor(item))}
        </p>
        {hasDiscount && (
          <p className="text-xs text-muted-foreground line-through tabular-nums">
            {formatMoney(lineOriginalTotalMinor(item))}
          </p>
        )}
      </div>
    </li>
  );
}

function CartItemsPreview({ items }: { items: CartItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, 2);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div>
      <ul className="divide-y divide-border">
        {visibleItems.map((item) => (
          <CartLineItem key={item.id} item={item} />
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={expanded}
          className="mt-1 text-sm font-medium text-primary hover:underline"
        >
          Show {hiddenCount} more item{hiddenCount === 1 ? "" : "s"}
        </button>
      )}
      {expanded && items.length > 2 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-expanded={expanded}
          className="mt-1 text-sm font-medium text-muted-foreground hover:underline"
        >
          Show less
        </button>
      )}
    </div>
  );
}

function PriceRow({
  label,
  value,
  emphasis,
  tone,
}: {
  label: ReactNode;
  value: string;
  emphasis?: boolean;
  tone?: "success" | "muted";
}) {
  return (
    <div
      className={`flex items-center justify-between py-1 text-sm ${
        emphasis ? "font-semibold text-foreground" : "text-foreground"
      }`}
    >
      <span className={tone === "muted" ? "text-muted-foreground" : undefined}>
        {label}
      </span>
      <span
        className={`tabular-nums ${tone === "success" ? "text-success" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function PriceBreakdown({ pricing }: { pricing: PricingBreakdown }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      <div className="pb-2">
        <PriceRow
          label="Items subtotal"
          value={formatMoney(pricing.subtotalMinor)}
        />
        {pricing.productDiscountMinor > 0 && (
          <PriceRow
            label="Product discounts"
            value={`-${formatMoney(pricing.productDiscountMinor)}`}
            tone="success"
          />
        )}
        {pricing.couponDiscountMinor > 0 && (
          <PriceRow
            label="Coupon discount"
            value={`-${formatMoney(pricing.couponDiscountMinor)}`}
            tone="success"
          />
        )}
        <PriceRow
          label="Shipping"
          value={
            pricing.shippingMinor - pricing.freeShippingSavingsMinor <= 0
              ? "FREE"
              : formatMoney(pricing.shippingMinor - pricing.freeShippingSavingsMinor)
          }
        />
        {pricing.giftWrapFeeMinor > 0 && (
          <PriceRow label="Gift wrapping" value={formatMoney(pricing.giftWrapFeeMinor)} />
        )}
        <PriceRow
          label="Estimated tax"
          value={formatMoney(pricing.taxMinor)}
          tone="muted"
        />
        {pricing.rewardsAppliedMinor > 0 && (
          <PriceRow
            label="Rewards points"
            value={`-${formatMoney(pricing.rewardsAppliedMinor)}`}
            tone="success"
          />
        )}
        {pricing.storeCreditAppliedMinor > 0 && (
          <PriceRow
            label="Store credit"
            value={`-${formatMoney(pricing.storeCreditAppliedMinor)}`}
            tone="success"
          />
        )}
      </div>
      {pricing.totalSavingsMinor > 0 && (
        <div className="py-2">
          <PriceRow
            label="Total savings"
            value={formatMoney(pricing.totalSavingsMinor)}
            tone="success"
          />
        </div>
      )}
      <div className="pt-2">
        <PriceRow
          label="Order total"
          value={formatMoney(pricing.grandTotalMinor)}
          emphasis
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Tax is estimated and may be recalculated at checkout.
        </p>
      </div>
    </div>
  );
}

function SecurePaymentSummary() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden="true">🔒</span> 256-bit encrypted checkout
    </p>
  );
}

// =============================================================================
// 22. Place-order components
// =============================================================================

function paymentMethodSummaryLabel(method: PaymentMethod | null): string {
  if (!method) return "No payment method selected";
  switch (method.kind) {
    case "card":
      return `${method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• ${method.last4}`;
    case "wallet":
      return method.label;
    case "bank-transfer":
      return method.bankName;
    case "cash-on-delivery":
      return "Cash on Delivery";
    case "bnpl":
      return `${method.provider} (${method.installments} payments)`;
    case "gift-card":
      return method.label;
    default:
      return "Payment method";
  }
}

type PlaceOrderStatus = "ready" | "blocked" | "processing";

function PlaceOrderCard({
  pricing,
  address,
  paymentLabel,
  deliveryEstimateLabel,
  status,
  onPlaceOrder,
}: {
  pricing: PricingBreakdown;
  address: Address | null;
  paymentLabel: string;
  deliveryEstimateLabel: string;
  status: PlaceOrderStatus;
  onPlaceOrder: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Deliver to</span>
          <span className="max-w-[60%] text-right text-foreground">
            {address ? `${address.city}, ${address.state}` : "Not selected"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estimated delivery</span>
          <span className="text-foreground">{deliveryEstimateLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Payment</span>
          <span className="text-foreground">{paymentLabel}</span>
        </div>
      </div>

      <div className="mb-4 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-sm font-medium text-foreground">Total</span>
        <span className="text-xl font-semibold text-foreground tabular-nums">
          {formatMoney(pricing.grandTotalMinor)}
        </span>
      </div>
      {pricing.totalSavingsMinor > 0 && (
        <p className="mb-4 -mt-2 text-right text-xs text-success">
          You're saving {formatMoney(pricing.totalSavingsMinor)}
        </p>
      )}

      <Button
        type="button"
        size="lg"
        className="w-full"
        isLoading={status === "processing"}
        onClick={onPlaceOrder}
        aria-describedby="place-order-help"
      >
        {status === "processing" ? "Processing your order…" : "Place Order"}
      </Button>
      <p id="place-order-help" className="mt-2 text-center text-xs text-muted-foreground">
        By placing your order, you agree to our Terms of Service.
      </p>
      <SecurePaymentSummary />
    </div>
  );
}

// =============================================================================
// 23. Loading / error / success states
// =============================================================================

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-muted ${className}`}
    />
  );
}

function CheckoutInitializingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading checkout"
      className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8"
    >
      <div className="flex flex-col gap-4">
        <SkeletonBlock className="h-40 w-full" />
        <SkeletonBlock className="h-56 w-full" />
        <SkeletonBlock className="h-64 w-full" />
      </div>
      <SkeletonBlock className="h-96 w-full" />
      <span className="sr-only">Loading your checkout…</span>
    </div>
  );
}

function OrderProcessingOverlay({ messageIndex }: { messageIndex: number }) {
  const message = PROCESSING_MESSAGES[messageIndex] ?? PROCESSING_MESSAGES[0];
  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card px-8 py-10 text-center shadow-sm">
        <span
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        />
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground">
          Please don't close or refresh this page.
        </p>
      </div>
    </div>
  );
}

function OrderSuccessView({
  orderNumber,
  estimatedDeliveryLabel,
  totalMinor,
  paymentLabel,
  address,
  onContinueShopping,
}: {
  orderNumber: string;
  estimatedDeliveryLabel: string;
  totalMinor: number;
  paymentLabel: string;
  address: Address | null;
  onContinueShopping: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <span
        aria-hidden="true"
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-2xl text-success"
      >
        ✓
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">
        Order confirmed
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A confirmation has been sent to your email.
      </p>

      <div className="mt-6 rounded-lg border border-border bg-card p-5 text-left">
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Order number</dt>
            <dd className="font-medium text-foreground">{orderNumber}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Estimated delivery</dt>
            <dd className="font-medium text-foreground">{estimatedDeliveryLabel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-medium text-foreground tabular-nums">
              {formatMoney(totalMinor)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Payment</dt>
            <dd className="font-medium text-foreground">{paymentLabel}</dd>
          </div>
          {address && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery address</dt>
              <dd className="max-w-[60%] text-right font-medium text-foreground">
                {address.line1}, {address.city}, {address.state} {address.postalCode}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button variant="secondary" onClick={() => undefined}>
          Track order
        </Button>
        <Button variant="secondary" onClick={() => undefined}>
          View orders
        </Button>
        <Button onClick={onContinueShopping}>Continue shopping</Button>
      </div>
    </div>
  );
}

const ORDER_FAILURE_COPY: Record<OrderFailureReason, { title: string; body: string }> = {
  "payment-failed": {
    title: "We couldn't process your payment",
    body: "Your payment method declined the charge. No funds were taken.",
  },
  "inventory-changed": {
    title: "An item is no longer available",
    body: "One or more items in your cart sold out while you were checking out.",
  },
  "price-changed": {
    title: "A price changed at checkout",
    body: "The price of an item changed. Please review your order total before retrying.",
  },
  "delivery-unavailable": {
    title: "Delivery is unavailable for this address",
    body: "Choose a different delivery method or shipping address to continue.",
  },
  "session-expired": {
    title: "Your session expired",
    body: "For your security, please review your details and try again.",
  },
  "service-issue": {
    title: "We hit a temporary issue",
    body: "Something went wrong on our end. Your cart and details have been kept.",
  },
};

function OrderFailureView({
  reason,
  onRetry,
  onChangePayment,
  onReviewCart,
}: {
  reason: OrderFailureReason;
  onRetry: () => void;
  onChangePayment: () => void;
  onReviewCart: () => void;
}) {
  const copy = ORDER_FAILURE_COPY[reason];
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <span
        aria-hidden="true"
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-2xl text-destructive"
      >
        !
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">{copy.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {reason === "payment-failed" ? (
          <Button onClick={onChangePayment}>Change payment method</Button>
        ) : reason === "inventory-changed" || reason === "price-changed" ? (
          <Button onClick={onReviewCart}>Review cart</Button>
        ) : (
          <Button onClick={onRetry}>Try again</Button>
        )}
        <Button variant="secondary" onClick={() => undefined}>
          Contact support
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// 24. Trust components
// =============================================================================

const TRUST_SIGNALS = [
  { icon: "🔒", label: "Secure checkout", detail: "Your data is encrypted in transit" },
  { icon: "↩", label: "Easy returns", detail: "30-day return window on eligible items" },
  { icon: "🛡", label: "Buyer protection", detail: "Refund guarantee on covered orders" },
  { icon: "✓", label: "Trusted payments", detail: "Cards, wallets, and bank transfers" },
] as const;

function TrustSection() {
  return (
    <section
      aria-label="Trust and security information"
      className="border-t border-border bg-muted/40"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
        {TRUST_SIGNALS.map((signal) => (
          <div key={signal.label} className="flex flex-col items-center gap-1 text-center">
            <span aria-hidden="true" className="text-xl">
              {signal.icon}
            </span>
            <p className="text-sm font-medium text-foreground">{signal.label}</p>
            <p className="text-xs text-muted-foreground">{signal.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// 25. Footer
// =============================================================================

function CheckoutFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© 2026 Meridian Commerce, Inc. All rights reserved.</p>
        <nav aria-label="Legal" className="flex gap-4">
          <a href="/privacy" className="hover:text-foreground">
            Privacy
          </a>
          <a href="/terms" className="hover:text-foreground">
            Terms
          </a>
          <a href="/support" className="hover:text-foreground">
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
}

// =============================================================================
// 26. Main CheckoutPage composition
// =============================================================================

function generateOrderNumber(): string {
  const digits = Math.floor(100000 + Math.random() * 899999);
  return `ORD-${digits}`;
}

const FAILURE_REASONS_POOL: OrderFailureReason[] = [
  "payment-failed",
  "inventory-changed",
  "service-issue",
];

function computeValidationErrors(input: {
  contact: ContactState;
  selectedAddress: Address | null;
  sellerGroups: SellerGroup[];
  selectedBySeller: Record<string, string>;
  selectedPaymentMethod: PaymentMethod | null;
  termsAccepted: boolean;
}): ValidationErrors {
  const errors: ValidationErrors = {};
  const emailError = validateEmail(input.contact.email);
  const phoneError = validatePhone(input.contact.phone);
  if (emailError) errors.email = emailError;
  if (phoneError) errors.phone = phoneError;
  if (!input.selectedAddress) errors.address = "Select a shipping address.";
  const allDeliverySelected = input.sellerGroups.every((group) => {
    const optionId = input.selectedBySeller[group.seller.id];
    const option = group.options.find((item) => item.id === optionId);
    return option && option.availability === "available";
  });
  if (!allDeliverySelected) errors.delivery = "Choose a delivery method for every seller.";
  if (!input.selectedPaymentMethod) errors.payment = "Select a payment method.";
  if (!input.termsAccepted) errors.terms = "Accept the terms to continue.";
  return errors;
}

function CheckoutMainColumn({
  sectionRefs,
  submitAttempted,
  sellerGroups,
  selectedAddress,
}: {
  sectionRefs: Record<string, React.RefObject<HTMLElement>>;
  submitAttempted: boolean;
  sellerGroups: SellerGroup[];
  selectedAddress: Address | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ContactInformationSection
        submitAttempted={submitAttempted}
        sectionRef={sectionRefs.contact}
      />
      <ShippingAddressSection
        submitAttempted={submitAttempted}
        sectionRef={sectionRefs.address}
      />
      <DeliveryMethodSection
        sellerGroups={sellerGroups}
        submitAttempted={submitAttempted}
        sectionRef={sectionRefs.delivery}
      />
      <PaymentSection
        submitAttempted={submitAttempted}
        sectionRef={sectionRefs.payment}
      />
      <BillingAddressSection shippingAddress={selectedAddress} />
      <CouponSection subtotalMinor={calcSubtotalMinor(MOCK_CART_ITEMS)} />
      <GiftOptionsSection />
      <OrderNotesSection />
    </div>
  );
}

function CheckoutSummaryColumn({
  items,
  pricing,
  maxRewardsApplicableMinor,
  selectedAddress,
  paymentLabel,
  deliveryEstimateLabel,
  placeOrderStatus,
  onPlaceOrder,
}: {
  items: CartItem[];
  pricing: PricingBreakdown;
  maxRewardsApplicableMinor: number;
  selectedAddress: Address | null;
  paymentLabel: string;
  deliveryEstimateLabel: string;
  placeOrderStatus: PlaceOrderStatus;
  onPlaceOrder: () => void;
}) {
  return (
    <aside
      aria-label="Order summary"
      className="hidden lg:sticky lg:top-6 lg:flex lg:h-fit lg:flex-col lg:gap-4"
    >
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-base font-semibold text-card-foreground">
          Order summary
        </h2>
        <CartItemsPreview items={items} />
        <div className="my-4 border-t border-border" />
        <RewardsSection maxApplicableMinor={maxRewardsApplicableMinor} />
        <div className="my-4 border-t border-border" />
        <PriceBreakdown pricing={pricing} />
      </div>
      <PlaceOrderCard
        pricing={pricing}
        address={selectedAddress}
        paymentLabel={paymentLabel}
        deliveryEstimateLabel={deliveryEstimateLabel}
        status={placeOrderStatus}
        onPlaceOrder={onPlaceOrder}
      />
    </aside>
  );
}

function MobileStickyCheckoutBar({
  pricing,
  placeOrderStatus,
  onPlaceOrder,
}: {
  pricing: PricingBreakdown;
  placeOrderStatus: PlaceOrderStatus;
  onPlaceOrder: () => void;
}) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4">
        <button
          type="button"
          onClick={() => setSummaryOpen((prev) => !prev)}
          aria-expanded={summaryOpen}
          className="flex flex-col text-left"
        >
          <span className="text-xs text-muted-foreground">
            {summaryOpen ? "Hide summary ▾" : "Order summary ▸"}
          </span>
          <span className="text-base font-semibold text-foreground tabular-nums">
            {formatMoney(pricing.grandTotalMinor)}
          </span>
        </button>
        <Button
          size="lg"
          isLoading={placeOrderStatus === "processing"}
          onClick={onPlaceOrder}
          className="min-w-[9.5rem]"
        >
          {placeOrderStatus === "processing" ? "Processing…" : "Place Order"}
        </Button>
      </div>
      {summaryOpen && (
        <div className="mx-auto mt-3 max-h-64 max-w-6xl overflow-y-auto border-t border-border px-4 pt-3">
          <PriceBreakdown pricing={pricing} />
        </div>
      )}
    </div>
  );
}

function CheckoutExperience() {
  const dispatch = useAppDispatch();
  const [isInitializing, setIsInitializing] = useState(true);

  const contact = useAppSelector(selectContact);
  const selectedAddress = useAppSelector(selectSelectedAddress);
  const { selectedBySeller } = useAppSelector(selectDeliveryState);
  const selectedPaymentMethod = useAppSelector(selectSelectedPaymentMethod);
  const billing = useAppSelector(selectBillingState);
  const appliedCoupon = useAppSelector(selectAppliedCoupon);
  const gift = useAppSelector(selectGiftState);
  const rewards = useAppSelector(selectRewardsState);
  const order = useAppSelector(selectOrderState);
  const submitAttempted = useAppSelector((state) => selectUiState(state).submitAttempted);

  const contactSectionRef = useRef<HTMLElement>(null);
  const addressSectionRef = useRef<HTMLElement>(null);
  const deliverySectionRef = useRef<HTMLElement>(null);
  const paymentSectionRef = useRef<HTMLElement>(null);
  const sectionRefs = useMemo(
    () => ({
      contact: contactSectionRef,
      address: addressSectionRef,
      delivery: deliverySectionRef,
      payment: paymentSectionRef,
    }),
    [],
  );

  useEffect(() => {
    const timeout = setTimeout(() => setIsInitializing(false), 550);
    return () => clearTimeout(timeout);
  }, []);

  const sellerGroups = useMemo(
    () => buildSellerGroups(MOCK_CART_ITEMS, MOCK_SELLERS),
    [],
  );

  const selectedDeliveryOptions = useMemo(() => {
    return sellerGroups
      .map((group) => group.options.find((opt) => opt.id === selectedBySeller[group.seller.id]))
      .filter((option): option is DeliveryOption => Boolean(option));
  }, [sellerGroups, selectedBySeller]);

  const pricingInputs = useMemo(
    () => ({
      items: MOCK_CART_ITEMS,
      selectedDeliveryOptions,
      appliedCoupon,
      giftWrapEnabled: gift.wrapEnabled,
      pointsApplied: rewards.pointsApplied,
      storeCreditAppliedMinor: rewards.storeCreditAppliedMinor,
    }),
    [selectedDeliveryOptions, appliedCoupon, gift.wrapEnabled, rewards],
  );
  const pricing = useMemo(() => calcPricing(pricingInputs), [pricingInputs]);

  const preRewardsTotalMinor =
    pricing.grandTotalMinor + pricing.rewardsAppliedMinor + pricing.storeCreditAppliedMinor;
  const maxRewardsApplicableMinor = Math.max(0, preRewardsTotalMinor);

  const validationErrors = useMemo(
    () =>
      computeValidationErrors({
        contact,
        selectedAddress,
        sellerGroups,
        selectedBySeller,
        selectedPaymentMethod,
        termsAccepted: order.termsAccepted,
      }),
    [contact, selectedAddress, sellerGroups, selectedBySeller, selectedPaymentMethod, order.termsAccepted],
  );
  const isReadyToSubmit = Object.keys(validationErrors).length === 0;

  const currentStepIndex = !selectedAddress
    ? 0
    : selectedDeliveryOptions.length < sellerGroups.length
      ? 1
      : !selectedPaymentMethod
        ? 2
        : 3;

  const deliveryEstimateLabel = useMemo(() => {
    const labels = selectedDeliveryOptions.map((opt) => opt.dateLabel);
    const unique = Array.from(new Set(labels));
    return unique.length === 1 ? unique[0] : unique.length > 1 ? "Multiple dates" : "—";
  }, [selectedDeliveryOptions]);

  const paymentLabel = paymentMethodSummaryLabel(selectedPaymentMethod);

  // Drives the processing sequence once order placement begins. A single
  // effect, cleaned up on every transition — guards against duplicate
  // submissions because the CTA is disabled for the whole 'processing' state.
  useEffect(() => {
    if (order.status.status !== "processing") return;
    const { stepIndex } = order.status;
    const isLastStep = stepIndex >= PROCESSING_MESSAGES.length - 1;
    const timeout = setTimeout(() => {
      if (!isLastStep) {
        dispatch(setOrderProcessing(stepIndex + 1));
        return;
      }
      const succeeds = Math.random() < 0.85;
      if (succeeds) {
        dispatch(
          setOrderSuccess({
            orderNumber: generateOrderNumber(),
            estimatedDeliveryLabel: deliveryEstimateLabel,
            totalMinor: pricing.grandTotalMinor,
          }),
        );
      } else {
        const reason =
          FAILURE_REASONS_POOL[Math.floor(Math.random() * FAILURE_REASONS_POOL.length)];
        dispatch(setOrderFailure(reason));
      }
    }, 480);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status, dispatch]);

  const handlePlaceOrder = useCallback(() => {
    dispatch(setSubmitAttempted(true));
    if (!isReadyToSubmit) {
      const firstErrorSection: keyof typeof sectionRefs | null = validationErrors.email
        ? "contact"
        : validationErrors.phone
          ? "contact"
          : validationErrors.address
            ? "address"
            : validationErrors.delivery
              ? "delivery"
              : validationErrors.payment
                ? "payment"
                : null;
      if (firstErrorSection) {
        sectionRefs[firstErrorSection].current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        sectionRefs[firstErrorSection].current?.focus({ preventScroll: true });
      }
      return;
    }
    dispatch(startOrderPlacement());
    dispatch(setOrderProcessing(0));
  }, [dispatch, isReadyToSubmit, validationErrors, sectionRefs]);

  const handleRetry = useCallback(() => dispatch(resetOrderStatus()), [dispatch]);
  const handleChangePayment = useCallback(() => {
    dispatch(resetOrderStatus());
    paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [dispatch]);
  const handleReviewCart = useCallback(() => {
    dispatch(resetOrderStatus());
    addressSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [dispatch]);
  const handleContinueShopping = useCallback(() => dispatch(resetCheckout()), [dispatch]);

  const placeOrderStatus: PlaceOrderStatus =
    order.status.status === "processing" || order.status.status === "validating"
      ? "processing"
      : isReadyToSubmit
        ? "ready"
        : "blocked";

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background">
        <CheckoutHeader currentStepIndex={0} />
        <CheckoutInitializingSkeleton />
      </div>
    );
  }

  if (order.status.status === "success") {
    return (
      <div className="min-h-screen bg-background">
        <CheckoutHeader currentStepIndex={3} />
        <OrderSuccessView
          orderNumber={order.status.orderNumber}
          estimatedDeliveryLabel={order.status.estimatedDeliveryLabel}
          totalMinor={order.status.totalMinor}
          paymentLabel={paymentLabel}
          address={selectedAddress}
          onContinueShopping={handleContinueShopping}
        />
        <CheckoutFooter />
      </div>
    );
  }

  if (order.status.status === "failure") {
    return (
      <div className="min-h-screen bg-background">
        <CheckoutHeader currentStepIndex={currentStepIndex} />
        <OrderFailureView
          reason={order.status.reason}
          onRetry={handleRetry}
          onChangePayment={handleChangePayment}
          onReviewCart={handleReviewCart}
        />
        <CheckoutFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <CheckoutHeader currentStepIndex={currentStepIndex} />

      {order.status.status === "processing" && (
        <OrderProcessingOverlay messageIndex={order.status.stepIndex} />
      )}

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="flex flex-col gap-6">
          <CheckoutMainColumn
            sectionRefs={sectionRefs}
            submitAttempted={submitAttempted}
            sellerGroups={sellerGroups}
            selectedAddress={selectedAddress}
          />
          <OrderReviewSection
            contact={contact}
            address={selectedAddress}
            sellerGroups={sellerGroups}
            selectedBySeller={selectedBySeller}
            paymentSummaryLabel={paymentLabel}
            itemCount={MOCK_CART_ITEMS.reduce((sum, item) => sum + item.quantity, 0)}
            sectionRefs={sectionRefs}
          />
          <TermsSection submitAttempted={submitAttempted} />
        </div>

        <CheckoutSummaryColumn
          items={MOCK_CART_ITEMS}
          pricing={pricing}
          maxRewardsApplicableMinor={maxRewardsApplicableMinor}
          selectedAddress={selectedAddress}
          paymentLabel={paymentLabel}
          deliveryEstimateLabel={deliveryEstimateLabel}
          placeOrderStatus={placeOrderStatus}
          onPlaceOrder={handlePlaceOrder}
        />
      </main>

      <TrustSection />
      <CheckoutFooter />

      <MobileStickyCheckoutBar
        pricing={pricing}
        placeOrderStatus={placeOrderStatus}
        onPlaceOrder={handlePlaceOrder}
      />
    </div>
  );
}

export default function CheckoutPage() {
  const [store] = useState(() => createCheckoutStore());
  return (
    <Provider store={store}>
      <CheckoutExperience />
    </Provider>
  );
}

// =============================================================================
// 27. Export
// =============================================================================
// Default export above is the sole public export required by the App Router
// page contract. Types and slice action creators are exported inline above
// for potential reuse by future integration tests.