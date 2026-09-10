"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Category, MenuItem } from "@/lib/types";
import { ItemCard } from "@/components/item-card";
import { ItemCardSkeleton } from "@/components/skeleton";
import { getSocket } from "@/lib/socket";

type VegFilter = "all" | "veg" | "nonveg";

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [vegFilter, setVegFilter] = useState<VegFilter>("all");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<{ categories: Category[] }>("/api/categories").then((d) => setCategories(d.categories));
  }, []);

  const refetchItems = useCallback(() => {
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    if (search.trim()) params.set("search", search.trim());
    if (vegFilter !== "all") params.set("veg", vegFilter === "veg" ? "true" : "false");
    if (maxPrice) params.set("maxPrice", String(maxPrice));

    setLoading(true);
    return apiFetch<{ items: MenuItem[] }>(`/api/menu-items?${params.toString()}`)
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, [activeCategory, search, vegFilter, maxPrice]);

  useEffect(() => {
    refetchItems();
  }, [refetchItems]);

  // Sold-out toggles (and other menu edits) from the admin dashboard show up
  // here immediately, without a page refresh.
  useEffect(() => {
    const socket = getSocket();
    socket.on("menu:item-updated", refetchItems);
    return () => {
      socket.off("menu:item-updated", refetchItems);
    };
  }, [refetchItems]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 font-display text-2xl font-semibold text-charcoal">Our Menu</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            activeCategory === null ? "bg-spice-500 text-white" : "bg-spice-50 text-spice-700"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              activeCategory === cat.id ? "bg-spice-500 text-white" : "bg-spice-50 text-spice-700"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search for a dish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-full border border-charcoal/20 px-4 py-2 text-sm focus:border-spice-400 focus:outline-none"
        />
        <select
          value={vegFilter}
          onChange={(e) => setVegFilter(e.target.value as VegFilter)}
          className="rounded-full border border-charcoal/20 px-3 py-2 text-sm"
        >
          <option value="all">Veg &amp; Non-veg</option>
          <option value="veg">Veg only</option>
          <option value="nonveg">Non-veg only</option>
        </select>
        <select
          value={maxPrice ?? ""}
          onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
          className="rounded-full border border-charcoal/20 px-3 py-2 text-sm"
        >
          <option value="">Any price</option>
          <option value="50">Under ₹50</option>
          <option value="100">Under ₹100</option>
          <option value="200">Under ₹200</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-charcoal/50">No items match your filters.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}
