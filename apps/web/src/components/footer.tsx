"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { ShopConfigPublic } from "@/lib/types";
import { LogoMark } from "./logo-mark";

export function Footer() {
  const [shopConfig, setShopConfig] = useState<ShopConfigPublic | null>(null);

  useEffect(() => {
    apiFetch<ShopConfigPublic>("/api/shop-config/public").then(setShopConfig);
  }, []);

  return (
    <footer className="mt-16 border-t border-spice-100 bg-cream-100">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="font-display text-lg font-semibold text-charcoal">RR Kitchen</span>
          </div>
          <p className="mt-2 max-w-xs text-sm text-charcoal/60">
            Home-style, hygienic, freshly cooked food — delivered locally, dine-in or takeaway.
          </p>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold text-charcoal">Quick links</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-charcoal/70">
            <li>
              <Link href="/menu" className="hover:text-spice-600">
                Menu
              </Link>
            </li>
            <li>
              <Link href="/combos" className="hover:text-spice-600">
                Combos
              </Link>
            </li>
            <li>
              <Link href="/orders" className="hover:text-spice-600">
                Track Order
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-spice-600">
                Login
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold text-charcoal">Visit us</h3>
          {shopConfig ? (
            <div className="mt-2 flex flex-col gap-1.5 text-sm text-charcoal/70">
              {shopConfig.address && <p>{shopConfig.address}</p>}
              <p className="mt-1">
                Open daily {shopConfig.openTime} – {shopConfig.closeTime}
              </p>
              <p>Home-style food, delivered locally.</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-charcoal/40">Loading...</p>
          )}
        </div>
      </div>
      <div className="border-t border-spice-200/60 px-4 py-4 text-center text-xs text-charcoal/50">
        © {new Date().getFullYear()} RR Kitchen. Made fresh, made local.
      </div>
    </footer>
  );
}
