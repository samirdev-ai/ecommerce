"use client";

/**
 * ProfilePage.tsx
 * ---------------------------------------------------------------------------
 * Personal identity & profile-management workspace for a global ecommerce
 * platform. This screen is intentionally scoped to *identity* concerns
 * (who the customer is, how they can be reached, how they want to be
 * treated) and does not duplicate the Account dashboard (orders, payments,
 * addresses, returns, support).
 *
 * File organization:
 *   1. Imports
 *   2. Types
 *   3. Enums / unions
 *   4. Constants
 *   5. Mock data
 *   6. Redux Toolkit state (slice, store, typed hooks, selectors)
 *   7. Formatting / validation utilities
 *   8. Small purposeful components
 *   9. Profile domain components
 *  10. Layout components
 *  11. ProfilePage (default export)
 * ---------------------------------------------------------------------------
 */

/* ========================================================================
 * 1. IMPORTS
 * ===================================================================== */

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Provider, useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import { configureStore, createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  Accessibility,
  AlertTriangle,
  Award,
  BadgeCheck,
  Bell,
  BellRing,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Crown,
  Download,
  Gift,
  Globe,
  Heart,
  History,
  Info,
  KeyRound,
  LayoutGrid,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Menu,
  Pencil,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  Trash2,
  TrendingUp,
  User,
  UserX,
  X,
  type LucideIcon,
} from "lucide-react";

/* ========================================================================
 * 2. TYPES
 * ===================================================================== */

interface PersonalInformation {
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string;
  preferredName: string | null;
  dateOfBirth: string;
  genderPreference: GenderPreference;
  occupation: string | null;
  countryOfResidence: RegionCode;
}

interface ContactChannelState {
  value: string;
  verification: VerificationState;
  verificationRequestedAt: string | null;
}

interface ContactInformation {
  email: ContactChannelState;
  phone: ContactChannelState;
}

interface AccessibilityPreferences {
  reducedMotion: boolean;
  largerText: boolean;
  highContrast: boolean;
}

interface RegionalPreferences {
  language: LanguageCode;
  region: RegionCode;
  currency: CurrencyCode;
  timezone: TimezoneId;
  measurementSystem: MeasurementSystem;
  accessibility: AccessibilityPreferences;
}

interface ShoppingPreferences {
  preferredCategories: ShoppingCategory[];
  preferredBrands: string[];
  clothingSize: string | null;
  shoeSize: string | null;
  personalizationEnabled: boolean;
}

interface CommunicationPreferenceEntry {
  category: CommunicationCategory;
  label: string;
  description: string;
  isTransactional: boolean;
  channels: Record<CommunicationChannel, boolean>;
}

interface PrivacyPreferences {
  profileVisibility: ProfileVisibility;
  personalizationEnabled: boolean;
  recommendationUsage: boolean;
  marketingPersonalization: boolean;
  analyticsDataUsage: boolean;
}

interface SecuritySummary {
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  activeSessionCount: number;
  lastPasswordChangeAt: string | null;
  passwordStrengthStatus: "strong" | "moderate" | "weak" | "unknown";
}

interface MembershipBenefit {
  id: string;
  label: string;
}

interface MembershipSummary {
  tier: MembershipTier;
  memberSinceAt: string;
  renewalAt: string | null;
  rewardPoints: number;
  tierProgressPercent: number;
  nextTier: MembershipTier | null;
  benefits: MembershipBenefit[];
}

interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  description: string;
  occurredAt: string;
}

interface DataExportRequest {
  status: DataExportStatus;
  requestedAt: string | null;
  readyAt: string | null;
  expiresAt: string | null;
}

interface ProfileNavigationItem {
  id: ProfileSectionId;
  label: string;
  icon: LucideIcon;
}

interface ProfileUiState {
  sectionErrors: Partial<Record<ProfileSectionId, string>>;
  avatarUrl: string | null;
}

interface ProfileState {
  identity: PersonalInformation;
  contact: ContactInformation;
  preferences: RegionalPreferences;
  shoppingPreferences: ShoppingPreferences;
  communicationPreferences: CommunicationPreferenceEntry[];
  privacy: PrivacyPreferences;
  security: SecuritySummary;
  membership: MembershipSummary;
  activity: ActivityEvent[];
  dataExport: DataExportRequest;
  navigation: { activeSectionId: ProfileSectionId };
  ui: ProfileUiState;
}

interface ProfileCompletionItem {
  label: string;
  complete: boolean;
  tier: "required" | "recommended" | "optional";
}

interface FieldErrors {
  [field: string]: string | undefined;
}

/* ========================================================================
 * 3. ENUMS / UNIONS
 * ===================================================================== */

type LanguageCode = "en-US" | "en-GB" | "ne-NP" | "hi-IN" | "ja-JP" | "de-DE";
type RegionCode = "US" | "GB" | "NP" | "IN" | "JP" | "DE";
type CurrencyCode = "USD" | "GBP" | "NPR" | "INR" | "JPY" | "EUR";
type TimezoneId =
  | "America/New_York"
  | "Europe/London"
  | "Asia/Kathmandu"
  | "Asia/Kolkata"
  | "Asia/Tokyo"
  | "Europe/Berlin";
type MeasurementSystem = "metric" | "imperial";
type GenderPreference = "female" | "male" | "non-binary" | "self-described" | "prefer-not-to-say";
type VerificationState = "verified" | "unverified" | "pending" | "failed";
type MembershipTier = "silver" | "gold" | "platinum" | "diamond";
type DataExportStatus = "idle" | "preparing" | "ready" | "expired" | "failed";
type FormStatus = "idle" | "editing" | "dirty" | "saving" | "saved" | "validationError" | "saveError";
type ProfileVisibility = "private" | "limitedRecommendations" | "public";
type ShoppingCategory =
  | "Electronics"
  | "Fashion"
  | "Home & Kitchen"
  | "Beauty"
  | "Sports & Outdoors"
  | "Books"
  | "Toys & Kids"
  | "Automotive";
type CommunicationChannel = "email" | "sms" | "push" | "inApp";
type CommunicationCategory =
  | "orderUpdates"
  | "deliveryUpdates"
  | "returnsAndRefunds"
  | "securityAlerts"
  | "accountActivity"
  | "productRecommendations"
  | "priceAlerts"
  | "promotions"
  | "newsletters"
  | "membershipUpdates";
type ActivityEventType =
  | "profileUpdated"
  | "emailVerified"
  | "phoneVerified"
  | "passwordChanged"
  | "securitySettingsChanged"
  | "preferencesUpdated"
  | "loginSucceeded";
type ProfileSectionId =
  | "overview"
  | "personal"
  | "contact"
  | "preferences"
  | "shopping"
  | "communication"
  | "privacy"
  | "security"
  | "membership"
  | "activity"
  | "dangerZone";
type AvatarStatus = "idle" | "uploading" | "error";

/* ========================================================================
 * 4. CONSTANTS
 * ===================================================================== */

const BRAND_NAME = "Verve Market";

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  "en-US": "English (United States)",
  "en-GB": "English (United Kingdom)",
  "ne-NP": "Nepali (नेपाली)",
  "hi-IN": "Hindi (हिन्दी)",
  "ja-JP": "Japanese (日本語)",
  "de-DE": "German (Deutsch)",
};

const REGION_LABELS: Record<RegionCode, string> = {
  US: "United States",
  GB: "United Kingdom",
  NP: "Nepal",
  IN: "India",
  JP: "Japan",
  DE: "Germany",
};

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: "US Dollar (USD)",
  GBP: "British Pound (GBP)",
  NPR: "Nepalese Rupee (NPR)",
  INR: "Indian Rupee (INR)",
  JPY: "Japanese Yen (JPY)",
  EUR: "Euro (EUR)",
};

const TIMEZONE_LABELS: Record<TimezoneId, string> = {
  "America/New_York": "Eastern Time — New York",
  "Europe/London": "Greenwich Mean Time — London",
  "Asia/Kathmandu": "Nepal Time — Kathmandu",
  "Asia/Kolkata": "India Standard Time — Kolkata",
  "Asia/Tokyo": "Japan Standard Time — Tokyo",
  "Europe/Berlin": "Central European Time — Berlin",
};

const GENDER_LABELS: Record<GenderPreference, string> = {
  female: "Female",
  male: "Male",
  "non-binary": "Non-binary",
  "self-described": "Self-described",
  "prefer-not-to-say": "Prefer not to say",
};

const SHOPPING_CATEGORIES: ShoppingCategory[] = [
  "Electronics",
  "Fashion",
  "Home & Kitchen",
  "Beauty",
  "Sports & Outdoors",
  "Books",
  "Toys & Kids",
  "Automotive",
];

const COMMUNICATION_CHANNEL_LABELS: Record<CommunicationChannel, { label: string; icon: LucideIcon }> = {
  email: { label: "Email", icon: Mail },
  sms: { label: "SMS", icon: Smartphone },
  push: { label: "Push", icon: BellRing },
  inApp: { label: "In-app", icon: Bell },
};

const PROFILE_NAVIGATION_ITEMS: ProfileNavigationItem[] = [
  { id: "overview", label: "Profile Overview", icon: LayoutGrid },
  { id: "personal", label: "Personal Information", icon: User },
  { id: "contact", label: "Contact Information", icon: Mail },
  { id: "preferences", label: "Preferences", icon: Settings2 },
  { id: "shopping", label: "Shopping Preferences", icon: ShoppingBag },
  { id: "communication", label: "Communication", icon: BellRing },
  { id: "privacy", label: "Privacy", icon: Lock },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "membership", label: "Membership", icon: Award },
];

const MEMBERSHIP_TIER_LABELS: Record<MembershipTier, string> = {
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
};

const CATEGORY_NAV_LINKS = ["Electronics", "Fashion", "Home & Kitchen", "Beauty", "Sports", "Deals"];

/* ========================================================================
 * 5. MOCK DATA
 * ===================================================================== */

const MOCK_IDENTITY: PersonalInformation = {
  firstName: "Priya",
  middleName: null,
  lastName: "Bhandari",
  displayName: "Priya Bhandari",
  preferredName: "Priya",
  dateOfBirth: "1994-03-18",
  genderPreference: "female",
  occupation: "Product Designer",
  countryOfResidence: "NP",
};

const MOCK_CONTACT: ContactInformation = {
  email: { value: "priya.bhandari@fastmail.com", verification: "verified", verificationRequestedAt: null },
  phone: { value: "+977 9803312381", verification: "verified", verificationRequestedAt: null },
};

const MOCK_PREFERENCES: RegionalPreferences = {
  language: "en-US",
  region: "NP",
  currency: "NPR",
  timezone: "Asia/Kathmandu",
  measurementSystem: "metric",
  accessibility: { reducedMotion: false, largerText: false, highContrast: false },
};

const MOCK_SHOPPING_PREFERENCES: ShoppingPreferences = {
  preferredCategories: ["Electronics", "Fashion", "Home & Kitchen"],
  preferredBrands: ["Sony", "Uniqlo", "IKEA"],
  clothingSize: "M",
  shoeSize: "EU 39",
  personalizationEnabled: true,
};

const MOCK_COMMUNICATION_PREFERENCES: CommunicationPreferenceEntry[] = [
  {
    category: "orderUpdates",
    label: "Order updates",
    description: "Confirmations, status changes, and cancellations for your orders.",
    isTransactional: true,
    channels: { email: true, sms: true, push: true, inApp: true },
  },
  {
    category: "deliveryUpdates",
    label: "Delivery updates",
    description: "Dispatch, out-for-delivery, and delivered notifications.",
    isTransactional: true,
    channels: { email: true, sms: true, push: true, inApp: true },
  },
  {
    category: "returnsAndRefunds",
    label: "Returns & refunds",
    description: "Progress on return requests and refund confirmations.",
    isTransactional: true,
    channels: { email: true, sms: false, push: true, inApp: true },
  },
  {
    category: "securityAlerts",
    label: "Security alerts",
    description: "Sign-ins from new devices and changes to your login credentials.",
    isTransactional: true,
    channels: { email: true, sms: true, push: true, inApp: true },
  },
  {
    category: "accountActivity",
    label: "Account activity",
    description: "Summaries of changes made to your account and profile.",
    isTransactional: true,
    channels: { email: true, sms: false, push: false, inApp: true },
  },
  {
    category: "productRecommendations",
    label: "Product recommendations",
    description: "Suggestions based on your browsing and purchase history.",
    isTransactional: false,
    channels: { email: true, sms: false, push: false, inApp: true },
  },
  {
    category: "priceAlerts",
    label: "Price-drop alerts",
    description: "Notify me when items on my wishlist drop in price.",
    isTransactional: false,
    channels: { email: true, sms: false, push: true, inApp: false },
  },
  {
    category: "promotions",
    label: "Promotions & offers",
    description: "Sales, coupons, and limited-time offers.",
    isTransactional: false,
    channels: { email: false, sms: false, push: false, inApp: true },
  },
  {
    category: "newsletters",
    label: "Newsletters",
    description: "Editorial roundups, buying guides, and seasonal lookbooks.",
    isTransactional: false,
    channels: { email: false, sms: false, push: false, inApp: false },
  },
  {
    category: "membershipUpdates",
    label: "Membership updates",
    description: "Changes to your tier, points balance, and renewal reminders.",
    isTransactional: false,
    channels: { email: true, sms: false, push: false, inApp: true },
  },
];

const MOCK_PRIVACY: PrivacyPreferences = {
  profileVisibility: "limitedRecommendations",
  personalizationEnabled: true,
  recommendationUsage: true,
  marketingPersonalization: false,
  analyticsDataUsage: true,
};

const MOCK_SECURITY: SecuritySummary = {
  emailVerified: true,
  phoneVerified: true,
  twoFactorEnabled: true,
  activeSessionCount: 3,
  lastPasswordChangeAt: "2026-06-02T09:15:00.000Z",
  passwordStrengthStatus: "strong",
};

const MOCK_MEMBERSHIP: MembershipSummary = {
  tier: "gold",
  memberSinceAt: "2021-11-04T00:00:00.000Z",
  renewalAt: "2027-11-04T00:00:00.000Z",
  rewardPoints: 4280,
  tierProgressPercent: 64,
  nextTier: "platinum",
  benefits: [
    { id: "shipping", label: "Free expedited shipping on eligible orders" },
    { id: "early-access", label: "Early access to seasonal sales" },
    { id: "returns", label: "Extended 60-day return window" },
    { id: "birthday", label: "Birthday reward credit" },
  ],
};

const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: "act-1", type: "profileUpdated", description: "Profile photo updated", occurredAt: "2026-09-13T10:42:00.000Z" },
  { id: "act-2", type: "emailVerified", description: "Email address verified", occurredAt: "2026-09-12T18:18:00.000Z" },
  { id: "act-3", type: "securitySettingsChanged", description: "Two-factor authentication enabled", occurredAt: "2026-09-08T08:03:00.000Z" },
  { id: "act-4", type: "preferencesUpdated", description: "Communication preferences updated", occurredAt: "2026-08-29T14:51:00.000Z" },
  { id: "act-5", type: "passwordChanged", description: "Password changed", occurredAt: "2026-06-02T09:15:00.000Z" },
  { id: "act-6", type: "loginSucceeded", description: "Signed in from a new device — Kathmandu, NP", occurredAt: "2026-05-27T07:40:00.000Z" },
];

const MOCK_DATA_EXPORT: DataExportRequest = {
  status: "idle",
  requestedAt: null,
  readyAt: null,
  expiresAt: null,
};

const INITIAL_PROFILE_STATE: ProfileState = {
  identity: MOCK_IDENTITY,
  contact: MOCK_CONTACT,
  preferences: MOCK_PREFERENCES,
  shoppingPreferences: MOCK_SHOPPING_PREFERENCES,
  communicationPreferences: MOCK_COMMUNICATION_PREFERENCES,
  privacy: MOCK_PRIVACY,
  security: MOCK_SECURITY,
  membership: MOCK_MEMBERSHIP,
  activity: MOCK_ACTIVITY,
  dataExport: MOCK_DATA_EXPORT,
  navigation: { activeSectionId: "overview" },
  ui: { sectionErrors: {}, avatarUrl: null },
};

/* ========================================================================
 * 6. REDUX TOOLKIT STATE
 * ===================================================================== */

const profileSlice = createSlice({
  name: "profile",
  initialState: INITIAL_PROFILE_STATE,
  reducers: {
    setActiveSection(state, action: PayloadAction<ProfileSectionId>) {
      state.navigation.activeSectionId = action.payload;
    },
    personalInformationSaved(state, action: PayloadAction<PersonalInformation>) {
      state.identity = action.payload;
      state.activity.unshift({
        id: `act-${Date.now()}`,
        type: "profileUpdated",
        description: "Personal information updated",
        occurredAt: new Date().toISOString(),
      });
    },
    contactValueChanged(state, action: PayloadAction<{ channel: "email" | "phone"; value: string }>) {
      const { channel, value } = action.payload;
      state.contact[channel].value = value;
      state.contact[channel].verification = "unverified";
      state.contact[channel].verificationRequestedAt = null;
      state.activity.unshift({
        id: `act-${Date.now()}`,
        type: "profileUpdated",
        description: channel === "email" ? "Email address changed" : "Phone number changed",
        occurredAt: new Date().toISOString(),
      });
    },
    contactVerificationRequested(state, action: PayloadAction<"email" | "phone">) {
      state.contact[action.payload].verification = "pending";
      state.contact[action.payload].verificationRequestedAt = new Date().toISOString();
    },
    contactVerificationSucceeded(state, action: PayloadAction<"email" | "phone">) {
      state.contact[action.payload].verification = "verified";
      state.activity.unshift({
        id: `act-${Date.now()}`,
        type: action.payload === "email" ? "emailVerified" : "phoneVerified",
        description: action.payload === "email" ? "Email address verified" : "Phone number verified",
        occurredAt: new Date().toISOString(),
      });
    },
    regionalPreferencesUpdated(state, action: PayloadAction<Partial<RegionalPreferences>>) {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    accessibilityPreferenceToggled(state, action: PayloadAction<keyof AccessibilityPreferences>) {
      const key = action.payload;
      state.preferences.accessibility[key] = !state.preferences.accessibility[key];
    },
    shoppingCategoryToggled(state, action: PayloadAction<ShoppingCategory>) {
      const category = action.payload;
      const current = state.shoppingPreferences.preferredCategories;
      state.shoppingPreferences.preferredCategories = current.includes(category)
        ? current.filter((entry) => entry !== category)
        : [...current, category];
    },
    shoppingBrandRemoved(state, action: PayloadAction<string>) {
      state.shoppingPreferences.preferredBrands = state.shoppingPreferences.preferredBrands.filter(
        (brand) => brand !== action.payload,
      );
    },
    shoppingPersonalizationToggled(state) {
      state.shoppingPreferences.personalizationEnabled = !state.shoppingPreferences.personalizationEnabled;
    },
    communicationChannelToggled(
      state,
      action: PayloadAction<{ category: CommunicationCategory; channel: CommunicationChannel }>,
    ) {
      const entry = state.communicationPreferences.find((item) => item.category === action.payload.category);
      if (entry) {
        entry.channels[action.payload.channel] = !entry.channels[action.payload.channel];
      }
    },
    privacySettingUpdated(state, action: PayloadAction<Partial<PrivacyPreferences>>) {
      state.privacy = { ...state.privacy, ...action.payload };
    },
    dataExportRequested(state) {
      state.dataExport = { status: "preparing", requestedAt: new Date().toISOString(), readyAt: null, expiresAt: null };
    },
    dataExportReady(state) {
      const now = Date.now();
      state.dataExport.status = "ready";
      state.dataExport.readyAt = new Date(now).toISOString();
      state.dataExport.expiresAt = new Date(now + 1000 * 60 * 60 * 24 * 7).toISOString();
    },
    avatarUpdated(state, action: PayloadAction<string | null>) {
      state.ui.avatarUrl = action.payload;
      state.activity.unshift({
        id: `act-${Date.now()}`,
        type: "profileUpdated",
        description: action.payload ? "Profile photo updated" : "Profile photo removed",
        occurredAt: new Date().toISOString(),
      });
    },
  },
});

const {
  setActiveSection,
  personalInformationSaved,
  contactValueChanged,
  contactVerificationRequested,
  contactVerificationSucceeded,
  regionalPreferencesUpdated,
  accessibilityPreferenceToggled,
  shoppingCategoryToggled,
  shoppingBrandRemoved,
  shoppingPersonalizationToggled,
  communicationChannelToggled,
  privacySettingUpdated,
  dataExportRequested,
  dataExportReady,
  avatarUpdated,
} = profileSlice.actions;

const profileStore = configureStore({
  reducer: { profile: profileSlice.reducer },
});

type RootState = ReturnType<typeof profileStore.getState>;
type AppDispatch = typeof profileStore.dispatch;

const useAppDispatch: () => AppDispatch = useDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

const selectIdentity = (state: RootState): PersonalInformation => state.profile.identity;
const selectContact = (state: RootState): ContactInformation => state.profile.contact;
const selectPreferences = (state: RootState): RegionalPreferences => state.profile.preferences;
const selectShoppingPreferences = (state: RootState): ShoppingPreferences => state.profile.shoppingPreferences;
const selectCommunicationPreferences = (state: RootState): CommunicationPreferenceEntry[] =>
  state.profile.communicationPreferences;
const selectPrivacy = (state: RootState): PrivacyPreferences => state.profile.privacy;
const selectSecurity = (state: RootState): SecuritySummary => state.profile.security;
const selectMembership = (state: RootState): MembershipSummary => state.profile.membership;
const selectActivity = (state: RootState): ActivityEvent[] => state.profile.activity;
const selectDataExport = (state: RootState): DataExportRequest => state.profile.dataExport;
const selectActiveSection = (state: RootState): ProfileSectionId => state.profile.navigation.activeSectionId;
const selectAvatarUrl = (state: RootState): string | null => state.profile.ui.avatarUrl;

const selectProfileCompletion = createSelector(
  [selectIdentity, selectContact, selectSecurity, selectShoppingPreferences, selectAvatarUrl],
  (identity, contact, security, shopping, avatarUrl) => {
    const items: ProfileCompletionItem[] = [
      { label: "Basic information", complete: Boolean(identity.firstName && identity.lastName), tier: "required" },
      { label: "Email verified", complete: contact.email.verification === "verified", tier: "required" },
      { label: "Phone verified", complete: contact.phone.verification === "verified", tier: "required" },
      { label: "Profile photo added", complete: avatarUrl !== null, tier: "recommended" },
      { label: "Two-factor authentication enabled", complete: security.twoFactorEnabled, tier: "recommended" },
      { label: "Shopping preferences added", complete: shopping.preferredCategories.length > 0, tier: "optional" },
    ];
    const percent = Math.round((items.filter((item) => item.complete).length / items.length) * 100);
    return { items, percent };
  },
);

/* ========================================================================
 * 7. FORMATTING / VALIDATION UTILITIES
 * ===================================================================== */

function maskPhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/[^\d+]/g, "");
  const countryMatch = digitsOnly.match(/^\+\d{1,3}/);
  const countryCode = countryMatch ? countryMatch[0] : "";
  const rest = digitsOnly.slice(countryCode.length);
  if (rest.length <= 4) return `${countryCode} ${rest}`;
  const visibleTail = rest.slice(-3);
  const maskedLength = Math.min(rest.length - 3, 6);
  return `${countryCode} ${"•".repeat(maskedLength)}${visibleTail}`;
}

function formatRelativeDateTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const isSameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  if (isSameDay) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function formatMemberSince(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(iso));
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

function validatePersonalInformation(values: PersonalInformation): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.firstName.trim()) errors.firstName = "First name is required.";
  if (!values.lastName.trim()) errors.lastName = "Last name is required.";
  if (!values.displayName.trim()) errors.displayName = "Display name is required.";
  if (!values.dateOfBirth) {
    errors.dateOfBirth = "Date of birth is required.";
  } else {
    const parsed = new Date(values.dateOfBirth);
    if (Number.isNaN(parsed.getTime())) {
      errors.dateOfBirth = "Enter a valid date.";
    } else if (parsed.getTime() > Date.now()) {
      errors.dateOfBirth = "Date of birth cannot be in the future.";
    } else if (calculateAge(values.dateOfBirth) < 13) {
      errors.dateOfBirth = "You must be at least 13 years old.";
    }
  }
  return errors;
}

function validateEmailValue(value: string): string | undefined {
  if (!value.trim()) return "Email address is required.";
  if (!EMAIL_PATTERN.test(value)) return "Enter a valid email address.";
  return undefined;
}

function validatePhoneValue(value: string): string | undefined {
  if (!value.trim()) return "Phone number is required.";
  if (!PHONE_PATTERN.test(value.replace(/[\s-]/g, ""))) return "Enter a valid phone number, e.g. +9779803312381.";
  return undefined;
}

/* ========================================================================
 * 8. SMALL PURPOSEFUL COMPONENTS
 * ===================================================================== */

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  neutral: "bg-muted text-muted-foreground",
};

function StatusPill({ label, tone, icon: Icon }: { label: string; tone: StatusTone; icon: LucideIcon }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE_CLASSES[tone]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">{percent}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-destructive">
      {message}
    </p>
  );
}

function ToggleSwitch({
  id,
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="mt-0.5 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-card shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function ProfileSection({
  id,
  title,
  description,
  actions,
  children,
}: {
  id: ProfileSectionId;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-24 rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id={headingId} className="text-lg font-semibold text-card-foreground">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  tone = "default",
  isOpen,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "destructive";
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
        className="fixed inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-sm rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-lg"
      >
        <h3 id={titleId} className="text-base font-semibold">
          {title}
        </h3>
        <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-3.5 py-2 text-sm font-medium ${
              tone === "destructive"
                ? "bg-destructive text-destructive-foreground hover:opacity-90"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================
 * 9. PROFILE DOMAIN COMPONENTS
 * ===================================================================== */

function ProfileAvatar({
  avatarUrl,
  displayName,
  onChangePhoto,
  onRemovePhoto,
}: {
  avatarUrl: string | null;
  displayName: string;
  onChangePhoto: (url: string) => void;
  onRemovePhoto: () => void;
}) {
  const [status, setStatus] = useState<AvatarStatus>("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleFileSelected(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("error");
      return;
    }
    setStatus("uploading");
    const objectUrl = URL.createObjectURL(file);
    // In production this uploads to object storage / CDN and the resulting
    // asset URL is written back to profile state — no fake upload pipeline
    // is simulated here beyond a local object URL preview.
    onChangePhoto(objectUrl);
    setStatus("idle");
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:items-start">
      <div className="relative h-24 w-24 shrink-0">
        <div className="h-24 w-24 overflow-hidden rounded-full border border-border bg-secondary">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={`${displayName}'s profile photo`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-secondary-foreground" aria-hidden="true">
              {initials}
            </div>
          )}
        </div>
        {status === "uploading" ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40">
            <Loader2 className="h-5 w-5 animate-spin text-background" aria-hidden="true" />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Change profile photo"
          className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm hover:bg-muted"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelected} className="sr-only" aria-hidden="true" tabIndex={-1} />
      </div>
      {status === "error" ? <p className="text-xs text-destructive">Choose an image file to update your photo.</p> : null}
      <div className="flex gap-3 text-sm">
        <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-primary hover:underline">
          Change photo
        </button>
        {avatarUrl ? (
          <button type="button" onClick={onRemovePhoto} className="font-medium text-muted-foreground hover:underline">
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ProfileIdentityCard({
  identity,
  membership,
  avatarUrl,
}: {
  identity: PersonalInformation;
  membership: MembershipSummary;
  avatarUrl: string | null;
}) {
  const initials = identity.displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-3 border-b border-border pb-4">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-secondary-foreground" aria-hidden="true">
            {initials}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{identity.displayName}</p>
        <p className="text-xs text-muted-foreground">{MEMBERSHIP_TIER_LABELS[membership.tier]} Member</p>
      </div>
    </div>
  );
}

function ProfileCompletionCard({ items, percent }: { items: ProfileCompletionItem[]; percent: number }) {
  return (
    <div className="border-b border-border py-4">
      <ProgressBar percent={percent} label="Profile completion" />
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            {item.complete ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className={item.complete ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
            {item.tier !== "required" ? (
              <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {item.tier}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileNavigation({ activeSectionId, onSelect }: { activeSectionId: ProfileSectionId; onSelect: (id: ProfileSectionId) => void }) {
  return (
    <nav aria-label="Profile sections" className="py-2">
      <ul className="space-y-0.5">
        {PROFILE_NAVIGATION_ITEMS.map((item) => {
          const isActive = item.id === activeSectionId;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(item.id)}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 space-y-0.5 border-t border-border pt-2">
        <a href="#dangerZone" onClick={() => onSelect("dangerZone")} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
          <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
          Export Personal Data
        </a>
        <button type="button" className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted">
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </nav>
  );
}

function ProfileHero({
  identity,
  contact,
  membership,
  completionPercent,
  avatarUrl,
  onChangePhoto,
  onRemovePhoto,
  onEditProfile,
}: {
  identity: PersonalInformation;
  contact: ContactInformation;
  membership: MembershipSummary;
  completionPercent: number;
  avatarUrl: string | null;
  onChangePhoto: (url: string) => void;
  onRemovePhoto: () => void;
  onEditProfile: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ProfileAvatar avatarUrl={avatarUrl} displayName={identity.displayName} onChangePhoto={onChangePhoto} onRemovePhoto={onRemovePhoto} />
          <div className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-xl font-semibold text-card-foreground">{identity.displayName}</h1>
              {contact.email.verification === "verified" ? <StatusPill label="Verified" tone="success" icon={BadgeCheck} /> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{contact.email.value}</p>
            <p className="text-sm text-muted-foreground">{maskPhoneNumber(contact.phone.value)}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground sm:justify-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">
                <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                {MEMBERSHIP_TIER_LABELS[membership.tier]} member
              </span>
              <span>Member since {formatMemberSince(membership.memberSinceAt)}</span>
            </div>
          </div>
        </div>
        <div className="w-full shrink-0 sm:w-56">
          <ProgressBar percent={completionPercent} label="Profile completion" />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        <button type="button" onClick={onEditProfile} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit Profile
        </button>
        <a href="#contact" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Manage Verification
        </a>
        <a href="#security" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          View Security
        </a>
      </div>
    </div>
  );
}

function PersonalInformationForm({ identity, onSave }: { identity: PersonalInformation; onSave: (values: PersonalInformation) => void }) {
  const [values, setValues] = useState<PersonalInformation>(identity);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const isDirty = JSON.stringify(values) !== JSON.stringify(identity);
  const formId = useId();

  function updateField<K extends keyof PersonalInformation>(key: K, value: PersonalInformation[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setStatus("dirty");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validatePersonalInformation(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatus("validationError");
      return;
    }
    setErrors({});
    setStatus("saving");
    window.setTimeout(() => {
      onSave(values);
      setStatus("saved");
    }, 400);
  }

  function handleCancel() {
    setValues(identity);
    setErrors({});
    setStatus("idle");
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-describedby={isDirty ? `${formId}-unsaved` : undefined}>
      {isDirty ? (
        <p id={`${formId}-unsaved`} className="mb-4 rounded-md bg-warning/15 px-3 py-2 text-sm text-warning">
          You have unsaved changes.
        </p>
      ) : null}
      {status === "saved" ? (
        <p role="status" className="mb-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Personal information saved.
        </p>
      ) : null}
      {status === "saveError" ? (
        <p role="alert" className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          We couldn&apos;t save your changes. Please try again.
        </p>
      ) : null}

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="sr-only">Name</legend>
        <div>
          <label htmlFor={`${formId}-first`} className="mb-1.5 block text-sm font-medium text-foreground">
            First name
          </label>
          <input
            id={`${formId}-first`}
            type="text"
            value={values.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? `${formId}-first-error` : undefined}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
          <FieldError id={`${formId}-first-error`} message={errors.firstName} />
        </div>
        <div>
          <label htmlFor={`${formId}-last`} className="mb-1.5 block text-sm font-medium text-foreground">
            Last name
          </label>
          <input
            id={`${formId}-last`}
            type="text"
            value={values.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? `${formId}-last-error` : undefined}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
          <FieldError id={`${formId}-last-error`} message={errors.lastName} />
        </div>
        <div>
          <label htmlFor={`${formId}-display`} className="mb-1.5 block text-sm font-medium text-foreground">
            Display name
          </label>
          <input
            id={`${formId}-display`}
            type="text"
            value={values.displayName}
            onChange={(event) => updateField("displayName", event.target.value)}
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={errors.displayName ? `${formId}-display-error` : undefined}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">Shown on reviews and shared wishlists.</p>
          <FieldError id={`${formId}-display-error`} message={errors.displayName} />
        </div>
        <div>
          <label htmlFor={`${formId}-preferred`} className="mb-1.5 block text-sm font-medium text-foreground">
            Preferred name <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id={`${formId}-preferred`}
            type="text"
            value={values.preferredName ?? ""}
            onChange={(event) => updateField("preferredName", event.target.value || null)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
      </fieldset>

      <fieldset className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="sr-only">Date of birth and gender</legend>
        <div>
          <label htmlFor={`${formId}-dob`} className="mb-1.5 block text-sm font-medium text-foreground">
            Date of birth
          </label>
          <input
            id={`${formId}-dob`}
            type="date"
            value={values.dateOfBirth}
            onChange={(event) => updateField("dateOfBirth", event.target.value)}
            aria-invalid={Boolean(errors.dateOfBirth)}
            aria-describedby={errors.dateOfBirth ? `${formId}-dob-error` : undefined}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
          <FieldError id={`${formId}-dob-error`} message={errors.dateOfBirth} />
        </div>
        <div>
          <label htmlFor={`${formId}-gender`} className="mb-1.5 block text-sm font-medium text-foreground">
            Gender <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <select
            id={`${formId}-gender`}
            value={values.genderPreference}
            onChange={(event) => updateField("genderPreference", event.target.value as GenderPreference)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            {(Object.keys(GENDER_LABELS) as GenderPreference[]).map((key) => (
              <option key={key} value={key}>
                {GENDER_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${formId}-occupation`} className="mb-1.5 block text-sm font-medium text-foreground">
            Occupation <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id={`${formId}-occupation`}
            type="text"
            value={values.occupation ?? ""}
            onChange={(event) => updateField("occupation", event.target.value || null)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label htmlFor={`${formId}-country`} className="mb-1.5 block text-sm font-medium text-foreground">
            Country / region
          </label>
          <select
            id={`${formId}-country`}
            value={values.countryOfResidence}
            onChange={(event) => updateField("countryOfResidence", event.target.value as RegionCode)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            {(Object.keys(REGION_LABELS) as RegionCode[]).map((key) => (
              <option key={key} value={key}>
                {REGION_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={handleCancel}
          disabled={!isDirty || status === "saving"}
          className="rounded-md border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isDirty || status === "saving"}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Save changes
        </button>
      </div>
    </form>
  );
}

function ContactChannelCard({
  icon: Icon,
  label,
  value,
  maskedValue,
  verification,
  onChangeValue,
  onRequestVerification,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  maskedValue?: string;
  verification: VerificationState;
  onChangeValue: (value: string) => void;
  onRequestVerification: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | undefined>(undefined);
  const fieldId = useId();

  const validate = label === "Email address" ? validateEmailValue : validatePhoneValue;

  function handleSave() {
    const validationError = validate(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(undefined);
    onChangeValue(draft);
    setIsEditing(false);
  }

  const toneByVerification: Record<VerificationState, { tone: StatusTone; icon: LucideIcon; label: string }> = {
    verified: { tone: "success", icon: BadgeCheck, label: "Verified" },
    unverified: { tone: "warning", icon: AlertTriangle, label: "Unverified" },
    pending: { tone: "info", icon: Loader2, label: "Verification pending" },
    failed: { tone: "danger", icon: AlertTriangle, label: "Verification failed" },
  };
  const statusMeta = toneByVerification[verification];

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {isEditing ? (
            <div className="mt-2">
              <label htmlFor={fieldId} className="sr-only">
                {label}
              </label>
              <input
                id={fieldId}
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${fieldId}-error` : undefined}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
              <FieldError id={`${fieldId}-error`} message={error} />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={handleSave} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDraft(value);
                    setError(undefined);
                  }}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{maskedValue ?? value}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill label={statusMeta.label} tone={statusMeta.tone} icon={statusMeta.icon} />
            {verification !== "verified" && !isEditing ? (
              <button type="button" onClick={onRequestVerification} className="text-xs font-medium text-primary hover:underline">
                {verification === "pending" ? "Resend verification" : "Verify now"}
              </button>
            ) : null}
          </div>
        </div>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`Change ${label.toLowerCase()}`}
            className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RegionalPreferencesForm({ preferences, onChange }: { preferences: RegionalPreferences; onChange: (partial: Partial<RegionalPreferences>) => void }) {
  const formId = useId();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${formId}-language`} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          Language
        </label>
        <select
          id={`${formId}-language`}
          value={preferences.language}
          onChange={(event) => onChange({ language: event.target.value as LanguageCode })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
        >
          {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((key) => (
            <option key={key} value={key}>
              {LANGUAGE_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${formId}-region`} className="mb-1.5 block text-sm font-medium text-foreground">
          Country / region
        </label>
        <select
          id={`${formId}-region`}
          value={preferences.region}
          onChange={(event) => onChange({ region: event.target.value as RegionCode })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
        >
          {(Object.keys(REGION_LABELS) as RegionCode[]).map((key) => (
            <option key={key} value={key}>
              {REGION_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${formId}-currency`} className="mb-1.5 block text-sm font-medium text-foreground">
          Currency
        </label>
        <select
          id={`${formId}-currency`}
          value={preferences.currency}
          onChange={(event) => onChange({ currency: event.target.value as CurrencyCode })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
        >
          {(Object.keys(CURRENCY_LABELS) as CurrencyCode[]).map((key) => (
            <option key={key} value={key}>
              {CURRENCY_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${formId}-timezone`} className="mb-1.5 block text-sm font-medium text-foreground">
          Timezone
        </label>
        <select
          id={`${formId}-timezone`}
          value={preferences.timezone}
          onChange={(event) => onChange({ timezone: event.target.value as TimezoneId })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
        >
          {(Object.keys(TIMEZONE_LABELS) as TimezoneId[]).map((key) => (
            <option key={key} value={key}>
              {TIMEZONE_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-foreground">Measurement system</legend>
          <div className="flex gap-4">
            {(["metric", "imperial"] as MeasurementSystem[]).map((system) => (
              <label key={system} className="flex items-center gap-1.5 text-sm text-foreground">
                <input
                  type="radio"
                  name={`${formId}-measurement`}
                  checked={preferences.measurementSystem === system}
                  onChange={() => onChange({ measurementSystem: system })}
                  className="h-4 w-4"
                />
                {system === "metric" ? "Metric (cm, kg)" : "Imperial (in, lb)"}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

function AccessibilityPreferencesForm({
  accessibility,
  onToggle,
}: {
  accessibility: AccessibilityPreferences;
  onToggle: (key: keyof AccessibilityPreferences) => void;
}) {
  return (
    <div className="mt-2 border-t border-border pt-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Accessibility className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        Accessibility
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        These control how {BRAND_NAME} displays content. Your device or browser&apos;s own accessibility settings are separate and always take priority.
      </p>
      <div className="mt-1 divide-y divide-border">
        <ToggleSwitch
          id="pref-reduced-motion"
          checked={accessibility.reducedMotion}
          onChange={() => onToggle("reducedMotion")}
          label="Reduce motion"
          description="Minimize non-essential animation across the site (application preference)."
        />
        <ToggleSwitch
          id="pref-larger-text"
          checked={accessibility.largerText}
          onChange={() => onToggle("largerText")}
          label="Larger text"
          description="Increase default text size in supported layouts (application preference)."
        />
        <ToggleSwitch
          id="pref-high-contrast"
          checked={accessibility.highContrast}
          onChange={() => onToggle("highContrast")}
          label="High contrast"
          description="Increase contrast between text and backgrounds where supported (application preference)."
        />
      </div>
    </div>
  );
}

function ShoppingCategoryPicker({ selected, onToggle }: { selected: ShoppingCategory[]; onToggle: (category: ShoppingCategory) => void }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <ShoppingBag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        Preferred categories
      </p>
      <div role="group" aria-label="Preferred shopping categories" className="flex flex-wrap gap-2">
        {SHOPPING_CATEGORIES.map((category) => {
          const isSelected = selected.includes(category);
          return (
            <button
              key={category}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(category)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ShoppingBrandsList({ brands, onRemove }: { brands: string[]; onRemove: (brand: string) => void }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Tag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        Preferred brands
      </p>
      {brands.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven&apos;t added any preferred brands yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {brands.map((brand) => (
            <li key={brand}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
                {brand}
                <button type="button" onClick={() => onRemove(brand)} aria-label={`Remove ${brand} from preferred brands`} className="rounded-full hover:text-destructive">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommunicationPreferencesTable({
  entries,
  onToggle,
}: {
  entries: CommunicationPreferenceEntry[];
  onToggle: (category: CommunicationCategory, channel: CommunicationChannel) => void;
}) {
  const transactional = entries.filter((entry) => entry.isTransactional);
  const marketing = entries.filter((entry) => !entry.isTransactional);
  const channels: CommunicationChannel[] = ["email", "sms", "push", "inApp"];

  function renderGroup(title: string, description: string, groupEntries: CommunicationPreferenceEntry[]) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Category
                </th>
                {channels.map((channel) => (
                  <th key={channel} scope="col" className="py-2 px-2 text-center font-medium">
                    {COMMUNICATION_CHANNEL_LABELS[channel].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupEntries.map((entry) => (
                <tr key={entry.category} className="border-b border-border last:border-0">
                  <th scope="row" className="py-2.5 pr-3 text-left font-normal align-top">
                    <span className="block font-medium text-foreground">{entry.label}</span>
                    <span className="block text-xs text-muted-foreground">{entry.description}</span>
                  </th>
                  {channels.map((channel) => {
                    const checked = entry.channels[channel];
                    const isLocked = entry.isTransactional && channel === "email";
                    return (
                      <td key={channel} className="py-2.5 px-2 text-center align-top">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={checked}
                          aria-label={`${entry.label} via ${COMMUNICATION_CHANNEL_LABELS[channel].label}`}
                          disabled={isLocked}
                          onClick={() => onToggle(entry.category, channel)}
                          className={`inline-flex h-6 w-11 items-center rounded-full border border-transparent disabled:cursor-not-allowed disabled:opacity-60 ${
                            checked ? "bg-primary" : "bg-muted"
                          }`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-card shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderGroup(
        "Transactional & security",
        "Required for account safety and order fulfillment. Email cannot be disabled for these categories.",
        transactional,
      )}
      {renderGroup("Marketing & personalization", "Optional — control how we reach you about deals, recommendations, and news.", marketing)}
    </div>
  );
}

function PrivacyControlRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: () => void }) {
  const id = useId();
  return <ToggleSwitch id={id} label={label} description={description} checked={checked} onChange={onChange} />;
}

function SecurityStatusRow({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: StatusTone }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-2.5 text-sm text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {label}
      </div>
      <StatusPill label={value} tone={tone} icon={Icon} />
    </div>
  );
}

function MembershipBenefitsList({ benefits }: { benefits: MembershipBenefit[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {benefits.map((benefit) => (
        <li key={benefit.id} className="flex items-start gap-2 text-sm text-foreground">
          <Gift className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {benefit.label}
        </li>
      ))}
    </ul>
  );
}

const ACTIVITY_ICONS: Record<ActivityEventType, LucideIcon> = {
  profileUpdated: User,
  emailVerified: Mail,
  phoneVerified: Smartphone,
  passwordChanged: KeyRound,
  securitySettingsChanged: ShieldCheck,
  preferencesUpdated: Settings2,
  loginSucceeded: History,
};

function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No recent profile activity to show.</p>;
  }
  return (
    <ol className="space-y-4">
      {events.slice(0, 6).map((event) => {
        const Icon = ACTIVITY_ICONS[event.type];
        return (
          <li key={event.id} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm text-foreground">{event.description}</p>
              <p className="text-xs text-muted-foreground">{formatRelativeDateTime(event.occurredAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DataExportPanel({ dataExport, onRequestExport }: { dataExport: DataExportRequest; onRequestExport: () => void }) {
  const statusCopy: Record<DataExportStatus, { label: string; tone: StatusTone }> = {
    idle: { label: "Not requested", tone: "neutral" },
    preparing: { label: "Preparing your export", tone: "info" },
    ready: { label: "Ready to download", tone: "success" },
    expired: { label: "Download link expired", tone: "warning" },
    failed: { label: "Export failed", tone: "danger" },
  };
  const meta = statusCopy[dataExport.status];
  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Download className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Export personal data
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Download a copy of your profile, preferences, and activity as a portable file.</p>
        </div>
        <StatusPill label={meta.label} tone={meta.tone} icon={Info} />
      </div>
      {dataExport.requestedAt ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Requested {formatRelativeDateTime(dataExport.requestedAt)}
          {dataExport.expiresAt ? ` · Available until ${formatRelativeDateTime(dataExport.expiresAt)}` : ""}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onRequestExport}
        disabled={dataExport.status === "preparing"}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {dataExport.status === "preparing" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {dataExport.status === "ready" ? "Request new export" : "Request export"}
      </button>
    </div>
  );
}

/* ========================================================================
 * 10. LAYOUT COMPONENTS
 * ===================================================================== */

function AnnouncementBar() {
  return (
    <div className="bg-primary px-4 py-2 text-center text-xs font-medium text-primary-foreground">
      Free standard shipping on orders over $49 · Sign in for member pricing
    </div>
  );
}

function SearchBar({ id, className }: { id: string; className?: string }) {
  const [query, setQuery] = useState("");
  return (
    <form role="search" onSubmit={(event) => event.preventDefault()} className={className}>
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products, brands, and categories"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground"
        />
      </div>
    </form>
  );
}

function HeaderActions({ onToggleMobileNav, isMobileNavOpen }: { onToggleMobileNav: () => void; isMobileNavOpen: boolean }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <a href="#wishlist" aria-label="Wishlist, 6 items" className="relative hidden rounded-md p-2 text-foreground hover:bg-muted sm:inline-flex">
        <Heart className="h-5 w-5" aria-hidden="true" />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">6</span>
      </a>
      <a href="#notifications" aria-label="Notifications, 2 unread" className="relative hidden rounded-md p-2 text-foreground hover:bg-muted sm:inline-flex">
        <Bell className="h-5 w-5" aria-hidden="true" />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">2</span>
      </a>
      <a href="#cart" aria-label="Cart, 3 items" className="relative rounded-md p-2 text-foreground hover:bg-muted">
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">3</span>
      </a>
      <a href="#account" className="hidden items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted md:inline-flex">
        <User className="h-4 w-4" aria-hidden="true" />
        Account
      </a>
      <button
        type="button"
        onClick={onToggleMobileNav}
        aria-expanded={isMobileNavOpen}
        aria-controls="mobile-nav-drawer"
        aria-label={isMobileNavOpen ? "Close menu" : "Open menu"}
        className="rounded-md p-2 text-foreground hover:bg-muted lg:hidden"
      >
        {isMobileNavOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}

function CategoryNavigation({ className }: { className?: string }) {
  return (
    <nav aria-label="Product categories" className={className}>
      <ul className="flex flex-wrap items-center gap-1">
        {CATEGORY_NAV_LINKS.map((category) => (
          <li key={category}>
            <a href={`#${category.toLowerCase()}`} className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              {category}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function EcommerceHeader() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <AnnouncementBar />
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <a href="#home" className="shrink-0 text-lg font-semibold tracking-tight text-foreground">
          {BRAND_NAME}
        </a>
        <SearchBar id="desktop-search" className="hidden flex-1 md:block" />
        <div className="ml-auto">
          <HeaderActions onToggleMobileNav={() => setIsMobileNavOpen((open) => !open)} isMobileNavOpen={isMobileNavOpen} />
        </div>
      </div>
      <CategoryNavigation className="mx-auto hidden max-w-7xl border-t border-border px-4 lg:block lg:px-6" />
      {isMobileNavOpen ? (
        <div id="mobile-nav-drawer" className="border-t border-border bg-background px-4 py-3 lg:hidden">
          <SearchBar id="mobile-search" className="mb-3" />
          <CategoryNavigation />
          <a href="#account" className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            <User className="h-4 w-4" aria-hidden="true" />
            Account
          </a>
        </div>
      ) : null}
    </header>
  );
}

function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <a href="#home" className="hover:text-foreground hover:underline">
            Home
          </a>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3.5 w-3.5" />
        </li>
        <li>
          <a href="#account" className="hover:text-foreground hover:underline">
            Account
          </a>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3.5 w-3.5" />
        </li>
        <li aria-current="page" className="font-medium text-foreground">
          Profile
        </li>
      </ol>
    </nav>
  );
}

function EcommerceFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">Shop</h2>
            <ul className="space-y-1.5">
              <li><a href="#deals" className="hover:text-foreground hover:underline">Deals</a></li>
              <li><a href="#new" className="hover:text-foreground hover:underline">New arrivals</a></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">Account</h2>
            <ul className="space-y-1.5">
              <li><a href="#orders" className="hover:text-foreground hover:underline">Orders</a></li>
              <li><a href="#addresses" className="hover:text-foreground hover:underline">Addresses</a></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">Support</h2>
            <ul className="space-y-1.5">
              <li><a href="#help" className="hover:text-foreground hover:underline">Help center</a></li>
              <li><a href="#returns" className="hover:text-foreground hover:underline">Returns</a></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">Company</h2>
            <ul className="space-y-1.5">
              <li><a href="#about" className="hover:text-foreground hover:underline">About</a></li>
              <li><a href="#careers" className="hover:text-foreground hover:underline">Careers</a></li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-border pt-4 text-xs">© 2026 {BRAND_NAME}, Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}

/* ---- Main workspace sections ------------------------------------------ */

function ProfileOverviewSection({ items, percent }: { items: ProfileCompletionItem[]; percent: number }) {
  return (
    <ProfileSection id="overview" title="Profile overview" description="A quick summary of your identity, verification, and completion status.">
      <ProgressBar percent={percent} label="Profile completion" />
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            {item.complete ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className={item.complete ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
            <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{item.tier}</span>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}

function ProfileMain() {
  const dispatch = useAppDispatch();
  const identity = useAppSelector(selectIdentity);
  const contact = useAppSelector(selectContact);
  const preferences = useAppSelector(selectPreferences);
  const shoppingPreferences = useAppSelector(selectShoppingPreferences);
  const communicationPreferences = useAppSelector(selectCommunicationPreferences);
  const privacy = useAppSelector(selectPrivacy);
  const security = useAppSelector(selectSecurity);
  const membership = useAppSelector(selectMembership);
  const activity = useAppSelector(selectActivity);
  const dataExport = useAppSelector(selectDataExport);
  const avatarUrl = useAppSelector(selectAvatarUrl);
  const completion = useAppSelector(selectProfileCompletion);

  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <div className="min-w-0 flex-1 space-y-6">
      <ProfileHero
        identity={identity}
        contact={contact}
        membership={membership}
        completionPercent={completion.percent}
        avatarUrl={avatarUrl}
        onChangePhoto={(url) => dispatch(avatarUpdated(url))}
        onRemovePhoto={() => dispatch(avatarUpdated(null))}
        onEditProfile={() => dispatch(setActiveSection("personal"))}
      />

      <ProfileOverviewSection items={completion.items} percent={completion.percent} />

      <ProfileSection id="personal" title="Personal information" description="Keep your name and basic details accurate and up to date.">
        <PersonalInformationForm identity={identity} onSave={(values) => dispatch(personalInformationSaved(values))} />
      </ProfileSection>

      <ProfileSection id="contact" title="Contact information" description="Used for order updates, sign-in, and account recovery.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ContactChannelCard
            icon={Mail}
            label="Email address"
            value={contact.email.value}
            verification={contact.email.verification}
            onChangeValue={(value) => dispatch(contactValueChanged({ channel: "email", value }))}
            onRequestVerification={() => {
              dispatch(contactVerificationRequested("email"));
              window.setTimeout(() => dispatch(contactVerificationSucceeded("email")), 600);
            }}
          />
          <ContactChannelCard
            icon={Smartphone}
            label="Phone number"
            value={contact.phone.value}
            maskedValue={maskPhoneNumber(contact.phone.value)}
            verification={contact.phone.verification}
            onChangeValue={(value) => dispatch(contactValueChanged({ channel: "phone", value }))}
            onRequestVerification={() => {
              dispatch(contactVerificationRequested("phone"));
              window.setTimeout(() => dispatch(contactVerificationSucceeded("phone")), 600);
            }}
          />
        </div>
      </ProfileSection>

      <ProfileSection id="preferences" title="Preferences" description="Language, region, currency, and how content is displayed to you.">
        <RegionalPreferencesForm preferences={preferences} onChange={(partial) => dispatch(regionalPreferencesUpdated(partial))} />
        <AccessibilityPreferencesForm
          accessibility={preferences.accessibility}
          onToggle={(key) => dispatch(accessibilityPreferenceToggled(key))}
        />
      </ProfileSection>

      <ProfileSection id="shopping" title="Shopping preferences" description="Help us tailor recommendations to what you actually shop for.">
        <div className="space-y-5">
          <ShoppingCategoryPicker selected={shoppingPreferences.preferredCategories} onToggle={(category) => dispatch(shoppingCategoryToggled(category))} />
          <ShoppingBrandsList brands={shoppingPreferences.preferredBrands} onRemove={(brand) => dispatch(shoppingBrandRemoved(brand))} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Clothing size</p>
              <p className="mt-1 text-sm text-foreground">{shoppingPreferences.clothingSize ?? "Not set"}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shoe size</p>
              <p className="mt-1 text-sm text-foreground">{shoppingPreferences.shoeSize ?? "Not set"}</p>
            </div>
          </div>
          <ToggleSwitch
            id="shopping-personalization"
            checked={shoppingPreferences.personalizationEnabled}
            onChange={() => dispatch(shoppingPersonalizationToggled())}
            label="Personalize recommendations"
            description="Use my shopping preferences to tailor product recommendations across the site."
          />
        </div>
      </ProfileSection>

      <ProfileSection id="communication" title="Communication preferences" description="Choose how and when we contact you, by category and channel.">
        <CommunicationPreferencesTable
          entries={communicationPreferences}
          onToggle={(category, channel) => dispatch(communicationChannelToggled({ category, channel }))}
        />
      </ProfileSection>

      <ProfileSection id="privacy" title="Privacy" description="Control what your profile shares and how your data is used.">
        <div className="divide-y divide-border">
          <div className="py-3">
            <label htmlFor="privacy-visibility" className="mb-1.5 block text-sm font-medium text-foreground">
              Profile visibility
            </label>
            <select
              id="privacy-visibility"
              value={privacy.profileVisibility}
              onChange={(event) => dispatch(privacySettingUpdated({ profileVisibility: event.target.value as ProfileVisibility }))}
              className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="private">Private — only visible to you</option>
              <option value="limitedRecommendations">Limited — used only to improve recommendations</option>
              <option value="public">Public — visible on shared reviews and lists</option>
            </select>
          </div>
          <PrivacyControlRow
            label="Personalization"
            description="Use my browsing and purchase activity to personalize my experience on this site."
            checked={privacy.personalizationEnabled}
            onChange={() => dispatch(privacySettingUpdated({ personalizationEnabled: !privacy.personalizationEnabled }))}
          />
          <PrivacyControlRow
            label="Recommendation usage"
            description="Allow my saved preferences to influence product recommendations shown to me."
            checked={privacy.recommendationUsage}
            onChange={() => dispatch(privacySettingUpdated({ recommendationUsage: !privacy.recommendationUsage }))}
          />
          <PrivacyControlRow
            label="Marketing personalization"
            description="Allow marketing messages to be tailored using my shopping activity."
            checked={privacy.marketingPersonalization}
            onChange={() => dispatch(privacySettingUpdated({ marketingPersonalization: !privacy.marketingPersonalization }))}
          />
          <PrivacyControlRow
            label="Analytics data usage"
            description="Allow aggregated, de-identified usage data to help improve the platform."
            checked={privacy.analyticsDataUsage}
            onChange={() => dispatch(privacySettingUpdated({ analyticsDataUsage: !privacy.analyticsDataUsage }))}
          />
        </div>
      </ProfileSection>

      <ProfileSection
        id="security"
        title="Security"
        description="A summary of your account's security posture."
        actions={
          <a href="#" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
            Manage Security
          </a>
        }
      >
        <div className="divide-y divide-border">
          <SecurityStatusRow
            icon={Mail}
            label="Email verification"
            value={security.emailVerified ? "Verified" : "Unverified"}
            tone={security.emailVerified ? "success" : "warning"}
          />
          <SecurityStatusRow
            icon={Smartphone}
            label="Phone verification"
            value={security.phoneVerified ? "Verified" : "Unverified"}
            tone={security.phoneVerified ? "success" : "warning"}
          />
          <SecurityStatusRow
            icon={ShieldCheck}
            label="Two-factor authentication"
            value={security.twoFactorEnabled ? "Enabled" : "Disabled"}
            tone={security.twoFactorEnabled ? "success" : "danger"}
          />
          <SecurityStatusRow icon={History} label="Active sessions" value={`${security.activeSessionCount} devices`} tone="info" />
          <SecurityStatusRow
            icon={KeyRound}
            label="Password"
            value={security.lastPasswordChangeAt ? `Changed ${formatRelativeDateTime(security.lastPasswordChangeAt)}` : "Never changed"}
            tone={security.passwordStrengthStatus === "strong" ? "success" : "warning"}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <a href="#" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Review sessions
          </a>
          <a href="#" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            {security.twoFactorEnabled ? "Manage 2FA" : "Enable 2FA"}
          </a>
          <a href="#" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Change password
          </a>
        </div>
      </ProfileSection>

      <ProfileSection id="membership" title="Membership" description="Your loyalty tier and identity-related membership details.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-sm font-medium text-accent-foreground">
              <Crown className="h-4 w-4" aria-hidden="true" />
              {MEMBERSHIP_TIER_LABELS[membership.tier]} member
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Member since {formatMemberSince(membership.memberSinceAt)}</p>
            {membership.renewalAt ? (
              <p className="text-sm text-muted-foreground">Renews {formatMemberSince(membership.renewalAt)}</p>
            ) : null}
            <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
              <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {membership.rewardPoints.toLocaleString()} reward points
            </p>
          </div>
          <div className="w-full sm:w-56">
            {membership.nextTier ? (
              <ProgressBar percent={membership.tierProgressPercent} label={`Progress to ${MEMBERSHIP_TIER_LABELS[membership.nextTier]}`} />
            ) : (
              <p className="text-sm text-muted-foreground">You&apos;ve reached our highest tier.</p>
            )}
          </div>
        </div>
        <MembershipBenefitsList benefits={membership.benefits} />
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <a href="#" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            View rewards
          </a>
          <a href="#" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Membership benefits
          </a>
        </div>
      </ProfileSection>

      <ProfileSection id="activity" title="Profile activity" description="Recent changes made to your profile and account.">
        <ActivityTimeline events={activity} />
      </ProfileSection>

      <ProfileSection id="dangerZone" title="Account actions" description="Manage data export, deactivation, and deletion for your account.">
        <div className="space-y-4">
          <DataExportPanel
            dataExport={dataExport}
            onRequestExport={() => {
              dispatch(dataExportRequested());
              window.setTimeout(() => dispatch(dataExportReady()), 1200);
            }}
          />
          <div className="flex items-center justify-between gap-3 rounded-md border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Sign out of this device</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Ends your current session on this browser only.</p>
            </div>
            <button type="button" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/5 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Deactivate account</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Temporarily hides your profile and pauses orders. You can reactivate anytime by signing back in.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsDeactivateOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-warning/40 px-3.5 py-2 text-sm font-medium text-warning hover:bg-warning/10"
            >
              <UserX className="h-4 w-4" aria-hidden="true" />
              Deactivate
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Delete account</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Permanently deletes your profile, order history, and saved data. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-destructive/40 px-3.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete account
            </button>
          </div>
        </div>
      </ProfileSection>

      <ConfirmDialog
        isOpen={isDeactivateOpen}
        title="Deactivate your account?"
        description="Your profile will be hidden from other shoppers and pending orders will pause. You can reactivate anytime by signing back in."
        confirmLabel="Deactivate account"
        onCancel={() => setIsDeactivateOpen(false)}
        onConfirm={() => setIsDeactivateOpen(false)}
      />
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete your account?"
        description="This permanently deletes your profile, order history, saved addresses, and preferences. This action cannot be undone."
        confirmLabel="Delete account"
        tone="destructive"
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}

function ProfileSidebar() {
  const dispatch = useAppDispatch();
  const identity = useAppSelector(selectIdentity);
  const membership = useAppSelector(selectMembership);
  const avatarUrl = useAppSelector(selectAvatarUrl);
  const activeSectionId = useAppSelector(selectActiveSection);
  const completion = useAppSelector(selectProfileCompletion);

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-24 rounded-lg border border-border bg-card px-4">
        <ProfileIdentityCard identity={identity} membership={membership} avatarUrl={avatarUrl} />
        <ProfileCompletionCard items={completion.items} percent={completion.percent} />
        <ProfileNavigation activeSectionId={activeSectionId} onSelect={(id) => dispatch(setActiveSection(id))} />
      </div>
    </aside>
  );
}

function MobileProfileNav() {
  const dispatch = useAppDispatch();
  const activeSectionId = useAppSelector(selectActiveSection);
  const [isOpen, setIsOpen] = useState(false);
  const activeLabel = PROFILE_NAVIGATION_ITEMS.find((item) => item.id === activeSectionId)?.label ?? "Profile Overview";

  return (
    <div className="mb-4 lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="mobile-profile-nav"
        className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground"
      >
        {activeLabel}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div id="mobile-profile-nav" className="mt-1 rounded-lg border border-border bg-card p-2">
          <ProfileNavigation
            activeSectionId={activeSectionId}
            onSelect={(id) => {
              dispatch(setActiveSection(id));
              setIsOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function ProfileWorkspace() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <MobileProfileNav />
      <div className="flex items-start gap-6">
        <ProfileSidebar />
        <ProfileMain />
      </div>
    </div>
  );
}

/* ========================================================================
 * 11. PROFILE PAGE (DEFAULT EXPORT)
 * ===================================================================== */

export default function ProfilePage() {
  return (
    <Provider store={profileStore}>
      <div className="min-h-screen bg-background">
        <EcommerceHeader />
        <Breadcrumbs />
        <ProfileWorkspace />
        <EcommerceFooter />
      </div>
    </Provider>
  );
}