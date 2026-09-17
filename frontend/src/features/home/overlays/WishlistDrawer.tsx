"use client";
import { Heart } from "lucide-react";
import { useGetWishlistQuery } from "@/store/api/ecommerce.api";
import { useCustomer } from "@/providers/use-customer";
import { Button } from "@/components/primitives/Button";
import { Skeleton } from "@/components/primitives/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Drawer } from "./Drawer";

export interface WishlistDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function WishlistDrawer({ open, onClose }: WishlistDrawerProps) {
  const customer = useCustomer();
  const { data, isLoading } = useGetWishlistQuery(undefined, { skip: !customer });

  return (
    <Drawer open={open} onClose={onClose} title="Your Wishlist">
      {!customer && (
        <div className="p-4">
          <EmptyState
            icon={Heart}
            title="Sign in to save items"
            description="Your wishlist is synced across devices when you're signed in."
            action={<Button onClick={onClose}>Sign in</Button>}
          />
        </div>
      )}
      {customer && isLoading && (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}
      {customer && !isLoading && (data?.length ?? 0) === 0 && (
        <div className="p-4">
          <EmptyState
            icon={Heart}
            title="No saved items yet"
            description="Tap the heart on any product to save it here."
          />
        </div>
      )}
    </Drawer>
  );
}
