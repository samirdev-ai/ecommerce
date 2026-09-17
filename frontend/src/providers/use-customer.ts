"use client";
import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import type { Customer } from "@/domain/customer.types";

export function useCustomer(): Customer | null {
  return useContext(AuthContext).customer;
}
