import type { AttributeFilterConfig } from "@/domain/filter.types";

export const ATTRIBUTE_CONFIG: readonly AttributeFilterConfig[] = [
  { key: "ram",       label: "RAM",             options: ["8GB", "16GB", "32GB", "64GB"] },
  { key: "storage",   label: "Storage",         options: ["256GB SSD", "512GB SSD", "1TB SSD", "2TB SSD"] },
  { key: "processor", label: "Processor",       options: ["Intel Core i5", "Intel Core i7", "Intel Core i9", "Apple M3", "Apple M3 Pro", "AMD Ryzen 7", "AMD Ryzen 9"] },
  { key: "screenSize",label: "Screen Size",     options: ["13\"", "14\"", "15.6\"", "16\"", "17\""] },
  { key: "gpu",       label: "Graphics",        options: ["Integrated", "RTX 4050", "RTX 4060", "RTX 4070", "RTX 4080"] },
  { key: "os",        label: "Operating System",options: ["Windows 11", "macOS", "ChromeOS"] },
  { key: "color",     label: "Color",           options: ["Space Gray", "Silver", "Midnight Black", "Platinum"] },
];
