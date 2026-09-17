"use client";

/**
 * PaymentMethodsPage.tsx
 *
 * Payment method management screen for a large-scale global ecommerce platform.
 * This is a management surface only — no payment authorization/checkout logic
 * lives here. The frontend is designed around a tokenized payment-method model:
 * the UI only ever holds non-sensitive references (paymentMethodId, brand,
 * last4, expiration, provider reference), never raw card/bank/wallet secrets.
 */

import React, {
  createContext,
  useContext,
  useId,
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
import { Provider, useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Bell,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Grid2x2,
  Heart,
  Landmark,
  List as ListIcon,
  Loader2,
  Lock,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";

/* ============================================================================
 * TYPES — domain model
 * ==========================================================================*/

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unionpay" | "unknown";

type PaymentMethodType =
  | "credit_card"
  | "debit_card"
  | "bank_account"
  | "digital_wallet"
  | "buy_now_pay_later"
  | "other_provider";

type PaymentMethodStatus =
  | "active"
  | "expiring_soon"
  | "expired"
  | "suspended"
  | "verification_required"
  | "unavailable";

type PaymentVerificationState = "not_required" | "pending" | "verified" | "failed" | "requires_action";

interface BillingAddressSummary {
  id: string;
  label: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
}

interface PaymentMethodBase {
  id: string;
  status: PaymentMethodStatus;
  verification: PaymentVerificationState;
  isDefault: boolean;
  billingAddressId: string | null;
  providerReference: string;
  addedAt: string; // ISO date
  lastUsedAt: string | null; // ISO date
  nickname: string | null;
}

interface CardPaymentMethod extends PaymentMethodBase {
  type: "credit_card" | "debit_card";
  brand: CardBrand;
  last4: string;
  expirationMonth: number;
  expirationYear: number;
  cardholderName: string;
}

interface BankAccountPaymentMethod extends PaymentMethodBase {
  type: "bank_account";
  bankName: string;
  accountType: "checking" | "savings";
  last4: string;
}

interface WalletPaymentMethod extends PaymentMethodBase {
  type: "digital_wallet";
  walletProvider: "PayPal" | "Apple Pay" | "Google Pay" | "Venmo";
  connectedIdentifier: string; // e.g. masked email or phone
}

interface BnplPaymentMethod extends PaymentMethodBase {
  type: "buy_now_pay_later";
  provider: "Klarna" | "Afterpay" | "Affirm";
}

interface OtherProviderPaymentMethod extends PaymentMethodBase {
  type: "other_provider";
  providerName: string;
  maskedIdentifier: string;
}

type PaymentMethod =
  | CardPaymentMethod
  | BankAccountPaymentMethod
  | WalletPaymentMethod
  | BnplPaymentMethod
  | OtherProviderPaymentMethod;

type PaymentMethodFilter =
  | "all"
  | "card"
  | "bank"
  | "wallet"
  | "active"
  | "expiring"
  | "expired"
  | "default"
  | "verification_required";

type PaymentMethodSort = "default_first" | "recently_used" | "recently_added" | "expiration";

type OperationStatus = "idle" | "loading" | "validating" | "requiresAction" | "success" | "error";

interface OperationState {
  status: OperationStatus;
  error: string | null;
}

const IDLE_OPERATION: OperationState = { status: "idle", error: null };

interface PaymentPreferences {
  preferredPaymentMethodId: string | null;
  useSavedMethodsByDefault: boolean;
  billingPreference: "default_address" | "ask_each_time";
  walletPreference: "ask_each_time" | "preferred_wallet";
  notifyOnExpiration: boolean;
  notifyOnNewMethod: boolean;
}

type DuplicateCheckState = "no_duplicate" | "possible_duplicate" | "duplicate";

/* ============================================================================
 * CONSTANTS
 * ==========================================================================*/

const PAYMENT_TYPE_LABEL: Record<PaymentMethodType, string> = {
  credit_card: "Credit card",
  debit_card: "Debit card",
  bank_account: "Bank account",
  digital_wallet: "Digital wallet",
  buy_now_pay_later: "Buy now, pay later",
  other_provider: "Other provider",
};

const STATUS_LABEL: Record<PaymentMethodStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  suspended: "Suspended",
  verification_required: "Verification required",
  unavailable: "Unavailable",
};

const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  unionpay: "UnionPay",
  unknown: "Card",
};

const FILTER_OPTIONS: { value: PaymentMethodFilter; label: string }[] = [
  { value: "all", label: "All methods" },
  { value: "card", label: "Cards" },
  { value: "bank", label: "Bank accounts" },
  { value: "wallet", label: "Wallets" },
  { value: "default", label: "Default" },
  { value: "expiring", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
  { value: "verification_required", label: "Needs verification" },
];

const SORT_OPTIONS: { value: PaymentMethodSort; label: string }[] = [
  { value: "default_first", label: "Default first" },
  { value: "recently_used", label: "Recently used" },
  { value: "recently_added", label: "Recently added" },
  { value: "expiration", label: "Expiration date" },
];

const ACCOUNT_NAV_ITEMS = [
  { id: "overview", label: "Account overview" },
  { id: "profile", label: "Profile" },
  { id: "orders", label: "Orders" },
  { id: "returns", label: "Returns & refunds" },
  { id: "wishlist", label: "Wishlist" },
  { id: "saved-items", label: "Saved items" },
  { id: "addresses", label: "Addresses" },
  { id: "payment-methods", label: "Payment methods" },
  { id: "membership", label: "Membership" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "support", label: "Support" },
] as const;

/* ============================================================================
 * MOCK DATA
 * ==========================================================================*/

const MOCK_BILLING_ADDRESSES: BillingAddressSummary[] = [
  {
    id: "addr_home",
    label: "Home",
    line1: "214 Ashgrove Lane",
    city: "Austin",
    region: "TX",
    postalCode: "78701",
    countryCode: "US",
  },
  {
    id: "addr_office",
    label: "Office",
    line1: "88 Harborview Plaza, Suite 1200",
    city: "Seattle",
    region: "WA",
    postalCode: "98101",
    countryCode: "US",
  },
];

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "pm_001",
    type: "credit_card",
    brand: "visa",
    last4: "4821",
    expirationMonth: 8,
    expirationYear: 2029,
    cardholderName: "Samir Thapa",
    status: "active",
    verification: "verified",
    isDefault: true,
    billingAddressId: "addr_home",
    providerReference: "tok_1P8q2K_visa4821",
    addedAt: "2023-02-11T00:00:00.000Z",
    lastUsedAt: "2026-09-02T00:00:00.000Z",
    nickname: null,
  },
  {
    id: "pm_002",
    type: "credit_card",
    brand: "mastercard",
    last4: "5537",
    expirationMonth: 10,
    expirationYear: 2026,
    cardholderName: "Samir Thapa",
    status: "expiring_soon",
    verification: "verified",
    isDefault: false,
    billingAddressId: "addr_home",
    providerReference: "tok_9Zx31M_mc5537",
    addedAt: "2022-06-20T00:00:00.000Z",
    lastUsedAt: "2026-08-14T00:00:00.000Z",
    nickname: null,
  },
  {
    id: "pm_003",
    type: "credit_card",
    brand: "amex",
    last4: "1006",
    expirationMonth: 3,
    expirationYear: 2026,
    cardholderName: "Samir Thapa",
    status: "expired",
    verification: "verified",
    isDefault: false,
    billingAddressId: "addr_office",
    providerReference: "tok_44Ldq_amex1006",
    addedAt: "2021-11-02T00:00:00.000Z",
    lastUsedAt: "2026-02-19T00:00:00.000Z",
    nickname: "Business Amex",
  },
  {
    id: "pm_004",
    type: "bank_account",
    bankName: "First National Bank",
    accountType: "checking",
    last4: "9182",
    status: "active",
    verification: "verified",
    isDefault: false,
    billingAddressId: "addr_home",
    providerReference: "ba_7Hq0v_fnb9182",
    addedAt: "2024-01-08T00:00:00.000Z",
    lastUsedAt: "2026-07-30T00:00:00.000Z",
    nickname: null,
  },
  {
    id: "pm_005",
    type: "digital_wallet",
    walletProvider: "PayPal",
    connectedIdentifier: "sa***@example.com",
    status: "active",
    verification: "verified",
    isDefault: false,
    billingAddressId: null,
    providerReference: "wal_2Bp9x_paypal",
    addedAt: "2024-09-25T00:00:00.000Z",
    lastUsedAt: "2026-06-11T00:00:00.000Z",
    nickname: null,
  },
  {
    id: "pm_006",
    type: "credit_card",
    brand: "discover",
    last4: "3399",
    expirationMonth: 12,
    expirationYear: 2028,
    cardholderName: "Samir Thapa",
    status: "verification_required",
    verification: "requires_action",
    isDefault: false,
    billingAddressId: "addr_office",
    providerReference: "tok_66Trq_disc3399",
    addedAt: "2026-08-29T00:00:00.000Z",
    lastUsedAt: null,
    nickname: null,
  },
  {
    id: "pm_007",
    type: "buy_now_pay_later",
    provider: "Klarna",
    status: "active",
    verification: "verified",
    isDefault: false,
    billingAddressId: null,
    providerReference: "bnpl_9Kd2w_klarna",
    addedAt: "2025-04-17T00:00:00.000Z",
    lastUsedAt: "2026-05-02T00:00:00.000Z",
    nickname: null,
  },
];

const DEFAULT_PREFERENCES: PaymentPreferences = {
  preferredPaymentMethodId: "pm_001",
  useSavedMethodsByDefault: true,
  billingPreference: "default_address",
  walletPreference: "ask_each_time",
  notifyOnExpiration: true,
  notifyOnNewMethod: false,
};

/* ============================================================================
 * FORMATTING & DOMAIN UTILITIES
 * ==========================================================================*/

function maskedDigits(last4: string): string {
  return `•••• ${last4}`;
}

function formatExpiration(month: number, year: number): string {
  return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "Never used";
  const date = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

function paymentMethodTitle(method: PaymentMethod): string {
  switch (method.type) {
    case "credit_card":
    case "debit_card":
      return `${BRAND_LABEL[method.brand]} ${method.type === "debit_card" ? "debit" : "credit"}`;
    case "bank_account":
      return method.bankName;
    case "digital_wallet":
      return method.walletProvider;
    case "buy_now_pay_later":
      return method.provider;
    case "other_provider":
      return method.providerName;
  }
}

function paymentMethodMaskedLine(method: PaymentMethod): string {
  switch (method.type) {
    case "credit_card":
    case "debit_card":
      return maskedDigits(method.last4);
    case "bank_account":
      return maskedDigits(method.last4);
    case "digital_wallet":
      return method.connectedIdentifier;
    case "buy_now_pay_later":
      return "Pay-in-installments plan";
    case "other_provider":
      return method.maskedIdentifier;
  }
}

function detectCardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  if (/^62/.test(digits)) return "unionpay";
  return "unknown";
}

function isExpirationValid(month: number, year: number): boolean {
  if (!month || !year) return false;
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expiry = new Date(year, month, 0, 23, 59, 59);
  return expiry.getTime() >= now.getTime();
}

function luhnCheck(digits: string): boolean {
  if (digits.length < 12) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function formatCardNumberDisplay(digits: string): string {
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

/* ============================================================================
 * REDUX TOOLKIT STATE
 * ==========================================================================*/

interface PaymentUiState {
  isAddDialogOpen: boolean;
  isEditDialogOpen: boolean;
  editingId: string | null;
  isDetailsPanelOpen: boolean;
  detailsId: string | null;
  isRemoveDialogOpen: boolean;
  removeTargetId: string | null;
  isSetDefaultDialogOpen: boolean;
  setDefaultTargetId: string | null;
  isVerificationDialogOpen: boolean;
  verificationTargetId: string | null;
  isExpiredDialogOpen: boolean;
  expiredTargetId: string | null;
  viewMode: "list" | "grid";
}

interface PaymentState {
  byId: Record<string, PaymentMethod>;
  ids: string[];
  billingAddressesById: Record<string, BillingAddressSummary>;
  fetchStatus: OperationStatus;
  fetchError: string | null;
  search: string;
  filter: PaymentMethodFilter;
  sort: PaymentMethodSort;
  preferences: PaymentPreferences;
  operations: {
    add: OperationState;
    setDefault: OperationState;
    removeById: Record<string, OperationState>;
    verifyById: Record<string, OperationState>;
  };
  ui: PaymentUiState;
}

function buildInitialState(): PaymentState {
  const byId: Record<string, PaymentMethod> = {};
  const ids: string[] = [];
  MOCK_PAYMENT_METHODS.forEach((pm) => {
    byId[pm.id] = pm;
    ids.push(pm.id);
  });
  const billingAddressesById: Record<string, BillingAddressSummary> = {};
  MOCK_BILLING_ADDRESSES.forEach((addr) => {
    billingAddressesById[addr.id] = addr;
  });
  return {
    byId,
    ids,
    billingAddressesById,
    fetchStatus: "success",
    fetchError: null,
    search: "",
    filter: "all",
    sort: "default_first",
    preferences: DEFAULT_PREFERENCES,
    operations: {
      add: IDLE_OPERATION,
      setDefault: IDLE_OPERATION,
      removeById: {},
      verifyById: {},
    },
    ui: {
      isAddDialogOpen: false,
      isEditDialogOpen: false,
      editingId: null,
      isDetailsPanelOpen: false,
      detailsId: null,
      isRemoveDialogOpen: false,
      removeTargetId: null,
      isSetDefaultDialogOpen: false,
      setDefaultTargetId: null,
      isVerificationDialogOpen: false,
      verificationTargetId: null,
      isExpiredDialogOpen: false,
      expiredTargetId: null,
      viewMode: "list",
    },
  };
}

interface NewPaymentMethodPayload {
  method: PaymentMethod;
}

const paymentSlice = createSlice({
  name: "paymentMethods",
  initialState: buildInitialState(),
  reducers: {
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setFilter(state, action: PayloadAction<PaymentMethodFilter>) {
      state.filter = action.payload;
    },
    setSort(state, action: PayloadAction<PaymentMethodSort>) {
      state.sort = action.payload;
    },
    setViewMode(state, action: PayloadAction<"list" | "grid">) {
      state.ui.viewMode = action.payload;
    },
    openAddDialog(state) {
      state.ui.isAddDialogOpen = true;
      state.operations.add = IDLE_OPERATION;
    },
    closeAddDialog(state) {
      state.ui.isAddDialogOpen = false;
      state.operations.add = IDLE_OPERATION;
    },
    openEditDialog(state, action: PayloadAction<string>) {
      state.ui.isEditDialogOpen = true;
      state.ui.editingId = action.payload;
    },
    closeEditDialog(state) {
      state.ui.isEditDialogOpen = false;
      state.ui.editingId = null;
    },
    openDetailsPanel(state, action: PayloadAction<string>) {
      state.ui.isDetailsPanelOpen = true;
      state.ui.detailsId = action.payload;
    },
    closeDetailsPanel(state) {
      state.ui.isDetailsPanelOpen = false;
      state.ui.detailsId = null;
    },
    openRemoveDialog(state, action: PayloadAction<string>) {
      state.ui.isRemoveDialogOpen = true;
      state.ui.removeTargetId = action.payload;
    },
    closeRemoveDialog(state) {
      state.ui.isRemoveDialogOpen = false;
      state.ui.removeTargetId = null;
    },
    openSetDefaultDialog(state, action: PayloadAction<string>) {
      state.ui.isSetDefaultDialogOpen = true;
      state.ui.setDefaultTargetId = action.payload;
    },
    closeSetDefaultDialog(state) {
      state.ui.isSetDefaultDialogOpen = false;
      state.ui.setDefaultTargetId = null;
    },
    openVerificationDialog(state, action: PayloadAction<string>) {
      state.ui.isVerificationDialogOpen = true;
      state.ui.verificationTargetId = action.payload;
    },
    closeVerificationDialog(state) {
      state.ui.isVerificationDialogOpen = false;
      state.ui.verificationTargetId = null;
    },
    openExpiredDialog(state, action: PayloadAction<string>) {
      state.ui.isExpiredDialogOpen = true;
      state.ui.expiredTargetId = action.payload;
    },
    closeExpiredDialog(state) {
      state.ui.isExpiredDialogOpen = false;
      state.ui.expiredTargetId = null;
    },
    addPaymentMethodStart(state) {
      state.operations.add = { status: "loading", error: null };
    },
    addPaymentMethodSuccess(state, action: PayloadAction<NewPaymentMethodPayload>) {
      const { method } = action.payload;
      state.byId[method.id] = method;
      state.ids.unshift(method.id);
      if (method.isDefault) {
        state.ids.forEach((id) => {
          if (id !== method.id) {
            const existing = state.byId[id];
            if (existing) existing.isDefault = false;
          }
        });
      }
      state.operations.add = { status: "success", error: null };
      state.ui.isAddDialogOpen = false;
    },
    addPaymentMethodFailure(state, action: PayloadAction<string>) {
      state.operations.add = { status: "error", error: action.payload };
    },
    setDefaultStart(state) {
      state.operations.setDefault = { status: "loading", error: null };
    },
    setDefaultSuccess(state, action: PayloadAction<string>) {
      const targetId = action.payload;
      state.ids.forEach((id) => {
        const method = state.byId[id];
        if (method) method.isDefault = id === targetId;
      });
      state.operations.setDefault = { status: "success", error: null };
      state.ui.isSetDefaultDialogOpen = false;
      state.ui.setDefaultTargetId = null;
    },
    setDefaultFailure(state, action: PayloadAction<string>) {
      state.operations.setDefault = { status: "error", error: action.payload };
    },
    removeStart(state, action: PayloadAction<string>) {
      state.operations.removeById[action.payload] = { status: "loading", error: null };
    },
    removeSuccess(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.ids = state.ids.filter((x) => x !== id);
      delete state.byId[id];
      delete state.operations.removeById[id];
      state.ui.isRemoveDialogOpen = false;
      state.ui.removeTargetId = null;
    },
    removeFailure(state, action: PayloadAction<{ id: string; error: string }>) {
      state.operations.removeById[action.payload.id] = { status: "error", error: action.payload.error };
    },
    verifyStart(state, action: PayloadAction<string>) {
      state.operations.verifyById[action.payload] = { status: "loading", error: null };
    },
    verifySuccess(state, action: PayloadAction<string>) {
      const id = action.payload;
      const method = state.byId[id];
      if (method) {
        method.verification = "verified";
        method.status = "active";
      }
      state.operations.verifyById[id] = { status: "success", error: null };
      state.ui.isVerificationDialogOpen = false;
      state.ui.verificationTargetId = null;
    },
    verifyFailure(state, action: PayloadAction<{ id: string; error: string }>) {
      const method = state.byId[action.payload.id];
      if (method) method.verification = "failed";
      state.operations.verifyById[action.payload.id] = { status: "error", error: action.payload.error };
    },
    updateBillingAddress(state, action: PayloadAction<{ id: string; billingAddressId: string }>) {
      const method = state.byId[action.payload.id];
      if (method) method.billingAddressId = action.payload.billingAddressId;
    },
    updatePreferences(state, action: PayloadAction<Partial<PaymentPreferences>>) {
      state.preferences = { ...state.preferences, ...action.payload };
    },
  },
});

const paymentActions = paymentSlice.actions;

const store = configureStore({
  reducer: {
    paymentMethods: paymentSlice.reducer,
  },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/* ---- selectors -----------------------------------------------------------*/

const selectPaymentState = (state: RootState) => state.paymentMethods;

const selectAllPaymentMethods = createSelector(selectPaymentState, (s) =>
  s.ids.map((id) => s.byId[id]).filter((m): m is PaymentMethod => Boolean(m)),
);

const selectDefaultPaymentMethod = createSelector(selectAllPaymentMethods, (methods) =>
  methods.find((m) => m.isDefault) ?? null,
);

const selectBillingAddressesById = createSelector(selectPaymentState, (s) => s.billingAddressesById);

const selectFilteredSortedMethods = createSelector(
  selectAllPaymentMethods,
  (s: RootState) => s.paymentMethods.search,
  (s: RootState) => s.paymentMethods.filter,
  (s: RootState) => s.paymentMethods.sort,
  (methods, search, filter, sort) => {
    const query = search.trim().toLowerCase();

    const searched = query
      ? methods.filter((m) => {
          const haystack = [
            paymentMethodTitle(m),
            paymentMethodMaskedLine(m),
            PAYMENT_TYPE_LABEL[m.type],
            "brand" in m ? BRAND_LABEL[m.brand] : "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        })
      : methods;

    const filtered = searched.filter((m) => {
      switch (filter) {
        case "all":
          return true;
        case "card":
          return m.type === "credit_card" || m.type === "debit_card";
        case "bank":
          return m.type === "bank_account";
        case "wallet":
          return m.type === "digital_wallet";
        case "default":
          return m.isDefault;
        case "expiring":
          return m.status === "expiring_soon";
        case "expired":
          return m.status === "expired";
        case "verification_required":
          return m.status === "verification_required" || m.verification === "requires_action";
        default:
          return true;
      }
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "default_first":
          return Number(b.isDefault) - Number(a.isDefault);
        case "recently_used": {
          const at = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
          const bt = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
          return bt - at;
        }
        case "recently_added":
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case "expiration": {
          const aExp = a.type === "credit_card" || a.type === "debit_card" ? a.expirationYear * 12 + a.expirationMonth : Infinity;
          const bExp = b.type === "credit_card" || b.type === "debit_card" ? b.expirationYear * 12 + b.expirationMonth : Infinity;
          return aExp - bExp;
        }
        default:
          return 0;
      }
    });

    return sorted;
  },
);

const selectExpiringOrExpiredCount = createSelector(selectAllPaymentMethods, (methods) =>
  methods.filter((m) => m.status === "expiring_soon" || m.status === "expired").length,
);

/* ============================================================================
 * SHARED UI PRIMITIVES (kept minimal & purposeful — not generic wrappers)
 * ==========================================================================*/

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

function toneForStatus(status: PaymentMethodStatus): StatusTone {
  switch (status) {
    case "active":
      return "success";
    case "expiring_soon":
      return "warning";
    case "expired":
    case "suspended":
      return "danger";
    case "verification_required":
      return "info";
    case "unavailable":
      return "neutral";
  }
}

function StatusPill({ label, tone, icon }: { label: string; tone: StatusTone; icon?: React.ReactNode }) {
  const toneClasses: Record<StatusTone, string> = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-info/10 text-info border-info/20",
    neutral: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {icon}
      {label}
    </span>
  );
}

function Dialog({
  isOpen,
  onClose,
  titleId,
  children,
  widthClassName = "max-w-lg",
}: {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex max-h-[92vh] w-full ${widthClassName} flex-col overflow-hidden rounded-t-2xl border border-border bg-card text-card-foreground shadow-xl animate-slide-up sm:rounded-2xl`}
      >
        {children}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  variant = "ghost",
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        variant === "danger" ? "hover:bg-destructive/10 hover:text-destructive" : ""
      }`}
    >
      {children}
    </button>
  );
}

/* ============================================================================
 * ECOMMERCE HEADER
 * ==========================================================================*/

function AnnouncementBar() {
  return (
    <div className="bg-foreground text-background">
      <div className="mx-auto flex max-w-[1440px] items-center justify-center px-4 py-2 text-center text-xs sm:text-sm">
        Free shipping on orders over $35 — plus fast, secure checkout with your saved payment methods.
      </div>
    </div>
  );
}

function CategoryNavigation() {
  const categories = ["Today's deals", "Electronics", "Home & kitchen", "Fashion", "Grocery", "Sports", "Beauty"];
  return (
    <nav aria-label="Product categories" className="hidden border-t border-border/70 bg-background lg:block">
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-2.5 text-sm">
        {categories.map((c) => (
          <a key={c} href="#" className="text-muted-foreground transition-colors hover:text-foreground">
            {c}
          </a>
        ))}
      </div>
    </nav>
  );
}

function EcommerceHeader({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchId = useId();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <AnnouncementBar />
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          aria-label="Open menu"
          onClick={onOpenMobileNav}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <a href="#" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingCart className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">Meridian</span>
        </a>

        <div className="relative ml-2 hidden flex-1 max-w-xl md:block">
          <label htmlFor={searchId} className="sr-only">
            Search products
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="search"
            placeholder="Search products, brands, and categories"
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            aria-label="Search"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-expanded={mobileSearchOpen}
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>
          <IconButton label="Wishlist">
            <Heart className="h-5 w-5" aria-hidden="true" />
          </IconButton>
          <IconButton label="Notifications">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </IconButton>
          <IconButton label="Account">
            <User className="h-5 w-5" aria-hidden="true" />
          </IconButton>
          <IconButton label="Cart, 0 items">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t border-border px-4 py-3 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              autoFocus
              placeholder="Search products"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}

      <CategoryNavigation />
    </header>
  );
}

function EcommerceFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-6 py-10 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Shop</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Today&apos;s deals</a></li>
            <li><a href="#" className="hover:text-foreground">New arrivals</a></li>
            <li><a href="#" className="hover:text-foreground">Gift cards</a></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Account</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Orders</a></li>
            <li><a href="#" className="hover:text-foreground">Payment methods</a></li>
            <li><a href="#" className="hover:text-foreground">Addresses</a></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Support</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Help center</a></li>
            <li><a href="#" className="hover:text-foreground">Contact us</a></li>
            <li><a href="#" className="hover:text-foreground">Returns</a></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Trust &amp; safety</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Security practices</a></li>
            <li><a href="#" className="hover:text-foreground">Privacy policy</a></li>
            <li><a href="#" className="hover:text-foreground">Terms of service</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        © 2026 Meridian Commerce, Inc. All rights reserved.
      </div>
    </footer>
  );
}

/* ============================================================================
 * BREADCRUMBS
 * ==========================================================================*/

function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-[1440px] px-4 pt-4 text-sm sm:px-6">
      <ol className="flex items-center gap-1.5 text-muted-foreground">
        <li>
          <a href="#" className="hover:text-foreground">Account</a>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3.5 w-3.5" />
        </li>
        <li aria-current="page" className="font-medium text-foreground">
          Payment methods
        </li>
      </ol>
    </nav>
  );
}

/* ============================================================================
 * ACCOUNT SIDEBAR
 * ==========================================================================*/

function AccountIdentity() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        ST
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">Samir Thapa</p>
        <p className="truncate text-xs text-muted-foreground">sa***@example.com</p>
      </div>
    </div>
  );
}

function AccountNavigation({ activeId }: { activeId: string }) {
  return (
    <nav aria-label="Account navigation">
      <ul className="flex flex-col gap-0.5 p-2">
        {ACCOUNT_NAV_ITEMS.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href="#"
                aria-current={isActive ? "page" : undefined}
                className={`block rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AccountSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 rounded-xl border border-border bg-card lg:block" aria-label="Account">
      <AccountIdentity />
      <AccountNavigation activeId="payment-methods" />
    </aside>
  );
}

function MobileAccountDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-xl animate-slide-in-left">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-foreground">My account</span>
          <IconButton label="Close menu" onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </div>
        <AccountIdentity />
        <div className="flex-1 overflow-y-auto">
          <AccountNavigation activeId="payment-methods" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * PAYMENT HEADER + OVERVIEW
 * ==========================================================================*/

function AddPaymentButton() {
  const dispatch = useAppDispatch();
  return (
    <button
      type="button"
      onClick={() => dispatch(paymentActions.openAddDialog())}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add payment method
    </button>
  );
}

function PaymentHeader() {
  const methods = useAppSelector(selectAllPaymentMethods);
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payment methods</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Securely manage the payment methods you use for purchases.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {methods.length} saved {methods.length === 1 ? "method" : "methods"}
        </p>
      </div>
      <AddPaymentButton />
    </div>
  );
}

function PaymentSecurityBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5">
      <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        Your saved payment details are represented securely. We only display the last four digits of a card or
        account, and full credentials are never shown here. You can remove a saved method at any time, subject to
        any active payment requirements.
      </p>
    </div>
  );
}

function OverviewCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PaymentOverview() {
  const methods = useAppSelector(selectAllPaymentMethods);
  const defaultMethod = useAppSelector(selectDefaultPaymentMethod);
  const expiringCount = useAppSelector(selectExpiringOrExpiredCount);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <OverviewCard
        icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
        label="Saved methods"
        value={String(methods.length)}
        hint="Across cards, bank accounts, and wallets"
      />
      <OverviewCard
        icon={<Star className="h-4 w-4" aria-hidden="true" />}
        label="Default method"
        value={defaultMethod ? `${paymentMethodTitle(defaultMethod)} ${paymentMethodMaskedLine(defaultMethod)}` : "Not set"}
        hint={defaultMethod ? "Used for eligible purchases automatically" : "Choose a default for faster checkout"}
      />
      <OverviewCard
        icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
        label="Needs attention"
        value={expiringCount > 0 ? `${expiringCount} method${expiringCount > 1 ? "s" : ""}` : "None"}
        hint={expiringCount > 0 ? "Expiring soon or expired" : "Everything looks up to date"}
      />
    </div>
  );
}

/* ============================================================================
 * TOOLBAR — search / filter / sort / view mode
 * ==========================================================================*/

function PaymentMethodToolbar() {
  const dispatch = useAppDispatch();
  const search = useAppSelector((s) => s.paymentMethods.search);
  const filter = useAppSelector((s) => s.paymentMethods.filter);
  const sort = useAppSelector((s) => s.paymentMethods.sort);
  const viewMode = useAppSelector((s) => s.paymentMethods.ui.viewMode);
  const searchId = useId();

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <label htmlFor={searchId} className="sr-only">
          Search saved payment methods
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(e) => dispatch(paymentActions.setSearch(e.target.value))}
          placeholder="Search by brand or last 4 digits"
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="payment-filter">
          Filter payment methods
        </label>
        <select
          id="payment-filter"
          value={filter}
          onChange={(e) => dispatch(paymentActions.setFilter(e.target.value as PaymentMethodFilter))}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="payment-sort">
          Sort payment methods
        </label>
        <select
          id="payment-sort"
          value={sort}
          onChange={(e) => dispatch(paymentActions.setSort(e.target.value as PaymentMethodSort))}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>

        <div className="inline-flex overflow-hidden rounded-lg border border-input" role="group" aria-label="View mode">
          <button
            type="button"
            aria-pressed={viewMode === "list"}
            aria-label="List view"
            onClick={() => dispatch(paymentActions.setViewMode("list"))}
            className={`inline-flex h-9 w-9 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <ListIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "grid"}
            aria-label="Grid view"
            onClick={() => dispatch(paymentActions.setViewMode("grid"))}
            className={`inline-flex h-9 w-9 items-center justify-center border-l border-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <Grid2x2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * PAYMENT METHOD CARD
 * ==========================================================================*/

function PaymentMethodBrandIcon({ method }: { method: PaymentMethod }) {
  const iconWrapClass = "flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground";
  switch (method.type) {
    case "credit_card":
    case "debit_card":
      return (
        <div className={iconWrapClass} aria-hidden="true">
          <CreditCard className="h-5 w-5" />
        </div>
      );
    case "bank_account":
      return (
        <div className={iconWrapClass} aria-hidden="true">
          <Landmark className="h-5 w-5" />
        </div>
      );
    case "digital_wallet":
      return (
        <div className={iconWrapClass} aria-hidden="true">
          <Wallet className="h-5 w-5" />
        </div>
      );
    case "buy_now_pay_later":
      return (
        <div className={iconWrapClass} aria-hidden="true">
          <Sparkles className="h-5 w-5" />
        </div>
      );
    case "other_provider":
      return (
        <div className={iconWrapClass} aria-hidden="true">
          <Banknote className="h-5 w-5" />
        </div>
      );
  }
}

function ExpirationStatus({ method }: { method: PaymentMethod }) {
  if (method.type !== "credit_card" && method.type !== "debit_card") return null;
  const expLabel = formatExpiration(method.expirationMonth, method.expirationYear);
  if (method.status === "expired") {
    return (
      <p className="mt-1 text-xs font-medium text-destructive">Expired {expLabel} — update before use</p>
    );
  }
  if (method.status === "expiring_soon") {
    return <p className="mt-1 text-xs font-medium text-warning">Expires {expLabel} — update soon</p>;
  }
  return <p className="mt-1 text-xs text-muted-foreground">Expires {expLabel}</p>;
}

function SecurityIndicator({ method }: { method: PaymentMethod }) {
  if (method.verification === "verified") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <BadgeCheck className="h-3.5 w-3.5 text-info" aria-hidden="true" />
        Stored as a secure token
      </span>
    );
  }
  if (method.verification === "pending" || method.verification === "requires_action") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        Verification in progress
      </span>
    );
  }
  return null;
}

function PaymentMethodActions({ method }: { method: PaymentMethod }) {
  const dispatch = useAppDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={menuRef}>
      <IconButton label={`More actions for ${paymentMethodTitle(method)} ${paymentMethodMaskedLine(method)}`} onClick={() => setMenuOpen((v) => !v)}>
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </IconButton>
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              dispatch(paymentActions.openDetailsPanel(method.id));
              setMenuOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
          >
            View details
          </button>
          {method.status === "expired" ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                dispatch(paymentActions.openExpiredDialog(method.id));
                setMenuOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            >
              Update payment method
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                dispatch(paymentActions.openEditDialog(method.id));
                setMenuOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            >
              Edit billing address
            </button>
          )}
          {method.status === "verification_required" && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                dispatch(paymentActions.openVerificationDialog(method.id));
                setMenuOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            >
              Verify method
            </button>
          )}
          {!method.isDefault && method.status === "active" && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                dispatch(paymentActions.openSetDefaultDialog(method.id));
                setMenuOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            >
              Set as default
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              dispatch(paymentActions.openRemoveDialog(method.id));
              setMenuOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function PaymentMethodCard({ method }: { method: PaymentMethod }) {
  const billingAddresses = useAppSelector(selectBillingAddressesById);
  const billingAddress = method.billingAddressId ? billingAddresses[method.billingAddressId] : undefined;
  const tone = toneForStatus(method.status);

  return (
    <li className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <PaymentMethodBrandIcon method={method} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {paymentMethodTitle(method)}
              {method.nickname && <span className="font-normal text-muted-foreground"> · {method.nickname}</span>}
            </h3>
            {method.isDefault && <StatusPill label="Default" tone="info" icon={<Star className="h-3 w-3" aria-hidden="true" />} />}
            <StatusPill label={STATUS_LABEL[method.status]} tone={tone} />
          </div>
          <p className="mt-1 font-mono text-sm tabular-nums text-foreground">{paymentMethodMaskedLine(method)}</p>
          <ExpirationStatus method={method} />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <SecurityIndicator method={method} />
            {billingAddress && (
              <span>
                Billing: {billingAddress.label}, {billingAddress.city} {billingAddress.region}
              </span>
            )}
            <span>Last used: {formatRelativeDate(method.lastUsedAt)}</span>
          </div>
        </div>
        <PaymentMethodActions method={method} />
      </div>
    </li>
  );
}

/* ============================================================================
 * LIST / EMPTY / LOADING / ERROR STATES
 * ==========================================================================*/

function PaymentLoadingState() {
  return (
    <ul className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="animate-pulse rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="h-11 w-14 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PaymentErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <CircleAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-foreground">We couldn&apos;t load your payment methods</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyPaymentState() {
  const dispatch = useAppDispatch();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <CreditCard className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-foreground">No saved payment methods</p>
        <p className="mt-1 text-sm text-muted-foreground">Add a secure payment method for faster checkout.</p>
      </div>
      <button
        type="button"
        onClick={() => dispatch(paymentActions.openAddDialog())}
        className="mt-1 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add payment method
      </button>
    </div>
  );
}

function NoResultsState() {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
      No payment methods match your search or filters.
    </div>
  );
}

function PaymentMethodList() {
  const fetchStatus = useAppSelector((s) => s.paymentMethods.fetchStatus);
  const fetchError = useAppSelector((s) => s.paymentMethods.fetchError);
  const allMethods = useAppSelector(selectAllPaymentMethods);
  const filtered = useAppSelector(selectFilteredSortedMethods);
  const viewMode = useAppSelector((s) => s.paymentMethods.ui.viewMode);

  if (fetchStatus === "loading") return <PaymentLoadingState />;
  if (fetchStatus === "error") {
    return <PaymentErrorState message={fetchError ?? "A network error occurred."} onRetry={() => undefined} />;
  }
  if (allMethods.length === 0) return <EmptyPaymentState />;
  if (filtered.length === 0) return <NoResultsState />;

  return (
    <ul className={viewMode === "grid" ? "grid grid-cols-1 gap-3 md:grid-cols-2" : "flex flex-col gap-3"}>
      {filtered.map((method) => (
        <PaymentMethodCard key={method.id} method={method} />
      ))}
    </ul>
  );
}

/* ============================================================================
 * ADD PAYMENT METHOD DIALOG
 * ==========================================================================*/

type AddStep = "type" | "details" | "billing" | "verify" | "review";

interface CardFormValues {
  cardholderName: string;
  cardNumber: string; // transient only — never persisted to redux/mock state
  expirationMonth: string;
  expirationYear: string;
  postalCode: string;
  cvv: string; // transient only — never persisted
}

interface BankFormValues {
  bankName: string;
  accountType: "checking" | "savings";
  routingNumber: string; // transient only
  accountNumber: string; // transient only
}

interface WalletFormValues {
  walletProvider: WalletPaymentMethod["walletProvider"];
}

const EMPTY_CARD_FORM: CardFormValues = {
  cardholderName: "",
  cardNumber: "",
  expirationMonth: "",
  expirationYear: "",
  postalCode: "",
  cvv: "",
};

const EMPTY_BANK_FORM: BankFormValues = {
  bankName: "",
  accountType: "checking",
  routingNumber: "",
  accountNumber: "",
};

function PaymentMethodTypeSelector({
  value,
  onChange,
}: {
  value: PaymentMethodType;
  onChange: (t: PaymentMethodType) => void;
}) {
  const options: { type: PaymentMethodType; label: string; icon: React.ReactNode; description: string }[] = [
    { type: "credit_card", label: "Credit or debit card", icon: <CreditCard className="h-5 w-5" />, description: "Visa, Mastercard, Amex, Discover" },
    { type: "bank_account", label: "Bank account", icon: <Landmark className="h-5 w-5" />, description: "Pay directly from checking or savings" },
    { type: "digital_wallet", label: "Digital wallet", icon: <Wallet className="h-5 w-5" />, description: "PayPal, Apple Pay, Google Pay, Venmo" },
  ];
  return (
    <div role="radiogroup" aria-label="Payment method type" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map((opt) => {
        const selected = value === opt.type;
        return (
          <button
            key={opt.type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.type)}
            className={`flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            }`}
          >
            <span className={selected ? "text-primary" : "text-muted-foreground"} aria-hidden="true">
              {opt.icon}
            </span>
            <span className="text-sm font-medium text-foreground">{opt.label}</span>
            <span className="text-xs text-muted-foreground">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            "aria-invalid": Boolean(error) || undefined,
            "aria-describedby": error ? errorId : hint ? hintId : undefined,
          })
        : children}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive";

function CardForm({
  values,
  onChange,
  errors,
}: {
  values: CardFormValues;
  onChange: (values: CardFormValues) => void;
  errors: Partial<Record<keyof CardFormValues, string>>;
}) {
  const brand = detectCardBrand(values.cardNumber.replace(/\s/g, ""));

  return (
    <div className="space-y-4">
      <FormField label="Cardholder name" htmlFor="cardholderName" error={errors.cardholderName}>
        <input
          id="cardholderName"
          type="text"
          autoComplete="cc-name"
          value={values.cardholderName}
          onChange={(e) => onChange({ ...values, cardholderName: e.target.value })}
          className={inputClass}
        />
      </FormField>

      <FormField
        label="Card number"
        htmlFor="cardNumber"
        error={errors.cardNumber}
        hint={brand !== "unknown" ? `Detected: ${BRAND_LABEL[brand]}` : "Never stored — used only to create a secure token"}
      >
        <input
          id="cardNumber"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          maxLength={19}
          value={formatCardNumberDisplay(values.cardNumber)}
          onChange={(e) => onChange({ ...values, cardNumber: e.target.value.replace(/\D/g, "").slice(0, 16) })}
          className={`${inputClass} font-mono tabular-nums`}
        />
      </FormField>

      <div className="grid grid-cols-3 gap-3">
        <FormField label="Month" htmlFor="expirationMonth" error={errors.expirationMonth}>
          <input
            id="expirationMonth"
            type="text"
            inputMode="numeric"
            placeholder="MM"
            autoComplete="cc-exp-month"
            maxLength={2}
            value={values.expirationMonth}
            onChange={(e) => onChange({ ...values, expirationMonth: e.target.value.replace(/\D/g, "").slice(0, 2) })}
            className={`${inputClass} tabular-nums`}
          />
        </FormField>
        <FormField label="Year" htmlFor="expirationYear" error={errors.expirationYear}>
          <input
            id="expirationYear"
            type="text"
            inputMode="numeric"
            placeholder="YYYY"
            autoComplete="cc-exp-year"
            maxLength={4}
            value={values.expirationYear}
            onChange={(e) => onChange({ ...values, expirationYear: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            className={`${inputClass} tabular-nums`}
          />
        </FormField>
        <FormField label="Security code" htmlFor="cvv" error={errors.cvv} hint="Not stored">
          <input
            id="cvv"
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={4}
            value={values.cvv}
            onChange={(e) => onChange({ ...values, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            className={`${inputClass} tabular-nums`}
          />
        </FormField>
      </div>

      <FormField label="Postal code" htmlFor="postalCode" error={errors.postalCode}>
        <input
          id="postalCode"
          type="text"
          autoComplete="postal-code"
          value={values.postalCode}
          onChange={(e) => onChange({ ...values, postalCode: e.target.value })}
          className={inputClass}
        />
      </FormField>
    </div>
  );
}

function BankAccountForm({
  values,
  onChange,
  errors,
}: {
  values: BankFormValues;
  onChange: (values: BankFormValues) => void;
  errors: Partial<Record<keyof BankFormValues, string>>;
}) {
  return (
    <div className="space-y-4">
      <FormField label="Bank name" htmlFor="bankName" error={errors.bankName}>
        <input
          id="bankName"
          type="text"
          value={values.bankName}
          onChange={(e) => onChange({ ...values, bankName: e.target.value })}
          className={inputClass}
        />
      </FormField>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-foreground">Account type</legend>
        <div className="flex gap-4">
          {(["checking", "savings"] as const).map((type) => (
            <label key={type} className="inline-flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="accountType"
                checked={values.accountType === type}
                onChange={() => onChange({ ...values, accountType: type })}
                className="h-4 w-4 accent-[oklch(var(--primary))]"
              />
              {type === "checking" ? "Checking" : "Savings"}
            </label>
          ))}
        </div>
      </fieldset>

      <FormField label="Routing number" htmlFor="routingNumber" error={errors.routingNumber} hint="Never stored in plain form after verification">
        <input
          id="routingNumber"
          type="text"
          inputMode="numeric"
          maxLength={9}
          value={values.routingNumber}
          onChange={(e) => onChange({ ...values, routingNumber: e.target.value.replace(/\D/g, "").slice(0, 9) })}
          className={`${inputClass} tabular-nums`}
        />
      </FormField>

      <FormField label="Account number" htmlFor="accountNumber" error={errors.accountNumber}>
        <input
          id="accountNumber"
          type="password"
          inputMode="numeric"
          value={values.accountNumber}
          onChange={(e) => onChange({ ...values, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 17) })}
          className={`${inputClass} tabular-nums`}
        />
      </FormField>
    </div>
  );
}

function WalletForm({ values, onChange }: { values: WalletFormValues; onChange: (v: WalletFormValues) => void }) {
  const providers: WalletPaymentMethod["walletProvider"][] = ["PayPal", "Apple Pay", "Google Pay", "Venmo"];
  return (
    <div role="radiogroup" aria-label="Wallet provider" className="grid grid-cols-2 gap-2">
      {providers.map((provider) => {
        const selected = values.walletProvider === provider;
        return (
          <button
            key={provider}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange({ walletProvider: provider })}
            className={`rounded-lg border p-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-muted"
            }`}
          >
            {provider}
          </button>
        );
      })}
      <p className="col-span-2 text-xs text-muted-foreground">
        You&apos;ll be redirected to {values.walletProvider} to connect your account. Meridian never sees your wallet
        password.
      </p>
    </div>
  );
}

function BillingAddressSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const addresses = useAppSelector((s) => s.paymentMethods.billingAddressesById);
  const list = Object.values(addresses);
  return (
    <div role="radiogroup" aria-label="Billing address" className="space-y-2">
      {list.map((addr) => {
        const selected = addr.id === selectedId;
        return (
          <button
            key={addr.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(addr.id)}
            className={`flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            }`}
          >
            <span>
              <span className="block font-medium text-foreground">{addr.label}</span>
              <span className="block text-muted-foreground">
                {addr.line1}, {addr.city}, {addr.region} {addr.postalCode}
              </span>
            </span>
            {selected && <BadgeCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
          </button>
        );
      })}
      <a href="#" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add a new address
      </a>
    </div>
  );
}

function DefaultPaymentControl({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded accent-[oklch(var(--primary))]"
      />
      <span>
        <span className="block font-medium text-foreground">Make this my default payment method</span>
        <span className="block text-muted-foreground">Used automatically for eligible purchases going forward.</span>
      </span>
    </label>
  );
}

function SecureStorageNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        Payment details are sent directly to our payment provider and represented in your account as a secure
        reference. We store only the card brand, last four digits, and expiration date.
      </p>
    </div>
  );
}

function DuplicateWarning({ state, existing }: { state: DuplicateCheckState; existing: PaymentMethod | null }) {
  if (state === "no_duplicate" || !existing) return null;
  const tone = state === "duplicate" ? "danger" : "warning";
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs ${tone === "danger" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-warning/30 bg-warning/5 text-warning"}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        {state === "duplicate" ? "This payment method is already saved" : "This may match a method you already saved"}
        {" "}({paymentMethodTitle(existing)} {paymentMethodMaskedLine(existing)}).
        {state === "possible_duplicate" && " You can continue if this is a different account."}
      </p>
    </div>
  );
}

function StepIndicator({ steps, current }: { steps: { id: AddStep; label: string }[]; current: AddStep }) {
  const currentIndex = steps.findIndex((s) => s.id === current);
  return (
    <ol className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Progress">
      {steps.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isDone
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <span className={isCurrent ? "font-medium text-foreground" : ""}>{step.label}</span>
            {index < steps.length - 1 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function PaymentFormActions({
  onBack,
  onNext,
  nextLabel,
  isNextDisabled,
  isLoading,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  isNextDisabled?: boolean;
  isLoading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={isNextDisabled || isLoading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {nextLabel}
      </button>
    </div>
  );
}

function AddPaymentMethodDialog() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.paymentMethods.ui.isAddDialogOpen);
  const addOperation = useAppSelector((s) => s.paymentMethods.operations.add);
  const existingMethods = useAppSelector(selectAllPaymentMethods);
  const titleId = useId();

  const [step, setStep] = useState<AddStep>("type");
  const [methodType, setMethodType] = useState<PaymentMethodType>("credit_card");
  const [cardForm, setCardForm] = useState<CardFormValues>(EMPTY_CARD_FORM);
  const [bankForm, setBankForm] = useState<BankFormValues>(EMPTY_BANK_FORM);
  const [walletForm, setWalletForm] = useState<WalletFormValues>({ walletProvider: "PayPal" });
  const [billingAddressId, setBillingAddressId] = useState<string | null>("addr_home");
  const [makeDefault, setMakeDefault] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CardFormValues | keyof BankFormValues, string>>>({});

  const steps: { id: AddStep; label: string }[] =
    methodType === "digital_wallet"
      ? [
          { id: "type", label: "Type" },
          { id: "details", label: "Connect" },
          { id: "review", label: "Review" },
        ]
      : [
          { id: "type", label: "Type" },
          { id: "details", label: "Details" },
          { id: "billing", label: "Billing" },
          { id: "review", label: "Review" },
        ];

  const duplicateCheck: DuplicateCheckState = useMemo(() => {
    if (methodType !== "credit_card" || cardForm.cardNumber.length < 4) return "no_duplicate";
    const last4 = cardForm.cardNumber.slice(-4);
    const match = existingMethods.find(
      (m) => (m.type === "credit_card" || m.type === "debit_card") && m.last4 === last4,
    );
    return match ? "duplicate" : "no_duplicate";
  }, [cardForm.cardNumber, existingMethods, methodType]);

  const duplicateMatch = useMemo(() => {
    if (duplicateCheck === "no_duplicate") return null;
    const last4 = cardForm.cardNumber.slice(-4);
    return (
      existingMethods.find((m) => (m.type === "credit_card" || m.type === "debit_card") && m.last4 === last4) ?? null
    );
  }, [duplicateCheck, cardForm.cardNumber, existingMethods]);

  function resetAndClose() {
    dispatch(paymentActions.closeAddDialog());
    setStep("type");
    setMethodType("credit_card");
    setCardForm(EMPTY_CARD_FORM);
    setBankForm(EMPTY_BANK_FORM);
    setWalletForm({ walletProvider: "PayPal" });
    setBillingAddressId("addr_home");
    setMakeDefault(false);
    setErrors({});
  }

  function validateCardDetails(): boolean {
    const nextErrors: typeof errors = {};
    const digits = cardForm.cardNumber;
    if (!cardForm.cardholderName.trim()) nextErrors.cardholderName = "Enter the name on the card.";
    if (digits.length < 13 || !luhnCheck(digits)) nextErrors.cardNumber = "Enter a valid card number.";
    const month = Number(cardForm.expirationMonth);
    const year = Number(cardForm.expirationYear);
    if (!isExpirationValid(month, year)) nextErrors.expirationMonth = "Enter a valid, unexpired date.";
    if (cardForm.cvv.length < 3) nextErrors.cvv = "Enter the security code.";
    if (!cardForm.postalCode.trim()) nextErrors.postalCode = "Enter a postal code.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateBankDetails(): boolean {
    const nextErrors: typeof errors = {};
    if (!bankForm.bankName.trim()) nextErrors.bankName = "Enter your bank name.";
    if (bankForm.routingNumber.length !== 9) nextErrors.routingNumber = "Enter a 9-digit routing number.";
    if (bankForm.accountNumber.length < 4) nextErrors.accountNumber = "Enter a valid account number.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (step === "type") {
      setStep("details");
      return;
    }
    if (step === "details") {
      if (methodType === "credit_card" && !validateCardDetails()) return;
      if (methodType === "bank_account" && !validateBankDetails()) return;
      setStep(methodType === "digital_wallet" ? "review" : "billing");
      return;
    }
    if (step === "billing") {
      setStep("review");
      return;
    }
    if (step === "review") {
      handleSave();
    }
  }

  function goBack() {
    if (step === "details") setStep("type");
    else if (step === "billing") setStep("details");
    else if (step === "review") setStep(methodType === "digital_wallet" ? "details" : "billing");
  }

  function handleSave() {
    dispatch(paymentActions.addPaymentMethodStart());
    // Simulated integration boundary: a real implementation exchanges the
    // transient card/bank fields for a provider token via a secure element —
    // raw values are discarded immediately after and never reach Redux.
    window.setTimeout(() => {
      const now = new Date().toISOString();
      const id = `pm_${Math.random().toString(36).slice(2, 9)}`;
      let method: PaymentMethod;

      if (methodType === "credit_card") {
        const brand = detectCardBrand(cardForm.cardNumber);
        method = {
          id,
          type: "credit_card",
          brand,
          last4: cardForm.cardNumber.slice(-4),
          expirationMonth: Number(cardForm.expirationMonth),
          expirationYear: Number(cardForm.expirationYear),
          cardholderName: cardForm.cardholderName,
          status: "active",
          verification: "verified",
          isDefault: makeDefault,
          billingAddressId,
          providerReference: `tok_${id}`,
          addedAt: now,
          lastUsedAt: null,
          nickname: null,
        };
      } else if (methodType === "bank_account") {
        method = {
          id,
          type: "bank_account",
          bankName: bankForm.bankName,
          accountType: bankForm.accountType,
          last4: bankForm.accountNumber.slice(-4),
          status: "verification_required",
          verification: "pending",
          isDefault: makeDefault,
          billingAddressId,
          providerReference: `ba_${id}`,
          addedAt: now,
          lastUsedAt: null,
          nickname: null,
        };
      } else {
        method = {
          id,
          type: "digital_wallet",
          walletProvider: walletForm.walletProvider,
          connectedIdentifier: "sa***@example.com",
          status: "active",
          verification: "verified",
          isDefault: makeDefault,
          billingAddressId: null,
          providerReference: `wal_${id}`,
          addedAt: now,
          lastUsedAt: null,
          nickname: null,
        };
      }

      dispatch(paymentActions.addPaymentMethodSuccess({ method }));
      resetAndClose();
    }, 700);
  }

  return (
    <Dialog isOpen={isOpen} onClose={resetAndClose} titleId={titleId} widthClassName="max-w-xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Add payment method
        </h2>
        <IconButton label="Close dialog" onClick={resetAndClose}>
          <X className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>

      <div className="border-b border-border px-5 py-3 sm:px-6">
        <StepIndicator steps={steps} current={step} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {step === "type" && <PaymentMethodTypeSelector value={methodType} onChange={setMethodType} />}

        {step === "details" && methodType === "credit_card" && (
          <div className="space-y-4">
            <CardForm values={cardForm} onChange={setCardForm} errors={errors} />
            <DuplicateWarning state={duplicateCheck} existing={duplicateMatch} />
          </div>
        )}
        {step === "details" && methodType === "bank_account" && (
          <BankAccountForm values={bankForm} onChange={setBankForm} errors={errors} />
        )}
        {step === "details" && methodType === "digital_wallet" && (
          <WalletForm values={walletForm} onChange={setWalletForm} />
        )}

        {step === "billing" && (
          <div className="space-y-4">
            <BillingAddressSelector selectedId={billingAddressId} onSelect={setBillingAddressId} />
            <DefaultPaymentControl checked={makeDefault} onChange={setMakeDefault} />
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 text-sm">
              <p className="font-medium text-foreground">{PAYMENT_TYPE_LABEL[methodType]}</p>
              {methodType === "credit_card" && (
                <p className="mt-1 text-muted-foreground">
                  {BRAND_LABEL[detectCardBrand(cardForm.cardNumber)]} ending in {cardForm.cardNumber.slice(-4) || "----"}, expires{" "}
                  {cardForm.expirationMonth || "MM"}/{cardForm.expirationYear || "YYYY"}
                </p>
              )}
              {methodType === "bank_account" && (
                <p className="mt-1 text-muted-foreground">
                  {bankForm.bankName || "Bank account"} ending in {bankForm.accountNumber.slice(-4) || "----"}
                </p>
              )}
              {methodType === "digital_wallet" && (
                <p className="mt-1 text-muted-foreground">Connect to {walletForm.walletProvider}</p>
              )}
              {makeDefault && <p className="mt-1 text-muted-foreground">Will be set as your default method.</p>}
            </div>
            <SecureStorageNotice />
            {addOperation.status === "error" && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {addOperation.error}
              </p>
            )}
          </div>
        )}
      </div>

      <PaymentFormActions
        onBack={step === "type" ? undefined : goBack}
        onNext={goNext}
        nextLabel={step === "review" ? "Save payment method" : "Continue"}
        isLoading={addOperation.status === "loading"}
      />
    </Dialog>
  );
}

/* ============================================================================
 * EDIT PAYMENT METHOD DIALOG (billing address + nickname)
 * ==========================================================================*/

function EditPaymentMethodDialog() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.paymentMethods.ui.isEditDialogOpen);
  const editingId = useAppSelector((s) => s.paymentMethods.ui.editingId);
  const method = useAppSelector((s) => (editingId ? s.paymentMethods.byId[editingId] : undefined));
  const titleId = useId();
  const [billingAddressId, setBillingAddressId] = useState<string | null>(method?.billingAddressId ?? null);

  if (!method) return null;

  function handleClose() {
    dispatch(paymentActions.closeEditDialog());
  }

  function handleSave() {
    if (editingId && billingAddressId) {
      dispatch(paymentActions.updateBillingAddress({ id: editingId, billingAddressId }));
    }
    handleClose();
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} titleId={titleId}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Edit {paymentMethodTitle(method)} {paymentMethodMaskedLine(method)}
        </h2>
        <IconButton label="Close dialog" onClick={handleClose}>
          <X className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <p className="mb-3 text-sm text-muted-foreground">
          Card and account numbers can&apos;t be edited directly. To use a different card or account, add it as a new
          payment method.
        </p>
        <BillingAddressSelector selectedId={billingAddressId} onSelect={setBillingAddressId} />
      </div>
      <PaymentFormActions onNext={handleSave} nextLabel="Save changes" />
    </Dialog>
  );
}

/* ============================================================================
 * DETAILS PANEL
 * ==========================================================================*/

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/70 py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function PaymentMethodDetailsPanel() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.paymentMethods.ui.isDetailsPanelOpen);
  const detailsId = useAppSelector((s) => s.paymentMethods.ui.detailsId);
  const method = useAppSelector((s) => (detailsId ? s.paymentMethods.byId[detailsId] : undefined));
  const billingAddresses = useAppSelector(selectBillingAddressesById);
  const titleId = useId();

  if (!method) return null;
  const billingAddress = method.billingAddressId ? billingAddresses[method.billingAddressId] : undefined;

  return (
    <Dialog isOpen={isOpen} onClose={() => dispatch(paymentActions.closeDetailsPanel())} titleId={titleId}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Payment method details
        </h2>
        <IconButton label="Close panel" onClick={() => dispatch(paymentActions.closeDetailsPanel())}>
          <X className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <DetailRow label="Type" value={PAYMENT_TYPE_LABEL[method.type]} />
        <DetailRow label="Identifier" value={<span className="font-mono">{paymentMethodMaskedLine(method)}</span>} />
        {(method.type === "credit_card" || method.type === "debit_card") && (
          <DetailRow label="Expiration" value={formatExpiration(method.expirationMonth, method.expirationYear)} />
        )}
        <DetailRow label="Status" value={STATUS_LABEL[method.status]} />
        <DetailRow label="Verification" value={method.verification.replace(/_/g, " ")} />
        <DetailRow label="Default method" value={method.isDefault ? "Yes" : "No"} />
        {billingAddress && (
          <DetailRow
            label="Billing address"
            value={`${billingAddress.line1}, ${billingAddress.city} ${billingAddress.region}`}
          />
        )}
        <DetailRow label="Added" value={formatMonthYear(method.addedAt)} />
        <DetailRow label="Last used" value={formatRelativeDate(method.lastUsedAt)} />
        <DetailRow label="Provider reference" value={<span className="font-mono text-xs">{method.providerReference}</span>} />
      </div>
    </Dialog>
  );
}

/* ============================================================================
 * SET DEFAULT / REMOVE / VERIFY / EXPIRED DIALOGS
 * ==========================================================================*/

function SetDefaultPaymentDialog() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.paymentMethods.ui.isSetDefaultDialogOpen);
  const targetId = useAppSelector((s) => s.paymentMethods.ui.setDefaultTargetId);
  const method = useAppSelector((s) => (targetId ? s.paymentMethods.byId[targetId] : undefined));
  const operation = useAppSelector((s) => s.paymentMethods.operations.setDefault);
  const titleId = useId();

  if (!method) return null;

  function handleClose() {
    dispatch(paymentActions.closeSetDefaultDialog());
  }

  function handleConfirm() {
    if (!targetId) return;
    dispatch(paymentActions.setDefaultStart());
    window.setTimeout(() => {
      dispatch(paymentActions.setDefaultSuccess(targetId));
    }, 500);
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} titleId={titleId} widthClassName="max-w-md">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Set as default payment method
        </h2>
        <IconButton label="Close dialog" onClick={handleClose}>
          <X className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>
      <div className="px-5 py-5 text-sm text-muted-foreground sm:px-6">
        <p>
          {paymentMethodTitle(method)} {paymentMethodMaskedLine(method)} will be used automatically for eligible
          purchases. You can change this at any time.
        </p>
        {operation.status === "error" && (
          <p role="alert" className="mt-3 font-medium text-destructive">
            {operation.error}
          </p>
        )}
      </div>
      <PaymentFormActions onBack={handleClose} onNext={handleConfirm} nextLabel="Confirm" isLoading={operation.status === "loading"} />
    </Dialog>
  );
}

function RemovePaymentDialog() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.paymentMethods.ui.isRemoveDialogOpen);
  const targetId = useAppSelector((s) => s.paymentMethods.ui.removeTargetId);
  const method = useAppSelector((s) => (targetId ? s.paymentMethods.byId[targetId] : undefined));
  const operation = useAppSelector((s) => (targetId ? s.paymentMethods.operations.removeById[targetId] : undefined)) ?? IDLE_OPERATION;
  const titleId = useId();

  if (!method) return null;

  function handleClose() {
    dispatch(paymentActions.closeRemoveDialog());
  }

  const isBlocked = method.type === "buy_now_pay_later" && method.status === "active";

  function handleConfirm() {
    if (!targetId || isBlocked) return;
    dispatch(paymentActions.removeStart(targetId));
    window.setTimeout(() => {
      dispatch(paymentActions.removeSuccess(targetId));
    }, 500);
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} titleId={titleId} widthClassName="max-w-md">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Remove payment method
        </h2>
        <IconButton label="Close dialog" onClick={handleClose}>
          <X className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>
      <div className="space-y-3 px-5 py-5 text-sm sm:px-6">
        <p className="text-muted-foreground">
          You&apos;re about to remove {paymentMethodTitle(method)} {paymentMethodMaskedLine(method)}. This
          can&apos;t be undone.
        </p>
        {method.isDefault && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-warning">
            This is your default payment method. You&apos;ll need to choose a new default afterward.
          </p>
        )}
        {isBlocked && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
            This payment method can&apos;t be removed while it is required for an active payment arrangement.
          </p>
        )}
        {operation.status === "error" && (
          <p role="alert" className="font-medium text-destructive">
            {operation.error}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isBlocked || operation.status === "loading"}
          className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {operation.status === "loading" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Remove
        </button>
      </div>
    </Dialog>
  );
}

function VerificationDialog() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.paymentMethods.ui.isVerificationDialogOpen);
  const targetId = useAppSelector((s) => s.paymentMethods.ui.verificationTargetId);
  const method = useAppSelector((s) => (targetId ? s.paymentMethods.byId[targetId] : undefined));
  const operation = useAppSelector((s) => (targetId ? s.paymentMethods.operations.verifyById[targetId] : undefined)) ?? IDLE_OPERATION;
  const titleId = useId();
  const [code, setCode] = useState("");

  if (!method) return null;

  function handleClose() {
    dispatch(paymentActions.closeVerificationDialog());
    setCode("");
  }

  function handleVerify() {
    if (!targetId) return;
    dispatch(paymentActions.verifyStart(targetId));
    window.setTimeout(() => {
      if (code.trim().length >= 4) {
        dispatch(paymentActions.verifySuccess(targetId));
        setCode("");
      } else {
        dispatch(paymentActions.verifyFailure({ id: targetId, error: "That verification code didn't match. Try again or contact support." }));
      }
    }, 600);
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} titleId={titleId} widthClassName="max-w-md">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Verify payment method
        </h2>
        <IconButton label="Close dialog" onClick={handleClose}>
          <X className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>
      <div className="space-y-4 px-5 py-5 text-sm sm:px-6">
        <p className="text-muted-foreground">
          Enter the verification code sent for {paymentMethodTitle(method)} {paymentMethodMaskedLine(method)} to
          finish activating it.
        </p>
        <FormField label="Verification code" htmlFor="verificationCode" error={operation.status === "error" ? operation.error ?? undefined : undefined}>
          <input
            id="verificationCode"
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <p className="text-xs text-muted-foreground">
          Didn&apos;t get a code? <a href="#" className="font-medium text-primary hover:underline">Contact support</a>.
        </p>
      </div>
      <PaymentFormActions onBack={handleClose} onNext={handleVerify} nextLabel="Verify" isLoading={operation.status === "loading"} />
    </Dialog>
  );
}

function ExpiredPaymentDialog() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.paymentMethods.ui.isExpiredDialogOpen);
  const targetId = useAppSelector((s) => s.paymentMethods.ui.expiredTargetId);
  const method = useAppSelector((s) => (targetId ? s.paymentMethods.byId[targetId] : undefined));
  const titleId = useId();

  if (!method) return null;

  function handleClose() {
    dispatch(paymentActions.closeExpiredDialog());
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} titleId={titleId} widthClassName="max-w-md">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Update expired payment method
        </h2>
        <IconButton label="Close dialog" onClick={handleClose}>
          <X className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>
      <div className="space-y-3 px-5 py-5 text-sm sm:px-6">
        <p className="text-muted-foreground">
          {paymentMethodTitle(method)} {paymentMethodMaskedLine(method)} expired in{" "}
          {method.type === "credit_card" || method.type === "debit_card"
            ? formatExpiration(method.expirationMonth, method.expirationYear)
            : ""}
          . Update it before using it for future purchases.
        </p>
      </div>
      <div className="flex flex-col gap-2 border-t border-border px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={() => {
            handleClose();
            dispatch(paymentActions.openAddDialog());
          }}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Add a new payment method
        </button>
        <button
          type="button"
          onClick={() => {
            handleClose();
            dispatch(paymentActions.openRemoveDialog(method.id));
          }}
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Remove this method
        </button>
      </div>
    </Dialog>
  );
}

/* ============================================================================
 * BILLING ADDRESS SECTION / PREFERENCES / SECURITY / HELP / TRUST
 * ==========================================================================*/

function BillingAddressSection() {
  const addresses = useAppSelector((s) => Object.values(s.paymentMethods.billingAddressesById));
  return (
    <section aria-labelledby="billing-addresses-heading" className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 id="billing-addresses-heading" className="text-sm font-semibold text-foreground">
          Billing addresses
        </h2>
        <a href="#" className="text-sm font-medium text-primary hover:underline">
          Manage addresses
        </a>
      </div>
      <ul className="mt-3 space-y-2">
        {addresses.map((addr) => (
          <li key={addr.id} className="rounded-lg border border-border/70 px-3 py-2.5 text-sm">
            <p className="font-medium text-foreground">{addr.label}</p>
            <p className="text-muted-foreground">
              {addr.line1}, {addr.city}, {addr.region} {addr.postalCode}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-b-0">
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function PaymentPreferencesSection() {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector((s) => s.paymentMethods.preferences);
  const methods = useAppSelector(selectAllPaymentMethods);

  return (
    <section aria-labelledby="payment-preferences-heading" className="rounded-xl border border-border bg-card p-5">
      <h2 id="payment-preferences-heading" className="text-sm font-semibold text-foreground">
        Payment preferences
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        These preferences affect how saved methods are suggested. They don&apos;t authorize any charge.
      </p>

      <div className="mt-3">
        <label htmlFor="preferredMethod" className="mb-1.5 block text-sm font-medium text-foreground">
          Preferred payment method
        </label>
        <select
          id="preferredMethod"
          value={preferences.preferredPaymentMethodId ?? ""}
          onChange={(e) => dispatch(paymentActions.updatePreferences({ preferredPaymentMethodId: e.target.value || null }))}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-80"
        >
          <option value="">No preference</option>
          {methods.map((m) => (
            <option key={m.id} value={m.id}>
              {paymentMethodTitle(m)} {paymentMethodMaskedLine(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2">
        <PreferenceToggle
          label="Use saved methods by default"
          description="Suggest a saved payment method instead of asking each time."
          checked={preferences.useSavedMethodsByDefault}
          onChange={(v) => dispatch(paymentActions.updatePreferences({ useSavedMethodsByDefault: v }))}
        />
        <PreferenceToggle
          label="Notify before a method expires"
          description="Get a reminder before a saved card or account expires."
          checked={preferences.notifyOnExpiration}
          onChange={(v) => dispatch(paymentActions.updatePreferences({ notifyOnExpiration: v }))}
        />
        <PreferenceToggle
          label="Notify when a new method is added"
          description="Send an email confirmation any time a payment method is saved."
          checked={preferences.notifyOnNewMethod}
          onChange={(v) => dispatch(paymentActions.updatePreferences({ notifyOnNewMethod: v }))}
        />
      </div>
    </section>
  );
}

function PaymentSecuritySection() {
  return (
    <section aria-labelledby="payment-security-heading" className="rounded-xl border border-border bg-card p-5">
      <h2 id="payment-security-heading" className="text-sm font-semibold text-foreground">
        How we protect your payment information
      </h2>
      <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
        <li className="flex gap-2.5">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Full card, bank, and wallet credentials are never stored on our servers — only a secure provider reference.
        </li>
        <li className="flex gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Only the last four digits of a saved method are ever displayed.
        </li>
        <li className="flex gap-2.5">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          You choose which methods to save, set as default, or remove at any time.
        </li>
      </ul>
    </section>
  );
}

function PaymentHelpSection() {
  const items = [
    { q: "Why do I need to verify a payment method?", a: "Some banks and providers require a one-time check before a method can be used for purchases." },
    { q: "What happens to my saved method if it expires?", a: "It stays visible so you can update or remove it, but it can't be used until it's updated." },
    { q: "Can I use different billing addresses for different methods?", a: "Yes — each saved method can have its own billing address." },
  ];
  return (
    <section aria-labelledby="payment-help-heading" className="rounded-xl border border-border bg-card p-5">
      <h2 id="payment-help-heading" className="text-sm font-semibold text-foreground">
        Common questions
      </h2>
      <dl className="mt-3 divide-y divide-border/70">
        {items.map((item) => (
          <div key={item.q} className="py-3 first:pt-0 last:pb-0">
            <dt className="text-sm font-medium text-foreground">{item.q}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{item.a}</dd>
          </div>
        ))}
      </dl>
      <a href="#" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        Visit the help center
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </section>
  );
}

function TrustSection() {
  return (
    <section aria-label="Trust information" className="grid grid-cols-1 gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:grid-cols-3">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Payment references are managed by PCI-conscious infrastructure.
      </div>
      <div className="flex items-start gap-2">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Sensitive fields are transmitted directly to our payment provider.
      </div>
      <div className="flex items-start gap-2">
        <Settings className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        You stay in control of every saved method.
      </div>
    </section>
  );
}

/* ============================================================================
 * PAGE COMPOSITION
 * ==========================================================================*/

function PaymentMain() {
  return (
    <main id="main-content" className="min-w-0 flex-1 space-y-6">
      <PaymentHeader />
      <PaymentSecurityBanner />
      <PaymentOverview />

      <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <PaymentMethodToolbar />
        <PaymentMethodList />
      </div>

      <BillingAddressSection />
      <PaymentPreferencesSection />
      <PaymentSecuritySection />
      <PaymentHelpSection />
      <TrustSection />

      <AddPaymentMethodDialog />
      <EditPaymentMethodDialog />
      <PaymentMethodDetailsPanel />
      <SetDefaultPaymentDialog />
      <RemovePaymentDialog />
      <VerificationDialog />
      <ExpiredPaymentDialog />
    </main>
  );
}

function PaymentWorkspace() {
  return (
    <div className="mx-auto flex max-w-[1440px] items-start gap-6 px-4 py-6 sm:px-6">
      <AccountSidebar />
      <PaymentWorkspaceMobileNavTrigger />
      <PaymentMain />
    </div>
  );
}

function PaymentWorkspaceMobileNavTrigger() {
  // Placeholder region kept intentionally empty on desktop; mobile nav is
  // triggered from the header and rendered as a drawer at the page level.
  return null;
}

export default function PaymentMethodsPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <Provider store={store}>
      <div className="min-h-screen bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <EcommerceHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
        <MobileAccountDrawer isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <Breadcrumbs />
        <PaymentWorkspace />
        <EcommerceFooter />
      </div>
    </Provider>
  );
}