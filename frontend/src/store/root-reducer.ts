import { cartUiSlice } from "./slices/cart-ui.slice";
import { wishlistUiSlice } from "./slices/wishlist-ui.slice";
import { uiSlice } from "./slices/ui.slice";
import { preferencesSlice } from "./slices/preferences.slice";
import { searchUiSlice } from "./slices/search-ui.slice";
import { ecommerceApi } from "./api/ecommerce.api";
// ── scaffold:auto:category-slices:begin ──
import { cartSlice } from "./slices/cart.slice";
import { wishlistSlice } from "./slices/wishlist.slice";
import { filtersSlice } from "./slices/filters.slice";
import { sortSlice } from "./slices/sort.slice";
import { viewModeSlice } from "./slices/view-mode.slice";
import { productsSlice } from "./slices/products.slice";

export const rootReducer = {
  cartUi: cartUiSlice.reducer,
  wishlistUi: wishlistUiSlice.reducer,
  ui: uiSlice.reducer,
  preferences: preferencesSlice.reducer,
  searchUi: searchUiSlice.reducer,
  cart: cartSlice.reducer,
  wishlist: wishlistSlice.reducer,
  filters: filtersSlice.reducer,
  sort: sortSlice.reducer,
  products: productsSlice.reducer,
  viewMode: viewModeSlice.reducer,
  [ecommerceApi.reducerPath]: ecommerceApi.reducer,
};


// NOTE: these are added to the reducer object below.
// If your root-reducer uses `combineSlices` or an object literal,
// add the five keys manually:
// ── scaffold:auto:category-slices:end ──
