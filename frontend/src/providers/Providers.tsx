"use client";
import { useMemo, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store/store";
import { AuthProvider } from "./AuthProvider";
import type { Customer } from "@/domain/customer.types";

export function Providers({
  customer = null,
  children,
}: {
  customer?: Customer | null;
  children: ReactNode;
}) {
  const store = useMemo(() => makeStore(), []);
  return (
    <Provider store={store}>
      <AuthProvider customer={customer}>{children}</AuthProvider>
    </Provider>
  );
}
