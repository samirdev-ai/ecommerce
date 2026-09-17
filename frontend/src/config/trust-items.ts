import type { ComponentType } from "react";
import { Truck, ShieldCheck, RotateCcw, Headphones } from "lucide-react";

export interface TrustItem {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export const TRUST_ITEMS: TrustItem[] = [
  { id: "shipping", icon: Truck,       title: "Free & Fast Delivery", description: "Free shipping on orders over $35" },
  { id: "secure",   icon: ShieldCheck, title: "Secure Payments",      description: "256-bit SSL encrypted checkout" },
  { id: "returns",  icon: RotateCcw,   title: "30-Day Returns",       description: "Hassle-free returns & refunds" },
  { id: "support",  icon: Headphones,  title: "24/7 Support",         description: "Real people, anytime you need" },
];
