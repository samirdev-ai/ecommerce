import type { Seller } from "@/domain/product.types";

export const SELLERS: readonly Seller[] = [
  { id: "nexus-direct", name: "Nexus Direct",     rating: 4.8, isOfficial: true },
  { id: "techhub",      name: "TechHub Official", rating: 4.6, isOfficial: true },
  { id: "compuworld",   name: "CompuWorld",       rating: 4.3, isOfficial: false },
  { id: "bytebazaar",   name: "ByteBazaar",       rating: 4.1, isOfficial: false },
];
