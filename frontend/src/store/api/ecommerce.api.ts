import { createApi, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { HomePagePayload } from "@/domain/campaign.types";
import type { Product } from "@/domain/product.types";
import type { SearchSuggestion, Recommendation } from "@/domain/search.types";
import type { CartSummary, WishlistItem } from "@/domain/cart.types";
import { MOCK_DB } from "@/mocks/db";

type SimulatedBaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>;

const simulatedBaseQuery: SimulatedBaseQuery = async (args) => {
  return { data: { args } };
};

export const ecommerceApi = createApi({
  reducerPath: "ecommerceApi",
  baseQuery: simulatedBaseQuery,
  tagTypes: ["Home", "Cart", "Wishlist", "Recommendations", "Search", "RecentlyViewed"],
  keepUnusedDataFor: 300,
  refetchOnFocus: false,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getHomePage: builder.query<HomePagePayload, void>({
      queryFn: async () => {
        try { return { data: await MOCK_DB.home() }; }
        catch (e) { return { error: e as FetchBaseQueryError }; }
      },
      providesTags: ["Home"],
    }),
    getRecommendations: builder.query<Recommendation[], { customerId: string | null }>({
      queryFn: async ({ customerId }) => {
        try { return { data: await MOCK_DB.recommendations(customerId) }; }
        catch (e) { return { error: e as FetchBaseQueryError }; }
      },
      providesTags: ["Recommendations"],
    }),
    getRecentlyViewed: builder.query<Product[], void>({
      queryFn: async () => {
        try { return { data: await MOCK_DB.recentlyViewed() }; }
        catch (e) { return { error: e as FetchBaseQueryError }; }
      },
      providesTags: ["RecentlyViewed"],
    }),
    getSearchSuggestions: builder.query<SearchSuggestion[], string>({
      queryFn: async (q) => {
        try { return { data: await MOCK_DB.search(q) }; }
        catch (e) { return { error: e as FetchBaseQueryError }; }
      },
      providesTags: ["Search"],
      keepUnusedDataFor: 60,
    }),
    getCart: builder.query<CartSummary, void>({
      queryFn: async () => {
        try { return { data: await MOCK_DB.cart() }; }
        catch (e) { return { error: e as FetchBaseQueryError }; }
      },
      providesTags: ["Cart"],
    }),
    getWishlist: builder.query<WishlistItem[], void>({
      queryFn: async () => {
        try { return { data: await MOCK_DB.wishlist() }; }
        catch (e) { return { error: e as FetchBaseQueryError }; }
      },
      providesTags: ["Wishlist"],
    }),
  }),
});

export const {
  useGetHomePageQuery,
  useGetRecommendationsQuery,
  useGetRecentlyViewedQuery,
  useGetSearchSuggestionsQuery,
  useGetCartQuery,
  useGetWishlistQuery,
} = ecommerceApi;
