"use client";
import { createContext, useMemo, type ReactNode } from "react";
import type { Customer } from "@/domain/customer.types";

export interface AuthContextValue {
  customer: Customer | null;
}

export const AuthContext = createContext<AuthContextValue>({ customer: null });

export function AuthProvider({
  customer,
  children,
}: {
  customer: Customer | null;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ customer }), [customer]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
