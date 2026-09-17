"use client";
import { FilterSidebarContent } from "./FilterSidebarContent";

export function FilterSidebar() {
  return (
    <aside aria-label="Product filters" className="hidden w-[260px] shrink-0 lg:block">
      <div className="sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto pr-2">
        <FilterSidebarContent />
      </div>
    </aside>
  );
}
