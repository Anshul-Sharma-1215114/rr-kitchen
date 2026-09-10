"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { MenuItem } from "@/lib/types";
import { ItemCard } from "@/components/item-card";
import { ItemCardSkeleton } from "@/components/skeleton";
import { getSocket } from "@/lib/socket";

// Ranked by real order volume server-side (apps/server/src/controllers/menu.controller.ts
// listPopularMenuItems), not a hardcoded list — falls back to newest items
// until enough order history exists to rank by.
export function PopularItemsSection() {
  const [items, setItems] = useState<MenuItem[] | null>(null);

  useEffect(() => {
    function load() {
      apiFetch<{ items: MenuItem[] }>("/api/menu-items/popular").then((d) => setItems(d.items));
    }
    load();
    const socket = getSocket();
    socket.on("menu:item-updated", load);
    return () => {
      socket.off("menu:item-updated", load);
    };
  }, []);

  if (items?.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="font-display text-xl font-semibold text-charcoal sm:text-2xl">Popular Right Now</h2>
      <p className="mt-1 text-sm text-charcoal/60">What our neighbors are ordering most.</p>
      <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
        {items === null
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-48 shrink-0 sm:w-56">
                <ItemCardSkeleton />
              </div>
            ))
          : items.map((item) => (
              <div key={item.id} className="w-48 shrink-0 sm:w-56">
                <ItemCard item={item} />
              </div>
            ))}
      </div>
    </section>
  );
}
