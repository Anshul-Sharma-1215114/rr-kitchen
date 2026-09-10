"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { Combo } from "@/lib/types";
import { formatInr } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { ComboCardSkeleton } from "@/components/skeleton";

function ComboHighlightCard({ combo }: { combo: Combo }) {
  const { addLine } = useCart();
  const [added, setAdded] = useState(false);

  function orderThisMeal() {
    addLine({
      kind: "combo",
      refId: combo.id,
      name: combo.name,
      price: Number(combo.price),
      imageUrl: combo.imageUrl,
      isVeg: combo.items.every((ci) => ci.menuItem.isVeg),
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border-2 border-leaf-200 bg-white shadow-sm">
      <div className="bg-leaf-100 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-leaf-700">
        Complete Meal
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold text-charcoal">{combo.name}</h3>
        {combo.description && <p className="mt-1 text-sm text-charcoal/60">{combo.description}</p>}
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-charcoal/40">What&apos;s included</p>
        <p className="mt-1 text-sm text-charcoal/70">
          {combo.items.map((ci) => (ci.quantity > 1 ? `${ci.menuItem.name} (x${ci.quantity})` : ci.menuItem.name)).join(" · ")}
        </p>
        <div className="mt-auto flex items-center justify-between pt-5">
          <span className="font-display text-xl font-semibold text-leaf-700">{formatInr(combo.price)}</span>
          <div className="flex items-center gap-2">
            <Link href={`/combo/${combo.id}`} className="text-xs text-charcoal/50 underline underline-offset-2">
              Customize
            </Link>
            <button
              onClick={orderThisMeal}
              className="rounded-full bg-leaf-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-leaf-700"
            >
              {added ? "Added ✓" : "Order this meal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComboHighlightSection() {
  const [combos, setCombos] = useState<Combo[] | null>(null);

  useEffect(() => {
    apiFetch<{ combos: Combo[] }>("/api/combos").then((d) => setCombos(d.combos));
  }, []);

  if (combos?.length === 0) return null;

  return (
    <section className="bg-leaf-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="font-display text-xl font-semibold text-charcoal sm:text-2xl">Complete Meals</h2>
        <p className="mt-1 text-sm text-charcoal/60">
          Our signature thalis — a full home-style meal in one order, at one price.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {combos === null
            ? Array.from({ length: 3 }).map((_, i) => <ComboCardSkeleton key={i} />)
            : combos.map((combo) => <ComboHighlightCard key={combo.id} combo={combo} />)}
        </div>
      </div>
    </section>
  );
}
