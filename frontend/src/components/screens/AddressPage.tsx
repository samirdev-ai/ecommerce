'use client';

/**
 * AddressPage.tsx
 * -----------------------------------------------------------------------------------------------
 * Customer address-management workspace for a global ecommerce platform.
 * Single-file implementation per project constraints: page shell, domain types, Redux Toolkit
 * state, formatting/validation utilities, and every internal component live in this module.
 *
 * Code map (search these section markers):
 *   [TYPES]        domain models & discriminated unions
 *   [CONSTANTS]    lookup tables, copy, config
 *   [MOCK DATA]    seed addresses for local/dev rendering
 *   [STORE]        Redux Toolkit slice, selectors, typed hooks
 *   [UTILS]        formatting, masking, validation, duplicate detection
 *   [UI PRIMITIVES] small purposeful presentational pieces reused across the screen
 *   [LAYOUT]       header, sidebar, footer, breadcrumbs
 *   [ADDRESS DOMAIN] toolbar, overview, list, card
 *   [FORMS/DIALOGS] add/edit form + confirmation dialogs
 *   [PAGE]         AddressPage default export
 * -----------------------------------------------------------------------------------------------
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  configureStore,
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import {
  Provider,
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from 'react-redux';
import {
  AlertTriangle,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  HelpCircle,
  Heart,
  Home,
  Info,
  LifeBuoy,
  Loader2,
  LogOut,
  MapPin,
  MapPinOff,
  Menu,
  MoreVertical,
  PackageCheck,
  PackageX,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Trash2,
  Truck,
  User2,
  Wallet,
  X,
} from 'lucide-react';

/* =================================================================================================
 * [TYPES]
 * ================================================================================================= */

type CountryCode = 'US' | 'GB' | 'DE' | 'JP' | 'NP' | 'IN' | 'AE' | 'SG' | 'FR' | 'CA';

type AddressPurpose = 'shipping' | 'billing' | 'pickup';

type AddressLabel = 'home' | 'office' | 'pickup-point' | 'other';

interface RecipientInfo {
  firstName: string;
  lastName: string;
  company?: string;
}

interface ContactInfo {
  phone: string;
  alternatePhone?: string;
}

/** International-ready location model. Not shaped around any single country's address format. */
interface GeoLocation {
  countryCode: CountryCode;
  administrativeArea: string; // state / province / region
  subAdministrativeArea?: string; // county / prefecture subdivision
  locality: string; // city / town
  district?: string; // neighborhood / ward, where used
  postalCode: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
}

interface DeliveryInstructions {
  gateOrBuildingInfo?: string;
  safePlaceNote?: string;
  deliveryNotes?: string;
}

type AddressValidationState =
  | 'not-validated'
  | 'validating'
  | 'validated'
  | 'needs-correction'
  | 'suggested-address'
  | 'validation-failed';

interface AddressValidationResult {
  state: AddressValidationState;
  message?: string;
  suggestedAddress?: Partial<GeoLocation>;
  validatedAt?: string;
}

type DeliveryEligibilityStatus =
  | 'available'
  | 'limited'
  | 'pickup-only'
  | 'unavailable'
  | 'verification-required';

interface DeliveryEligibility {
  status: DeliveryEligibilityStatus;
  estimatedDays?: { min: number; max: number };
  availableMethods?: string[];
  restrictionNote?: string;
}

interface AddressUsage {
  usedFor: AddressPurpose[];
  lastUsedAt?: string;
  recentOrderCount: number;
  selectedAtCheckout?: boolean;
}

interface Address {
  id: string;
  label: AddressLabel;
  customLabel?: string;
  purposes: AddressPurpose[];
  recipient: RecipientInfo;
  contact: ContactInfo;
  location: GeoLocation;
  deliveryInstructions?: DeliveryInstructions;
  validation: AddressValidationResult;
  deliveryEligibility: DeliveryEligibility;
  usage: AddressUsage;
  createdAt: string;
  updatedAt: string;
}

type AddressFilter = 'all' | 'default' | 'shipping' | 'billing' | 'pickup' | 'verified' | 'needs-review';
type AddressSort = 'recently-used' | 'recently-added' | 'alphabetical' | 'default-first';
type ViewDensity = 'comfortable' | 'compact';

/** Flattened, editable shape used by the address form — decoupled from the persisted Address. */
interface AddressFormValues {
  label: AddressLabel;
  customLabel: string;
  purposes: AddressPurpose[];
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  alternatePhone: string;
  countryCode: CountryCode;
  administrativeArea: string;
  subAdministrativeArea: string;
  locality: string;
  district: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  gateOrBuildingInfo: string;
  safePlaceNote: string;
  deliveryNotes: string;
  setDefaultShipping: boolean;
  setDefaultBilling: boolean;
}

type FormStatus = 'idle' | 'editing' | 'dirty' | 'validating' | 'invalid' | 'saving' | 'saved' | 'save-error';

type FormErrors = Partial<Record<keyof AddressFormValues, string>>;

type DuplicateStatus = 'none' | 'possible-duplicate' | 'duplicate-confirmed';

/** Generic async-operation state for transient, component-local feedback (never over-modeled in Redux). */
type OperationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; message: string };

/* =================================================================================================
 * [CONSTANTS]
 * ================================================================================================= */

const COUNTRIES: ReadonlyArray<{ code: CountryCode; name: string; dialCode: string }> = [
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'DE', name: 'Germany', dialCode: '+49' },
  { code: 'FR', name: 'France', dialCode: '+33' },
  { code: 'JP', name: 'Japan', dialCode: '+81' },
  { code: 'NP', name: 'Nepal', dialCode: '+977' },
  { code: 'IN', name: 'India', dialCode: '+91' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
  { code: 'SG', name: 'Singapore', dialCode: '+65' },
];

const COUNTRY_NAME: Record<CountryCode, string> = COUNTRIES.reduce(
  (acc, c) => ({ ...acc, [c.code]: c.name }),
  {} as Record<CountryCode, string>,
);

const COUNTRY_DIAL_CODE: Record<CountryCode, string> = COUNTRIES.reduce(
  (acc, c) => ({ ...acc, [c.code]: c.dialCode }),
  {} as Record<CountryCode, string>,
);

const ADDRESS_LABEL_CONFIG: Record<AddressLabel, { title: string; icon: typeof Home }> = {
  home: { title: 'Home', icon: Home },
  office: { title: 'Office', icon: Briefcase },
  'pickup-point': { title: 'Pickup point', icon: Building2 },
  other: { title: 'Other', icon: Bookmark },
};

const PURPOSE_CONFIG: Record<AddressPurpose, { title: string; icon: typeof Truck }> = {
  shipping: { title: 'Shipping', icon: Truck },
  billing: { title: 'Billing', icon: CreditCard },
  pickup: { title: 'Pickup', icon: Building2 },
};

const FILTER_OPTIONS: ReadonlyArray<{ value: AddressFilter; label: string }> = [
  { value: 'all', label: 'All addresses' },
  { value: 'default', label: 'Default addresses' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'billing', label: 'Billing' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'verified', label: 'Verified' },
  { value: 'needs-review', label: 'Needs review' },
];

const SORT_OPTIONS: ReadonlyArray<{ value: AddressSort; label: string }> = [
  { value: 'default-first', label: 'Default first' },
  { value: 'recently-used', label: 'Recently used' },
  { value: 'recently-added', label: 'Recently added' },
  { value: 'alphabetical', label: 'Alphabetical' },
];

const ACCOUNT_NAV_ITEMS: ReadonlyArray<{ label: string; icon: typeof User2; active?: boolean }> = [
  { label: 'Profile', icon: User2 },
  { label: 'Orders', icon: PackageCheck },
  { label: 'Returns & refunds', icon: RotateCcw },
  { label: 'Wishlist', icon: Heart },
  { label: 'Saved items', icon: Bookmark },
  { label: 'Addresses', icon: MapPin, active: true },
  { label: 'Payment methods', icon: Wallet },
  { label: 'Membership', icon: ShieldCheck },
  { label: 'Security', icon: LifeBuoy },
  { label: 'Notifications', icon: Bell },
  { label: 'Support', icon: HelpCircle },
];

const DELIVERY_ELIGIBILITY_CONFIG: Record<
  DeliveryEligibilityStatus,
  { title: string; icon: typeof PackageCheck; tone: 'success' | 'warning' | 'info' | 'destructive' }
> = {
  available: { title: 'Delivery available', icon: PackageCheck, tone: 'success' },
  limited: { title: 'Limited delivery', icon: AlertTriangle, tone: 'warning' },
  'pickup-only': { title: 'Pickup only', icon: Building2, tone: 'info' },
  unavailable: { title: 'Currently unavailable', icon: PackageX, tone: 'destructive' },
  'verification-required': { title: 'Verification required', icon: MapPinOff, tone: 'warning' },
};

const EMPTY_FORM_VALUES: AddressFormValues = {
  label: 'home',
  customLabel: '',
  purposes: ['shipping'],
  firstName: '',
  lastName: '',
  company: '',
  phone: '',
  alternatePhone: '',
  countryCode: 'US',
  administrativeArea: '',
  subAdministrativeArea: '',
  locality: '',
  district: '',
  postalCode: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  gateOrBuildingInfo: '',
  safePlaceNote: '',
  deliveryNotes: '',
  setDefaultShipping: false,
  setDefaultBilling: false,
};

const DELIVERY_NOTES_MAX_LENGTH = 200;

/* =================================================================================================
 * [MOCK DATA]
 * ================================================================================================= */

let mockIdCounter = 0;
function generateAddressId(): string {
  mockIdCounter += 1;
  return `addr_${Date.now().toString(36)}_${mockIdCounter}`;
}

const SEED_ADDRESSES: Address[] = [
  {
    id: 'addr_seed_1',
    label: 'home',
    purposes: ['shipping', 'billing'],
    recipient: { firstName: 'Amara', lastName: 'Whitfield' },
    contact: { phone: '+14155550142' },
    location: {
      countryCode: 'US',
      administrativeArea: 'California',
      locality: 'San Francisco',
      postalCode: '94107',
      addressLine1: '482 Brannan Street',
      addressLine2: 'Unit 6B',
    },
    deliveryInstructions: { gateOrBuildingInfo: 'Doorman building, ring unit 6B', deliveryNotes: 'Leave with front desk if not home.' },
    validation: { state: 'validated', validatedAt: '2026-08-12T10:30:00Z' },
    deliveryEligibility: { status: 'available', estimatedDays: { min: 1, max: 2 }, availableMethods: ['Standard', 'Express', 'Same-day'] },
    usage: { usedFor: ['shipping', 'billing'], lastUsedAt: '2026-09-08T14:20:00Z', recentOrderCount: 12, selectedAtCheckout: true },
    createdAt: '2024-02-11T09:00:00Z',
    updatedAt: '2026-08-12T10:30:00Z',
  },
  {
    id: 'addr_seed_2',
    label: 'office',
    purposes: ['shipping'],
    recipient: { firstName: 'Amara', lastName: 'Whitfield', company: 'Northbridge Analytics' },
    contact: { phone: '+14155550187' },
    location: {
      countryCode: 'US',
      administrativeArea: 'California',
      locality: 'San Francisco',
      postalCode: '94105',
      addressLine1: '101 Spear Street',
      addressLine2: 'Floor 14',
      landmark: 'Near Salesforce Park',
    },
    deliveryInstructions: { gateOrBuildingInfo: 'Check in with lobby security, badge required.' },
    validation: { state: 'validated', validatedAt: '2026-07-02T08:00:00Z' },
    deliveryEligibility: { status: 'limited', estimatedDays: { min: 2, max: 4 }, availableMethods: ['Standard'], restrictionNote: 'No weekend delivery to this building.' },
    usage: { usedFor: ['shipping'], lastUsedAt: '2026-06-30T11:00:00Z', recentOrderCount: 3 },
    createdAt: '2024-05-20T09:00:00Z',
    updatedAt: '2026-07-02T08:00:00Z',
  },
  {
    id: 'addr_seed_3',
    label: 'home',
    purposes: ['shipping', 'billing'],
    recipient: { firstName: 'Kenji', lastName: 'Watanabe' },
    contact: { phone: '+81368520147' },
    location: {
      countryCode: 'JP',
      administrativeArea: 'Tokyo',
      subAdministrativeArea: 'Shibuya City',
      locality: 'Shibuya',
      district: 'Jinnan',
      postalCode: '150-0041',
      addressLine1: '2-24-1 Jinnan',
      addressLine2: 'Cocoti 8F',
    },
    validation: { state: 'validated', validatedAt: '2026-05-18T05:00:00Z' },
    deliveryEligibility: { status: 'available', estimatedDays: { min: 1, max: 3 }, availableMethods: ['Standard', 'Express'] },
    usage: { usedFor: ['shipping', 'billing'], lastUsedAt: '2026-09-01T02:15:00Z', recentOrderCount: 7 },
    createdAt: '2023-11-03T09:00:00Z',
    updatedAt: '2026-05-18T05:00:00Z',
  },
  {
    id: 'addr_seed_4',
    label: 'other',
    customLabel: "Parents' house",
    purposes: ['shipping'],
    recipient: { firstName: 'Priya', lastName: 'Sharma' },
    contact: { phone: '+9779801234567' },
    location: {
      countryCode: 'NP',
      administrativeArea: 'Bagmati Province',
      locality: 'Kathmandu',
      district: 'Baneshwor',
      postalCode: '44600',
      addressLine1: 'Mid Baneshwor, Ward 31',
      landmark: 'Near Api Complex',
    },
    deliveryInstructions: { deliveryNotes: 'Call on arrival, gate is unmarked.' },
    validation: { state: 'needs-correction', message: 'Postal code format could not be confirmed for this locality.' },
    deliveryEligibility: { status: 'verification-required', restrictionNote: 'Confirm address to unlock delivery estimates.' },
    usage: { usedFor: ['shipping'], recentOrderCount: 1, lastUsedAt: '2026-03-14T09:00:00Z' },
    createdAt: '2026-03-14T09:00:00Z',
    updatedAt: '2026-03-14T09:00:00Z',
  },
  {
    id: 'addr_seed_5',
    label: 'pickup-point',
    purposes: ['pickup'],
    recipient: { firstName: 'Lukas', lastName: 'Bergmann' },
    contact: { phone: '+493022345678' },
    location: {
      countryCode: 'DE',
      administrativeArea: 'Berlin',
      locality: 'Berlin',
      postalCode: '10115',
      addressLine1: 'Torstraße 34',
      landmark: 'Parcel locker, station 4',
    },
    validation: { state: 'validated', validatedAt: '2026-04-22T07:00:00Z' },
    deliveryEligibility: { status: 'pickup-only', availableMethods: ['Locker pickup'] },
    usage: { usedFor: ['pickup'], recentOrderCount: 5, lastUsedAt: '2026-08-19T16:40:00Z' },
    createdAt: '2025-01-09T09:00:00Z',
    updatedAt: '2026-04-22T07:00:00Z',
  },
  {
    id: 'addr_seed_6',
    label: 'home',
    purposes: ['shipping'],
    recipient: { firstName: 'Sofia', lastName: 'Alaoui' },
    contact: { phone: '+971501234567' },
    location: {
      countryCode: 'AE',
      administrativeArea: 'Dubai',
      locality: 'Dubai',
      district: 'Jumeirah',
      postalCode: '00000',
      addressLine1: 'Villa 12, Al Wasl Road',
    },
    validation: { state: 'validation-failed', message: 'We could not verify this address. Double-check the street and area.' },
    deliveryEligibility: { status: 'unavailable', restrictionNote: 'Resolve address validation to enable delivery.' },
    usage: { usedFor: ['shipping'], recentOrderCount: 0 },
    createdAt: '2026-09-02T09:00:00Z',
    updatedAt: '2026-09-02T09:00:00Z',
  },
];

const SEED_DEFAULTS: Partial<Record<AddressPurpose, string>> = {
  shipping: 'addr_seed_1',
  billing: 'addr_seed_1',
  pickup: 'addr_seed_5',
};

/* =================================================================================================
 * [STORE] — Redux Toolkit
 * ================================================================================================= */

interface AddressState {
  byId: Record<string, Address>;
  ids: string[];
  selectedAddressId: string | null;
  defaultAddressIds: Partial<Record<AddressPurpose, string>>;
  search: string;
  filter: AddressFilter;
  sort: AddressSort;
  loadStatus: 'idle' | 'loading' | 'success' | 'error';
  loadError: string | null;
}

function buildInitialAddressState(): AddressState {
  const byId: Record<string, Address> = {};
  const ids: string[] = [];
  for (const address of SEED_ADDRESSES) {
    byId[address.id] = address;
    ids.push(address.id);
  }
  return {
    byId,
    ids,
    selectedAddressId: SEED_DEFAULTS.shipping ?? ids[0] ?? null,
    defaultAddressIds: { ...SEED_DEFAULTS },
    search: '',
    filter: 'all',
    sort: 'default-first',
    loadStatus: 'success',
    loadError: null,
  };
}

const addressSlice = createSlice({
  name: 'address',
  initialState: buildInitialAddressState(),
  reducers: {
    addressAdded(state, action: PayloadAction<Address>) {
      const address = action.payload;
      state.byId[address.id] = address;
      state.ids.unshift(address.id);
    },
    addressUpdated(state, action: PayloadAction<Address>) {
      state.byId[action.payload.id] = action.payload;
    },
    addressRemoved(state, action: PayloadAction<{ id: string }>) {
      const { id } = action.payload;
      delete state.byId[id];
      state.ids = state.ids.filter((existingId) => existingId !== id);
      (Object.keys(state.defaultAddressIds) as AddressPurpose[]).forEach((purpose) => {
        if (state.defaultAddressIds[purpose] === id) delete state.defaultAddressIds[purpose];
      });
      if (state.selectedAddressId === id) state.selectedAddressId = state.ids[0] ?? null;
    },
    defaultAddressSet(state, action: PayloadAction<{ purpose: AddressPurpose; id: string }>) {
      state.defaultAddressIds[action.payload.purpose] = action.payload.id;
    },
    selectedAddressChanged(state, action: PayloadAction<string | null>) {
      state.selectedAddressId = action.payload;
    },
    searchChanged(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    filterChanged(state, action: PayloadAction<AddressFilter>) {
      state.filter = action.payload;
    },
    sortChanged(state, action: PayloadAction<AddressSort>) {
      state.sort = action.payload;
    },
  },
});

const {
  addressAdded,
  addressUpdated,
  addressRemoved,
  defaultAddressSet,
  selectedAddressChanged,
  searchChanged,
  filterChanged,
  sortChanged,
} = addressSlice.actions;

const store = configureStore({
  reducer: { address: addressSlice.reducer },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

const selectAddressState = (state: RootState) => state.address;

const selectAllAddresses = createSelector(selectAddressState, (s) => s.ids.map((id) => s.byId[id]));

const selectDefaultAddressIds = createSelector(selectAddressState, (s) => s.defaultAddressIds);

const selectSelectedAddressId = createSelector(selectAddressState, (s) => s.selectedAddressId);

const selectFilteredSortedAddresses = createSelector(
  selectAllAddresses,
  selectAddressState,
  (addresses, s) => {
    const query = s.search.trim().toLowerCase();
    let result = addresses.filter((address) => {
      if (!query) return true;
      const haystack = [
        address.customLabel ?? ADDRESS_LABEL_CONFIG[address.label].title,
        address.recipient.firstName,
        address.recipient.lastName,
        address.location.locality,
        address.location.postalCode,
        COUNTRY_NAME[address.location.countryCode],
        address.location.addressLine1,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    result = result.filter((address) => {
      switch (s.filter) {
        case 'all':
          return true;
        case 'default':
          return Object.values(s.defaultAddressIds).includes(address.id);
        case 'shipping':
        case 'billing':
        case 'pickup':
          return address.purposes.includes(s.filter);
        case 'verified':
          return address.validation.state === 'validated';
        case 'needs-review':
          return (
            address.validation.state === 'needs-correction' ||
            address.validation.state === 'validation-failed' ||
            address.validation.state === 'suggested-address'
          );
        default:
          return true;
      }
    });

    const sorted = [...result];
    switch (s.sort) {
      case 'alphabetical':
        sorted.sort((a, b) => `${a.recipient.firstName} ${a.recipient.lastName}`.localeCompare(`${b.recipient.firstName} ${b.recipient.lastName}`));
        break;
      case 'recently-added':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'recently-used':
        sorted.sort((a, b) => new Date(b.usage.lastUsedAt ?? 0).getTime() - new Date(a.usage.lastUsedAt ?? 0).getTime());
        break;
      case 'default-first':
      default:
        sorted.sort((a, b) => {
          const aDefault = Object.values(s.defaultAddressIds).includes(a.id) ? 0 : 1;
          const bDefault = Object.values(s.defaultAddressIds).includes(b.id) ? 0 : 1;
          return aDefault - bDefault;
        });
        break;
    }
    return sorted;
  },
);

/* =================================================================================================
 * [UTILS]
 * ================================================================================================= */

function fullName(recipient: RecipientInfo): string {
  return `${recipient.firstName} ${recipient.lastName}`.trim();
}

function addressLabelTitle(address: Pick<Address, 'label' | 'customLabel'>): string {
  return address.label === 'other' && address.customLabel ? address.customLabel : ADDRESS_LABEL_CONFIG[address.label].title;
}

function formatAddressLines(location: GeoLocation): string[] {
  const lines: string[] = [location.addressLine1];
  if (location.addressLine2) lines.push(location.addressLine2);
  const regionLine = [location.locality, location.administrativeArea, location.postalCode].filter(Boolean).join(', ');
  if (regionLine) lines.push(regionLine);
  lines.push(COUNTRY_NAME[location.countryCode]);
  return lines;
}

/** Masks a phone number for display while preserving the country dial code and last 3 digits. */
function formatMaskedPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  const match = digits.match(/^(\+\d{1,3})(\d+)$/);
  if (!match) return '••••••••';
  const [, dialCode, rest] = match;
  const visibleTail = rest.slice(-3);
  return `${dialCode} ${'•'.repeat(Math.max(rest.length - 3, 4))}${visibleTail}`;
}

function formatRelativeDate(iso?: string): string {
  if (!iso) return 'Never used';
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/** Client-side structural validation. Field requirements are not one-size-fits-all across countries. */
function validateAddressForm(values: AddressFormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.firstName.trim()) errors.firstName = 'First name is required.';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!values.phone.trim()) errors.phone = 'A phone number is required for delivery updates.';
  else if (!/^\+?[0-9\s-]{7,15}$/.test(values.phone.trim())) errors.phone = 'Enter a valid phone number, digits only.';
  if (!values.addressLine1.trim()) errors.addressLine1 = 'Street address is required.';
  if (!values.locality.trim()) errors.locality = 'City / locality is required.';
  if (!values.postalCode.trim()) errors.postalCode = 'Postal / ZIP code is required.';
  if (values.countryCode !== 'SG' && values.countryCode !== 'AE' && !values.administrativeArea.trim()) {
    errors.administrativeArea = 'State / province / region is required.';
  }
  if (values.purposes.length === 0) errors.purposes = 'Select at least one purpose for this address.';
  return errors;
}

/**
 * Integration point for a real address-validation service (e.g. a carrier or postal API).
 * This simulates the round trip and standardization logic so the UI/state is wired end-to-end;
 * replace the body with a real network call when the backend contract is available.
 */
async function simulateValidateAddress(values: AddressFormValues): Promise<AddressValidationResult> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const postal = values.postalCode.trim();
  if (values.countryCode === 'US' && /^\d{5}$/.test(postal) === false && /^\d{9}$/.test(postal.replace('-', ''))) {
    return {
      state: 'suggested-address',
      message: 'We standardized your ZIP+4 code.',
      suggestedAddress: { postalCode: `${postal.slice(0, 5)}-${postal.slice(5)}` },
      validatedAt: new Date().toISOString(),
    };
  }
  if (postal.length < 3) {
    return { state: 'validation-failed', message: 'We could not verify this postal code. Please check it and try again.' };
  }
  if (!values.addressLine1.match(/\d/)) {
    return {
      state: 'needs-correction',
      message: 'Your street address usually includes a house or building number.',
    };
  }
  return { state: 'validated', validatedAt: new Date().toISOString() };
}

async function simulateDeliveryEligibility(values: AddressFormValues): Promise<DeliveryEligibility> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  if (values.purposes.includes('pickup') && values.purposes.length === 1) {
    return { status: 'pickup-only', availableMethods: ['Locker pickup'] };
  }
  if (values.countryCode === 'AE' || values.countryCode === 'NP') {
    return {
      status: 'limited',
      estimatedDays: { min: 3, max: 6 },
      availableMethods: ['Standard'],
      restrictionNote: 'Express delivery is not yet available in this area.',
    };
  }
  return { status: 'available', estimatedDays: { min: 1, max: 3 }, availableMethods: ['Standard', 'Express'] };
}

function detectDuplicateAddress(existing: Address[], candidate: AddressFormValues, excludeId?: string): DuplicateStatus {
  const candidateLine = candidate.addressLine1.trim().toLowerCase();
  const candidatePostal = candidate.postalCode.trim().toLowerCase();
  const candidateLocality = candidate.locality.trim().toLowerCase();

  for (const address of existing) {
    if (address.id === excludeId) continue;
    const line = address.location.addressLine1.trim().toLowerCase();
    const postal = address.location.postalCode.trim().toLowerCase();
    const locality = address.location.locality.trim().toLowerCase();
    if (line === candidateLine && postal === candidatePostal) return 'duplicate-confirmed';
    if (postal === candidatePostal && locality === candidateLocality && candidatePostal) return 'possible-duplicate';
  }
  return 'none';
}

function addressToFormValues(address: Address): AddressFormValues {
  return {
    label: address.label,
    customLabel: address.customLabel ?? '',
    purposes: address.purposes,
    firstName: address.recipient.firstName,
    lastName: address.recipient.lastName,
    company: address.recipient.company ?? '',
    phone: address.contact.phone,
    alternatePhone: address.contact.alternatePhone ?? '',
    countryCode: address.location.countryCode,
    administrativeArea: address.location.administrativeArea,
    subAdministrativeArea: address.location.subAdministrativeArea ?? '',
    locality: address.location.locality,
    district: address.location.district ?? '',
    postalCode: address.location.postalCode,
    addressLine1: address.location.addressLine1,
    addressLine2: address.location.addressLine2 ?? '',
    landmark: address.location.landmark ?? '',
    gateOrBuildingInfo: address.deliveryInstructions?.gateOrBuildingInfo ?? '',
    safePlaceNote: address.deliveryInstructions?.safePlaceNote ?? '',
    deliveryNotes: address.deliveryInstructions?.deliveryNotes ?? '',
    setDefaultShipping: false,
    setDefaultBilling: false,
  };
}

function formValuesToAddress(values: AddressFormValues, existing: Address | null, validation: AddressValidationResult, eligibility: DeliveryEligibility): Address {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? generateAddressId(),
    label: values.label,
    customLabel: values.label === 'other' ? values.customLabel.trim() || undefined : undefined,
    purposes: values.purposes,
    recipient: { firstName: values.firstName.trim(), lastName: values.lastName.trim(), company: values.company.trim() || undefined },
    contact: { phone: values.phone.trim(), alternatePhone: values.alternatePhone.trim() || undefined },
    location: {
      countryCode: values.countryCode,
      administrativeArea: values.administrativeArea.trim(),
      subAdministrativeArea: values.subAdministrativeArea.trim() || undefined,
      locality: values.locality.trim(),
      district: values.district.trim() || undefined,
      postalCode: values.postalCode.trim(),
      addressLine1: values.addressLine1.trim(),
      addressLine2: values.addressLine2.trim() || undefined,
      landmark: values.landmark.trim() || undefined,
    },
    deliveryInstructions:
      values.gateOrBuildingInfo || values.safePlaceNote || values.deliveryNotes
        ? {
            gateOrBuildingInfo: values.gateOrBuildingInfo.trim() || undefined,
            safePlaceNote: values.safePlaceNote.trim() || undefined,
            deliveryNotes: values.deliveryNotes.trim() || undefined,
          }
        : undefined,
    validation,
    deliveryEligibility: eligibility,
    usage: existing?.usage ?? { usedFor: values.purposes, recentOrderCount: 0 },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/* =================================================================================================
 * [UI PRIMITIVES]
 * ================================================================================================= */

function Badge({ tone, icon: Icon, children }: { tone: 'success' | 'warning' | 'info' | 'destructive' | 'neutral'; icon?: typeof Info; children: ReactNode }) {
  const toneClasses: Record<typeof tone, string> = {
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    info: 'bg-info/10 text-info border-info/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    neutral: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${toneClasses[tone]}`}>
      {Icon ? <Icon aria-hidden="true" className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

function IconButton({ label, onClick, children, variant = 'ghost' }: { label: string; onClick?: () => void; children: ReactNode; variant?: 'ghost' | 'outline' }) {
  const base = 'inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
  const styles = variant === 'outline' ? 'border-border bg-card hover:bg-accent hover:text-accent-foreground' : 'border-transparent hover:bg-accent hover:text-accent-foreground';
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

interface DialogShellProps {
  titleId: string;
  descriptionId?: string;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
}

function DialogShell({ titleId, descriptionId, onClose, children, widthClassName = 'max-w-lg' }: DialogShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    containerRef.current?.querySelector<HTMLElement>('input, button, select, textarea')?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`max-h-[92vh] w-full ${widthClassName} overflow-y-auto rounded-t-xl border border-border bg-card text-card-foreground shadow-lg sm:rounded-xl`}
      >
        {children}
      </div>
    </div>
  );
}

/* =================================================================================================
 * [LAYOUT]
 * ================================================================================================= */

function AnnouncementBar() {
  return (
    <div className="hidden bg-primary px-4 py-2 text-center text-xs font-medium text-primary-foreground sm:block">
      Free standard shipping on orders over $49 — international delivery to 42 countries.
    </div>
  );
}

function EcommerceHeader({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <AnnouncementBar />
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border lg:hidden"
          aria-label="Open account navigation"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
        <span className="text-lg font-semibold tracking-tight text-foreground">Meridian</span>
        <div className="ml-2 hidden flex-1 items-center md:flex">
          <label htmlFor="global-search" className="sr-only">
            Search products
          </label>
          <div className="relative w-full max-w-xl">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="global-search"
              type="search"
              placeholder="Search products, brands, and categories"
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Wishlist">
            <Heart aria-hidden="true" className="h-5 w-5" />
          </IconButton>
          <IconButton label="Notifications">
            <Bell aria-hidden="true" className="h-5 w-5" />
          </IconButton>
          <IconButton label="Cart, 3 items">
            <ShoppingCart aria-hidden="true" className="h-5 w-5" />
          </IconButton>
          <span className="ml-1 hidden h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground sm:flex">
            AW
          </span>
        </div>
      </div>
      <nav aria-label="Product categories" className="hidden border-t border-border md:block">
        <ul className="mx-auto flex max-w-7xl gap-6 px-6 py-2 text-sm text-muted-foreground">
          {['Electronics', 'Home & Living', 'Fashion', 'Beauty', 'Groceries', 'Deals'].map((item) => (
            <li key={item}>
              <a href="#" className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {item}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <a href="#" className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Account
          </a>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3.5 w-3.5" />
        </li>
        <li aria-current="page" className="font-medium text-foreground">
          Addresses
        </li>
      </ol>
    </nav>
  );
}

function AccountIdentity() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-base font-semibold text-secondary-foreground">AW</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">Amara Whitfield</p>
        <p className="truncate text-xs text-muted-foreground">amara.whitfield@meridianmail.com</p>
      </div>
    </div>
  );
}

function AccountNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Account navigation" className="px-2 py-3">
      <ul className="space-y-0.5">
        {ACCOUNT_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <a
                href="#"
                aria-current={item.active ? 'page' : undefined}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  item.active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </a>
            </li>
          );
        })}
        <li className="pt-2">
          <a href="#" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
            <Settings aria-hidden="true" className="h-4 w-4" />
            Account settings
          </a>
        </li>
        <li>
          <a href="#" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </a>
        </li>
      </ul>
    </nav>
  );
}

function AddressSidebar() {
  return (
    <aside aria-label="Account" className="hidden w-64 shrink-0 rounded-xl border border-border bg-card lg:block">
      <AccountIdentity />
      <AccountNavigation />
    </aside>
  );
}

function MobileAccountDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Account navigation" className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Your account</span>
          <IconButton label="Close menu" onClick={onClose}>
            <X aria-hidden="true" className="h-5 w-5" />
          </IconButton>
        </div>
        <AccountIdentity />
        <AccountNavigation onNavigate={onClose} />
      </div>
    </div>
  );
}

function EcommerceFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-muted-foreground sm:px-6 md:grid-cols-4">
        <div>
          <p className="mb-3 font-semibold text-foreground">Customer service</p>
          <ul className="space-y-2">
            <li>Help center</li>
            <li>Shipping & delivery</li>
            <li>Returns & refunds</li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold text-foreground">About Meridian</p>
          <ul className="space-y-2">
            <li>Our story</li>
            <li>Sustainability</li>
            <li>Careers</li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold text-foreground">Policies</p>
          <ul className="space-y-2">
            <li>Privacy policy</li>
            <li>Terms of service</li>
            <li>Accessibility</li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold text-foreground">Stay in touch</p>
          <p>Get delivery updates and offers for your saved addresses.</p>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">© 2026 Meridian Commerce, Inc.</div>
    </footer>
  );
}

/* =================================================================================================
 * [ADDRESS DOMAIN]
 * ================================================================================================= */

function AddressHeader({ addressCount, onAddAddress }: { addressCount: number; onAddAddress: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your addresses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage shipping, billing, and pickup locations · {addressCount} saved
        </p>
      </div>
      <button
        type="button"
        onClick={onAddAddress}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add new address
      </button>
    </div>
  );
}

function AddressToolbar({
  search,
  filter,
  sort,
  density,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onDensityChange,
}: {
  search: string;
  filter: AddressFilter;
  sort: AddressSort;
  density: ViewDensity;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: AddressFilter) => void;
  onSortChange: (value: AddressSort) => void;
  onDensityChange: (value: ViewDensity) => void;
}) {
  const searchId = useId();
  const filterId = useId();
  const sortId = useId();
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <label htmlFor={searchId} className="sr-only">
          Search addresses
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          placeholder="Search by name, city, or postal code"
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor={filterId} className="sr-only">
          Filter addresses
        </label>
        <select
          id={filterId}
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as AddressFilter)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <label htmlFor={sortId} className="sr-only">
          Sort addresses
        </label>
        <select
          id={sortId}
          value={sort}
          onChange={(e) => onSortChange(e.target.value as AddressSort)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div role="group" aria-label="View density" className="hidden items-center rounded-md border border-input p-0.5 sm:flex">
          {(['comfortable', 'compact'] as ViewDensity[]).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={density === mode}
              onClick={() => onDensityChange(mode)}
              className={`rounded px-2.5 py-1.5 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                density === mode ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddressOverview({
  addresses,
  defaultAddressIds,
  onViewCoverage,
}: {
  addresses: Address[];
  defaultAddressIds: Partial<Record<AddressPurpose, string>>;
  onViewCoverage: () => void;
}) {
  const byId = useMemo(() => new Map(addresses.map((a) => [a.id, a])), [addresses]);
  const defaultShipping = defaultAddressIds.shipping ? byId.get(defaultAddressIds.shipping) : undefined;
  const needsReviewCount = addresses.filter((a) => a.validation.state !== 'validated').length;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Default shipping address</p>
        {defaultShipping ? (
          <>
            <p className="mt-1.5 truncate text-sm font-semibold text-foreground">{fullName(defaultShipping.recipient)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {defaultShipping.location.locality}, {COUNTRY_NAME[defaultShipping.location.countryCode]}
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">No default set</p>
        )}
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Saved addresses</p>
        <p className="mt-1.5 text-2xl font-semibold text-foreground">{addresses.length}</p>
        <p className="text-xs text-muted-foreground">{needsReviewCount === 0 ? 'All verified' : `${needsReviewCount} need review`}</p>
      </div>
      <button
        type="button"
        onClick={onViewCoverage}
        className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <p className="text-xs font-medium text-muted-foreground">Delivery coverage</p>
        <p className="mt-1.5 text-sm font-semibold text-foreground">View shipping methods by address</p>
        <span className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
          View details <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </button>
    </div>
  );
}

interface AddressCardProps {
  address: Address;
  isSelected: boolean;
  defaultAddressIds: Partial<Record<AddressPurpose, string>>;
  density: ViewDensity;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: (purpose: AddressPurpose) => void;
  onSelect: () => void;
}

function AddressCard({ address, isSelected, defaultAddressIds, density, onEdit, onDelete, onSetDefault, onSelect }: AddressCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const LabelIcon = ADDRESS_LABEL_CONFIG[address.label].icon;
  const defaultForPurposes = (Object.keys(defaultAddressIds) as AddressPurpose[]).filter((p) => defaultAddressIds[p] === address.id);
  const isAnyDefault = defaultForPurposes.length > 0;
  const eligibilityConfig = DELIVERY_ELIGIBILITY_CONFIG[address.deliveryEligibility.status];
  const EligibilityIcon = eligibilityConfig.icon;
  const needsReview = address.validation.state !== 'validated';
  const settableDefaults = address.purposes.filter((p) => defaultAddressIds[p] !== address.id);

  return (
    <li className={`rounded-xl border border-border bg-card ${density === 'compact' ? 'p-3' : 'p-4'} ${isSelected ? 'ring-2 ring-ring' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <LabelIcon aria-hidden="true" className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{addressLabelTitle(address)}</h3>
              {isAnyDefault && (
                <Badge tone="info" icon={Star}>
                  Default {defaultForPurposes.map((p) => PURPOSE_CONFIG[p].title).join(' & ')}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm text-foreground">{fullName(address.recipient)}</p>
            {address.recipient.company && <p className="truncate text-xs text-muted-foreground">{address.recipient.company}</p>}
          </div>
        </div>
        <div className="relative shrink-0">
          <IconButton label={`More actions for ${addressLabelTitle(address)}`} onClick={() => setMenuOpen((v) => !v)}>
            <MoreVertical aria-hidden="true" className="h-4.5 w-4.5" />
          </IconButton>
          {menuOpen && (
            <div role="menu" className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
              <button role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
              </button>
              {settableDefaults.map((purpose) => (
                <button
                  key={purpose}
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onSetDefault(purpose); }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Star className="h-3.5 w-3.5" aria-hidden="true" /> Set as default {PURPOSE_CONFIG[purpose].title.toLowerCase()}
                </button>
              ))}
              <button role="menuitem" onClick={() => { setMenuOpen(false); onDelete(); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
        {formatAddressLines(address.location).map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p className="flex items-center gap-1.5 pt-1">
          <Phone aria-hidden="true" className="h-3.5 w-3.5" /> {formatMaskedPhone(address.contact.phone)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {address.purposes.map((p) => (
          <Badge key={p} tone="neutral">
            {PURPOSE_CONFIG[p].title}
          </Badge>
        ))}
        <Badge tone={eligibilityConfig.tone} icon={EligibilityIcon}>
          {eligibilityConfig.title}
        </Badge>
        {needsReview && (
          <Badge tone="warning" icon={AlertTriangle}>
            Needs review
          </Badge>
        )}
      </div>

      {expanded && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <dt>Used for</dt>
          <dd className="text-foreground">{address.usage.usedFor.map((p) => PURPOSE_CONFIG[p].title).join(', ')}</dd>
          <dt>Last used</dt>
          <dd className="text-foreground">{formatRelativeDate(address.usage.lastUsedAt)}</dd>
          <dt>Recent orders</dt>
          <dd className="text-foreground">{address.usage.recentOrderCount}</dd>
          {address.deliveryEligibility.estimatedDays && (
            <>
              <dt>Estimated delivery</dt>
              <dd className="text-foreground">
                {address.deliveryEligibility.estimatedDays.min}–{address.deliveryEligibility.estimatedDays.max} business days
              </dd>
            </>
          )}
          {address.deliveryEligibility.restrictionNote && (
            <>
              <dt>Note</dt>
              <dd className="text-foreground">{address.deliveryEligibility.restrictionNote}</dd>
            </>
          )}
        </dl>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onSelect}
          disabled={isSelected}
          className="inline-flex h-8 items-center rounded-md border border-input px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isSelected ? 'Selected for delivery' : 'Use for delivery'}
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? 'Hide details' : 'View details'}
          <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </li>
  );
}

function AddressList({
  addresses,
  selectedAddressId,
  defaultAddressIds,
  density,
  onEdit,
  onDelete,
  onSetDefault,
  onSelect,
}: {
  addresses: Address[];
  selectedAddressId: string | null;
  defaultAddressIds: Partial<Record<AddressPurpose, string>>;
  density: ViewDensity;
  onEdit: (address: Address) => void;
  onDelete: (address: Address) => void;
  onSetDefault: (address: Address, purpose: AddressPurpose) => void;
  onSelect: (address: Address) => void;
}) {
  return (
    <ul className={`grid gap-3 ${density === 'compact' ? '' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
      {addresses.map((address) => (
        <AddressCard
          key={address.id}
          address={address}
          isSelected={address.id === selectedAddressId}
          defaultAddressIds={defaultAddressIds}
          density={density}
          onEdit={() => onEdit(address)}
          onDelete={() => onDelete(address)}
          onSetDefault={(purpose) => onSetDefault(address, purpose)}
          onSelect={() => onSelect(address)}
        />
      ))}
    </ul>
  );
}

function EmptyAddressState({ onAddAddress }: { onAddAddress: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <MapPin aria-hidden="true" className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">No saved addresses</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">Add your home, office, or other delivery location for faster checkout.</p>
      <button
        type="button"
        onClick={onAddAddress}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add address
      </button>
    </div>
  );
}

function AddressLoadingState() {
  return (
    <div aria-live="polite" aria-busy="true" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4">
          <div className="h-9 w-9 rounded-md bg-muted" />
          <div className="mt-3 h-3.5 w-2/3 rounded bg-muted" />
          <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
          <div className="mt-4 h-3 w-full rounded bg-muted" />
          <div className="mt-1.5 h-3 w-4/5 rounded bg-muted" />
        </div>
      ))}
      <span className="sr-only">Loading your saved addresses…</span>
    </div>
  );
}

function AddressErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <AlertTriangle aria-hidden="true" className="h-8 w-8 text-destructive" />
      <p className="mt-3 text-sm font-medium text-foreground">We couldn't load your addresses</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Try again
      </button>
    </div>
  );
}

function AddressPolicySection() {
  return (
    <section aria-labelledby="policy-heading" className="rounded-xl border border-border bg-card p-4">
      <h2 id="policy-heading" className="text-sm font-semibold text-foreground">
        How address changes affect your orders
      </h2>
      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
        <li>Editing an address updates future orders only — orders already placed keep their original delivery details.</li>
        <li>A default address is used automatically at checkout unless you choose a different one.</li>
        <li>Some regions require address verification before same-day or express delivery is available.</li>
      </ul>
    </section>
  );
}

function TrustSection() {
  return (
    <section aria-labelledby="trust-heading" className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
      <h2 id="trust-heading" className="sr-only">
        Why trust Meridian with your address
      </h2>
      <div className="flex items-start gap-2.5">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">Your address data is encrypted and never shared with third parties without consent.</p>
      </div>
      <div className="flex items-start gap-2.5">
        <Truck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">Delivery estimates are calculated per address using live carrier coverage.</p>
      </div>
      <div className="flex items-start gap-2.5">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">Address validation helps prevent failed or delayed deliveries.</p>
      </div>
    </section>
  );
}

/* =================================================================================================
 * [FORMS / DIALOGS]
 * ================================================================================================= */

function RecipientFields({ values, errors, onChange }: { values: AddressFormValues; errors: FormErrors; onChange: (patch: Partial<AddressFormValues>) => void }) {
  const firstId = useId();
  const lastId = useId();
  const companyId = useId();
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="col-span-full text-sm font-semibold text-foreground">Recipient</legend>
      <div>
        <label htmlFor={firstId} className="mb-1 block text-xs font-medium text-muted-foreground">
          First name
        </label>
        <input
          id={firstId}
          value={values.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
          aria-invalid={Boolean(errors.firstName)}
          aria-describedby={errors.firstName ? `${firstId}-error` : undefined}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {errors.firstName && <p id={`${firstId}-error`} className="mt-1 text-xs text-destructive">{errors.firstName}</p>}
      </div>
      <div>
        <label htmlFor={lastId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Last name
        </label>
        <input
          id={lastId}
          value={values.lastName}
          onChange={(e) => onChange({ lastName: e.target.value })}
          aria-invalid={Boolean(errors.lastName)}
          aria-describedby={errors.lastName ? `${lastId}-error` : undefined}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {errors.lastName && <p id={`${lastId}-error`} className="mt-1 text-xs text-destructive">{errors.lastName}</p>}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={companyId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Company <span className="text-muted-foreground/70">(optional)</span>
        </label>
        <input id={companyId} value={values.company} onChange={(e) => onChange({ company: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
    </fieldset>
  );
}

function ContactFields({ values, errors, onChange }: { values: AddressFormValues; errors: FormErrors; onChange: (patch: Partial<AddressFormValues>) => void }) {
  const phoneId = useId();
  const altId = useId();
  const dialCode = COUNTRY_DIAL_CODE[values.countryCode];
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="col-span-full text-sm font-semibold text-foreground">Contact</legend>
      <div>
        <label htmlFor={phoneId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Phone number
        </label>
        <div className="flex">
          <span className="inline-flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">{dialCode}</span>
          <input
            id={phoneId}
            type="tel"
            value={values.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? `${phoneId}-error` : undefined}
            className="h-10 w-full rounded-r-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {errors.phone && <p id={`${phoneId}-error`} className="mt-1 text-xs text-destructive">{errors.phone}</p>}
      </div>
      <div>
        <label htmlFor={altId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Alternate contact <span className="text-muted-foreground/70">(optional)</span>
        </label>
        <input id={altId} type="tel" value={values.alternatePhone} onChange={(e) => onChange({ alternatePhone: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
    </fieldset>
  );
}

function LocationFields({ values, errors, onChange }: { values: AddressFormValues; errors: FormErrors; onChange: (patch: Partial<AddressFormValues>) => void }) {
  const countryId = useId();
  const line1Id = useId();
  const line2Id = useId();
  const areaId = useId();
  const localityId = useId();
  const postalId = useId();
  const landmarkId = useId();
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="col-span-full text-sm font-semibold text-foreground">Location</legend>
      <div className="sm:col-span-2">
        <label htmlFor={countryId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Country / region
        </label>
        <select id={countryId} value={values.countryCode} onChange={(e) => onChange({ countryCode: e.target.value as CountryCode })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={line1Id} className="mb-1 block text-xs font-medium text-muted-foreground">
          Address line 1
        </label>
        <input
          id={line1Id}
          value={values.addressLine1}
          onChange={(e) => onChange({ addressLine1: e.target.value })}
          aria-invalid={Boolean(errors.addressLine1)}
          aria-describedby={errors.addressLine1 ? `${line1Id}-error` : undefined}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {errors.addressLine1 && <p id={`${line1Id}-error`} className="mt-1 text-xs text-destructive">{errors.addressLine1}</p>}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={line2Id} className="mb-1 block text-xs font-medium text-muted-foreground">
          Address line 2 <span className="text-muted-foreground/70">(optional)</span>
        </label>
        <input id={line2Id} value={values.addressLine2} onChange={(e) => onChange({ addressLine2: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <div>
        <label htmlFor={localityId} className="mb-1 block text-xs font-medium text-muted-foreground">
          City / locality
        </label>
        <input
          id={localityId}
          value={values.locality}
          onChange={(e) => onChange({ locality: e.target.value })}
          aria-invalid={Boolean(errors.locality)}
          aria-describedby={errors.locality ? `${localityId}-error` : undefined}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {errors.locality && <p id={`${localityId}-error`} className="mt-1 text-xs text-destructive">{errors.locality}</p>}
      </div>
      <div>
        <label htmlFor={areaId} className="mb-1 block text-xs font-medium text-muted-foreground">
          State / province / region
        </label>
        <input
          id={areaId}
          value={values.administrativeArea}
          onChange={(e) => onChange({ administrativeArea: e.target.value })}
          aria-invalid={Boolean(errors.administrativeArea)}
          aria-describedby={errors.administrativeArea ? `${areaId}-error` : undefined}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {errors.administrativeArea && <p id={`${areaId}-error`} className="mt-1 text-xs text-destructive">{errors.administrativeArea}</p>}
      </div>
      <div>
        <label htmlFor={postalId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Postal / ZIP code
        </label>
        <input
          id={postalId}
          value={values.postalCode}
          onChange={(e) => onChange({ postalCode: e.target.value })}
          aria-invalid={Boolean(errors.postalCode)}
          aria-describedby={errors.postalCode ? `${postalId}-error` : undefined}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {errors.postalCode && <p id={`${postalId}-error`} className="mt-1 text-xs text-destructive">{errors.postalCode}</p>}
      </div>
      <div>
        <label htmlFor={landmarkId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Landmark <span className="text-muted-foreground/70">(optional)</span>
        </label>
        <input id={landmarkId} value={values.landmark} onChange={(e) => onChange({ landmark: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
    </fieldset>
  );
}

function DeliveryInstructionsFields({ values, onChange }: { values: AddressFormValues; onChange: (patch: Partial<AddressFormValues>) => void }) {
  const gateId = useId();
  const notesId = useId();
  const remaining = DELIVERY_NOTES_MAX_LENGTH - values.deliveryNotes.length;
  return (
    <fieldset className="grid gap-4">
      <legend className="text-sm font-semibold text-foreground">Delivery instructions <span className="font-normal text-muted-foreground/70">(optional)</span></legend>
      <div>
        <label htmlFor={gateId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Gate / building info
        </label>
        <input id={gateId} value={values.gateOrBuildingInfo} onChange={(e) => onChange({ gateOrBuildingInfo: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <div>
        <label htmlFor={notesId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Notes for the courier
        </label>
        <textarea
          id={notesId}
          rows={3}
          maxLength={DELIVERY_NOTES_MAX_LENGTH}
          value={values.deliveryNotes}
          onChange={(e) => onChange({ deliveryNotes: e.target.value })}
          aria-describedby={`${notesId}-count`}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p id={`${notesId}-count`} className="mt-1 text-right text-xs text-muted-foreground">
          {remaining} characters left
        </p>
      </div>
    </fieldset>
  );
}

function AddressTypeSelector({ values, errors, onChange }: { values: AddressFormValues; errors: FormErrors; onChange: (patch: Partial<AddressFormValues>) => void }) {
  const labelGroupId = useId();
  function togglePurpose(purpose: AddressPurpose) {
    const has = values.purposes.includes(purpose);
    onChange({ purposes: has ? values.purposes.filter((p) => p !== purpose) : [...values.purposes, purpose] });
  }
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-foreground">Label &amp; purpose</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {(Object.keys(ADDRESS_LABEL_CONFIG) as AddressLabel[]).map((label) => {
          const config = ADDRESS_LABEL_CONFIG[label];
          const Icon = config.icon;
          const active = values.label === label;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ label })}
              className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground hover:bg-accent'
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {config.title}
            </button>
          );
        })}
      </div>
      {values.label === 'other' && (
        <input
          value={values.customLabel}
          onChange={(e) => onChange({ customLabel: e.target.value })}
          placeholder="Custom label, e.g. Parents' house"
          className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      )}
      <p id={labelGroupId} className="mb-1.5 mt-4 text-xs font-medium text-muted-foreground">
        Use this address for
      </p>
      <div role="group" aria-labelledby={labelGroupId} className="flex flex-wrap gap-2">
        {(Object.keys(PURPOSE_CONFIG) as AddressPurpose[]).map((purpose) => {
          const config = PURPOSE_CONFIG[purpose];
          const Icon = config.icon;
          const active = values.purposes.includes(purpose);
          return (
            <button
              key={purpose}
              type="button"
              aria-pressed={active}
              onClick={() => togglePurpose(purpose)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground hover:bg-accent'
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {config.title}
            </button>
          );
        })}
      </div>
      {errors.purposes && <p className="mt-1 text-xs text-destructive">{errors.purposes}</p>}
    </fieldset>
  );
}

function DefaultAddressControl({ values, onChange }: { values: AddressFormValues; onChange: (patch: Partial<AddressFormValues>) => void }) {
  return (
    <fieldset className="space-y-2 rounded-md border border-border p-3">
      <legend className="px-1 text-sm font-semibold text-foreground">Defaults</legend>
      {values.purposes.includes('shipping') && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={values.setDefaultShipping} onChange={(e) => onChange({ setDefaultShipping: e.target.checked })} className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          Set as default shipping address
        </label>
      )}
      {values.purposes.includes('billing') && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={values.setDefaultBilling} onChange={(e) => onChange({ setDefaultBilling: e.target.checked })} className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          Set as default billing address
        </label>
      )}
    </fieldset>
  );
}

function AddressValidationStatus({ validation, duplicateStatus }: { validation: AddressValidationResult; duplicateStatus: DuplicateStatus }) {
  if (validation.state === 'not-validated' && duplicateStatus === 'none') return null;
  const config: Record<AddressValidationState, { tone: 'success' | 'warning' | 'info' | 'destructive' | 'neutral'; icon: typeof Info; text: string }> = {
    'not-validated': { tone: 'neutral', icon: Info, text: 'Not yet validated' },
    validating: { tone: 'info', icon: Loader2, text: 'Validating address…' },
    validated: { tone: 'success', icon: CheckCircle2, text: 'Address validated' },
    'needs-correction': { tone: 'warning', icon: AlertTriangle, text: validation.message ?? 'This address may need a correction.' },
    'suggested-address': { tone: 'info', icon: Info, text: validation.message ?? 'We found a standardized version of this address.' },
    'validation-failed': { tone: 'destructive', icon: AlertTriangle, text: validation.message ?? 'We could not verify this address.' },
  };
  const current = config[validation.state];
  const Icon = current.icon;
  return (
    <div aria-live="polite" className="space-y-2">
      {validation.state !== 'not-validated' && (
        <Badge tone={current.tone} icon={Icon}>
          {current.text}
        </Badge>
      )}
      {duplicateStatus !== 'none' && (
        <div role="status" className="rounded-md border border-warning/30 bg-warning/10 p-2.5 text-xs text-foreground">
          {duplicateStatus === 'duplicate-confirmed'
            ? 'This looks identical to an address you already saved.'
            : 'This address is similar to one you already saved. You can still continue if this is a different unit or recipient.'}
        </div>
      )}
    </div>
  );
}

interface AddressFormDialogProps {
  mode: 'add' | 'edit';
  address: Address | null;
  existingAddresses: Address[];
  onClose: () => void;
  onSaved: (address: Address, defaults: Array<{ purpose: AddressPurpose }>) => void;
}

function AddressFormDialog({ mode, address, existingAddresses, onClose, onSaved }: AddressFormDialogProps) {
  const titleId = useId();
  const [values, setValues] = useState<AddressFormValues>(() => (address ? addressToFormValues(address) : EMPTY_FORM_VALUES));
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>('idle');
  const [validation, setValidation] = useState<AddressValidationResult>(address?.validation ?? { state: 'not-validated' });
  const [eligibility, setEligibility] = useState<DeliveryEligibility>(address?.deliveryEligibility ?? { status: 'verification-required' });
  const [duplicateStatus, setDuplicateStatus] = useState<DuplicateStatus>('none');
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [dirty, setDirty] = useState(false);

  function handleChange(patch: Partial<AddressFormValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setStatus('dirty');
  }

  function requestClose() {
    if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validateAddressForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setStatus('invalid');
      return;
    }
    const duplicate = detectDuplicateAddress(existingAddresses, values, address?.id);
    setDuplicateStatus(duplicate);
    if (duplicate === 'duplicate-confirmed') return;

    setStatus('validating');
    setValidation({ state: 'validating' });
    const [validationResult, eligibilityResult] = await Promise.all([simulateValidateAddress(values), simulateDeliveryEligibility(values)]);
    setValidation(validationResult);
    setEligibility(eligibilityResult);

    if (validationResult.state === 'suggested-address') {
      setShowSuggestionDialog(true);
      setStatus('idle');
      return;
    }
    if (validationResult.state === 'validation-failed') {
      setStatus('save-error');
      return;
    }
    await persist(values, validationResult, eligibilityResult);
  }

  async function persist(finalValues: AddressFormValues, finalValidation: AddressValidationResult, finalEligibility: DeliveryEligibility) {
    setStatus('saving');
    await new Promise((resolve) => setTimeout(resolve, 500));
    const saved = formValuesToAddress(finalValues, address, finalValidation, finalEligibility);
    const defaults: Array<{ purpose: AddressPurpose }> = [];
    if (finalValues.setDefaultShipping) defaults.push({ purpose: 'shipping' });
    if (finalValues.setDefaultBilling) defaults.push({ purpose: 'billing' });
    setStatus('saved');
    onSaved(saved, defaults);
  }

  function acceptSuggestion() {
    const merged = { ...values, ...(validation.suggestedAddress?.postalCode ? { postalCode: validation.suggestedAddress.postalCode } : {}) };
    setValues(merged);
    setShowSuggestionDialog(false);
    void persist(merged, { state: 'validated', validatedAt: new Date().toISOString() }, eligibility);
  }

  function keepOriginal() {
    setShowSuggestionDialog(false);
    void persist(values, { state: 'validated', validatedAt: new Date().toISOString() }, eligibility);
  }

  return (
    <DialogShell titleId={titleId} onClose={requestClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            {mode === 'add' ? 'Add a new address' : 'Edit address'}
          </h2>
          <IconButton label="Close dialog" onClick={requestClose}>
            <X aria-hidden="true" className="h-5 w-5" />
          </IconButton>
        </div>

        <div className="space-y-6 px-5 py-5">
          <AddressTypeSelector values={values} errors={errors} onChange={handleChange} />
          <RecipientFields values={values} errors={errors} onChange={handleChange} />
          <ContactFields values={values} errors={errors} onChange={handleChange} />
          <LocationFields values={values} errors={errors} onChange={handleChange} />
          <DeliveryInstructionsFields values={values} onChange={handleChange} />
          <DefaultAddressControl values={values} onChange={handleChange} />
          <AddressValidationStatus validation={validation} duplicateStatus={duplicateStatus} />
          {status === 'save-error' && (
            <p role="alert" className="text-sm text-destructive">
              {validation.message ?? 'We could not save this address. Please review the highlighted fields.'}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" onClick={requestClose} className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Cancel
          </button>
          <button
            type="submit"
            disabled={status === 'validating' || status === 'saving'}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {(status === 'validating' || status === 'saving') && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {status === 'validating' ? 'Validating…' : status === 'saving' ? 'Saving…' : 'Save address'}
          </button>
        </div>
      </form>

      {showSuggestionDialog && (
        <AddressValidationDialog
          original={values}
          suggestion={validation.suggestedAddress ?? {}}
          onAccept={acceptSuggestion}
          onKeepOriginal={keepOriginal}
          onClose={() => setShowSuggestionDialog(false)}
        />
      )}
    </DialogShell>
  );
}

function AddressValidationDialog({
  original,
  suggestion,
  onAccept,
  onKeepOriginal,
  onClose,
}: {
  original: AddressFormValues;
  suggestion: Partial<GeoLocation>;
  onAccept: () => void;
  onKeepOriginal: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <DialogShell titleId={titleId} onClose={onClose} widthClassName="max-w-md">
      <div className="px-5 py-5">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          We standardized your address
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Review the suggested version before saving.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground">You entered</p>
            <p className="mt-1 text-sm text-foreground">{original.addressLine1}</p>
            <p className="text-sm text-foreground">{original.postalCode}</p>
          </div>
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary">Suggested</p>
            <p className="mt-1 text-sm text-foreground">{suggestion.addressLine1 ?? original.addressLine1}</p>
            <p className="text-sm text-foreground">{suggestion.postalCode ?? original.postalCode}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
        <button type="button" onClick={onKeepOriginal} className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Keep as entered
        </button>
        <button type="button" onClick={onAccept} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Use suggested address
        </button>
      </div>
    </DialogShell>
  );
}

function DeleteAddressDialog({
  address,
  isDefault,
  onCancel,
  onConfirm,
}: {
  address: Address;
  isDefault: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const titleId = useId();
  const [operation, setOperation] = useState<OperationState>({ status: 'idle' });

  async function handleConfirm() {
    setOperation({ status: 'loading' });
    try {
      await onConfirm();
      setOperation({ status: 'success' });
    } catch {
      setOperation({ status: 'error', message: 'We could not delete this address. Please try again.' });
    }
  }

  return (
    <DialogShell titleId={titleId} onClose={onCancel} widthClassName="max-w-md">
      <div className="px-5 py-5">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Delete this address?
        </h2>
        <div className="mt-3 rounded-md border border-border p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{addressLabelTitle(address)}</p>
          <p>{fullName(address.recipient)}</p>
          <p>{address.location.addressLine1}, {address.location.locality}</p>
        </div>
        {isDefault ? (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            This address is a default address. Choose another default before deleting it.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">This won't affect orders already placed with this address.</p>
        )}
        {operation.status === 'error' && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {operation.message}
          </p>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
        <button type="button" onClick={onCancel} className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isDefault || operation.status === 'loading'}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {operation.status === 'loading' && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
          Delete address
        </button>
      </div>
    </DialogShell>
  );
}

function SetDefaultAddressDialog({
  address,
  purpose,
  onCancel,
  onConfirm,
}: {
  address: Address;
  purpose: AddressPurpose;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const titleId = useId();
  const [operation, setOperation] = useState<OperationState>({ status: 'idle' });

  async function handleConfirm() {
    setOperation({ status: 'loading' });
    try {
      await onConfirm();
      setOperation({ status: 'success' });
    } catch {
      setOperation({ status: 'error', message: 'We could not update your default address. Please try again.' });
    }
  }

  return (
    <DialogShell titleId={titleId} onClose={onCancel} widthClassName="max-w-md">
      <div className="px-5 py-5">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Set as default {PURPOSE_CONFIG[purpose].title.toLowerCase()} address?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {fullName(address.recipient)} · {address.location.addressLine1}, {address.location.locality} will be used automatically for {PURPOSE_CONFIG[purpose].title.toLowerCase()} going forward.
        </p>
        {operation.status === 'error' && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {operation.message}
          </p>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
        <button type="button" onClick={onCancel} className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={operation.status === 'loading'}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {operation.status === 'loading' && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
          Confirm default
        </button>
      </div>
    </DialogShell>
  );
}

function DeliveryCoverageDialog({ addresses, onClose }: { addresses: Address[]; onClose: () => void }) {
  const titleId = useId();
  return (
    <DialogShell titleId={titleId} onClose={onClose} widthClassName="max-w-xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Delivery coverage by address
        </h2>
        <IconButton label="Close dialog" onClick={onClose}>
          <X aria-hidden="true" className="h-5 w-5" />
        </IconButton>
      </div>
      <ul className="divide-y divide-border">
        {addresses.map((address) => {
          const config = DELIVERY_ELIGIBILITY_CONFIG[address.deliveryEligibility.status];
          const Icon = config.icon;
          return (
            <li key={address.id} className="flex items-start justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{addressLabelTitle(address)} · {address.location.locality}</p>
                <p className="text-xs text-muted-foreground">
                  {address.deliveryEligibility.availableMethods?.join(', ') ?? 'No methods available yet'}
                </p>
              </div>
              <Badge tone={config.tone} icon={Icon}>
                {config.title}
              </Badge>
            </li>
          );
        })}
      </ul>
    </DialogShell>
  );
}

/* =================================================================================================
 * [PAGE]
 * ================================================================================================= */

type DialogState =
  | { type: 'none' }
  | { type: 'form'; mode: 'add' | 'edit'; address: Address | null }
  | { type: 'delete'; address: Address }
  | { type: 'set-default'; address: Address; purpose: AddressPurpose }
  | { type: 'coverage' };

function AddressWorkspace() {
  const dispatch = useAppDispatch();
  const addresses = useAppSelector(selectFilteredSortedAddresses);
  const allAddresses = useAppSelector(selectAllAddresses);
  const defaultAddressIds = useAppSelector(selectDefaultAddressIds);
  const selectedAddressId = useAppSelector(selectSelectedAddressId);
  const { search, filter, sort, loadStatus, loadError } = useAppSelector(selectAddressState);

  const [density, setDensity] = useState<ViewDensity>('comfortable');
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  const isDefaultAddress = useCallback((id: string) => Object.values(defaultAddressIds).includes(id), [defaultAddressIds]);

  function handleSaved(address: Address, defaults: Array<{ purpose: AddressPurpose }>) {
    if (dialog.type === 'form' && dialog.mode === 'edit') {
      dispatch(addressUpdated(address));
    } else {
      dispatch(addressAdded(address));
    }
    defaults.forEach(({ purpose }) => dispatch(defaultAddressSet({ purpose, id: address.id })));
    setDialog({ type: 'none' });
  }

  async function handleDeleteConfirm(address: Address) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    dispatch(addressRemoved({ id: address.id }));
    setDialog({ type: 'none' });
  }

  async function handleSetDefaultConfirm(address: Address, purpose: AddressPurpose) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    dispatch(defaultAddressSet({ purpose, id: address.id }));
    setDialog({ type: 'none' });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
      <AddressSidebar />
      <main aria-label="Address management" className="flex min-w-0 flex-1 flex-col gap-5">
        <AddressHeader addressCount={allAddresses.length} onAddAddress={() => setDialog({ type: 'form', mode: 'add', address: null })} />

        {loadStatus === 'loading' ? (
          <AddressLoadingState />
        ) : loadStatus === 'error' ? (
          <AddressErrorState message={loadError ?? 'Something went wrong on our end.'} onRetry={() => undefined} />
        ) : allAddresses.length === 0 ? (
          <EmptyAddressState onAddAddress={() => setDialog({ type: 'form', mode: 'add', address: null })} />
        ) : (
          <>
            <AddressOverview addresses={allAddresses} defaultAddressIds={defaultAddressIds} onViewCoverage={() => setDialog({ type: 'coverage' })} />
            <AddressToolbar
              search={search}
              filter={filter}
              sort={sort}
              density={density}
              onSearchChange={(v) => dispatch(searchChanged(v))}
              onFilterChange={(v) => dispatch(filterChanged(v))}
              onSortChange={(v) => dispatch(sortChanged(v))}
              onDensityChange={setDensity}
            />
            {addresses.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No addresses match your search or filters.
              </p>
            ) : (
              <AddressList
                addresses={addresses}
                selectedAddressId={selectedAddressId}
                defaultAddressIds={defaultAddressIds}
                density={density}
                onEdit={(address) => setDialog({ type: 'form', mode: 'edit', address })}
                onDelete={(address) => setDialog({ type: 'delete', address })}
                onSetDefault={(address, purpose) => setDialog({ type: 'set-default', address, purpose })}
                onSelect={(address) => dispatch(selectedAddressChanged(address.id))}
              />
            )}
          </>
        )}

        <AddressPolicySection />
        <TrustSection />
      </main>

      {dialog.type === 'form' && (
        <AddressFormDialog
          mode={dialog.mode}
          address={dialog.address}
          existingAddresses={allAddresses}
          onClose={() => setDialog({ type: 'none' })}
          onSaved={handleSaved}
        />
      )}
      {dialog.type === 'delete' && (
        <DeleteAddressDialog
          address={dialog.address}
          isDefault={isDefaultAddress(dialog.address.id)}
          onCancel={() => setDialog({ type: 'none' })}
          onConfirm={() => handleDeleteConfirm(dialog.address)}
        />
      )}
      {dialog.type === 'set-default' && (
        <SetDefaultAddressDialog
          address={dialog.address}
          purpose={dialog.purpose}
          onCancel={() => setDialog({ type: 'none' })}
          onConfirm={() => handleSetDefaultConfirm(dialog.address, dialog.purpose)}
        />
      )}
      {dialog.type === 'coverage' && <DeliveryCoverageDialog addresses={allAddresses} onClose={() => setDialog({ type: 'none' })} />}
    </div>
  );
}

function AddressPageContent() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <EcommerceHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
      <MobileAccountDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <Breadcrumbs />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <AddressWorkspace />
      </div>
      <EcommerceFooter />
    </div>
  );
}

export default function AddressPage() {
  return (
    <Provider store={store}>
      <AddressPageContent />
    </Provider>
  );
}