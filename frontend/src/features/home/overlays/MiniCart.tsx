"use client";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useGetCartQuery } from "@/store/api/ecommerce.api";
import { Button } from "@/components/primitives/Button";
import { IconButton } from "@/components/primitives/IconButton";
import { Skeleton } from "@/components/primitives/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Drawer } from "./Drawer";

export interface MiniCartProps {
  open: boolean;
  onClose: () => void;
}

export function MiniCart({ open, onClose }: MiniCartProps) {
  const { data, isLoading, isError, refetch } = useGetCartQuery();

  return (
    <Drawer open={open} onClose={onClose} title="Your Cart">
      {isLoading && (
        <div className="space-y-4 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-20 rounded-[var(--radius-md)]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}
      {isError && (
        <div className="p-4">
          <ErrorState title="Couldn't load your cart" onRetry={refetch} />
        </div>
      )}
      {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
        <div className="p-4">
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Browse our best sellers and start filling it up."
            action={<Button onClick={onClose}>Continue shopping</Button>}
          />
        </div>
      )}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <ul className="divide-y divide-[var(--color-border)]">
            {data.items.map((item) => (
              <li key={item.id} className="flex gap-3 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" className="size-20 rounded-[var(--radius-md)] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-body font-medium">{item.name}</p>
                  <p className="mt-1 text-body font-semibold">{item.unitPrice.formatted}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)]">
                      <IconButton label="Decrease quantity" size="sm">
                        <Minus className="size-3" />
                      </IconButton>
                      <span className="min-w-6 text-center text-small tabular-nums">{item.quantity}</span>
                      <IconButton label="Increase quantity" size="sm">
                        <Plus className="size-3" />
                      </IconButton>
                    </div>
                    <IconButton label={`Remove ${item.name}`} size="sm">
                      <Trash2 className="size-3.5" />
                    </IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--color-border)] p-4">
            <div className="flex justify-between text-body">
              <span>Subtotal</span>
              <span className="font-semibold tabular-nums">{data.subtotal.formatted}</span>
            </div>
            <p className="mt-1 text-caption text-[var(--color-muted-foreground)]">
              Shipping and taxes calculated at checkout.
            </p>
            <Button size="lg" className="mt-3 w-full">
              Checkout · {data.estimatedTotal.formatted}
            </Button>
          </div>
        </>
      )}
    </Drawer>
  );
}
