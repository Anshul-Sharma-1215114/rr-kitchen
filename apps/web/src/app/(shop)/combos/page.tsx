"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Combo } from "@/lib/types";
import { ComboCard } from "@/components/combo-card";
import { ComboCardSkeleton } from "@/components/skeleton";

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ combos: Combo[] }>("/api/combos")
      .then((d) => setCombos(d.combos))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="font-display text-2xl font-semibold text-charcoal">Complete Meals</h1>
      <p className="mt-1 text-sm text-charcoal/60">
        Our signature thalis — a full home-style meal in one order, at one price.
      </p>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ComboCardSkeleton key={i} />
          ))}
        </div>
      ) : combos.length === 0 ? (
        <p className="mt-6 text-sm text-charcoal/50">No combo meals available right now.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {combos.map((combo) => (
            <ComboCard key={combo.id} combo={combo} />
          ))}
        </div>
      )}
    </main>
  );
}
