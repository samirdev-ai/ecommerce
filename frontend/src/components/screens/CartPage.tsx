"use client";

/**
 * CartPage.tsx
 * Enterprise ecommerce Cart screen — single-file implementation.
 * Internally modular: types → constants → mock data → utils → redux →
 * primitives → header/footer chrome → cart components → summary → page.
 *
 * Install: npm i @reduxjs/toolkit react-redux lucide-react
 */

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  memo,
  type ReactNode,
  type ChangeEvent,
} from "react";
import {
  configureStore,
  createSlice,
  createSelector,
  combineReducers,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  Provider,
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Bell,
  Menu,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  Trash2,
  BadgeCheck,
  Star,
  Truck,
  MapPin,
  Tag,
  X,
  Check,
  AlertTriangle,
  PackageX,
  Clock,
  Gift,
  ShieldCheck,
  Globe,
  MessageCircle,
  Send,
  Video,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// 2. TYPES
// ════════════════════════════════════════════════════════════════════════════

type InventoryStatus =
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "backordered"
  | "preorder";

type ShippingMethod = "standard" | "express" | "free";

type FulfillmentType = "platform" | "seller" | "marketplace";

interface Seller {
  id: string;
  name: string;
  verified: boolean;
  rating: number;
  ratingCount: number;
  fulfillment: FulfillmentType;
  shipsFrom: string;
}

interface ProductVariant {
  color?: string;
  size?: string;
  storage?: string;
  configuration?: string;
}

interface Product {
  id: string;
  brand: string;
  name: string;
  sku: string;
  image: string;
  category: string;
  rating: number;
  reviewCount: number;
  variant: ProductVariant;
}

/** Discriminated union describing badges shown on an item */
type ItemBadge =
  | { kind: "price-changed"; previousPrice: number }
  | { kind: "seller-changed" }
  | { kind: "delivery-delayed"; newEstimate: string }
  | { kind: "limited-quantity"; remaining: number }
  | { kind: "best-seller" };

interface CartItemEntity {
  id: string;
  productId: string;
  sellerId: string;
  unitPrice: number;
  originalPrice: number;
  quantity: number;
  maxQuantity: number;
  inventoryStatus: InventoryStatus;
  stockRemaining: number | null;
  deliveryEstimate: string;
  shippingMethod: ShippingMethod;
  shippingFee: number;
  badges: ItemBadge[];
}

interface SavedItemEntity {
  id: string;
  productId: string;
  sellerId: string;
  price: number;
  originalPrice: number;
  savedAt: string;
}

/** Discriminated union — coupon lifecycle */
type CouponStatus =
  | { state: "available" }
  | { state: "applied" }
  | { state: "invalid"; reason: string }
  | { state: "expired" }
  | { state: "minimum-not-met"; minimumOrder: number }
  | { state: "not-eligible"; reason: string };

interface Coupon {
  code: string;
  label: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount?: number;
  minimumOrder: number;
  expiresOn: string;
}

interface DeliveryAddress {
  label: string;
  line: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
}

interface RecommendedProduct {
  id: string;
  brand: string;
  name: string;
  image: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
}

interface PriceBreakdown {
  itemSubtotal: number;
  productDiscount: number;
  couponDiscount: number;
  shipping: number;
  tax: number;
  platformFee: number;
  totalSavings: number;
  grandTotal: number;
}

// ════════════════════════════════════════════════════════════════════════════
// 3. CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const FREE_SHIPPING_THRESHOLD = 75;
const TAX_RATE = 0.0575;
const PLATFORM_FEE_RATE = 0.0;
const POINTS_PER_DOLLAR = 5;

const INVENTORY_LABEL: Record<InventoryStatus, string> = {
  "in-stock": "In Stock",
  "low-stock": "Low Stock",
  "out-of-stock": "Out of Stock",
  backordered: "Backordered",
  preorder: "Preorder",
};

const INVENTORY_CLASSES: Record<InventoryStatus, string> = {
  "in-stock": "text-success",
  "low-stock": "text-warning",
  "out-of-stock": "text-destructive",
  backordered: "text-info",
  preorder: "text-info",
};

const SHIPPING_LABEL: Record<ShippingMethod, string> = {
  standard: "Standard Shipping",
  express: "Express Shipping",
  free: "Free Shipping",
};

// ════════════════════════════════════════════════════════════════════════════
// 4. MOCK DATA
// ════════════════════════════════════════════════════════════════════════════

const MOCK_SELLERS: Record<string, Seller> = {
  "seller-aurora": {
    id: "seller-aurora",
    name: "Aurora Electronics Co.",
    verified: true,
    rating: 4.8,
    ratingCount: 24800,
    fulfillment: "platform",
    shipsFrom: "Portland, OR",
  },
  "seller-northgear": {
    id: "seller-northgear",
    name: "NorthGear Outdoor Supply",
    verified: true,
    rating: 4.6,
    ratingCount: 9120,
    fulfillment: "marketplace",
    shipsFrom: "Denver, CO",
  },
  "seller-homeloom": {
    id: "seller-homeloom",
    name: "HomeLoom Living",
    verified: false,
    rating: 4.2,
    ratingCount: 1830,
    fulfillment: "seller",
    shipsFrom: "Austin, TX",
  },
};

const MOCK_PRODUCTS: Record<string, Product> = {
  "prod-headset": {
    id: "prod-headset",
    brand: "Aurora",
    name: "Aurora Pro Wireless Noise-Cancelling Headphones",
    sku: "AUR-HP-402-BLK",
    image: "🎧",
    category: "Audio",
    rating: 4.7,
    reviewCount: 12480,
    variant: { color: "Midnight Black", configuration: "Over-Ear" },
  },
  "prod-watch": {
    id: "prod-watch",
    brand: "Aurora",
    name: "Aurora Fit Series 6 Smartwatch, GPS + Cellular",
    sku: "AUR-SW6-44-SLV",
    image: "⌚",
    category: "Wearables",
    rating: 4.5,
    reviewCount: 8340,
    variant: { color: "Silver Aluminum", size: "44mm", storage: "32GB" },
  },
  "prod-tent": {
    id: "prod-tent",
    brand: "NorthGear",
    name: "NorthGear Summit 4-Person Waterproof Tent",
    sku: "NG-TENT4-GRN",
    image: "⛺",
    category: "Outdoor",
    rating: 4.6,
    reviewCount: 2140,
    variant: { color: "Forest Green", configuration: "4-Person" },
  },
  "prod-boots": {
    id: "prod-boots",
    brand: "NorthGear",
    name: "NorthGear Trailblazer Waterproof Hiking Boots",
    sku: "NG-BOOT-TRL-42",
    image: "🥾",
    category: "Footwear",
    rating: 4.4,
    reviewCount: 3670,
    variant: { color: "Charcoal", size: "US 9" },
  },
  "prod-lamp": {
    id: "prod-lamp",
    brand: "HomeLoom",
    name: "HomeLoom Ceramic Table Lamp with Linen Shade",
    sku: "HL-LAMP-CER-IVY",
    image: "💡",
    category: "Home",
    rating: 4.3,
    reviewCount: 690,
    variant: { color: "Ivory" },
  },
};

const MOCK_CART_ITEMS: CartItemEntity[] = [
  {
    id: "ci-1",
    productId: "prod-headset",
    sellerId: "seller-aurora",
    unitPrice: 179.99,
    originalPrice: 229.99,
    quantity: 1,
    maxQuantity: 5,
    inventoryStatus: "in-stock",
    stockRemaining: null,
    deliveryEstimate: "Sep 18 – Sep 20",
    shippingMethod: "free",
    shippingFee: 0,
    badges: [{ kind: "price-changed", previousPrice: 199.99 }, { kind: "best-seller" }],
  },
  {
    id: "ci-2",
    productId: "prod-watch",
    sellerId: "seller-aurora",
    unitPrice: 249.0,
    originalPrice: 279.0,
    quantity: 2,
    maxQuantity: 4,
    inventoryStatus: "low-stock",
    stockRemaining: 3,
    deliveryEstimate: "Sep 18 – Sep 20",
    shippingMethod: "free",
    shippingFee: 0,
    badges: [{ kind: "limited-quantity", remaining: 3 }],
  },
  {
    id: "ci-3",
    productId: "prod-tent",
    sellerId: "seller-northgear",
    unitPrice: 189.5,
    originalPrice: 189.5,
    quantity: 1,
    maxQuantity: 8,
    inventoryStatus: "in-stock",
    stockRemaining: null,
    deliveryEstimate: "Sep 22 – Sep 25",
    shippingMethod: "standard",
    shippingFee: 6.99,
    badges: [],
  },
  {
    id: "ci-4",
    productId: "prod-boots",
    sellerId: "seller-northgear",
    unitPrice: 96.0,
    originalPrice: 120.0,
    quantity: 1,
    maxQuantity: 6,
    inventoryStatus: "out-of-stock",
    stockRemaining: 0,
    deliveryEstimate: "Unavailable",
    shippingMethod: "standard",
    shippingFee: 5.99,
    badges: [{ kind: "delivery-delayed", newEstimate: "Oct 2 – Oct 6" }],
  },
  {
    id: "ci-5",
    productId: "prod-lamp",
    sellerId: "seller-homeloom",
    unitPrice: 42.0,
    originalPrice: 42.0,
    quantity: 1,
    maxQuantity: 10,
    inventoryStatus: "in-stock",
    stockRemaining: null,
    deliveryEstimate: "Sep 24 – Sep 27",
    shippingMethod: "standard",
    shippingFee: 4.5,
    badges: [{ kind: "seller-changed" }],
  },
];

const MOCK_SAVED_ITEMS: SavedItemEntity[] = [
  {
    id: "si-1",
    productId: "prod-lamp",
    sellerId: "seller-homeloom",
    price: 38.0,
    originalPrice: 42.0,
    savedAt: "2024-06-02",
  },
];

const MOCK_COUPONS: Coupon[] = [
  {
    code: "WELCOME10",
    label: "10% Off Your Order",
    description: "10% off orders over $50, up to $25 off",
    discountType: "percentage",
    discountValue: 10,
    maxDiscount: 25,
    minimumOrder: 50,
    expiresOn: "2024-12-31",
  },
  {
    code: "FREESHIP",
    label: "Free Standard Shipping",
    description: "Free standard shipping on any order",
    discountType: "fixed",
    discountValue: 6.99,
    minimumOrder: 0,
    expiresOn: "2024-09-30",
  },
  {
    code: "SAVE20NOW",
    label: "$20 Off Orders Over $150",
    description: "$20 off when you spend $150 or more",
    discountType: "fixed",
    discountValue: 20,
    minimumOrder: 150,
    expiresOn: "2024-07-01",
  },
];

const MOCK_ADDRESS: DeliveryAddress = {
  label: "Home",
  line: "1420 Maple Grove Ave, Apt 3B",
  city: "Kathmandu",
  postalCode: "44600",
  isDefault: true,
};

const MOCK_RECOMMENDATIONS: RecommendedProduct[] = [
  { id: "rec-1", brand: "Aurora", name: "Aurora Charging Dock Stand", image: "🔌", price: 34.99, originalPrice: 44.99, rating: 4.5, reviewCount: 1240 },
  { id: "rec-2", brand: "NorthGear", name: "NorthGear Insulated Water Bottle 1L", image: "🧴", price: 22.0, originalPrice: 28.0, rating: 4.7, reviewCount: 3980 },
  { id: "rec-3", brand: "Aurora", name: "Aurora SoundClip Portable Speaker", image: "🔊", price: 59.0, originalPrice: 79.0, rating: 4.4, reviewCount: 870 },
  { id: "rec-4", brand: "HomeLoom", name: "HomeLoom Woven Throw Blanket", image: "🧣", price: 36.0, originalPrice: 36.0, rating: 4.6, reviewCount: 512 },
];

const MOCK_RECENTLY_VIEWED: RecommendedProduct[] = [
  { id: "rv-1", brand: "NorthGear", name: "NorthGear Trail Backpack 30L", image: "🎒", price: 68.0, originalPrice: 85.0, rating: 4.5, reviewCount: 2210 },
  { id: "rv-2", brand: "Aurora", name: "Aurora Slim Laptop Sleeve 14\"", image: "💻", price: 24.0, originalPrice: 24.0, rating: 4.3, reviewCount: 640 },
  { id: "rv-3", brand: "HomeLoom", name: "HomeLoom Stoneware Mug Set of 4", image: "☕", price: 29.0, originalPrice: 35.0, rating: 4.6, reviewCount: 980 },
];

// ════════════════════════════════════════════════════════════════════════════
// 5. UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatCompactNumber = (value: number): string =>
  new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);

const clampQuantity = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Evaluate a coupon's real-time status against the current subtotal. */
function evaluateCouponStatus(coupon: Coupon, subtotal: number): CouponStatus {
  const isExpired = new Date(coupon.expiresOn).getTime() < Date.now();
  if (isExpired) return { state: "expired" };
  if (subtotal < coupon.minimumOrder) {
    return { state: "minimum-not-met", minimumOrder: coupon.minimumOrder };
  }
  return { state: "available" };
}

function calculateCouponDiscount(coupon: Coupon, subtotal: number): number {
  if (coupon.discountType === "fixed") return coupon.discountValue;
  const raw = subtotal * (coupon.discountValue / 100);
  return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
}

function badgeMeta(badge: ItemBadge): { label: string; tone: "warning" | "info" | "success" } {
  switch (badge.kind) {
    case "price-changed":
      return { label: `Price dropped from ${formatCurrency(badge.previousPrice)}`, tone: "success" };
    case "seller-changed":
      return { label: "Seller updated since you added this", tone: "info" };
    case "delivery-delayed":
      return { label: `Delivery delayed — now ${badge.newEstimate}`, tone: "warning" };
    case "limited-quantity":
      return { label: `Only ${badge.remaining} left`, tone: "warning" };
    case "best-seller":
      return { label: "Best Seller", tone: "info" };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 6. REDUX — cart slice
// ════════════════════════════════════════════════════════════════════════════

interface CartState {
  itemsById: Record<string, CartItemEntity>;
  itemIds: string[];
  selectedIds: string[];
  savedItemsById: Record<string, SavedItemEntity>;
  savedItemIds: string[];
}

const initialCartItems = MOCK_CART_ITEMS;
const initialCartState: CartState = {
  itemsById: Object.fromEntries(initialCartItems.map((i) => [i.id, i])),
  itemIds: initialCartItems.map((i) => i.id),
  // Everything in-stock starts selected; out-of-stock items are excluded.
  selectedIds: initialCartItems.filter((i) => i.inventoryStatus !== "out-of-stock").map((i) => i.id),
  savedItemsById: Object.fromEntries(MOCK_SAVED_ITEMS.map((i) => [i.id, i])),
  savedItemIds: MOCK_SAVED_ITEMS.map((i) => i.id),
};

const cartSlice = createSlice({
  name: "cart",
  initialState: initialCartState,
  reducers: {
    incrementQuantity(state, action: PayloadAction<string>) {
      const item = state.itemsById[action.payload];
      if (!item) return;
      item.quantity = clampQuantity(item.quantity + 1, 1, item.maxQuantity);
    },
    decrementQuantity(state, action: PayloadAction<string>) {
      const item = state.itemsById[action.payload];
      if (!item) return;
      item.quantity = clampQuantity(item.quantity - 1, 1, item.maxQuantity);
    },
    setQuantity(state, action: PayloadAction<{ id: string; quantity: number }>) {
      const item = state.itemsById[action.payload.id];
      if (!item) return;
      item.quantity = clampQuantity(action.payload.quantity, 1, item.maxQuantity);
    },
    removeItem(state, action: PayloadAction<string>) {
      const id = action.payload;
      delete state.itemsById[id];
      state.itemIds = state.itemIds.filter((x) => x !== id);
      state.selectedIds = state.selectedIds.filter((x) => x !== id);
    },
    removeSelectedItems(state) {
      const toRemove = new Set(state.selectedIds);
      state.itemIds = state.itemIds.filter((id) => !toRemove.has(id));
      toRemove.forEach((id) => delete state.itemsById[id]);
      state.selectedIds = [];
    },
    toggleItemSelection(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.selectedIds = state.selectedIds.includes(id)
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id];
    },
    selectAll(state) {
      state.selectedIds = state.itemIds.filter(
        (id) => state.itemsById[id]?.inventoryStatus !== "out-of-stock",
      );
    },
    clearSelection(state) {
      state.selectedIds = [];
    },
    selectSeller(state, action: PayloadAction<{ sellerId: string; itemIds: string[] }>) {
      const set = new Set(state.selectedIds);
      action.payload.itemIds.forEach((id) => set.add(id));
      state.selectedIds = Array.from(set);
    },
    deselectSeller(state, action: PayloadAction<{ itemIds: string[] }>) {
      const remove = new Set(action.payload.itemIds);
      state.selectedIds = state.selectedIds.filter((id) => !remove.has(id));
    },
    saveForLater(state, action: PayloadAction<string>) {
      const item = state.itemsById[action.payload];
      if (!item) return;
      const saved: SavedItemEntity = {
        id: `si-${item.id}`,
        productId: item.productId,
        sellerId: item.sellerId,
        price: item.unitPrice,
        originalPrice: item.originalPrice,
        savedAt: new Date().toISOString(),
      };
      state.savedItemsById[saved.id] = saved;
      state.savedItemIds.push(saved.id);
      delete state.itemsById[item.id];
      state.itemIds = state.itemIds.filter((x) => x !== item.id);
      state.selectedIds = state.selectedIds.filter((x) => x !== item.id);
    },
    moveToCart(state, action: PayloadAction<string>) {
      const saved = state.savedItemsById[action.payload];
      if (!saved) return;
      const restored: CartItemEntity = {
        id: `ci-${saved.id}`,
        productId: saved.productId,
        sellerId: saved.sellerId,
        unitPrice: saved.price,
        originalPrice: saved.originalPrice,
        quantity: 1,
        maxQuantity: 10,
        inventoryStatus: "in-stock",
        stockRemaining: null,
        deliveryEstimate: "Sep 24 – Sep 27",
        shippingMethod: "standard",
        shippingFee: 4.5,
        badges: [],
      };
      state.itemsById[restored.id] = restored;
      state.itemIds.push(restored.id);
      state.selectedIds.push(restored.id);
      delete state.savedItemsById[saved.id];
      state.savedItemIds = state.savedItemIds.filter((x) => x !== saved.id);
    },
    removeSavedItem(state, action: PayloadAction<string>) {
      delete state.savedItemsById[action.payload];
      state.savedItemIds = state.savedItemIds.filter((x) => x !== action.payload);
    },
  },
});

// ── Coupon slice ─────────────────────────────────────────────────────────────

interface CouponState {
  appliedCode: string | null;
  inputValue: string;
  lastError: string | null;
}

const couponSlice = createSlice({
  name: "coupon",
  initialState: { appliedCode: null, inputValue: "", lastError: null } as CouponState,
  reducers: {
    setCouponInput(state, action: PayloadAction<string>) {
      state.inputValue = action.payload;
      state.lastError = null;
    },
    applyCoupon(state, action: PayloadAction<{ code: string; error: string | null }>) {
      if (action.payload.error) {
        state.lastError = action.payload.error;
        return;
      }
      state.appliedCode = action.payload.code;
      state.inputValue = "";
      state.lastError = null;
    },
    removeCoupon(state) {
      state.appliedCode = null;
      state.lastError = null;
    },
  },
});

// ── Delivery slice ───────────────────────────────────────────────────────────

interface DeliveryState {
  address: DeliveryAddress;
  shippingMethod: ShippingMethod;
}

const deliverySlice = createSlice({
  name: "delivery",
  initialState: { address: MOCK_ADDRESS, shippingMethod: "free" } as DeliveryState,
  reducers: {
    setDeliveryAddress(state, action: PayloadAction<DeliveryAddress>) {
      state.address = action.payload;
    },
    setShippingMethod(state, action: PayloadAction<ShippingMethod>) {
      state.shippingMethod = action.payload;
    },
  },
});

// ── Wishlist slice ───────────────────────────────────────────────────────────

interface WishlistState {
  productIds: string[];
}

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: { productIds: [] } as WishlistState,
  reducers: {
    toggleWishlist(state, action: PayloadAction<string>) {
      state.productIds = state.productIds.includes(action.payload)
        ? state.productIds.filter((id) => id !== action.payload)
        : [...state.productIds, action.payload];
    },
  },
});

// ── UI slice — genuinely global, transient UI flags only ───────────────────

interface UiState {
  isCouponPanelOpen: boolean;
  isMobileNavOpen: boolean;
  theme: "light" | "dark";
}

const uiSlice = createSlice({
  name: "ui",
  initialState: { isCouponPanelOpen: false, isMobileNavOpen: false, theme: "light" } as UiState,
  reducers: {
    openCouponPanel(state) {
      state.isCouponPanelOpen = true;
    },
    closeCouponPanel(state) {
      state.isCouponPanelOpen = false;
    },
    openMobileNav(state) {
      state.isMobileNavOpen = true;
    },
    closeMobileNav(state) {
      state.isMobileNavOpen = false;
    },
    toggleTheme(state) {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
  },
});

// ── Store assembly ───────────────────────────────────────────────────────────

const rootReducer = combineReducers({
  cart: cartSlice.reducer,
  coupon: couponSlice.reducer,
  delivery: deliverySlice.reducer,
  wishlist: wishlistSlice.reducer,
  ui: uiSlice.reducer,
});

const IS_DEV = typeof window !== "undefined" && window.location.hostname === "localhost";

const store = configureStore({
  reducer: rootReducer,
  devTools: IS_DEV,
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ════════════════════════════════════════════════════════════════════════════
// 7. SELECTORS — granular + derived/memoized
// ════════════════════════════════════════════════════════════════════════════

const selectCart = (s: RootState) => s.cart;
const selectItemIds = createSelector(selectCart, (c) => c.itemIds);
const selectSelectedIds = createSelector(selectCart, (c) => c.selectedIds);
const selectItemsById = createSelector(selectCart, (c) => c.itemsById);
const selectSavedItemIds = createSelector(selectCart, (c) => c.savedItemIds);
const selectSavedItemsById = createSelector(selectCart, (c) => c.savedItemsById);

const selectCartItemById = (id: string) =>
  createSelector(selectItemsById, (byId) => byId[id]);

const selectIsItemSelected = (id: string) =>
  createSelector(selectSelectedIds, (ids) => ids.includes(id));

const selectAllCartItems = createSelector(
  selectItemIds,
  selectItemsById,
  (ids, byId) => ids.map((id) => byId[id]).filter(Boolean),
);

const selectSelectedCartItems = createSelector(
  selectAllCartItems,
  selectSelectedIds,
  (items, selectedIds) => {
    const set = new Set(selectedIds);
    return items.filter((i) => set.has(i.id));
  },
);

const selectSelectableItemIds = createSelector(selectAllCartItems, (items) =>
  items.filter((i) => i.inventoryStatus !== "out-of-stock").map((i) => i.id),
);

const selectSelectionSummary = createSelector(
  selectSelectableItemIds,
  selectSelectedIds,
  (selectable, selected) => ({
    totalSelectable: selectable.length,
    totalSelected: selected.length,
    isAllSelected: selectable.length > 0 && selectable.every((id) => selected.includes(id)),
    isPartiallySelected: selected.length > 0 && selected.length < selectable.length,
  }),
);

const selectSellerGroups = createSelector(selectAllCartItems, (items) => {
  const groups = new Map<string, CartItemEntity[]>();
  items.forEach((item) => {
    const list = groups.get(item.sellerId) ?? [];
    list.push(item);
    groups.set(item.sellerId, list);
  });
  return Array.from(groups.entries()).map(([sellerId, sellerItems]) => ({
    sellerId,
    seller: MOCK_SELLERS[sellerId],
    items: sellerItems,
  }));
});

const selectSavedItems = createSelector(
  selectSavedItemIds,
  selectSavedItemsById,
  (ids, byId) => ids.map((id) => byId[id]).filter(Boolean),
);

const selectAppliedCouponCode = (s: RootState) => s.coupon.appliedCode;
const selectCouponInputValue = (s: RootState) => s.coupon.inputValue;
const selectCouponError = (s: RootState) => s.coupon.lastError;

const selectDeliveryAddress = (s: RootState) => s.delivery.address;
const selectShippingMethod = (s: RootState) => s.delivery.shippingMethod;

const selectWishlistIds = (s: RootState) => s.wishlist.productIds;
const selectIsWishlisted = (productId: string) =>
  createSelector(selectWishlistIds, (ids) => ids.includes(productId));

const selectIsCouponPanelOpen = (s: RootState) => s.ui.isCouponPanelOpen;
const selectIsMobileNavOpen = (s: RootState) => s.ui.isMobileNavOpen;

/** Core derived pricing — computed fresh from selected items + coupon, never stored. */
const selectPriceBreakdown = createSelector(
  selectSelectedCartItems,
  selectAppliedCouponCode,
  (items, appliedCode): PriceBreakdown => {
    const itemSubtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const productDiscount = items.reduce(
      (sum, i) => sum + (i.originalPrice - i.unitPrice) * i.quantity,
      0,
    );
    const shipping = items.reduce((sum, i) => sum + (i.shippingMethod === "free" ? 0 : i.shippingFee), 0);
    const effectiveShipping = itemSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : shipping;

    const coupon = appliedCode ? MOCK_COUPONS.find((c) => c.code === appliedCode) : undefined;
    const couponDiscount = coupon ? calculateCouponDiscount(coupon, itemSubtotal) : 0;

    const taxableAmount = Math.max(itemSubtotal - couponDiscount, 0);
    const tax = taxableAmount * TAX_RATE;
    const platformFee = itemSubtotal * PLATFORM_FEE_RATE;

    const grandTotal = Math.max(
      itemSubtotal - productDiscount * 0 - couponDiscount + effectiveShipping + tax + platformFee,
      0,
    );
    const totalSavings = productDiscount + couponDiscount + (shipping - effectiveShipping);

    return {
      itemSubtotal,
      productDiscount,
      couponDiscount,
      shipping: effectiveShipping,
      tax,
      platformFee,
      totalSavings,
      grandTotal,
    };
  },
);

const selectFreeShippingProgress = createSelector(selectPriceBreakdown, (pb) => {
  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - pb.itemSubtotal, 0);
  const percent = Math.min((pb.itemSubtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  return { remaining, percent, unlocked: remaining === 0 };
});

const selectRewardPointsEarned = createSelector(selectPriceBreakdown, (pb) =>
  Math.round(pb.grandTotal * POINTS_PER_DOLLAR),
);

// ════════════════════════════════════════════════════════════════════════════
// 8. UI PRIMITIVES
// ════════════════════════════════════════════════════════════════════════════

const Badge = ({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "warning" | "destructive";
  children: ReactNode;
}) => {
  const toneClasses: Record<string, string> = {
    info: "bg-info-subtle text-info",
    success: "bg-success-subtle text-success",
    warning: "bg-warning-subtle text-warning",
    destructive: "bg-destructive-subtle text-destructive",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
};

const IconButton = ({
  icon: Icon,
  label,
  onClick,
  badge,
}: {
  icon: typeof Search;
  label: string;
  onClick?: () => void;
  badge?: number;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="relative flex size-10 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
  >
    <Icon className="size-5" strokeWidth={1.75} />
    {typeof badge === "number" && badge > 0 && (
      <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
        {badge > 9 ? "9+" : badge}
      </span>
    )}
  </button>
);

const RatingStars = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
  const dim = size === "sm" ? "size-3.5" : "size-4";
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${dim} ${i < Math.round(rating) ? "fill-warning text-warning" : "fill-none text-border"}`}
        />
      ))}
    </span>
  );
};

const PrimaryButton = ({
  children,
  onClick,
  disabled,
  fullWidth,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit";
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`${fullWidth ? "w-full" : ""} inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`}
  >
    {children}
  </button>
);

const SecondaryButton = ({
  children,
  onClick,
  fullWidth,
}: {
  children: ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`${fullWidth ? "w-full" : ""} inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted`}
  >
    {children}
  </button>
);

const Checkbox = ({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="size-4 rounded border-border accent-[var(--color-primary)]"
      />
      <span className="sr-only">{label}</span>
    </label>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 9. HEADER COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const AnnouncementBar = () => (
  <div className="hidden bg-primary py-1.5 text-center text-2xs font-medium text-primary-foreground sm:block">
    Free shipping on orders over {formatCurrency(FREE_SHIPPING_THRESHOLD)} · Ends soon
  </div>
);

const SearchBar = () => (
  <div className="relative hidden flex-1 max-w-xl md:flex">
    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <input
      type="search"
      placeholder="Search products, brands, and categories"
      aria-label="Search the store"
      className="w-full rounded-md border border-border bg-muted py-2 pl-9 pr-16 text-sm placeholder:text-muted-foreground focus:bg-card"
    />
    <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.5 text-2xs text-muted-foreground">
      ⌘K
    </kbd>
  </div>
);

const HeaderActions = () => {
  const dispatch = useAppDispatch();
  const cartCount = useAppSelector(selectItemIds).length;
  const wishlistCount = useAppSelector(selectWishlistIds).length;

  return (
    <div className="flex items-center gap-1">
      <IconButton icon={Heart} label="Wishlist" badge={wishlistCount} />
      <IconButton icon={Bell} label="Notifications" badge={2} />
      <IconButton icon={User} label="Account" />
      <IconButton icon={ShoppingCart} label="Shopping cart" badge={cartCount} onClick={() => dispatch(uiSlice.actions.closeMobileNav())} />
    </div>
  );
};

const CATEGORY_NAV = ["Electronics", "Fashion", "Home & Living", "Outdoor", "Beauty", "Deals"];

const CategoryNavigation = () => (
  <nav aria-label="Product categories" className="hidden border-t border-border md:block">
    <ul className="mx-auto flex max-w-screen-2xl items-center gap-6 px-6 py-2.5">
      {CATEGORY_NAV.map((cat) => (
        <li key={cat}>
          <a href="#" className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            {cat}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);

const EcommerceHeader = () => {
  const dispatch = useAppDispatch();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <AnnouncementBar />
      <div className="mx-auto flex max-w-screen-2xl items-center gap-4 px-4 py-3 md:px-6">
        <button
          type="button"
          aria-label="Open menu"
          className="flex size-9 items-center justify-center rounded-md text-foreground md:hidden"
          onClick={() => dispatch(uiSlice.actions.openMobileNav())}
        >
          <Menu className="size-5" />
        </button>
        <a href="#" className="shrink-0 text-lg font-bold tracking-tight text-foreground">
          Marketplace<span className="text-primary">.</span>
        </a>
        <SearchBar />
        <div className="ml-auto">
          <HeaderActions />
        </div>
      </div>
      <CategoryNavigation />
    </header>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 10. BREADCRUMBS
// ════════════════════════════════════════════════════════════════════════════

const Breadcrumbs = () => (
  <nav aria-label="Breadcrumb" className="mx-auto max-w-screen-2xl px-4 pt-4 md:px-6">
    <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <li><a href="#" className="hover:text-foreground">Home</a></li>
      <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
      <li aria-current="page" className="font-medium text-foreground">Shopping Cart</li>
    </ol>
  </nav>
);

// ════════════════════════════════════════════════════════════════════════════
// 11. CART HEADER
// ════════════════════════════════════════════════════════════════════════════

const CartHeader = () => {
  const dispatch = useAppDispatch();
  const itemCount = useAppSelector(selectItemIds).length;
  const { totalSelected } = useAppSelector(selectSelectionSummary);

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 px-4 pt-3 pb-2 sm:flex-row sm:items-end sm:justify-between md:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Shopping Cart</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {itemCount} {itemCount === 1 ? "item" : "items"}
          {totalSelected > 0 ? ` · ${totalSelected} selected` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <SecondaryButton onClick={() => {}}>Continue Shopping</SecondaryButton>
        <button
          type="button"
          disabled={totalSelected === 0}
          onClick={() => dispatch(cartSlice.actions.removeSelectedItems())}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive-subtle disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="size-4" /> Clear Selected
        </button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 12. CART SELECTION TOOLBAR
// ════════════════════════════════════════════════════════════════════════════

const CartSelectionToolbar = () => {
  const dispatch = useAppDispatch();
  const { totalSelected, totalSelectable, isAllSelected, isPartiallySelected } =
    useAppSelector(selectSelectionSummary);
  const selectedItems = useAppSelector(selectSelectedCartItems);
  const selectedSubtotal = useMemo(
    () => selectedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [selectedItems],
  );

  const handleToggleAll = useCallback(() => {
    dispatch(isAllSelected ? cartSlice.actions.clearSelection() : cartSlice.actions.selectAll());
  }, [dispatch, isAllSelected]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isAllSelected}
          indeterminate={isPartiallySelected}
          onChange={handleToggleAll}
          label="Select all items"
        />
        <span className="text-sm font-medium text-foreground">
          Select All <span className="text-muted-foreground">({totalSelectable} available)</span>
        </span>
      </div>

      {totalSelected > 0 && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Subtotal: <span className="font-semibold text-foreground">{formatCurrency(selectedSubtotal)}</span>
          </span>
          <button
            type="button"
            onClick={() => dispatch(cartSlice.actions.removeSelectedItems())}
            className="text-xs font-medium text-destructive hover:underline"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => selectedItems.forEach((i) => dispatch(cartSlice.actions.saveForLater(i.id)))}
            className="text-xs font-medium text-primary hover:underline"
          >
            Move to Wishlist
          </button>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 13. SELLER / CART ITEM COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const QuantityControl = memo(
  ({ item }: { item: CartItemEntity }) => {
    const dispatch = useAppDispatch();
    const disabled = item.inventoryStatus === "out-of-stock";
    const maxReached = item.quantity >= item.maxQuantity;

    const handleDirectChange = (e: ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (Number.isNaN(val)) return;
      dispatch(cartSlice.actions.setQuantity({ id: item.id, quantity: val }));
    };

    return (
      <div className="inline-flex items-center rounded-md border border-border">
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={disabled || item.quantity <= 1}
          onClick={() => dispatch(cartSlice.actions.decrementQuantity(item.id))}
          className="flex size-8 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus className="size-3.5" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={item.quantity}
          onChange={handleDirectChange}
          disabled={disabled}
          aria-label={`Quantity for ${item.id}`}
          min={1}
          max={item.maxQuantity}
          className="w-10 border-x border-border bg-transparent text-center text-sm font-medium tabular-nums [appearance:textfield] disabled:opacity-40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={disabled || maxReached}
          onClick={() => dispatch(cartSlice.actions.incrementQuantity(item.id))}
          className="flex size-8 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    );
  },
);
QuantityControl.displayName = "QuantityControl";

const InventoryIndicator = ({ item }: { item: CartItemEntity }) => {
  const label =
    item.inventoryStatus === "low-stock" && item.stockRemaining
      ? `Only ${item.stockRemaining} left`
      : INVENTORY_LABEL[item.inventoryStatus];
  const Icon = item.inventoryStatus === "out-of-stock" ? PackageX : Check;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${INVENTORY_CLASSES[item.inventoryStatus]}`}>
      <Icon className="size-3.5" /> {label}
    </span>
  );
};

const DeliveryInformation = ({ item }: { item: CartItemEntity }) => (
  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <Truck className="size-3.5 shrink-0" />
    {item.inventoryStatus === "out-of-stock" ? (
      <span className="text-destructive">Delivery unavailable</span>
    ) : (
      <span>
        {SHIPPING_LABEL[item.shippingMethod]} · Arrives {item.deliveryEstimate}
      </span>
    )}
  </div>
);

const ItemBadgeRow = ({ badges }: { badges: ItemBadge[] }) => {
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b, i) => {
        const meta = badgeMeta(b);
        return (
          <Badge key={i} tone={meta.tone}>
            {meta.label}
          </Badge>
        );
      })}
    </div>
  );
};

const ProductVariantLine = ({ variant }: { variant: ProductVariant }) => {
  const parts = [variant.color, variant.size, variant.storage, variant.configuration].filter(Boolean);
  if (parts.length === 0) return null;
  return <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>;
};

const ItemActions = ({ item, product }: { item: CartItemEntity; product: Product }) => {
  const dispatch = useAppDispatch();
  const isWishlisted = useAppSelector(selectIsWishlisted(product.id));

  return (
    <div className="flex items-center gap-4 text-xs">
      <button
        type="button"
        onClick={() => dispatch(cartSlice.actions.saveForLater(item.id))}
        className="font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Save for later
      </button>
      <button
        type="button"
        onClick={() => dispatch(wishlistSlice.actions.toggleWishlist(product.id))}
        aria-pressed={isWishlisted}
        className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Heart className={`size-3.5 ${isWishlisted ? "fill-destructive text-destructive" : ""}`} />
        Wishlist
      </button>
      <button
        type="button"
        onClick={() => dispatch(cartSlice.actions.removeItem(item.id))}
        className="inline-flex items-center gap-1 font-medium text-destructive transition-colors hover:underline"
      >
        <Trash2 className="size-3.5" /> Remove
      </button>
    </div>
  );
};

const CartItemRow = memo(({ item }: { item: CartItemEntity }) => {
  const dispatch = useAppDispatch();
  const isSelected = useAppSelector(selectIsItemSelected(item.id));
  const product = MOCK_PRODUCTS[item.productId];
  const isOOS = item.inventoryStatus === "out-of-stock";
  const hasDiscount = item.originalPrice > item.unitPrice;

  return (
    <li
      className={`flex gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:gap-4 sm:px-5 ${isOOS ? "opacity-70" : ""}`}
      aria-label={product.name}
    >
      <div className="pt-1">
        <Checkbox
          checked={isSelected}
          onChange={() => dispatch(cartSlice.actions.toggleItemSelection(item.id))}
          label={`Select ${product.name}`}
        />
      </div>

      <div className="flex size-20 shrink-0 items-center justify-center rounded-md bg-muted text-3xl sm:size-24">
        {product.image}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{product.brand}</p>
            <h3 className="truncate text-sm font-medium text-foreground sm:text-base">{product.name}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-foreground sm:text-base">{formatCurrency(item.unitPrice)}</p>
            {hasDiscount && (
              <p className="text-xs text-muted-foreground line-through">{formatCurrency(item.originalPrice)}</p>
            )}
          </div>
        </div>

        <ProductVariantLine variant={product.variant} />

        <div className="flex items-center gap-2 text-2xs text-muted-foreground">
          <RatingStars rating={product.rating} />
          <span>({formatCompactNumber(product.reviewCount)})</span>
          <span aria-hidden="true">·</span>
          <span>SKU {product.sku}</span>
        </div>

        <ItemBadgeRow badges={item.badges} />

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <InventoryIndicator item={item} />
          <DeliveryInformation item={item} />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <QuantityControl item={item} />
          <ItemActions item={item} product={product} />
        </div>
      </div>
    </li>
  );
});
CartItemRow.displayName = "CartItemRow";

const SellerHeader = ({
  seller,
  itemIds,
}: {
  seller: Seller;
  itemIds: string[];
}) => {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector(selectSelectedIds);
  const allSelected = itemIds.every((id) => selectedIds.includes(id));

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-2.5 sm:px-5">
      <div className="flex items-center gap-2.5">
        <Checkbox
          checked={allSelected}
          onChange={() =>
            dispatch(
              allSelected
                ? cartSlice.actions.deselectSeller({ itemIds })
                : cartSlice.actions.selectSeller({ sellerId: seller.id, itemIds }),
            )
          }
          label={`Select all items from ${seller.name}`}
        />
        <span className="text-sm font-semibold text-foreground">{seller.name}</span>
        {seller.verified && (
          <span className="inline-flex items-center gap-0.5 text-2xs font-medium text-info">
            <BadgeCheck className="size-3.5" /> Verified
          </span>
        )}
        <span className="hidden items-center gap-1 text-2xs text-muted-foreground sm:inline-flex">
          <Star className="size-3 fill-warning text-warning" /> {seller.rating} ({formatCompactNumber(seller.ratingCount)})
        </span>
      </div>
      <span className="text-2xs text-muted-foreground">Ships from {seller.shipsFrom}</span>
    </div>
  );
};

const SellerGroup = ({ sellerId, seller, items }: { sellerId: string; seller: Seller; items: CartItemEntity[] }) => (
  <section aria-label={`Items from ${seller.name}`} className="overflow-hidden rounded-lg border border-border bg-card">
    <SellerHeader seller={seller} itemIds={items.map((i) => i.id)} />
    <ul>
      {items.map((item) => (
        <CartItemRow key={item.id} item={item} />
      ))}
    </ul>
  </section>
);

// ════════════════════════════════════════════════════════════════════════════
// 14. DELIVERY COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const DeliveryLocationCard = () => {
  const address = useAppSelector(selectDeliveryAddress);
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">Deliver to</p>
            <p className="text-sm font-semibold text-foreground">
              {address.label} — {address.city} {address.postalCode}
            </p>
            <p className="text-xs text-muted-foreground">{address.line}</p>
          </div>
        </div>
        <button type="button" className="shrink-0 text-xs font-medium text-primary hover:underline">
          Change
        </button>
      </div>
    </div>
  );
};

const FreeShippingProgress = () => {
  const { remaining, percent, unlocked } = useAppSelector(selectFreeShippingProgress);
  return (
    <div className="rounded-lg border border-border bg-card p-4" role="status" aria-live="polite">
      {unlocked ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success">
          <Check className="size-4" /> You've unlocked FREE delivery
        </p>
      ) : (
        <>
          <p className="text-sm text-foreground">
            Add <span className="font-semibold">{formatCurrency(remaining)}</span> more to unlock{" "}
            <span className="font-semibold">FREE delivery</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 15. COUPON COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const AppliedCouponRow = ({ coupon }: { coupon: Coupon }) => {
  const dispatch = useAppDispatch();
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-success-subtle px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Tag className="size-4 text-success" />
        <div>
          <p className="text-sm font-semibold text-success">{coupon.code} applied</p>
          <p className="text-2xs text-muted-foreground">{coupon.description}</p>
        </div>
      </div>
      <button
        type="button"
        aria-label="Remove coupon"
        onClick={() => dispatch(couponSlice.actions.removeCoupon())}
        className="text-muted-foreground transition-colors hover:text-destructive"
      >
        <X className="size-4" />
      </button>
    </div>
  );
};

const AvailableCouponRow = ({
  coupon,
  status,
  onApply,
}: {
  coupon: Coupon;
  status: CouponStatus;
  onApply: () => void;
}) => {
  const disabled = status.state !== "available";
  const statusText: Record<CouponStatus["state"], string> = {
    available: "",
    applied: "Applied",
    invalid: "Invalid code",
    expired: "Expired",
    "minimum-not-met": `Min. order ${formatCurrency((status as { minimumOrder: number }).minimumOrder)}`,
    "not-eligible": "Not eligible",
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{coupon.label}</p>
        <p className="truncate text-2xs text-muted-foreground">{coupon.description}</p>
        {disabled && <p className="mt-0.5 text-2xs font-medium text-warning">{statusText[status.state]}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onApply}
        className="shrink-0 rounded-md border border-primary px-2.5 py-1 text-2xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent"
      >
        Apply
      </button>
    </div>
  );
};

const CouponSection = () => {
  const dispatch = useAppDispatch();
  const inputValue = useAppSelector(selectCouponInputValue);
  const appliedCode = useAppSelector(selectAppliedCouponCode);
  const error = useAppSelector(selectCouponError);
  const { itemSubtotal } = useAppSelector(selectPriceBreakdown);
  const isOpen = useAppSelector(selectIsCouponPanelOpen);

  const appliedCoupon = appliedCode ? MOCK_COUPONS.find((c) => c.code === appliedCode) : undefined;

  const handleApply = useCallback(
    (code: string) => {
      const coupon = MOCK_COUPONS.find((c) => c.code === code);
      if (!coupon) {
        dispatch(couponSlice.actions.applyCoupon({ code, error: "Coupon code not found" }));
        return;
      }
      const status = evaluateCouponStatus(coupon, itemSubtotal);
      if (status.state !== "available") {
        const msg =
          status.state === "minimum-not-met"
            ? `Requires a minimum order of ${formatCurrency(status.minimumOrder)}`
            : status.state === "expired"
              ? "This coupon has expired"
              : "This coupon is not eligible for your order";
        dispatch(couponSlice.actions.applyCoupon({ code, error: msg }));
        return;
      }
      dispatch(couponSlice.actions.applyCoupon({ code, error: null }));
    },
    [dispatch, itemSubtotal],
  );

  return (
    <section aria-labelledby="coupon-heading" className="rounded-lg border border-border bg-card p-4">
      <h2 id="coupon-heading" className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Tag className="size-4" /> Coupons & Offers
      </h2>

      {appliedCoupon ? (
        <AppliedCouponRow coupon={appliedCoupon} />
      ) : (
        <div className="flex gap-2">
          <label htmlFor="coupon-input" className="sr-only">
            Enter coupon code
          </label>
          <input
            id="coupon-input"
            type="text"
            value={inputValue}
            onChange={(e) => dispatch(couponSlice.actions.setCouponInput(e.target.value.toUpperCase()))}
            placeholder="Enter coupon code"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "coupon-error" : undefined}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
          />
          <SecondaryButton onClick={() => inputValue && handleApply(inputValue)}>Apply</SecondaryButton>
        </div>
      )}

      {error && (
        <p id="coupon-error" role="alert" className="mt-2 flex items-center gap-1 text-xs font-medium text-destructive">
          <AlertTriangle className="size-3.5" /> {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => dispatch(isOpen ? uiSlice.actions.closeCouponPanel() : uiSlice.actions.openCouponPanel())}
        aria-expanded={isOpen}
        className="mt-3 flex w-full items-center justify-between text-xs font-medium text-primary"
      >
        View available coupons
        <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="mt-3 flex flex-col gap-2">
          {MOCK_COUPONS.map((c) => (
            <AvailableCouponRow
              key={c.code}
              coupon={c}
              status={
                c.code === appliedCode ? { state: "applied" } : evaluateCouponStatus(c, itemSubtotal)
              }
              onApply={() => handleApply(c.code)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 16. PRICING / SUMMARY COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const PriceRow = ({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "success";
}) => (
  <div className="flex items-center justify-between text-sm">
    <span className={emphasis ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
    <span
      className={`tabular-nums ${emphasis ? "text-base font-bold text-foreground" : "font-medium"} ${tone === "success" ? "text-success" : "text-foreground"}`}
    >
      {value}
    </span>
  </div>
);

const PriceBreakdownCard = () => {
  const pb = useAppSelector(selectPriceBreakdown);
  const { totalSelected } = useAppSelector(selectSelectionSummary);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        Price Details ({totalSelected} {totalSelected === 1 ? "item" : "items"})
      </h2>
      <div className="flex flex-col gap-2.5">
        <PriceRow label="Item Subtotal" value={formatCurrency(pb.itemSubtotal)} />
        {pb.productDiscount > 0 && (
          <PriceRow label="Product Discount" value={`− ${formatCurrency(pb.productDiscount)}`} tone="success" />
        )}
        {pb.couponDiscount > 0 && (
          <PriceRow label="Coupon Discount" value={`− ${formatCurrency(pb.couponDiscount)}`} tone="success" />
        )}
        <PriceRow label="Shipping" value={pb.shipping === 0 ? "FREE" : formatCurrency(pb.shipping)} tone={pb.shipping === 0 ? "success" : undefined} />
        <PriceRow label="Estimated Tax" value={formatCurrency(pb.tax)} />
        {pb.platformFee > 0 && <PriceRow label="Platform Fee" value={formatCurrency(pb.platformFee)} />}
        <div className="my-1 h-px bg-border" />
        <PriceRow label="Total" value={formatCurrency(pb.grandTotal)} emphasis />
      </div>
    </div>
  );
};

const SavingsSummary = () => {
  const pb = useAppSelector(selectPriceBreakdown);
  if (pb.totalSavings <= 0) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-subtle px-4 py-3">
      <Sparkles className="size-4 shrink-0 text-success" />
      <p className="text-sm font-medium text-success">
        You're saving {formatCurrency(pb.totalSavings)} on this order
      </p>
    </div>
  );
};

const RewardsSummary = () => {
  const points = useAppSelector(selectRewardPointsEarned);
  if (points <= 0) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <Gift className="size-4 shrink-0 text-primary" />
      <p className="text-sm text-foreground">
        You'll earn <span className="font-semibold">{formatCompactNumber(points)} points</span> with this order
      </p>
    </div>
  );
};

const CheckoutCard = () => {
  const pb = useAppSelector(selectPriceBreakdown);
  const { totalSelected } = useAppSelector(selectSelectionSummary);
  const hasOutOfStockSelected = false;

  return (
    <div className="sticky top-20 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Order Total</span>
        <span className="text-xl font-bold tabular-nums text-foreground">{formatCurrency(pb.grandTotal)}</span>
      </div>
      {pb.totalSavings > 0 && (
        <p className="text-xs font-medium text-success">You save {formatCurrency(pb.totalSavings)}</p>
      )}
      <PrimaryButton fullWidth disabled={totalSelected === 0 || hasOutOfStockSelected}>
        Proceed to Checkout <ArrowRight className="size-4" />
      </PrimaryButton>
      <p className="flex items-center justify-center gap-1.5 text-2xs text-muted-foreground">
        <ShieldCheck className="size-3.5" /> Secure checkout · SSL encrypted
      </p>
    </div>
  );
};

const CartSummaryColumn = () => (
  <aside aria-label="Order summary" className="flex flex-col gap-4 lg:w-[360px] lg:shrink-0">
    <DeliveryLocationCard />
    <FreeShippingProgress />
    <CouponSection />
    <PriceBreakdownCard />
    <SavingsSummary />
    <RewardsSummary />
    <CheckoutCard />
  </aside>
);

// ════════════════════════════════════════════════════════════════════════════
// 17. RECOMMENDATION COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const RecommendationCard = ({ product }: { product: RecommendedProduct }) => {
  const dispatch = useAppDispatch();
  const isWishlisted = useAppSelector(selectIsWishlisted(product.id));
  const hasDiscount = product.originalPrice > product.price;

  return (
    <div className="flex w-40 shrink-0 flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:w-44">
      <div className="relative flex h-24 items-center justify-center rounded-md bg-muted text-3xl">
        {product.image}
        <button
          type="button"
          aria-label="Toggle wishlist"
          aria-pressed={isWishlisted}
          onClick={() => dispatch(wishlistSlice.actions.toggleWishlist(product.id))}
          className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-card/90"
        >
          <Heart className={`size-3.5 ${isWishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
        </button>
      </div>
      <p className="text-2xs font-medium text-muted-foreground">{product.brand}</p>
      <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">{product.name}</p>
      <div className="flex items-center gap-1 text-2xs text-muted-foreground">
        <RatingStars rating={product.rating} />
        <span>({formatCompactNumber(product.reviewCount)})</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-foreground">{formatCurrency(product.price)}</span>
        {hasDiscount && <span className="text-2xs text-muted-foreground line-through">{formatCurrency(product.originalPrice)}</span>}
      </div>
      <SecondaryButton fullWidth onClick={() => {}}>
        Add to Cart
      </SecondaryButton>
    </div>
  );
};

const ProductRail = ({ title, products }: { title: string; products: RecommendedProduct[] }) => {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby={`${title}-heading`}>
      <h2 id={`${title}-heading`} className="mb-3 text-base font-semibold text-foreground">
        {title}
      </h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {products.map((p) => (
          <RecommendationCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
};

const CartRecommendations = () => (
  <div className="flex flex-col gap-8">
    <ProductRail title="Frequently Bought Together" products={MOCK_RECOMMENDATIONS.slice(0, 3)} />
    <ProductRail title="Recommended For You" products={MOCK_RECOMMENDATIONS} />
    <ProductRail title="Recently Viewed" products={MOCK_RECENTLY_VIEWED} />
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// 18. SAVED-ITEM COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const SavedItemRow = ({ item }: { item: SavedItemEntity }) => {
  const dispatch = useAppDispatch();
  const product = MOCK_PRODUCTS[item.productId];
  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:px-5">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-2xl">
        {product.image}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-sm font-bold text-foreground">{formatCurrency(item.price)}</span>
          {item.originalPrice > item.price && (
            <span className="text-2xs text-muted-foreground line-through">{formatCurrency(item.originalPrice)}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => dispatch(cartSlice.actions.moveToCart(item.id))}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Move to Cart
        </button>
        <button
          type="button"
          aria-label="Remove saved item"
          onClick={() => dispatch(cartSlice.actions.removeSavedItem(item.id))}
          className="text-muted-foreground transition-colors hover:text-destructive"
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
};

const SavedForLaterSection = () => {
  const savedItems = useAppSelector(selectSavedItems);
  if (savedItems.length === 0) return null;
  return (
    <section aria-labelledby="saved-heading" className="overflow-hidden rounded-lg border border-border bg-card">
      <h2 id="saved-heading" className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground sm:px-5">
        Saved for Later ({savedItems.length})
      </h2>
      <ul>
        {savedItems.map((item) => (
          <SavedItemRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 19. LOADING / EMPTY / ERROR STATES
// ════════════════════════════════════════════════════════════════════════════

const CartSkeleton = () => (
  <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading cart">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex gap-4 rounded-lg border border-border bg-card p-4">
        <div className="skeleton size-24 rounded-md" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="skeleton h-3 w-1/4 rounded" />
          <div className="skeleton h-4 w-2/3 rounded" />
          <div className="skeleton h-3 w-1/3 rounded" />
          <div className="skeleton mt-2 h-8 w-28 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyCartState = () => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
    <div className="flex size-16 items-center justify-center rounded-full bg-muted">
      <ShoppingCart className="size-8 text-muted-foreground" strokeWidth={1.5} />
    </div>
    <div>
      <h2 className="text-lg font-semibold text-foreground">Your cart is waiting for something great</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Explore products, discover deals, and continue shopping.
      </p>
    </div>
    <div className="flex gap-3">
      <PrimaryButton>Start Shopping</PrimaryButton>
      <SecondaryButton>View Deals</SecondaryButton>
    </div>
  </div>
);

const CartErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive-subtle px-6 py-12 text-center">
    <AlertTriangle className="size-8 text-destructive" />
    <div>
      <h2 className="text-base font-semibold text-foreground">We couldn't load your cart</h2>
      <p className="mt-1 text-sm text-muted-foreground">Something went wrong. Please try again.</p>
    </div>
    <SecondaryButton onClick={onRetry}>Retry</SecondaryButton>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// 20. TRUST SECTION
// ════════════════════════════════════════════════════════════════════════════

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "Buyer Protection", desc: "Full refund if item is not as described" },
  { icon: Truck, label: "Fast, Reliable Shipping", desc: "Real-time tracking on every order" },
  { icon: Clock, label: "Easy 30-Day Returns", desc: "No questions asked return policy" },
  { icon: Info, label: "24/7 Customer Support", desc: "We're here whenever you need us" },
];

const TrustSection = () => (
  <section aria-label="Why shop with us" className="rounded-lg border border-border bg-card p-5">
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
      {TRUST_POINTS.map(({ icon: Icon, label, desc }) => (
        <div key={label} className="flex flex-col items-start gap-1.5">
          <Icon className="size-5 text-primary" strokeWidth={1.75} />
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <p className="text-2xs text-muted-foreground">{desc}</p>
        </div>
      ))}
    </div>
  </section>
);

// ════════════════════════════════════════════════════════════════════════════
// 21. FOOTER
// ════════════════════════════════════════════════════════════════════════════

const FOOTER_COLUMNS: { title: string; links: string[] }[] = [
  { title: "Shop", links: ["New Arrivals", "Best Sellers", "Deals", "Gift Cards"] },
  { title: "Customer Service", links: ["Orders", "Returns", "Payments", "Delivery"] },
  { title: "Sell With Us", links: ["Become a Seller", "Seller Center", "Advertising"] },
  { title: "Company", links: ["About", "Careers", "Privacy", "Terms", "Accessibility"] },
];

const SOCIAL_LINKS = [
  { icon: Globe, label: "Website" },
  { icon: MessageCircle, label: "Community" },
  { icon: Send, label: "Newsletter" },
  { icon: Video, label: "Video Channel" },
];

const PAYMENT_METHODS = ["Visa", "Mastercard", "Amex", "PayPal", "Apple Pay", "Google Pay"];

const EcommerceFooter = () => (
  <footer className="mt-12 border-t border-border bg-card">
    <div className="mx-auto grid max-w-screen-2xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4 md:px-6">
      {FOOTER_COLUMNS.map((col) => (
        <div key={col.title}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{col.title}</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {col.links.map((link) => (
              <li key={link}>
                <a href="#" className="text-xs text-muted-foreground hover:text-foreground">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 border-t border-border px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex items-center gap-3">
        {SOCIAL_LINKS.map(({ icon: Icon, label }) => (
          <a key={label} href="#" aria-label={label} className="text-muted-foreground hover:text-foreground">
            <Icon className="size-4" />
          </a>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
        {PAYMENT_METHODS.map((m) => (
          <span key={m} className="rounded border border-border px-2 py-1">
            {m}
          </span>
        ))}
      </div>
      <p className="text-2xs text-muted-foreground">© 2024 Marketplace, Inc. All rights reserved.</p>
    </div>
  </footer>
);

// ════════════════════════════════════════════════════════════════════════════
// 22. MOBILE STICKY CHECKOUT BAR
// ════════════════════════════════════════════════════════════════════════════

const MobileCheckoutBar = () => {
  const pb = useAppSelector(selectPriceBreakdown);
  const { totalSelected } = useAppSelector(selectSelectionSummary);
  if (totalSelected === 0) return null;

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 shadow-lg lg:hidden">
      <div>
        <p className="text-2xs text-muted-foreground">
          {pb.totalSavings > 0 && `Save ${formatCurrency(pb.totalSavings)} · `}Total
        </p>
        <p className="text-base font-bold text-foreground">{formatCurrency(pb.grandTotal)}</p>
      </div>
      <PrimaryButton>
        Checkout <ArrowRight className="size-4" />
      </PrimaryButton>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 23. MAIN CART LAYOUT / COMPOSITION
// ════════════════════════════════════════════════════════════════════════════

const CartMainColumn = () => {
  const sellerGroups = useAppSelector(selectSellerGroups);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <CartSelectionToolbar />
      {sellerGroups.map((group) => (
        <SellerGroup key={group.sellerId} sellerId={group.sellerId} seller={group.seller} items={group.items} />
      ))}
      <SavedForLaterSection />
      <FreeShippingProgressMobile />
      <CartRecommendations />
    </div>
  );
};

/** Shown only on small screens where the summary column is not visible inline. */
const FreeShippingProgressMobile = () => (
  <div className="lg:hidden">
    <FreeShippingProgress />
  </div>
);

const CartLayout = () => (
  <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 pb-24 pt-2 md:px-6 lg:flex-row lg:pb-8">
    <CartMainColumn />
    <div className="hidden lg:block">
      <CartSummaryColumn />
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// 24. MOBILE NAV DRAWER
// ════════════════════════════════════════════════════════════════════════════

const MobileNavDrawer = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsMobileNavOpen);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => dispatch(uiSlice.actions.closeMobileNav())}
        className="absolute inset-0 bg-foreground/40"
      />
      <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-1 bg-card p-4 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-base font-bold text-foreground">Menu</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => dispatch(uiSlice.actions.closeMobileNav())}
            className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        {CATEGORY_NAV.map((cat) => (
          <a key={cat} href="#" className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            {cat}
          </a>
        ))}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 25. CART PAGE ROOT
// ════════════════════════════════════════════════════════════════════════════

type LoadState = "loading" | "success" | "error";

function CartScreen() {
  const [loadState, setLoadState] = useState<LoadState>("success");
  const itemCount = useAppSelector(selectItemIds).length;

  const handleRetry = useCallback(() => setLoadState("success"), []);

  return (
    <div className="min-h-dvh bg-background">
      <EcommerceHeader />
      <MobileNavDrawer />
      <Breadcrumbs />
      <CartHeader />

      <main className="mx-auto max-w-screen-2xl px-4 md:px-6">
        {loadState === "loading" && <CartSkeleton />}
        {loadState === "error" && <CartErrorState onRetry={handleRetry} />}
      </main>

      {loadState === "success" && itemCount === 0 && (
        <main className="mx-auto max-w-screen-2xl px-4 pb-16 md:px-6">
          <EmptyCartState />
          <div className="mt-10">
            <CartRecommendations />
          </div>
        </main>
      )}

      {loadState === "success" && itemCount > 0 && <CartLayout />}

      <div className="mx-auto max-w-screen-2xl px-4 pb-10 md:px-6">
        <TrustSection />
      </div>

      <EcommerceFooter />
      <MobileCheckoutBar />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 26. DEFAULT EXPORT
// ════════════════════════════════════════════════════════════════════════════

export default function CartPage() {
  return (
    <Provider store={store}>
      <CartScreen />
    </Provider>
  );
}