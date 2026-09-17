"use client";

/**
 * ============================================================================
 * REVIEWS & RATINGS — customer trust, feedback, and review-management screen
 * ----------------------------------------------------------------------------
 * Single-file implementation. Internally organized as:
 *   Types → Constants → Mock data → Redux Toolkit state → Selectors →
 *   Utilities → Review components → Rating components → Form components →
 *   My Reviews components → Dialogs/media viewer → Workspace → Header/Footer
 *   → Page root.
 *
 * Redux owns shared review state (entities, filters, search, sort,
 * pagination, voting, reporting, submission lifecycle). Local component
 * state owns transient UI only (dialog visibility, in-progress form fields,
 * media previews, hover/dropdown state) per the state-ownership rule.
 * ============================================================================
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  configureStore,
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  Provider,
  useDispatch as useReduxDispatch,
  useSelector as useReduxSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Store,
  Film,
  Filter,
  Flag,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Menu,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Package,
  PenSquare,
  Plus,
  RefreshCcw,
  Search,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Truck,
  User,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";

// ============================================================================
// DOMAIN TYPES
// ============================================================================

type RatingValue = 1 | 2 | 3 | 4 | 5;

/** Customer-visible lifecycle. Internal moderation mechanics are never exposed. */
type ReviewStatus = "draft" | "pending" | "published" | "rejected" | "removed";

interface ReviewAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  /** Total published reviews by this author — a mild trust signal, not a claim of expertise. */
  totalReviews: number;
}

type ReviewMedia =
  | { id: string; kind: "image"; url: string; thumbnailUrl: string; altText: string }
  | { id: string; kind: "video"; url: string; thumbnailUrl: string; altText: string; durationSeconds: number };

interface ReviewVariant {
  label: string;
}

interface SellerResponse {
  id: string;
  responderName: string;
  respondedAt: string;
  message: string;
}

type ReviewVoteState = "none" | "helpful" | "notHelpful";

interface Review {
  id: string;
  productId: string;
  author: ReviewAuthor;
  rating: RatingValue;
  title: string;
  body: string;
  pros: string[];
  cons: string[];
  media: ReviewMedia[];
  variant: ReviewVariant | null;
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  createdAt: string;
  editedAt: string | null;
  helpfulCount: number;
  notHelpfulCount: number;
  myVote: ReviewVoteState;
  sellerResponse: SellerResponse | null;
  /** Present only for the current customer's own reviews (My Reviews section). */
  isOwn: boolean;
}

interface RatingDistributionEntry {
  rating: RatingValue;
  count: number;
}

interface ReviewInsight {
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
}

interface ReviewSummary {
  productId: string;
  averageRatingTenths: number; // e.g. 47 => 4.7, avoids float aggregation
  totalRatings: number;
  distribution: RatingDistributionEntry[];
  verifiedPurchaseRatio: number; // 0–100 integer percent
  mediaReviewCount: number;
  positiveThemes: ReviewInsight[];
  negativeThemes: ReviewInsight[];
}

interface ProductContext {
  id: string;
  brand: string;
  title: string;
  imageUrl: string;
  selectedVariant: string;
  isAvailable: boolean;
  priceLabel: string;
}

type ReviewRatingFilter = "all" | RatingValue;

interface ReviewFilters {
  rating: ReviewRatingFilter;
  verifiedOnly: boolean;
  withPhotos: boolean;
  withVideos: boolean;
  withSellerResponse: boolean;
}

type ReviewSort = "relevant" | "recent" | "helpful" | "highest" | "lowest" | "media";

type ReviewEligibility =
  | { status: "eligible" }
  | { status: "alreadyReviewed"; reviewId: string }
  | { status: "purchaseRequired" }
  | { status: "reviewWindowExpired"; windowDays: number }
  | { status: "productUnavailable" }
  | { status: "pendingPreviousReview" };

/** Discriminated union for any async operation lifecycle — avoids boolean-flag soup. */
type OperationState<TError = string> =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success" }
  | { phase: "error"; message: TError };

interface MediaDraftItem {
  localId: string;
  kind: "image" | "video";
  previewUrl: string;
  upload: OperationState;
}

type MyReviewsTab = "published" | "drafts" | "pending";

type ReportReason =
  | "spam"
  | "offensive"
  | "fake"
  | "personalInfo"
  | "irrelevant"
  | "harassment"
  | "other";

// ============================================================================
// ENUMS / UNION CONSTANTS
// ============================================================================

const RATING_VALUES: RatingValue[] = [5, 4, 3, 2, 1];

const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "spam", label: "Spam" },
  { id: "offensive", label: "Offensive content" },
  { id: "fake", label: "Fake review" },
  { id: "personalInfo", label: "Personal information" },
  { id: "irrelevant", label: "Irrelevant content" },
  { id: "harassment", label: "Harassment" },
  { id: "other", label: "Other" },
];

const SORT_OPTIONS: { id: ReviewSort; label: string }[] = [
  { id: "relevant", label: "Most Relevant" },
  { id: "recent", label: "Most Recent" },
  { id: "helpful", label: "Most Helpful" },
  { id: "highest", label: "Highest Rating" },
  { id: "lowest", label: "Lowest Rating" },
  { id: "media", label: "With Media" },
];

const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  draft: "Draft",
  pending: "Pending Review",
  published: "Published",
  rejected: "Rejected",
  removed: "Removed",
};

const PAGE_SIZE = 6;

// ============================================================================
// MOCK DATA
// ============================================================================
// Realistic ecommerce fixtures. Structurally identical to what a real reviews
// API would return, so the API layer can be swapped in without reshaping
// components.

const MOCK_PRODUCT: ProductContext = {
  id: "prod_soundcore_q45",
  brand: "Aurelia Audio",
  title: "Aurelia Audio WaveForm Q45 Wireless Noise-Cancelling Headphones",
  imageUrl: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&h=300&fit=crop",
  selectedVariant: "Midnight Black · Standard Fit",
  isAvailable: true,
  priceLabel: "$249.00",
};

const CURRENT_USER_ID = "user_self_0001";

function mediaImage(id: string, seed: string, altText: string): ReviewMedia {
  return {
    id,
    kind: "image",
    url: `https://images.unsplash.com/${seed}?w=1200&h=900&fit=crop`,
    thumbnailUrl: `https://images.unsplash.com/${seed}?w=200&h=200&fit=crop`,
    altText,
  };
}

function mediaVideo(id: string, seed: string, altText: string, durationSeconds: number): ReviewMedia {
  return {
    id,
    kind: "video",
    url: `https://images.unsplash.com/${seed}?w=1200&h=900&fit=crop`,
    thumbnailUrl: `https://images.unsplash.com/${seed}?w=200&h=200&fit=crop`,
    altText,
    durationSeconds,
  };
}

const MOCK_REVIEWS: Review[] = [
  {
    id: "rev_1001",
    productId: MOCK_PRODUCT.id,
    author: { id: "auth_201", displayName: "Marcus T.", avatarUrl: null, totalReviews: 34 },
    rating: 5,
    title: "Excellent everyday headphones",
    body: "The noise cancellation is strong enough to disappear on a full flight, and the ear cups stay comfortable well past the two-hour mark. Battery life has held up at roughly 28 hours per charge after three months of daily commuting. The companion app's EQ presets are genuinely useful rather than gimmicky.",
    pros: ["Strong noise cancellation", "All-day comfort", "Long battery life"],
    cons: ["Case is slightly bulky for a jacket pocket"],
    media: [
      mediaImage("med_1", "photo-1505740420928-5e560c06d30e", "Headphones resting on a wooden desk"),
      mediaImage("med_2", "photo-1583394838336-acd977736f90", "Headphones folded next to their case"),
    ],
    variant: { label: "Midnight Black · Standard Fit" },
    status: "published",
    isVerifiedPurchase: true,
    createdAt: "2026-08-18T14:22:00Z",
    editedAt: null,
    helpfulCount: 142,
    notHelpfulCount: 6,
    myVote: "none",
    sellerResponse: {
      id: "resp_1",
      responderName: "Aurelia Audio Official Store",
      respondedAt: "2026-08-20T09:00:00Z",
      message: "Thanks for the detailed review, Marcus — glad the ANC and EQ presets are working well for your commute. We're passing the case-size feedback to our accessories team.",
    },
    isOwn: false,
  },
  {
    id: "rev_1002",
    productId: MOCK_PRODUCT.id,
    author: { id: "auth_202", displayName: "Priya R.", avatarUrl: null, totalReviews: 11 },
    rating: 4,
    title: "Great sound, a bit tight out of the box",
    body: "Audio clarity and bass response are excellent for the price point, especially on podcasts and acoustic tracks. The headband was noticeably tight for the first week and left a mild pressure mark on longer sessions, but it loosened up with regular wear. Bluetooth pairing with two devices at once works reliably.",
    pros: ["Clear, balanced sound", "Reliable multipoint pairing"],
    cons: ["Tight headband initially"],
    media: [],
    variant: { label: "Cloud White · Standard Fit" },
    status: "published",
    isVerifiedPurchase: true,
    createdAt: "2026-08-11T10:05:00Z",
    editedAt: "2026-08-12T08:40:00Z",
    helpfulCount: 58,
    notHelpfulCount: 3,
    myVote: "none",
    sellerResponse: null,
    isOwn: false,
  },
  {
    id: "rev_1003",
    productId: MOCK_PRODUCT.id,
    author: { id: "auth_203", displayName: "Daniel K.", avatarUrl: null, totalReviews: 2 },
    rating: 2,
    title: "Disappointed with the mic quality on calls",
    body: "Audio playback is fine, but colleagues on video calls consistently mentioned my voice sounded muffled and distant compared to my previous headset. I tried both the default and 'clear voice' modes in the app without much improvement. Might be fine for music-only use, but not for a hybrid work setup.",
    pros: ["Good music playback"],
    cons: ["Weak microphone on calls", "App voice modes made little difference"],
    media: [],
    variant: { label: "Midnight Black · Standard Fit" },
    status: "published",
    isVerifiedPurchase: true,
    createdAt: "2026-07-29T19:12:00Z",
    editedAt: null,
    helpfulCount: 89,
    notHelpfulCount: 14,
    myVote: "none",
    sellerResponse: {
      id: "resp_2",
      responderName: "Aurelia Audio Official Store",
      respondedAt: "2026-07-31T13:20:00Z",
      message: "Sorry to hear about the call quality, Daniel. This can sometimes be improved with a firmware update from the app's Settings > Firmware tab. Please reach our support team if the issue continues after updating.",
    },
    isOwn: false,
  },
  {
    id: "rev_1004",
    productId: MOCK_PRODUCT.id,
    author: { id: "auth_204", displayName: "Aisha M.", avatarUrl: null, totalReviews: 19 },
    rating: 5,
    title: "Worth the upgrade from the Q30",
    body: "Coming from the previous generation Q30, the difference in noise cancellation depth is immediately noticeable on the subway. Touch controls are more responsive and less accidental-triggering than before. Included carrying case has a much better zipper this time around.",
    pros: ["Noticeable ANC improvement", "Better touch controls", "Improved case"],
    cons: [],
    media: [mediaVideo("med_3", "photo-1484704849700-f032a568e944", "Unboxing the headphones", 42)],
    variant: { label: "Midnight Black · Wide Fit" },
    status: "published",
    isVerifiedPurchase: true,
    createdAt: "2026-08-02T08:50:00Z",
    editedAt: null,
    helpfulCount: 211,
    notHelpfulCount: 9,
    myVote: "none",
    sellerResponse: null,
    isOwn: false,
  },
  {
    id: "rev_1005",
    productId: MOCK_PRODUCT.id,
    author: { id: "auth_205", displayName: "Community Member", avatarUrl: null, totalReviews: 1 },
    rating: 3,
    title: "Good but not exceptional",
    body: "They do what's advertised — solid ANC, decent sound — but at this price there are competitors with better app ecosystems. Fine as a first pair of premium headphones, less compelling if you're comparing across brands.",
    pros: ["Solid overall performance"],
    cons: ["App ecosystem behind competitors"],
    media: [],
    variant: null,
    status: "published",
    isVerifiedPurchase: false,
    createdAt: "2026-06-30T21:15:00Z",
    editedAt: null,
    helpfulCount: 17,
    notHelpfulCount: 21,
    myVote: "none",
    sellerResponse: null,
    isOwn: false,
  },
  {
    id: "rev_1006",
    productId: MOCK_PRODUCT.id,
    author: { id: "auth_206", displayName: "Julia S.", avatarUrl: null, totalReviews: 7 },
    rating: 5,
    title: "Perfect for long-haul flights",
    body: "Used these on a 14-hour flight and they held a charge the entire way with ANC on. The fold-flat hinge design means they pack down small enough for a backpack's front pocket. Only minor gripe is the case rattles slightly when the headphones aren't seated perfectly.",
    pros: ["All-day battery on ANC", "Compact folding design"],
    cons: ["Case rattles if not seated correctly"],
    media: [
      mediaImage("med_4", "photo-1546435770-a3e426bf472b", "Headphones packed in a travel bag"),
    ],
    variant: { label: "Slate Grey · Standard Fit" },
    status: "published",
    isVerifiedPurchase: true,
    createdAt: "2026-07-14T06:40:00Z",
    editedAt: null,
    helpfulCount: 76,
    notHelpfulCount: 4,
    myVote: "none",
    sellerResponse: null,
    isOwn: false,
  },
  {
    id: "rev_1007",
    productId: MOCK_PRODUCT.id,
    author: { id: "auth_207", displayName: "Tom H.", avatarUrl: null, totalReviews: 4 },
    rating: 1,
    title: "Right ear cup stopped working after 3 weeks",
    body: "Sound cut out entirely from the right side after about three weeks of normal use. Support was responsive and processed an exchange, but I'm cautious about the long-term durability given how quickly this happened. Updating this review if the replacement unit holds up better.",
    pros: [],
    cons: ["Hardware failure within a month"],
    media: [],
    variant: { label: "Midnight Black · Standard Fit" },
    status: "published",
    isVerifiedPurchase: true,
    createdAt: "2026-08-05T17:00:00Z",
    editedAt: null,
    helpfulCount: 63,
    notHelpfulCount: 8,
    myVote: "none",
    sellerResponse: {
      id: "resp_3",
      responderName: "Aurelia Audio Official Store",
      respondedAt: "2026-08-06T11:30:00Z",
      message: "We're sorry about this, Tom — glad our support team could get an exchange moving quickly. Please keep us posted on the replacement unit.",
    },
    isOwn: false,
  },
  {
    id: "rev_1008",
    productId: MOCK_PRODUCT.id,
    author: { id: "auth_208", displayName: "Renée B.", avatarUrl: null, totalReviews: 26 },
    rating: 4,
    title: "Fantastic for the office, mediocre for the gym",
    body: "In a quiet office these are superb for focus work — ANC handles HVAC hum and nearby conversation well. They're not designed for workouts though; they shifted noticeably during a light jog. Buying these specifically for gym use would be the wrong call.",
    pros: ["Excellent for focused office work"],
    cons: ["Not secure enough for exercise"],
    media: [],
    variant: { label: "Cloud White · Standard Fit" },
    status: "published",
    isVerifiedPurchase: true,
    createdAt: "2026-05-22T12:10:00Z",
    editedAt: null,
    helpfulCount: 44,
    notHelpfulCount: 2,
    myVote: "none",
    sellerResponse: null,
    isOwn: false,
  },
];

/** The current customer's own reviews across all lifecycle states — kept separate from the public list. */
const MOCK_MY_REVIEWS: Review[] = [
  {
    id: "rev_own_2001",
    productId: MOCK_PRODUCT.id,
    author: { id: CURRENT_USER_ID, displayName: "You", avatarUrl: null, totalReviews: 6 },
    rating: 4,
    title: "Reliable daily driver, minor case gripe",
    body: "I've been using these for about six weeks now for work calls and music. Very happy with the sound signature and comfort during long days. My only complaint is the charging case cover feels slightly loose.",
    pros: ["Comfortable for long wear", "Good call quality on my end"],
    cons: ["Charging case cover feels loose"],
    media: [],
    variant: { label: "Midnight Black · Standard Fit" },
    status: "published",
    isVerifiedPurchase: true,
    createdAt: "2026-07-02T10:00:00Z",
    editedAt: "2026-07-05T09:12:00Z",
    helpfulCount: 12,
    notHelpfulCount: 1,
    myVote: "none",
    sellerResponse: null,
    isOwn: true,
  },
  {
    id: "rev_own_2002",
    productId: "prod_kettle_lumen_x2",
    author: { id: CURRENT_USER_ID, displayName: "You", avatarUrl: null, totalReviews: 6 },
    rating: 5,
    title: "",
    body: "Draft in progress — comparing to my old kettle before finishing this review.",
    pros: [],
    cons: [],
    media: [],
    variant: null,
    status: "draft",
    isVerifiedPurchase: true,
    createdAt: "2026-09-01T08:30:00Z",
    editedAt: null,
    helpfulCount: 0,
    notHelpfulCount: 0,
    myVote: "none",
    sellerResponse: null,
    isOwn: true,
  },
  {
    id: "rev_own_2003",
    productId: "prod_backpack_arcline_22l",
    author: { id: CURRENT_USER_ID, displayName: "You", avatarUrl: null, totalReviews: 6 },
    rating: 3,
    title: "Solid build, laptop sleeve runs small",
    body: "Stitching and zippers feel durable after two months of daily commuting. The padded laptop sleeve is snugger than advertised — my 16-inch laptop barely fits and requires care when removing it.",
    pros: ["Durable stitching and zippers"],
    cons: ["Laptop sleeve runs smaller than advertised"],
    media: [],
    variant: { label: "Graphite · 22L" },
    status: "pending",
    isVerifiedPurchase: true,
    createdAt: "2026-09-08T15:45:00Z",
    editedAt: null,
    helpfulCount: 0,
    notHelpfulCount: 0,
    myVote: "none",
    sellerResponse: null,
    isOwn: true,
  },
];

const MOCK_SUMMARY: ReviewSummary = {
  productId: MOCK_PRODUCT.id,
  averageRatingTenths: 47,
  totalRatings: 12482,
  distribution: [
    { rating: 5, count: 8112 },
    { rating: 4, count: 2734 },
    { rating: 3, count: 998 },
    { rating: 2, count: 412 },
    { rating: 1, count: 226 },
  ],
  verifiedPurchaseRatio: 91,
  mediaReviewCount: 1348,
  positiveThemes: [
    { label: "Noise cancellation", value: "Mentioned positively in 68% of 5★ reviews", tone: "positive" },
    { label: "Comfort for long wear", value: "Mentioned positively in 54% of 5★ reviews", tone: "positive" },
    { label: "Battery life", value: "Mentioned positively in 41% of 5★ reviews", tone: "positive" },
  ],
  negativeThemes: [
    { label: "Microphone on calls", value: "Mentioned negatively in 22% of 1–2★ reviews", tone: "negative" },
    { label: "Case durability", value: "Mentioned negatively in 14% of 1–2★ reviews", tone: "negative" },
  ],
};

// ============================================================================
// REDUX TOOLKIT — SHARED REVIEW STATE
// ============================================================================
// Normalized entity table (byId/ids) shared by the public review list, My
// Reviews, and the details panel — nothing is duplicated between them. Every
// screen section that needs review data reads it by ID through a selector.

interface ReviewsState {
  entities: { byId: Record<string, Review>; ids: string[] };
  selectedReviewId: string | null;
  search: string;
  filters: ReviewFilters;
  sort: ReviewSort;
  pagination: { visibleCount: number; loadMore: OperationState };
  voting: Record<string, OperationState>;
  reporting: Record<string, OperationState>;
  submission: OperationState;
  listStatus: OperationState;
}

function seedEntities(reviews: Review[]): { byId: Record<string, Review>; ids: string[] } {
  const byId: Record<string, Review> = {};
  const ids: string[] = [];
  for (const review of reviews) {
    byId[review.id] = review;
    ids.push(review.id);
  }
  return { byId, ids };
}

const initialReviewsState: ReviewsState = {
  entities: seedEntities([...MOCK_REVIEWS, ...MOCK_MY_REVIEWS]),
  selectedReviewId: null,
  search: "",
  filters: { rating: "all", verifiedOnly: false, withPhotos: false, withVideos: false, withSellerResponse: false },
  sort: "relevant",
  pagination: { visibleCount: PAGE_SIZE, loadMore: { phase: "idle" } },
  voting: {},
  reporting: {},
  submission: { phase: "idle" },
  listStatus: { phase: "loading" },
};

const reviewsSlice = createSlice({
  name: "reviews",
  initialState: initialReviewsState,
  reducers: {
    listLoadSucceeded(state) {
      state.listStatus = { phase: "success" };
    },
    listLoadFailed(state, action: PayloadAction<string>) {
      state.listStatus = { phase: "error", message: action.payload };
    },
    searchChanged(state, action: PayloadAction<string>) {
      state.search = action.payload;
      state.pagination.visibleCount = PAGE_SIZE;
    },
    ratingFilterChanged(state, action: PayloadAction<ReviewRatingFilter>) {
      state.filters.rating = action.payload;
      state.pagination.visibleCount = PAGE_SIZE;
    },
    booleanFilterToggled(state, action: PayloadAction<keyof Omit<ReviewFilters, "rating">>) {
      state.filters[action.payload] = !state.filters[action.payload];
      state.pagination.visibleCount = PAGE_SIZE;
    },
    filtersCleared(state) {
      state.filters = { rating: "all", verifiedOnly: false, withPhotos: false, withVideos: false, withSellerResponse: false };
      state.pagination.visibleCount = PAGE_SIZE;
    },
    sortChanged(state, action: PayloadAction<ReviewSort>) {
      state.sort = action.payload;
      state.pagination.visibleCount = PAGE_SIZE;
    },
    selectedReviewSet(state, action: PayloadAction<string | null>) {
      state.selectedReviewId = action.payload;
    },
    loadMoreRequested(state) {
      state.pagination.loadMore = { phase: "loading" };
    },
    loadMoreSucceeded(state, action: PayloadAction<{ increment: number }>) {
      state.pagination.visibleCount += action.payload.increment;
      state.pagination.loadMore = { phase: "success" };
    },
    loadMoreFailed(state, action: PayloadAction<string>) {
      state.pagination.loadMore = { phase: "error", message: action.payload };
    },
    voteRequested(state, action: PayloadAction<string>) {
      state.voting[action.payload] = { phase: "loading" };
    },
    voteSucceeded(state, action: PayloadAction<{ reviewId: string; vote: ReviewVoteState }>) {
      const { reviewId, vote } = action.payload;
      const review = state.entities.byId[reviewId];
      if (review) {
        if (review.myVote === "helpful") review.helpfulCount -= 1;
        if (review.myVote === "notHelpful") review.notHelpfulCount -= 1;
        if (vote === "helpful") review.helpfulCount += 1;
        if (vote === "notHelpful") review.notHelpfulCount += 1;
        review.myVote = vote;
      }
      state.voting[reviewId] = { phase: "success" };
    },
    voteFailed(state, action: PayloadAction<{ reviewId: string; message: string }>) {
      state.voting[action.payload.reviewId] = { phase: "error", message: action.payload.message };
    },
    reportRequested(state, action: PayloadAction<string>) {
      state.reporting[action.payload] = { phase: "loading" };
    },
    reportSucceeded(state, action: PayloadAction<string>) {
      state.reporting[action.payload] = { phase: "success" };
    },
    reportFailed(state, action: PayloadAction<{ reviewId: string; message: string }>) {
      state.reporting[action.payload.reviewId] = { phase: "error", message: action.payload.message };
    },
    reportReset(state, action: PayloadAction<string>) {
      delete state.reporting[action.payload];
    },
    submissionStarted(state) {
      state.submission = { phase: "loading" };
    },
    submissionSucceeded(state, action: PayloadAction<Review>) {
      const review = action.payload;
      if (!state.entities.byId[review.id]) state.entities.ids.unshift(review.id);
      state.entities.byId[review.id] = review;
      state.submission = { phase: "success" };
    },
    submissionFailed(state, action: PayloadAction<string>) {
      state.submission = { phase: "error", message: action.payload };
    },
    submissionReset(state) {
      state.submission = { phase: "idle" };
    },
    reviewDeleted(state, action: PayloadAction<string>) {
      const id = action.payload;
      delete state.entities.byId[id];
      state.entities.ids = state.entities.ids.filter((existingId) => existingId !== id);
      if (state.selectedReviewId === id) state.selectedReviewId = null;
    },
  },
});

const {
  listLoadSucceeded,
  listLoadFailed,
  searchChanged,
  ratingFilterChanged,
  booleanFilterToggled,
  filtersCleared,
  sortChanged,
  selectedReviewSet,
  loadMoreRequested,
  loadMoreSucceeded,
  loadMoreFailed,
  voteRequested,
  voteSucceeded,
  voteFailed,
  reportRequested,
  reportSucceeded,
  reportFailed,
  reportReset,
  submissionStarted,
  submissionSucceeded,
  submissionFailed,
  submissionReset,
  reviewDeleted,
} = reviewsSlice.actions;

interface ReviewSummaryState {
  data: ReviewSummary | null;
  status: OperationState;
}

const initialSummaryState: ReviewSummaryState = { data: null, status: { phase: "loading" } };

const reviewSummarySlice = createSlice({
  name: "reviewSummary",
  initialState: initialSummaryState,
  reducers: {
    summaryLoadSucceeded(state, action: PayloadAction<ReviewSummary>) {
      state.data = action.payload;
      state.status = { phase: "success" };
    },
    summaryLoadFailed(state, action: PayloadAction<string>) {
      state.status = { phase: "error", message: action.payload };
    },
  },
});

const { summaryLoadSucceeded, summaryLoadFailed } = reviewSummarySlice.actions;

interface MyReviewsState {
  ids: string[];
  activeTab: MyReviewsTab;
  status: OperationState;
}

const initialMyReviewsState: MyReviewsState = {
  ids: MOCK_MY_REVIEWS.map((r) => r.id),
  activeTab: "published",
  status: { phase: "loading" },
};

const myReviewsSlice = createSlice({
  name: "myReviews",
  initialState: initialMyReviewsState,
  reducers: {
    myReviewsLoadSucceeded(state) {
      state.status = { phase: "success" };
    },
    myReviewsLoadFailed(state, action: PayloadAction<string>) {
      state.status = { phase: "error", message: action.payload };
    },
    activeTabChanged(state, action: PayloadAction<MyReviewsTab>) {
      state.activeTab = action.payload;
    },
    myReviewIdAdded(state, action: PayloadAction<string>) {
      if (!state.ids.includes(action.payload)) state.ids.unshift(action.payload);
    },
    myReviewIdRemoved(state, action: PayloadAction<string>) {
      state.ids = state.ids.filter((id) => id !== action.payload);
    },
  },
});

const { myReviewsLoadSucceeded, myReviewsLoadFailed, activeTabChanged, myReviewIdAdded, myReviewIdRemoved } = myReviewsSlice.actions;

const store = configureStore({
  reducer: {
    reviews: reviewsSlice.reducer,
    reviewSummary: reviewSummarySlice.reducer,
    myReviews: myReviewsSlice.reducer,
  },
});

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

const useAppDispatch: () => AppDispatch = useReduxDispatch;
const useAppSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

// ============================================================================
// SELECTORS
// ============================================================================

const selectReviewEntities = (state: RootState) => state.reviews.entities;
const selectSearch = (state: RootState) => state.reviews.search;
const selectFilters = (state: RootState) => state.reviews.filters;
const selectSort = (state: RootState) => state.reviews.sort;
const selectPagination = (state: RootState) => state.reviews.pagination;
const selectSelectedReviewId = (state: RootState) => state.reviews.selectedReviewId;
const selectListStatus = (state: RootState) => state.reviews.listStatus;
const selectVotingState = (reviewId: string) => (state: RootState): OperationState => state.reviews.voting[reviewId] ?? { phase: "idle" };
const selectReportingState = (reviewId: string) => (state: RootState): OperationState => state.reviews.reporting[reviewId] ?? { phase: "idle" };
const selectSubmissionState = (state: RootState) => state.reviews.submission;

const selectReviewById = (reviewId: string | null) => (state: RootState): Review | null =>
  reviewId ? state.reviews.entities.byId[reviewId] ?? null : null;

const selectSummary = (state: RootState) => state.reviewSummary.data;
const selectSummaryStatus = (state: RootState) => state.reviewSummary.status;

const selectMyReviewIds = (state: RootState) => state.myReviews.ids;
const selectMyReviewsActiveTab = (state: RootState) => state.myReviews.activeTab;
const selectMyReviewsStatus = (state: RootState) => state.myReviews.status;

/** All published, non-own reviews for the current product — the base pool before search/filter/sort. */
const selectPublicReviewPool = createSelector([selectReviewEntities], (entities) =>
  entities.ids
    .map((id) => entities.byId[id])
    .filter((review) => review.productId === MOCK_PRODUCT.id && review.status === "published" && !review.isOwn),
);

function reviewMatchesSearch(review: Review, query: string): boolean {
  if (!query.trim()) return true;
  const needle = query.trim().toLowerCase();
  return (
    review.title.toLowerCase().includes(needle) ||
    review.body.toLowerCase().includes(needle) ||
    review.author.displayName.toLowerCase().includes(needle) ||
    (review.variant?.label.toLowerCase().includes(needle) ?? false)
  );
}

function reviewMatchesFilters(review: Review, filters: ReviewFilters): boolean {
  if (filters.rating !== "all" && review.rating !== filters.rating) return false;
  if (filters.verifiedOnly && !review.isVerifiedPurchase) return false;
  if (filters.withPhotos && !review.media.some((m) => m.kind === "image")) return false;
  if (filters.withVideos && !review.media.some((m) => m.kind === "video")) return false;
  if (filters.withSellerResponse && !review.sellerResponse) return false;
  return true;
}

function sortReviews(reviews: Review[], sort: ReviewSort): Review[] {
  const sorted = reviews.slice();
  switch (sort) {
    case "recent":
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "helpful":
      return sorted.sort((a, b) => b.helpfulCount - a.helpfulCount);
    case "highest":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "lowest":
      return sorted.sort((a, b) => a.rating - b.rating);
    case "media":
      return sorted.sort((a, b) => b.media.length - a.media.length);
    case "relevant":
    default:
      // Relevance blends helpfulness with recency — verified + helpful + recent surfaces first.
      return sorted.sort((a, b) => {
        const scoreA = a.helpfulCount + (a.isVerifiedPurchase ? 25 : 0) + new Date(a.createdAt).getTime() / 1e11;
        const scoreB = b.helpfulCount + (b.isVerifiedPurchase ? 25 : 0) + new Date(b.createdAt).getTime() / 1e11;
        return scoreB - scoreA;
      });
  }
}

/** Full filtered + sorted result set (before pagination slicing). */
const selectFilteredReviews = createSelector(
  [selectPublicReviewPool, selectSearch, selectFilters, selectSort],
  (pool, search, filters, sort) => sortReviews(pool.filter((r) => reviewMatchesSearch(r, search) && reviewMatchesFilters(r, filters)), sort),
);

const selectVisibleReviews = createSelector([selectFilteredReviews, selectPagination], (filtered, pagination) =>
  filtered.slice(0, pagination.visibleCount),
);

const selectHasMoreReviews = createSelector(
  [selectFilteredReviews, selectPagination],
  (filtered, pagination) => pagination.visibleCount < filtered.length,
);

const selectActiveFilterCount = createSelector([selectFilters], (filters) => {
  let count = 0;
  if (filters.rating !== "all") count += 1;
  if (filters.verifiedOnly) count += 1;
  if (filters.withPhotos) count += 1;
  if (filters.withVideos) count += 1;
  if (filters.withSellerResponse) count += 1;
  return count;
});

const selectMyReviews = createSelector([selectReviewEntities, selectMyReviewIds], (entities, ids) =>
  ids.map((id) => entities.byId[id]).filter((review): review is Review => Boolean(review)),
);

const selectMyReviewsForActiveTab = createSelector([selectMyReviews, selectMyReviewsActiveTab], (reviews, tab) =>
  reviews.filter((r) => r.status === tab),
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Renders a tenths-based rating (47 -> "4.7") without floating-point aggregation. */
function formatRatingTenths(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

function ratingTenthsToStars(tenths: number): { full: number; half: boolean; empty: number } {
  const twentieths = Math.round(tenths * 2); // half-star resolution
  const full = Math.floor(twentieths / 10) > 5 ? 5 : Math.floor(twentieths / 10);
  const half = twentieths % 10 >= 5 && full < 5;
  const empty = 5 - full - (half ? 1 : 0);
  return { full, half, empty };
}

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeShort(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diffDays < 1) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function computeNetVoteState(current: ReviewVoteState, pressed: "helpful" | "notHelpful"): ReviewVoteState {
  // Pressing the already-active vote clears it; the two vote types can never be simultaneously active.
  return current === pressed ? "none" : pressed;
}

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function deriveEligibility(product: ProductContext, myReviews: Review[]): ReviewEligibility {
  if (!product.isAvailable) return { status: "productUnavailable" };
  const existing = myReviews.find((r) => r.productId === product.id);
  if (existing) {
    if (existing.status === "pending") return { status: "pendingPreviousReview" };
    if (existing.status === "published" || existing.status === "draft") return { status: "alreadyReviewed", reviewId: existing.id };
  }
  return { status: "eligible" };
}

const ELIGIBILITY_MESSAGE: Record<ReviewEligibility["status"], string> = {
  eligible: "You're eligible to write a review for this product.",
  alreadyReviewed: "You've already reviewed this product. You can edit your existing review instead.",
  purchaseRequired: "Purchase this product to write a verified review.",
  reviewWindowExpired: "The review window for this order has closed.",
  productUnavailable: "This product is no longer available for review.",
  pendingPreviousReview: "Your previous review for this product is still pending moderation.",
};

// ============================================================================
// PRIMITIVES
// ============================================================================

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]",
  secondary: "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-[var(--color-secondary-hover)]",
  outline: "bg-transparent border border-[var(--color-border-strong)] text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]",
  ghost: "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]",
  destructive: "bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] hover:bg-[var(--color-destructive-hover)]",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors duration-[var(--duration-fast)]",
        "disabled:pointer-events-none disabled:opacity-50",
        fullWidth && "w-full",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="animate-spin-slow" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  pressed?: boolean;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, pressed, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors duration-[var(--duration-fast)]",
        "hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]",
        pressed && "bg-[var(--color-secondary)] text-[var(--color-foreground)]",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

type BadgeTone = "success" | "info" | "warning" | "destructive" | "neutral";

const BADGE_TONES: Record<BadgeTone, string> = {
  success: "bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]",
  info: "bg-[var(--color-info-muted)] text-[var(--color-info-foreground)]",
  warning: "bg-[var(--color-warning-muted)] text-[var(--color-warning-foreground)]",
  destructive: "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]",
  neutral: "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]",
};

function Badge({ tone, icon, children }: { tone: BadgeTone; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", BADGE_TONES[tone])}>
      {icon}
      {children}
    </span>
  );
}

const REVIEW_STATUS_TONE: Record<ReviewStatus, BadgeTone> = {
  draft: "neutral",
  pending: "warning",
  published: "success",
  rejected: "destructive",
  removed: "neutral",
};

/** Accessible star rating: renders visual stars plus a screen-reader-only numeric statement — never color-only. */
function StarRating({
  ratingTenths,
  size = 16,
  showNumeric = false,
}: {
  ratingTenths: number;
  size?: number;
  showNumeric?: boolean;
}) {
  const { full, half, empty } = ratingTenthsToStars(ratingTenths);
  const label = `${formatRatingTenths(ratingTenths)} out of 5 stars`;
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={label}>
      <span className="inline-flex items-center" aria-hidden="true">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} size={size} className="fill-[var(--color-star)] text-[var(--color-star)]" />
        ))}
        {half && (
          <span className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-[var(--color-star-empty)]" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
              <Star size={size} className="fill-[var(--color-star)] text-[var(--color-star)]" />
            </span>
          </span>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} size={size} className="text-[var(--color-star-empty)]" />
        ))}
      </span>
      {showNumeric && <span className="text-sm font-medium text-[var(--color-foreground)]">{formatRatingTenths(ratingTenths)}</span>}
    </span>
  );
}

/** Interactive star input for the write/edit review form — full keyboard support. */
function StarRatingInput({ value, onChange, error }: { value: RatingValue | null; onChange: (v: RatingValue) => void; error?: string }) {
  const [hovered, setHovered] = useState<RatingValue | null>(null);
  const display = hovered ?? value ?? 0;
  return (
    <div>
      <div role="radiogroup" aria-label="Rating" aria-required="true" className="inline-flex items-center gap-1">
        {([1, 2, 3, 4, 5] as RatingValue[]).map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(null)}
            onClick={() => onChange(star)}
            className="rounded-sm p-0.5"
          >
            <Star size={28} className={star <= display ? "fill-[var(--color-star)] text-[var(--color-star)]" : "text-[var(--color-star-empty)]"} />
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-[var(--color-destructive)]">
          {error}
        </p>
      )}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden="true" />;
}

function InlineSpinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
      <Loader2 size={15} className="animate-spin-slow" aria-hidden="true" />
      {label}
    </span>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 px-3 py-2.5 text-sm">
      <span className="flex items-center gap-2 text-[var(--color-destructive)]">
        <AlertTriangle size={15} className="shrink-0" />
        {message}
      </span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} icon={<RefreshCcw size={13} />}>
          Retry
        </Button>
      )}
    </div>
  );
}

function EmptyPanel({ icon: Icon, title, description, action }: { icon: IconType; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--color-border)] px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-muted)]">
        <Icon size={20} className="text-[var(--color-muted-foreground)]" />
      </span>
      <div>
        <p className="text-sm font-medium text-[var(--color-foreground)]">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--color-muted-foreground)]">{description}</p>
      </div>
      {action}
    </div>
  );
}

type IconType = React.ComponentType<{ size?: number | string; className?: string }>;

function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    const focusable = container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable[0]?.focus();
    function onKeydown(e: KeyboardEvent) {
      if (e.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    container.addEventListener("keydown", onKeydown);
    return () => container.removeEventListener("keydown", onKeydown);
  }, [active, containerRef]);
}

function useEscapeKey(handler: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") handler();
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [handler, active]);
}

/** Shared modal shell: centered dialog on desktop/tablet, full-screen sheet on mobile. */
function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(ref, open);
  useEscapeKey(onClose, open);
  if (!open) return null;
  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[var(--color-overlay)] animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col rounded-t-xl border border-[var(--color-border)] bg-[var(--color-popover)] shadow-[var(--shadow-lg)] animate-sheet-up sm:rounded-xl sm:animate-scale-in",
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-[var(--color-popover-foreground)]">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{description}</p>}
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/** Mobile filter/sort surface — a bottom sheet rather than a shrunken desktop layout. */
function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);
  useEscapeKey(onClose, open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:hidden">
      <div className="absolute inset-0 bg-[var(--color-overlay)] animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-xl border border-[var(--color-border)] bg-[var(--color-popover)] shadow-[var(--shadow-lg)] animate-sheet-up">
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-popover)] px-5 py-3.5">
          <p className="text-sm font-semibold text-[var(--color-popover-foreground)]">{title}</p>
          <IconButton label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// REVIEW COMPONENTS
// ============================================================================

function ReviewerIdentity({ author, isOwn }: { author: ReviewAuthor; isOwn: boolean }) {
  const initials = author.displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-xs font-medium text-[var(--color-muted-foreground)]" aria-hidden="true">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
          {author.displayName}
          {isOwn && <span className="ml-1.5 text-xs font-normal text-[var(--color-muted-foreground)]">(You)</span>}
        </p>
        <p className="text-xs text-[var(--color-muted-foreground)]">{author.totalReviews} reviews</p>
      </div>
    </div>
  );
}

function VerifiedPurchaseBadge() {
  return (
    <Badge tone="success" icon={<BadgeCheck size={13} />}>
      Verified Purchase
    </Badge>
  );
}

function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge tone={REVIEW_STATUS_TONE[status]}>{REVIEW_STATUS_LABEL[status]}</Badge>;
}

function ReviewProsCons({ pros, cons }: { pros: string[]; cons: string[] }) {
  if (pros.length === 0 && cons.length === 0) return null;
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {pros.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-[var(--color-success-foreground)]">Pros</p>
          <ul className="space-y-1">
            {pros.map((pro, i) => (
              <li key={i} className="flex items-start gap-1.5 text-sm text-[var(--color-foreground)]">
                <Plus size={13} className="mt-0.5 shrink-0 text-[var(--color-success-foreground)]" aria-hidden="true" />
                {pro}
              </li>
            ))}
          </ul>
        </div>
      )}
      {cons.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-[var(--color-destructive)]">Cons</p>
          <ul className="space-y-1">
            {cons.map((con, i) => (
              <li key={i} className="flex items-start gap-1.5 text-sm text-[var(--color-foreground)]">
                <Minus size={13} className="mt-0.5 shrink-0 text-[var(--color-destructive)]" aria-hidden="true" />
                {con}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReviewMediaThumbnails({ media, onOpen }: { media: ReviewMedia[]; onOpen: (index: number) => void }) {
  if (media.length === 0) return null;
  const imageCount = media.filter((m) => m.kind === "image").length;
  const videoCount = media.filter((m) => m.kind === "video").length;
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2" role="list" aria-label="Customer media">
        {media.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            onClick={() => onOpen(index)}
            className="group relative h-16 w-16 overflow-hidden rounded-md border border-[var(--color-border)]"
            aria-label={`${item.kind === "video" ? "Play video" : "View photo"}: ${item.altText}`}
          >
            <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover transition-transform duration-[var(--duration-base)] group-hover:scale-105" />
            {item.kind === "video" && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                <Film size={16} className="text-white" aria-hidden="true" />
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">
        {imageCount > 0 && `${imageCount} photo${imageCount === 1 ? "" : "s"}`}
        {imageCount > 0 && videoCount > 0 && " · "}
        {videoCount > 0 && `${videoCount} video${videoCount === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}

function ReviewHelpfulActions({ review }: { review: Review }) {
  const dispatch = useAppDispatch();
  const votingState = useAppSelector(selectVotingState(review.id));
  const totalVotes = review.helpfulCount + review.notHelpfulCount;

  const castVote = useCallback(
    async (pressed: "helpful" | "notHelpful") => {
      const nextVote = computeNetVoteState(review.myVote, pressed);
      dispatch(voteRequested(review.id));
      try {
        await new Promise((resolve, reject) => setTimeout(() => (Math.random() < 0.04 ? reject(new Error("network")) : resolve(null)), 350));
        dispatch(voteSucceeded({ reviewId: review.id, vote: nextVote }));
      } catch {
        dispatch(voteFailed({ reviewId: review.id, message: "Couldn't record your vote. Please try again." }));
      }
    },
    [dispatch, review.id, review.myVote],
  );

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <span className="text-xs text-[var(--color-muted-foreground)]" aria-live="polite">
        {totalVotes > 0 ? `${formatCompactCount(review.helpfulCount)} people found this helpful` : "Was this review helpful?"}
      </span>
      <div className="flex items-center gap-1.5" role="group" aria-label="Vote on review helpfulness">
        <button
          type="button"
          aria-pressed={review.myVote === "helpful"}
          disabled={votingState.phase === "loading"}
          onClick={() => castVote("helpful")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            review.myVote === "helpful" ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "border-[var(--color-border-strong)] text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]",
          )}
        >
          Helpful
        </button>
        <button
          type="button"
          aria-pressed={review.myVote === "notHelpful"}
          disabled={votingState.phase === "loading"}
          onClick={() => castVote("notHelpful")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            review.myVote === "notHelpful" ? "border-[var(--color-border-strong)] bg-[var(--color-secondary)] text-[var(--color-foreground)]" : "border-[var(--color-border-strong)] text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]",
          )}
        >
          Not helpful
        </button>
        {votingState.phase === "loading" && <Loader2 size={13} className="animate-spin-slow text-[var(--color-muted-foreground)]" aria-hidden="true" />}
      </div>
      {votingState.phase === "error" && <span className="text-xs text-[var(--color-destructive)]">{votingState.message}</span>}
    </div>
  );
}

function SellerResponseBlock({ response }: { response: SellerResponse }) {
  return (
    <div className="mt-3 rounded-md border border-[var(--color-info)]/30 bg-[var(--color-info-muted)] p-3">
      <div className="flex items-center gap-2">
        <Store size={14} className="text-[var(--color-info-foreground)]" aria-hidden="true" />
        <p className="text-xs font-semibold text-[var(--color-info-foreground)]">Seller Response · Official Store</p>
        <span className="text-xs text-[var(--color-muted-foreground)]">{formatReviewDate(response.respondedAt)}</span>
      </div>
      <p className="mt-1.5 text-sm text-[var(--color-foreground)]">{response.message}</p>
    </div>
  );
}

function ReviewCard({
  review,
  onOpenMedia,
  onReport,
  onEdit,
  onDelete,
}: {
  review: Review;
  onOpenMedia: (review: Review, index: number) => void;
  onReport: (reviewId: string) => void;
  onEdit?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
}) {
  const reportingState = useAppSelector(selectReportingState(review.id));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <article className="border-b border-[var(--color-border)] py-5 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <ReviewerIdentity author={review.author} isOwn={review.isOwn} />
        <div ref={menuRef} className="relative">
          <IconButton label="Review actions" onClick={() => setMenuOpen((v) => !v)} pressed={menuOpen}>
            <MoreHorizontal size={16} />
          </IconButton>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-[var(--color-border)] bg-[var(--color-popover)] p-1 shadow-[var(--shadow-md)] animate-scale-in">
              {review.isOwn && onEdit && (
                <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); onEdit(review.id); }} className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm text-[var(--color-popover-foreground)] hover:bg-[var(--color-secondary)]">
                  <PenSquare size={14} /> Edit review
                </button>
              )}
              {review.isOwn && onDelete && (
                <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); onDelete(review.id); }} className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10">
                  <Trash2 size={14} /> Delete review
                </button>
              )}
              {!review.isOwn && (
                <button
                  role="menuitem"
                  type="button"
                  disabled={reportingState.phase === "success"}
                  onClick={() => { setMenuOpen(false); onReport(review.id); }}
                  className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm text-[var(--color-foreground)] hover:bg-[var(--color-secondary)] disabled:opacity-50"
                >
                  <Flag size={14} /> {reportingState.phase === "success" ? "Reported" : "Report review"}
                </button>
              )}
              <button role="menuitem" type="button" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]">
                <Share2 size={14} /> Share
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StarRating ratingTenths={review.rating * 10} size={15} />
        {review.isVerifiedPurchase && <VerifiedPurchaseBadge />}
        {review.status !== "published" && <ReviewStatusBadge status={review.status} />}
      </div>

      {review.title && <h3 className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">{review.title}</h3>}
      {review.body && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[var(--color-foreground)]">{review.body}</p>}

      <ReviewProsCons pros={review.pros} cons={review.cons} />
      <ReviewMediaThumbnails media={review.media} onOpen={(index) => onOpenMedia(review, index)} />

      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
        <span>Reviewed on {formatReviewDate(review.createdAt)}</span>
        {review.editedAt && <span>· Edited {formatRelativeShort(review.editedAt)}</span>}
        {review.variant && <span>· Variant: {review.variant.label}</span>}
      </p>

      {!review.isOwn && <ReviewHelpfulActions review={review} />}
      {reportingState.phase === "success" && (
        <p role="status" className="mt-2 text-xs text-[var(--color-success-foreground)]">
          Thanks — we've received your report and our team will review it.
        </p>
      )}
      {review.sellerResponse && <SellerResponseBlock response={review.sellerResponse} />}
    </article>
  );
}

// ============================================================================
// RATING COMPONENTS
// ============================================================================

function RatingSummarySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

function OverallRating({ summary }: { summary: ReviewSummary }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-semibold tabular-nums text-[var(--color-foreground)]">{formatRatingTenths(summary.averageRatingTenths)}</span>
        <span className="text-sm text-[var(--color-muted-foreground)]">out of 5</span>
      </div>
      <div className="mt-1.5">
        <StarRating ratingTenths={summary.averageRatingTenths} size={18} />
      </div>
      <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">{formatCompactCount(summary.totalRatings)} ratings</p>
    </div>
  );
}

function RatingDistributionRows({ summary, activeFilter, onSelectRating }: { summary: ReviewSummary; activeFilter: ReviewRatingFilter; onSelectRating: (rating: RatingValue) => void }) {
  const maxCount = Math.max(...summary.distribution.map((d) => d.count));
  return (
    <div className="mt-4 space-y-1.5" role="list" aria-label="Rating distribution">
      {summary.distribution.map((entry) => {
        const percent = Math.round((entry.count / summary.totalRatings) * 100);
        const isActive = activeFilter === entry.rating;
        return (
          <button
            key={entry.rating}
            type="button"
            role="listitem"
            aria-pressed={isActive}
            aria-label={`${entry.rating} star: ${formatCompactCount(entry.count)} ratings, ${percent} percent. ${isActive ? "Filtering applied, activate to clear." : "Activate to filter."}`}
            onClick={() => onSelectRating(entry.rating)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[var(--color-secondary)]",
              isActive && "bg-[var(--color-secondary)]",
            )}
          >
            <span className="w-9 shrink-0 text-xs text-[var(--color-muted-foreground)]">{entry.rating} ★</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-muted)]">
              <span className="block h-full rounded-full bg-[var(--color-star)]" style={{ width: `${(entry.count / maxCount) * 100}%` }} />
            </span>
            <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[var(--color-muted-foreground)]">{formatCompactCount(entry.count)}</span>
          </button>
        );
      })}
    </div>
  );
}

function RatingOverviewCard({
  status,
  summary,
  onRetry,
  activeFilter,
  onSelectRating,
}: {
  status: OperationState;
  summary: ReviewSummary | null;
  onRetry: () => void;
  activeFilter: ReviewRatingFilter;
  onSelectRating: (rating: RatingValue) => void;
}) {
  return (
    <section aria-labelledby="rating-overview-heading" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <h2 id="rating-overview-heading" className="text-sm font-semibold text-[var(--color-card-foreground)]">
        Customer ratings
      </h2>
      <div className="mt-3">
        {status.phase === "loading" && <RatingSummarySkeleton />}
        {status.phase === "error" && <InlineError message="Rating summary is unavailable right now." onRetry={onRetry} />}
        {status.phase === "success" && summary && (
          <>
            <OverallRating summary={summary} />
            <RatingDistributionRows summary={summary} activeFilter={activeFilter} onSelectRating={onSelectRating} />
          </>
        )}
      </div>
    </section>
  );
}

function ReviewInsightsCard({ status, summary }: { status: OperationState; summary: ReviewSummary | null }) {
  return (
    <section aria-labelledby="review-insights-heading" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <h2 id="review-insights-heading" className="text-sm font-semibold text-[var(--color-card-foreground)]">
        Review insights
      </h2>
      <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">Summary information derived from customer reviews on this product.</p>
      {status.phase === "loading" && (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}
      {status.phase === "success" && summary && (
        <dl className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-[var(--color-muted-foreground)]">
              <ShieldCheck size={14} /> Verified purchases
            </dt>
            <dd className="font-medium tabular-nums text-[var(--color-foreground)]">{summary.verifiedPurchaseRatio}%</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-[var(--color-muted-foreground)]">
              <Camera size={14} /> Reviews with media
            </dt>
            <dd className="font-medium tabular-nums text-[var(--color-foreground)]">{formatCompactCount(summary.mediaReviewCount)}</dd>
          </div>
          <div className="border-t border-[var(--color-border)] pt-3">
            <p className="mb-1.5 text-xs font-medium text-[var(--color-success-foreground)]">Common positive themes</p>
            <ul className="space-y-1">
              {summary.positiveThemes.map((theme) => (
                <li key={theme.label} className="text-xs text-[var(--color-muted-foreground)]">
                  <span className="font-medium text-[var(--color-foreground)]">{theme.label}</span> — {theme.value}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--color-destructive)]">Common negative themes</p>
            <ul className="space-y-1">
              {summary.negativeThemes.map((theme) => (
                <li key={theme.label} className="text-xs text-[var(--color-muted-foreground)]">
                  <span className="font-medium text-[var(--color-foreground)]">{theme.label}</span> — {theme.value}
                </li>
              ))}
            </ul>
          </div>
        </dl>
      )}
    </section>
  );
}

// ============================================================================
// PRODUCT REVIEW CONTEXT
// ============================================================================

function ProductReviewContext({ product, summary }: { product: ProductContext; summary: ReviewSummary | null }) {
  return (
    <section aria-label="Product being reviewed" className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <img src={product.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-md border border-[var(--color-border)] object-cover sm:h-20 sm:w-20" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--color-muted-foreground)]">{product.brand}</p>
        <h1 className="truncate text-sm font-semibold text-[var(--color-foreground)] sm:text-base">{product.title}</h1>
        <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{product.selectedVariant}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {summary && (
            <span className="flex items-center gap-1.5 text-xs">
              <StarRating ratingTenths={summary.averageRatingTenths} size={13} />
              <span className="font-medium tabular-nums text-[var(--color-foreground)]">{formatRatingTenths(summary.averageRatingTenths)}</span>
              <span className="text-[var(--color-muted-foreground)]">({formatCompactCount(summary.totalRatings)})</span>
            </span>
          )}
          <Badge tone={product.isAvailable ? "success" : "neutral"}>{product.isAvailable ? "In stock" : "Unavailable"}</Badge>
        </div>
      </div>
      <Button variant="outline" size="sm" className="hidden shrink-0 sm:inline-flex">
        View Product
      </Button>
    </section>
  );
}

// ============================================================================
// REVIEW TOOLBAR — search, filters, sort, active chips
// ============================================================================

function ReviewSearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1">
      <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search reviews…"
        aria-label="Search reviews"
        className="h-9 w-full rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] pl-8 pr-8 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus-visible:border-[var(--color-ring)]"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

const RATING_FILTER_OPTIONS: { id: ReviewRatingFilter; label: string }[] = [
  { id: "all", label: "All Ratings" },
  { id: 5, label: "5 Star" },
  { id: 4, label: "4 Star" },
  { id: 3, label: "3 Star" },
  { id: 2, label: "2 Star" },
  { id: 1, label: "1 Star" },
];

function FilterControls() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-[var(--color-muted-foreground)]">Rating</legend>
        <div className="flex flex-wrap gap-1.5">
          {RATING_FILTER_OPTIONS.map((option) => (
            <button
              key={String(option.id)}
              type="button"
              aria-pressed={filters.rating === option.id}
              onClick={() => dispatch(ratingFilterChanged(option.id))}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                filters.rating === option.id
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "border-[var(--color-border-strong)] text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-[var(--color-muted-foreground)]">Refine</legend>
        <div className="space-y-2">
          {(
            [
              ["verifiedOnly", "Verified Purchases"],
              ["withPhotos", "With Photos"],
              ["withVideos", "With Videos"],
              ["withSellerResponse", "With Seller Response"],
            ] as [keyof Omit<ReviewFilters, "rating">, string][]
          ).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-foreground)]">
              <input
                type="checkbox"
                checked={filters[key]}
                onChange={() => dispatch(booleanFilterToggled(key))}
                className="h-4 w-4 rounded border-[var(--color-border-strong)] accent-[var(--color-primary)]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function SortMenu() {
  const dispatch = useAppDispatch();
  const sort = useAppSelector(selectSort);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  const activeLabel = SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "Most Relevant";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]"
      >
        <SlidersHorizontal size={14} />
        <span className="hidden sm:inline">Sort: {activeLabel}</span>
        <span className="sm:hidden">Sort</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-52 rounded-md border border-[var(--color-border)] bg-[var(--color-popover)] p-1 shadow-[var(--shadow-md)] animate-scale-in">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              role="menuitemradio"
              aria-checked={sort === option.id}
              type="button"
              onClick={() => {
                dispatch(sortChanged(option.id));
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left text-sm hover:bg-[var(--color-secondary)]",
                sort === option.id ? "font-medium text-[var(--color-foreground)]" : "text-[var(--color-foreground)]",
              )}
            >
              {option.label}
              {sort === option.id && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveFilterChips() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);
  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (filters.rating !== "all") chips.push({ key: "rating", label: `${filters.rating} Star`, onRemove: () => dispatch(ratingFilterChanged("all")) });
  if (filters.verifiedOnly) chips.push({ key: "verified", label: "Verified Purchases", onRemove: () => dispatch(booleanFilterToggled("verifiedOnly")) });
  if (filters.withPhotos) chips.push({ key: "photos", label: "With Photos", onRemove: () => dispatch(booleanFilterToggled("withPhotos")) });
  if (filters.withVideos) chips.push({ key: "videos", label: "With Videos", onRemove: () => dispatch(booleanFilterToggled("withVideos")) });
  if (filters.withSellerResponse) chips.push({ key: "response", label: "With Seller Response", onRemove: () => dispatch(booleanFilterToggled("withSellerResponse")) });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <span key={chip.key} className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-secondary)] py-1 pl-3 pr-1.5 text-xs text-[var(--color-secondary-foreground)]">
          {chip.label}
          <button type="button" onClick={chip.onRemove} aria-label={`Remove filter ${chip.label}`} className="rounded-full p-0.5 hover:bg-[var(--color-border-strong)]/40">
            <X size={12} />
          </button>
        </span>
      ))}
      <button type="button" onClick={() => dispatch(filtersCleared())} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
        Clear all
      </button>
    </div>
  );
}

function ReviewToolbar() {
  const dispatch = useAppDispatch();
  const search = useAppSelector(selectSearch);
  const activeFilterCount = useAppSelector(selectActiveFilterCount);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <div className="space-y-3 border-b border-[var(--color-border)] pb-4">
      <div className="flex items-center gap-2">
        <ReviewSearchInput value={search} onChange={(v) => dispatch(searchChanged(v))} />
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-secondary)] sm:hidden"
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] text-[var(--color-primary-foreground)]">{activeFilterCount}</span>}
        </button>
        <div className="hidden sm:block">
          <SortMenu />
        </div>
      </div>

      <div className="hidden sm:block">
        <FilterControls />
      </div>

      <ActiveFilterChips />

      <BottomSheet open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} title="Filter & sort reviews">
        <div className="space-y-5">
          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--color-muted-foreground)]">Sort by</p>
            <div className="grid grid-cols-2 gap-1.5">
              <MobileSortOptions />
            </div>
          </div>
          <FilterControls />
        </div>
        <div className="sticky bottom-0 mt-5 flex gap-2 border-t border-[var(--color-border)] bg-[var(--color-popover)] pt-3">
          <Button variant="outline" fullWidth onClick={() => dispatch(filtersCleared())}>
            Clear all
          </Button>
          <Button variant="primary" fullWidth onClick={() => setMobileFiltersOpen(false)}>
            Show results
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

function MobileSortOptions() {
  const dispatch = useAppDispatch();
  const sort = useAppSelector(selectSort);
  return (
    <>
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={sort === option.id}
          onClick={() => dispatch(sortChanged(option.id))}
          className={cn(
            "rounded-md border px-2.5 py-1.5 text-left text-xs font-medium",
            sort === option.id ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "border-[var(--color-border-strong)] text-[var(--color-foreground)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </>
  );
}

// ============================================================================
// REVIEW CONTENT — list, pagination, empty states
// ============================================================================

function ReviewCardSkeleton() {
  return (
    <div className="border-b border-[var(--color-border)] py-5 last:border-0">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="mt-3 h-4 w-40" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-5/6" />
    </div>
  );
}

function ReviewEmptyState({ search, hasActiveFilters, onClearSearch, onClearFilters }: { search: string; hasActiveFilters: boolean; onClearSearch: () => void; onClearFilters: () => void }) {
  if (search) {
    return (
      <EmptyPanel
        icon={Search}
        title={`No reviews match "${search}"`}
        description="Try a different search term or clear the search to see all reviews."
        action={
          <Button variant="outline" size="sm" onClick={onClearSearch}>
            Clear search
          </Button>
        }
      />
    );
  }
  if (hasActiveFilters) {
    return (
      <EmptyPanel
        icon={Filter}
        title="No reviews match your filters"
        description="Try removing a filter to see more reviews."
        action={
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear all filters
          </Button>
        }
      />
    );
  }
  return <EmptyPanel icon={MessageSquare} title="No reviews yet" description="Be the first to share your experience with this product." />;
}

function ReviewPagination({ onLoadMore }: { onLoadMore: () => void }) {
  const hasMore = useAppSelector(selectHasMoreReviews);
  const pagination = useAppSelector(selectPagination);
  const totalFiltered = useAppSelector(selectFilteredReviews).length;

  if (totalFiltered === 0) return null;

  if (!hasMore) {
    return <p className="pt-4 text-center text-xs text-[var(--color-muted-foreground)]">You've reached the end of the reviews.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2 pt-4">
      <Button variant="outline" onClick={onLoadMore} loading={pagination.loadMore.phase === "loading"}>
        Load more reviews
      </Button>
      {pagination.loadMore.phase === "error" && <InlineError message={pagination.loadMore.message} onRetry={onLoadMore} />}
    </div>
  );
}

function ReviewList({
  onOpenMedia,
  onReport,
}: {
  onOpenMedia: (review: Review, index: number) => void;
  onReport: (reviewId: string) => void;
}) {
  const dispatch = useAppDispatch();
  const listStatus = useAppSelector(selectListStatus);
  const visibleReviews = useAppSelector(selectVisibleReviews);
  const search = useAppSelector(selectSearch);
  const activeFilterCount = useAppSelector(selectActiveFilterCount);

  const handleLoadMore = useCallback(() => {
    dispatch(loadMoreRequested());
    setTimeout(() => {
      if (Math.random() < 0.05) {
        dispatch(loadMoreFailed("Couldn't load more reviews. Check your connection and try again."));
      } else {
        dispatch(loadMoreSucceeded({ increment: PAGE_SIZE }));
      }
    }, 500);
  }, [dispatch]);

  if (listStatus.phase === "loading") {
    return (
      <div>
        {Array.from({ length: 3 }).map((_, i) => (
          <ReviewCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (listStatus.phase === "error") {
    return <InlineError message="Reviews are temporarily unavailable." onRetry={() => dispatch(listLoadSucceeded())} />;
  }

  if (visibleReviews.length === 0) {
    return (
      <ReviewEmptyState
        search={search}
        hasActiveFilters={activeFilterCount > 0}
        onClearSearch={() => dispatch(searchChanged(""))}
        onClearFilters={() => dispatch(filtersCleared())}
      />
    );
  }

  return (
    <div>
      {visibleReviews.map((review) => (
        <ReviewCard key={review.id} review={review} onOpenMedia={onOpenMedia} onReport={onReport} />
      ))}
      <ReviewPagination onLoadMore={handleLoadMore} />
    </div>
  );
}

// ============================================================================
// WRITE REVIEW — eligibility, prompt, dialog with validated form
// ============================================================================

interface ReviewFormValues {
  rating: RatingValue | null;
  title: string;
  body: string;
  pros: string;
  cons: string;
  variant: string;
}

interface ReviewFormErrors {
  rating?: string;
  title?: string;
  body?: string;
}

const EMPTY_FORM: ReviewFormValues = { rating: null, title: "", body: "", pros: "", cons: "", variant: "" };

function reviewToFormValues(review: Review): ReviewFormValues {
  return {
    rating: review.rating,
    title: review.title,
    body: review.body,
    pros: review.pros.join("\n"),
    cons: review.cons.join("\n"),
    variant: review.variant?.label ?? "",
  };
}

function validateReviewForm(values: ReviewFormValues): ReviewFormErrors {
  const errors: ReviewFormErrors = {};
  if (!values.rating) errors.rating = "Please select a star rating.";
  if (values.title.trim().length > 0 && values.title.trim().length < 4) errors.title = "Title should be at least 4 characters.";
  if (values.title.trim().length > 120) errors.title = "Title must be under 120 characters.";
  if (values.body.trim().length < 20) errors.body = "Please write at least 20 characters describing your experience.";
  if (values.body.trim().length > 4000) errors.body = "Review body must be under 4,000 characters.";
  return errors;
}

function MediaUploader({ items, onAdd, onRemove }: { items: MediaDraftItem[]; onAdd: (kind: "image" | "video") => void; onRemove: (localId: string) => void }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div key={item.localId} className="relative h-16 w-16 overflow-hidden rounded-md border border-[var(--color-border)]">
            <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
            {item.kind === "video" && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                <Film size={14} className="text-white" />
              </span>
            )}
            {item.upload.phase === "loading" && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 size={16} className="animate-spin-slow text-white" />
              </span>
            )}
            {item.upload.phase === "error" && (
              <span className="absolute inset-0 flex items-center justify-center bg-[var(--color-destructive)]/70">
                <AlertTriangle size={16} className="text-white" />
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(item.localId)}
              aria-label="Remove media"
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        {items.length < 6 && (
          <>
            <button
              type="button"
              onClick={() => onAdd("image")}
              className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[var(--color-border-strong)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <ImageIcon size={16} />
              <span className="text-[10px]">Photo</span>
            </button>
            <button
              type="button"
              onClick={() => onAdd("video")}
              className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[var(--color-border-strong)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <Video size={16} />
              <span className="text-[10px]">Video</span>
            </button>
          </>
        )}
      </div>
      <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">Up to 6 files. JPG, PNG, or MP4 — 25MB max each.</p>
    </div>
  );
}

const MOCK_MEDIA_PREVIEWS = [
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&h=200&fit=crop",
];

function WriteReviewDialog({
  open,
  onClose,
  product,
  editingReview,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductContext;
  editingReview: Review | null;
}) {
  const dispatch = useAppDispatch();
  const submission = useAppSelector(selectSubmissionState);
  const [values, setValues] = useState<ReviewFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const [media, setMedia] = useState<MediaDraftItem[]>([]);
  const [attestPurchase, setAttestPurchase] = useState(true);

  useEffect(() => {
    if (!open) return;
    setValues(editingReview ? reviewToFormValues(editingReview) : { ...EMPTY_FORM, variant: product.selectedVariant });
    setErrors({});
    setMedia([]);
    dispatch(submissionReset());
  }, [open, editingReview, product.selectedVariant, dispatch]);

  const addMedia = useCallback((kind: "image" | "video") => {
    const localId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const previewUrl = MOCK_MEDIA_PREVIEWS[Math.floor(Math.random() * MOCK_MEDIA_PREVIEWS.length)];
    setMedia((prev) => [...prev, { localId, kind, previewUrl, upload: { phase: "loading" } }]);
    setTimeout(() => {
      setMedia((prev) =>
        prev.map((item) => (item.localId === localId ? { ...item, upload: Math.random() < 0.9 ? { phase: "success" } : { phase: "error", message: "Upload failed" } } : item)),
      );
    }, 700);
  }, []);

  const removeMedia = useCallback((localId: string) => {
    setMedia((prev) => prev.filter((item) => item.localId !== localId));
  }, []);

  const handleSaveDraft = useCallback(() => {
    const draft: Review = {
      id: editingReview?.id ?? `rev_draft_${Date.now()}`,
      productId: product.id,
      author: { id: CURRENT_USER_ID, displayName: "You", avatarUrl: null, totalReviews: 6 },
      rating: values.rating ?? 5,
      title: values.title,
      body: values.body,
      pros: values.pros.split("\n").map((p) => p.trim()).filter(Boolean),
      cons: values.cons.split("\n").map((c) => c.trim()).filter(Boolean),
      media: [],
      variant: values.variant ? { label: values.variant } : null,
      status: "draft",
      isVerifiedPurchase: attestPurchase,
      createdAt: editingReview?.createdAt ?? new Date().toISOString(),
      editedAt: editingReview ? new Date().toISOString() : null,
      helpfulCount: editingReview?.helpfulCount ?? 0,
      notHelpfulCount: editingReview?.notHelpfulCount ?? 0,
      myVote: "none",
      sellerResponse: editingReview?.sellerResponse ?? null,
      isOwn: true,
    };
    dispatch(submissionSucceeded(draft));
    dispatch(myReviewIdAdded(draft.id));
    onClose();
  }, [dispatch, editingReview, product.id, values, attestPurchase, onClose]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const validation = validateReviewForm(values);
      setErrors(validation);
      if (Object.keys(validation).length > 0) return;

      dispatch(submissionStarted());
      try {
        await new Promise((resolve, reject) => setTimeout(() => (Math.random() < 0.06 ? reject(new Error("submit failed")) : resolve(null)), 700));
        const publishedReview: Review = {
          id: editingReview?.id ?? `rev_pending_${Date.now()}`,
          productId: product.id,
          author: { id: CURRENT_USER_ID, displayName: "You", avatarUrl: null, totalReviews: 6 },
          rating: values.rating as RatingValue,
          title: values.title.trim(),
          body: values.body.trim(),
          pros: values.pros.split("\n").map((p) => p.trim()).filter(Boolean),
          cons: values.cons.split("\n").map((c) => c.trim()).filter(Boolean),
          media: media.filter((m) => m.upload.phase === "success").map((m) => (m.kind === "image" ? mediaImage(m.localId, "photo-1505740420928-5e560c06d30e", "Customer photo") : mediaVideo(m.localId, "photo-1484704849700-f032a568e944", "Customer video", 20))),
          variant: values.variant ? { label: values.variant } : null,
          status: "pending",
          isVerifiedPurchase: attestPurchase,
          createdAt: editingReview?.createdAt ?? new Date().toISOString(),
          editedAt: editingReview ? new Date().toISOString() : null,
          helpfulCount: editingReview?.helpfulCount ?? 0,
          notHelpfulCount: editingReview?.notHelpfulCount ?? 0,
          myVote: "none",
          sellerResponse: editingReview?.sellerResponse ?? null,
          isOwn: true,
        };
        dispatch(submissionSucceeded(publishedReview));
        dispatch(myReviewIdAdded(publishedReview.id));
      } catch {
        dispatch(submissionFailed("We couldn't submit your review. Please try again."));
      }
    },
    [dispatch, editingReview, product.id, values, media, attestPurchase],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingReview ? "Edit your review" : "Write a review"}
      description={product.title}
      size="lg"
      footer={
        submission.phase === "success" ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={handleSaveDraft} disabled={submission.phase === "loading"}>
              Save as draft
            </Button>
            <Button variant="outline" onClick={onClose} disabled={submission.phase === "loading"}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={submission.phase === "loading"}>
              {editingReview ? "Save changes" : "Submit review"}
            </Button>
          </>
        )
      }
    >
      {submission.phase === "success" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 size={36} className="text-[var(--color-success)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">Review submitted</p>
            <p className="mt-1 max-w-sm text-xs text-[var(--color-muted-foreground)]">
              Thanks for your feedback. Your review is pending moderation and will appear publicly once approved.
            </p>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {submission.phase === "error" && <InlineError message={submission.message} />}

          <div className="flex items-center gap-3 rounded-md border border-[var(--color-border)] p-2.5">
            <img src={product.imageUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[var(--color-foreground)]">{product.title}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{product.brand}</p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--color-foreground)]">Your rating *</p>
            <StarRatingInput value={values.rating} onChange={(rating) => setValues((v) => ({ ...v, rating }))} error={errors.rating} />
          </div>

          <div>
            <label htmlFor="review-title" className="mb-1.5 block text-xs font-medium text-[var(--color-foreground)]">
              Title
            </label>
            <input
              id="review-title"
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              maxLength={120}
              placeholder="Sum up your experience in one line"
              className="h-9 w-full rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-foreground)] focus-visible:border-[var(--color-ring)]"
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title && <p className="mt-1 text-xs text-[var(--color-destructive)]">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="review-body" className="mb-1.5 block text-xs font-medium text-[var(--color-foreground)]">
              Your review *
            </label>
            <textarea
              id="review-body"
              value={values.body}
              onChange={(e) => setValues((v) => ({ ...v, body: e.target.value }))}
              rows={5}
              maxLength={4000}
              placeholder="What did you like or dislike? How did you use this product?"
              className="w-full rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-foreground)] focus-visible:border-[var(--color-ring)]"
              aria-invalid={Boolean(errors.body)}
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.body ? <p className="text-xs text-[var(--color-destructive)]">{errors.body}</p> : <span />}
              <span className="text-xs text-[var(--color-muted-foreground)]">{values.body.length}/4000</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="review-pros" className="mb-1.5 block text-xs font-medium text-[var(--color-foreground)]">
                Pros <span className="font-normal text-[var(--color-muted-foreground)]">(one per line)</span>
              </label>
              <textarea id="review-pros" value={values.pros} onChange={(e) => setValues((v) => ({ ...v, pros: e.target.value }))} rows={3} className="w-full rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-foreground)] focus-visible:border-[var(--color-ring)]" />
            </div>
            <div>
              <label htmlFor="review-cons" className="mb-1.5 block text-xs font-medium text-[var(--color-foreground)]">
                Cons <span className="font-normal text-[var(--color-muted-foreground)]">(one per line)</span>
              </label>
              <textarea id="review-cons" value={values.cons} onChange={(e) => setValues((v) => ({ ...v, cons: e.target.value }))} rows={3} className="w-full rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-foreground)] focus-visible:border-[var(--color-ring)]" />
            </div>
          </div>

          <div>
            <label htmlFor="review-variant" className="mb-1.5 block text-xs font-medium text-[var(--color-foreground)]">
              Variant purchased
            </label>
            <input
              id="review-variant"
              value={values.variant}
              onChange={(e) => setValues((v) => ({ ...v, variant: e.target.value }))}
              className="h-9 w-full rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-foreground)] focus-visible:border-[var(--color-ring)]"
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--color-foreground)]">Add photos or videos</p>
            <MediaUploader items={media} onAdd={addMedia} onRemove={removeMedia} />
          </div>

          <label className="flex items-start gap-2 rounded-md border border-[var(--color-border)] p-2.5 text-xs text-[var(--color-muted-foreground)]">
            <input type="checkbox" checked={attestPurchase} onChange={(e) => setAttestPurchase(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-[var(--color-border-strong)] accent-[var(--color-primary)]" />
            I confirm this review reflects my genuine purchase and experience with this product.
          </label>
        </form>
      )}
    </Dialog>
  );
}

// ============================================================================
// WRITE REVIEW SECTION — eligibility + prompt
// ============================================================================

function WriteReviewSection({ eligibility, onOpenWrite, onOpenEdit }: { eligibility: ReviewEligibility; onOpenWrite: () => void; onOpenEdit: (reviewId: string) => void }) {
  return (
    <section aria-labelledby="write-review-heading" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <h2 id="write-review-heading" className="text-sm font-semibold text-[var(--color-card-foreground)]">
        Share your experience
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{ELIGIBILITY_MESSAGE[eligibility.status]}</p>
      <div className="mt-3">
        {eligibility.status === "eligible" && (
          <Button variant="primary" icon={<PenSquare size={15} />} onClick={onOpenWrite}>
            Write a Review
          </Button>
        )}
        {eligibility.status === "alreadyReviewed" && (
          <Button variant="outline" icon={<PenSquare size={15} />} onClick={() => onOpenEdit(eligibility.reviewId)}>
            Edit your review
          </Button>
        )}
        {(eligibility.status === "purchaseRequired" || eligibility.status === "productUnavailable" || eligibility.status === "pendingPreviousReview") && (
          <Button variant="secondary" disabled icon={<HelpCircle size={15} />}>
            Write a Review
          </Button>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// MY REVIEWS SECTION
// ============================================================================

const MY_REVIEWS_TABS: { id: MyReviewsTab; label: string }[] = [
  { id: "published", label: "Published" },
  { id: "drafts", label: "Drafts" },
  { id: "pending", label: "Pending" },
];

function MyReviewRow({
  review,
  onEdit,
  onDelete,
}: {
  review: Review;
  onEdit: (reviewId: string) => void;
  onDelete: (reviewId: string) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] py-3.5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StarRating ratingTenths={review.rating * 10} size={13} />
          <ReviewStatusBadge status={review.status} />
          {review.editedAt && <span className="text-xs text-[var(--color-muted-foreground)]">Edited</span>}
        </div>
        <p className="mt-1 truncate text-sm font-medium text-[var(--color-foreground)]">{review.title || "Untitled draft"}</p>
        <p className="line-clamp-2 text-xs text-[var(--color-muted-foreground)]">{review.body || "No content yet."}</p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{formatReviewDate(review.createdAt)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconButton label={review.status === "draft" ? "Continue editing" : "Edit review"} onClick={() => onEdit(review.id)}>
          <PenSquare size={15} />
        </IconButton>
        <IconButton label={review.status === "draft" ? "Discard draft" : "Delete review"} onClick={() => onDelete(review.id)}>
          <Trash2 size={15} />
        </IconButton>
        {review.status === "published" && (
          <IconButton label="Share review">
            <Share2 size={15} />
          </IconButton>
        )}
      </div>
    </div>
  );
}

const MY_REVIEWS_EMPTY_COPY: Record<MyReviewsTab, { title: string; description: string }> = {
  published: { title: "No reviews written yet", description: "Reviews you publish will appear here for easy management." },
  drafts: { title: "No draft reviews", description: "Start a review and save it as a draft to finish later." },
  pending: { title: "No reviews pending", description: "Submitted reviews awaiting moderation will appear here." },
};

function MyReviewsSection({ onEdit, onDelete }: { onEdit: (reviewId: string) => void; onDelete: (reviewId: string) => void }) {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(selectMyReviewsActiveTab);
  const status = useAppSelector(selectMyReviewsStatus);
  const reviews = useAppSelector(selectMyReviewsForActiveTab);

  return (
    <section aria-labelledby="my-reviews-heading" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <h2 id="my-reviews-heading" className="text-sm font-semibold text-[var(--color-card-foreground)]">
        My reviews
      </h2>
      <div role="tablist" aria-label="My reviews status" className="mt-3 flex gap-1 border-b border-[var(--color-border)]">
        {MY_REVIEWS_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`my-reviews-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`my-reviews-panel-${tab.id}`}
            onClick={() => dispatch(activeTabChanged(tab.id))}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id ? "border-[var(--color-primary)] text-[var(--color-foreground)]" : "border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`my-reviews-panel-${activeTab}`} aria-labelledby={`my-reviews-tab-${activeTab}`} className="pt-1">
        {status.phase === "loading" && (
          <div className="space-y-3 py-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}
        {status.phase === "error" && <InlineError message="Couldn't load your reviews right now." />}
        {status.phase === "success" &&
          (reviews.length === 0 ? (
            <div className="py-6">
              <EmptyPanel icon={MessageSquare} title={MY_REVIEWS_EMPTY_COPY[activeTab].title} description={MY_REVIEWS_EMPTY_COPY[activeTab].description} />
            </div>
          ) : (
            <div>
              {reviews.map((review) => (
                <MyReviewRow key={review.id} review={review} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
          ))}
      </div>
    </section>
  );
}

// ============================================================================
// DIALOGS — delete, report, media viewer, details panel
// ============================================================================

function DeleteReviewDialog({ review, onClose, onConfirm }: { review: Review | null; onClose: () => void; onConfirm: (reviewId: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  if (!review) return null;
  const isDraft = review.status === "draft";
  return (
    <Dialog
      open={Boolean(review)}
      onClose={onClose}
      title={isDraft ? "Discard draft?" : "Delete review?"}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={deleting}
            onClick={() => {
              setDeleting(true);
              setTimeout(() => {
                onConfirm(review.id);
                setDeleting(false);
              }, 400);
            }}
          >
            {isDraft ? "Discard draft" : "Delete review"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--color-foreground)]">
        {isDraft
          ? "This draft and any unsaved content will be permanently discarded. This cannot be undone."
          : "This will permanently remove your review, including any helpful votes and seller responses it has received. This cannot be undone."}
      </p>
    </Dialog>
  );
}

function ReportReviewDialog({ reviewId, onClose }: { reviewId: string | null; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const reportingState = useAppSelector(selectReportingState(reviewId ?? "__none__"));
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");

  useEffect(() => {
    setReason(null);
    setDetails("");
  }, [reviewId]);

  if (!reviewId) return null;

  const handleSubmit = async () => {
    if (!reason) return;
    dispatch(reportRequested(reviewId));
    try {
      await new Promise((resolve, reject) => setTimeout(() => (Math.random() < 0.05 ? reject(new Error("fail")) : resolve(null)), 500));
      dispatch(reportSucceeded(reviewId));
    } catch {
      dispatch(reportFailed({ reviewId, message: "Couldn't submit your report. Please try again." }));
    }
  };

  return (
    <Dialog
      open={Boolean(reviewId)}
      onClose={onClose}
      title="Report review"
      description="Help us understand what's wrong with this review. Reports are reviewed by our trust & safety team."
      size="sm"
      footer={
        reportingState.phase === "success" ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!reason} loading={reportingState.phase === "loading"} onClick={handleSubmit}>
              Submit report
            </Button>
          </>
        )
      }
    >
      {reportingState.phase === "success" ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle2 size={30} className="text-[var(--color-success)]" />
          <p className="text-sm text-[var(--color-foreground)]">Thanks — your report has been submitted.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reportingState.phase === "error" && <InlineError message={reportingState.message} />}
          <fieldset role="radiogroup" aria-label="Reason for reporting" className="space-y-1.5">
            {REPORT_REASONS.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]">
                <input type="radio" name="report-reason" checked={reason === r.id} onChange={() => setReason(r.id)} className="h-4 w-4 accent-[var(--color-primary)]" />
                {r.label}
              </label>
            ))}
          </fieldset>
          <div>
            <label htmlFor="report-details" className="mb-1.5 block text-xs font-medium text-[var(--color-foreground)]">
              Additional details (optional)
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 py-2 text-sm text-[var(--color-foreground)] focus-visible:border-[var(--color-ring)]"
            />
          </div>
        </div>
      )}
    </Dialog>
  );
}

interface MediaViewerTarget {
  media: ReviewMedia[];
  index: number;
  reviewTitle: string;
}

function ReviewMediaViewer({ target, onClose, onNavigate }: { target: MediaViewerTarget | null; onClose: () => void; onNavigate: (delta: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, Boolean(target));

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate(1);
      if (e.key === "ArrowLeft") onNavigate(-1);
    },
    [onClose, onNavigate],
  );
  useEffect(() => {
    if (!target) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [target, handleKey]);

  if (!target) return null;
  const item = target.media[target.index];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
      <div ref={ref} role="dialog" aria-modal="true" aria-label={`Media viewer: ${target.reviewTitle}`} className="relative flex h-full w-full max-w-3xl flex-col items-center justify-center">
        <IconButton label="Close media viewer" onClick={onClose} className="absolute right-0 top-0 text-white hover:bg-white/10 hover:text-white">
          <X size={22} />
        </IconButton>
        <div className="flex w-full flex-1 items-center justify-center">
          <img src={item.url} alt={item.altText} className="max-h-full max-w-full rounded-md object-contain" />
        </div>
        <div className="mt-3 flex items-center gap-4 text-white">
          <IconButton
            label="Previous media"
            onClick={() => onNavigate(-1)}
            disabled={target.index === 0}
            className="text-white hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </IconButton>
          <span className="text-xs tabular-nums text-white/80">
            {target.index + 1} / {target.media.length}
          </span>
          <IconButton
            label="Next media"
            onClick={() => onNavigate(1)}
            disabled={target.index === target.media.length - 1}
            className="text-white hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </IconButton>
        </div>
        <p className="mt-1 max-w-md text-center text-xs text-white/70">{item.altText}</p>
      </div>
    </div>
  );
}

// ============================================================================
// HEADER / FOOTER / SITE CHROME
// ============================================================================
// Kept consistent with the rest of the ecommerce ecosystem (Home, PDP, Cart,
// Orders, Account) so this screen doesn't feel like a standalone tool.

function AnnouncementBar() {
  return (
    <div className="hidden bg-[var(--color-primary)] px-4 py-1.5 text-center text-xs text-[var(--color-primary-foreground)] sm:block">
      Free standard shipping on orders over $50 · Extended holiday returns through Jan 31
    </div>
  );
}

function EcommerceHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-background)]">
      <AnnouncementBar />
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Open menu" aria-expanded={mobileMenuOpen} className="text-[var(--color-foreground)] lg:hidden">
          <Menu size={20} />
        </button>
        <a href="#" className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
          meridian
        </a>
        <nav aria-label="Category navigation" className="ml-4 hidden items-center gap-5 text-sm text-[var(--color-foreground-secondary,var(--color-foreground))] lg:flex">
          {["Electronics", "Home & Living", "Fashion", "Beauty", "Deals"].map((cat) => (
            <a key={cat} href="#" className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
              {cat}
            </a>
          ))}
        </nav>
        <div className="relative ml-auto hidden max-w-md flex-1 sm:block">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="search"
            placeholder="Search products, brands, and more"
            aria-label="Search the store"
            className="h-9 w-full rounded-full border border-[var(--color-input-border)] bg-[var(--color-input)] pl-9 pr-3 text-sm text-[var(--color-foreground)] focus-visible:border-[var(--color-ring)]"
          />
        </div>
        <div className="ml-auto flex items-center gap-1 sm:ml-3">
          <IconButton label="Search" className="sm:hidden">
            <Search size={18} />
          </IconButton>
          <IconButton label="Notifications">
            <Bell size={18} />
          </IconButton>
          <IconButton label="Wishlist">
            <Heart size={18} />
          </IconButton>
          <IconButton label="Account">
            <User size={18} />
          </IconButton>
          <IconButton label="Cart, 2 items">
            <ShoppingCart size={18} />
          </IconButton>
        </div>
      </div>
    </header>
  );
}

function Breadcrumbs({ product }: { product: ProductContext }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 py-3 text-xs text-[var(--color-muted-foreground)] sm:px-6 lg:px-8">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <a href="#" className="hover:text-[var(--color-foreground)]">
            Home
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <a href="#" className="hover:text-[var(--color-foreground)]">
            Electronics
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <a href="#" className="max-w-[10rem] truncate hover:text-[var(--color-foreground)] sm:max-w-xs">
            {product.title}
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="font-medium text-[var(--color-foreground)]">
          Reviews
        </li>
      </ol>
    </nav>
  );
}

const RELATED_PRODUCTS = [
  { id: "rp1", title: "Aurelia Audio Bass Grip True Wireless Earbuds", price: "$129.00", rating: 46, imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&h=300&fit=crop" },
  { id: "rp2", title: "Aurelia Audio Studio One Over-Ear Headphones", price: "$189.00", rating: 44, imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300&h=300&fit=crop" },
  { id: "rp3", title: "Aurelia Audio TravelCase Pro Hardshell Case", price: "$34.00", rating: 48, imageUrl: "https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=300&h=300&fit=crop" },
  { id: "rp4", title: "Aurelia Audio ClearTalk Bluetooth Speakerphone", price: "$79.00", rating: 43, imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=300&fit=crop" },
];

function RelatedProductsSection() {
  return (
    <section aria-labelledby="related-products-heading" className="border-t border-[var(--color-border)] py-8">
      <h2 id="related-products-heading" className="text-base font-semibold text-[var(--color-foreground)]">
        You may also like
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {RELATED_PRODUCTS.map((item) => (
          <a key={item.id} href="#" className="group rounded-lg border border-[var(--color-border)] p-3 transition-colors hover:border-[var(--color-border-strong)]">
            <img src={item.imageUrl} alt="" className="aspect-square w-full rounded-md object-cover" />
            <p className="mt-2 line-clamp-2 text-xs font-medium text-[var(--color-foreground)] group-hover:underline">{item.title}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <StarRating ratingTenths={item.rating} size={11} />
            </div>
            <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">{item.price}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

const TRUST_POINTS = [
  { icon: ShieldCheck, title: "Buyer protection", description: "Full refund if an item doesn't match its description." },
  { icon: Truck, title: "Reliable delivery", description: "Real-time tracking on every order, worldwide." },
  { icon: Users, title: "Verified reviews", description: "Purchase-linked verification distinguishes genuine buyers." },
  { icon: Shield, title: "Secure payments", description: "Industry-standard encryption on every transaction." },
];

function TrustSection() {
  return (
    <section aria-labelledby="trust-heading" className="border-t border-[var(--color-border)] py-8">
      <h2 id="trust-heading" className="sr-only">
        Why shop with us
      </h2>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {TRUST_POINTS.map((point) => (
          <div key={point.title} className="flex flex-col items-start gap-2">
            <point.icon size={20} className="text-[var(--color-muted-foreground)]" aria-hidden="true" />
            <p className="text-sm font-medium text-[var(--color-foreground)]">{point.title}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">{point.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EcommerceFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { heading: "Shop", links: ["New arrivals", "Best sellers", "Deals", "Gift cards"] },
            { heading: "Customer service", links: ["Orders", "Returns & refunds", "Shipping info", "Contact us"] },
            { heading: "Account", links: ["Profile", "Addresses", "Payment methods", "Wishlist"] },
            { heading: "Company", links: ["About", "Careers", "Sustainability", "Press"] },
          ].map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground)]">{col.heading}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-8 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted-foreground)]">© 2026 Meridian Commerce, Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}

// ============================================================================
// REVIEWS WORKSPACE — header + composition root for the review experience
// ============================================================================

function ReviewsHeader({ summary }: { summary: ReviewSummary | null }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-foreground)] sm:text-2xl">Reviews &amp; Ratings</h1>
        {summary && (
          <p className="mt-1 flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            <StarRating ratingTenths={summary.averageRatingTenths} size={14} />
            <span className="font-medium text-[var(--color-foreground)]">{formatRatingTenths(summary.averageRatingTenths)}</span>
            <span>· {formatCompactCount(summary.totalRatings)} ratings</span>
          </p>
        )}
      </div>
    </div>
  );
}

function ReviewsWorkspace() {
  const dispatch = useAppDispatch();
  const product = MOCK_PRODUCT;
  const summary = useAppSelector(selectSummary);
  const summaryStatus = useAppSelector(selectSummaryStatus);
  const filters = useAppSelector(selectFilters);
  const myReviews = useAppSelector(selectMyReviews);

  const [writeDialogOpen, setWriteDialogOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [mediaViewer, setMediaViewer] = useState<MediaViewerTarget | null>(null);

  const editingReview = useAppSelector(selectReviewById(editingReviewId));
  const deleteTarget = useAppSelector(selectReviewById(deleteTargetId));

  // One-time simulated data load per section — independent skeletons rather
  // than a single page-level spinner, and a failure in one never blocks another.
  useEffect(() => {
    const summaryTimer = setTimeout(() => dispatch(summaryLoadSucceeded(MOCK_SUMMARY)), 550);
    const listTimer = setTimeout(() => dispatch(listLoadSucceeded()), 700);
    const myReviewsTimer = setTimeout(() => dispatch(myReviewsLoadSucceeded()), 650);
    return () => {
      clearTimeout(summaryTimer);
      clearTimeout(listTimer);
      clearTimeout(myReviewsTimer);
    };
  }, [dispatch]);

  const eligibility = useMemo(() => deriveEligibility(product, myReviews), [product, myReviews]);

  const handleOpenWrite = useCallback(() => {
    setEditingReviewId(null);
    setWriteDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((reviewId: string) => {
    setEditingReviewId(reviewId);
    setWriteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(
    (reviewId: string) => {
      dispatch(reviewDeleted(reviewId));
      dispatch(myReviewIdRemoved(reviewId));
      setDeleteTargetId(null);
    },
    [dispatch],
  );

  const handleOpenMedia = useCallback((review: Review, index: number) => {
    setMediaViewer({ media: review.media, index, reviewTitle: review.title });
  }, []);

  const handleNavigateMedia = useCallback((delta: number) => {
    setMediaViewer((current) => {
      if (!current) return current;
      const nextIndex = current.index + delta;
      if (nextIndex < 0 || nextIndex >= current.media.length) return current;
      return { ...current, index: nextIndex };
    });
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <ReviewsHeader summary={summary} />

      <div className="mt-4">
        <ProductReviewContext product={product} summary={summary} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <RatingOverviewCard
            status={summaryStatus}
            summary={summary}
            onRetry={() => dispatch(summaryLoadSucceeded(MOCK_SUMMARY))}
            activeFilter={filters.rating}
            onSelectRating={(rating) => dispatch(ratingFilterChanged(filters.rating === rating ? "all" : rating))}
          />
          <ReviewInsightsCard status={summaryStatus} summary={summary} />
          <WriteReviewSection eligibility={eligibility} onOpenWrite={handleOpenWrite} onOpenEdit={handleOpenEdit} />
          <MyReviewsSection onEdit={handleOpenEdit} onDelete={(id) => setDeleteTargetId(id)} />
        </aside>

        <div>
          <ReviewToolbar />
          <div className="mt-1">
            <ReviewList onOpenMedia={handleOpenMedia} onReport={(id) => setReportTargetId(id)} />
          </div>
        </div>
      </div>

      <RelatedProductsSection />
      <TrustSection />

      <WriteReviewDialog open={writeDialogOpen} onClose={() => setWriteDialogOpen(false)} product={product} editingReview={editingReview} />
      <DeleteReviewDialog review={deleteTarget} onClose={() => setDeleteTargetId(null)} onConfirm={handleConfirmDelete} />
      <ReportReviewDialog reviewId={reportTargetId} onClose={() => setReportTargetId(null)} />
      <ReviewMediaViewer target={mediaViewer} onClose={() => setMediaViewer(null)} onNavigate={handleNavigateMedia} />
    </div>
  );
}

// ============================================================================
// PAGE ROOT
// ============================================================================

function ReviewsRatingsPageContent() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <EcommerceHeader />
      <Breadcrumbs product={MOCK_PRODUCT} />
      <ReviewsWorkspace />
      <EcommerceFooter />
    </div>
  );
}

export default function ReviewsRatingsPage() {
  const storeRef = useRef(store);
  return (
    <Provider store={storeRef.current}>
      <ReviewsRatingsPageContent />
    </Provider>
  );
}