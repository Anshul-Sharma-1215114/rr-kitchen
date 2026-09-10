"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { MenuItem } from "@/lib/types";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth-context";
import { formatInr } from "@/lib/format";

export default function AccountPage() {
  return (
    <RoleGuard role="CUSTOMER" loginPath="/login">
      <AccountContent />
    </RoleGuard>
  );
}

function AccountContent() {
  const { user, logout } = useAuth();
  const [favorites, setFavorites] = useState<{ menuItem: MenuItem }[]>([]);

  useEffect(() => {
    apiFetch<{ favorites: { menuItem: MenuItem }[] }>("/api/favorites").then((d) => setFavorites(d.favorites));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold">My account</h1>
      <div className="mt-3 rounded-2xl border border-spice-100 p-4">
        <p className="font-semibold">{user?.name}</p>
        <p className="text-sm text-charcoal/50">{user?.phone}</p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Link href="/account/addresses" className="rounded-xl border border-spice-100 px-4 py-3 hover:bg-spice-50">
          📍 Saved addresses
        </Link>
        <Link href="/orders" className="rounded-xl border border-spice-100 px-4 py-3 hover:bg-spice-50">
          🧾 Order history
        </Link>
      </div>

      <h2 className="mt-6 mb-2 font-semibold">Favorites</h2>
      {favorites.length === 0 ? (
        <p className="text-sm text-charcoal/50">Tap the heart on any item to save it here.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {favorites.map((f) => (
            <Link
              key={f.menuItem.id}
              href={`/menu/${f.menuItem.id}`}
              className="flex items-center justify-between rounded-xl border border-spice-100 px-4 py-3 hover:bg-spice-50"
            >
              <span>{f.menuItem.name}</span>
              <span className="text-sm font-medium text-spice-700">{formatInr(f.menuItem.price)}</span>
            </Link>
          ))}
        </div>
      )}

      <button onClick={logout} className="mt-8 text-sm text-charcoal/50 underline">
        Log out
      </button>
    </main>
  );
}
