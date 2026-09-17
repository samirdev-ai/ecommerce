import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "./root-reducer";
import { ecommerceApi } from "./api/ecommerce.api";

export function makeStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault().concat(ecommerceApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
