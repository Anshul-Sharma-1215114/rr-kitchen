"use client";

import Link from "next/link";
import Image from "next/image";
import type { MenuItem } from "@/lib/types";
import { formatInr } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { resolveImageUrl } from "@/lib/api-url";
import { VegBadge } from "./veg-badge";
import { QuantityStepper } from "./quantity-stepper";

export function ItemCard({ item }: { item: MenuItem }) {
  const { lines, addLine, updateQuantity } = useCart();
  const cartLine = lines.find((l) => l.kind === "item" && l.refId === item.id);
  const quantity = cartLine?.quantity ?? 0;
  const imageUrl = resolveImageUrl(item.imageUrl);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-spice-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/menu/${item.id}`} className="relative block aspect-[4/3] bg-spice-50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-spice-200">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/menu/${item.id}`} className="font-semibold leading-tight hover:text-spice-600">
            {item.name}
          </Link>
          <VegBadge isVeg={item.isVeg} />
        </div>
        {item.description && (
          <p className="line-clamp-2 text-sm text-charcoal/60">{item.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-lg font-semibold text-spice-700">{formatInr(item.price)}</span>
          {quantity > 0 ? (
            <QuantityStepper
              quantity={quantity}
              onChange={(next) => updateQuantity(cartLine!.key, next)}
            />
          ) : (
            <button
              onClick={() =>
                addLine({
                  kind: "item",
                  refId: item.id,
                  name: item.name,
                  price: Number(item.price),
                  imageUrl: item.imageUrl,
                  isVeg: item.isVeg,
                  quantity: 1,
                })
              }
              className="rounded-full border border-spice-500 px-4 py-1.5 text-sm font-medium text-spice-600 hover:bg-spice-500 hover:text-white"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
