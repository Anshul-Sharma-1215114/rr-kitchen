"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { apiFetch } from "@/lib/api";
import { LogoMark } from "./logo-mark";
import type { Address } from "@/lib/types";

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l3.6-8H5.4M7 13L5.4 5M7 13l-1.35 4.5A1 1 0 0 0 6.6 19H18" />
      <circle cx="9" cy="21.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="18" cy="21.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

function NavPill({
  href,
  isActive,
  onClick,
  className = "",
  children,
}: {
  href: string;
  isActive: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        isActive ? "bg-spice-500 text-white shadow-sm" : "text-charcoal/70 hover:bg-spice-100/70 hover:text-spice-700"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

export function Header() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Admin/delivery-agent sessions share the same site (and cookie) as the
    // customer app — an admin who navigates to a customer-facing page while
    // logged into /admin still has a truthy `user` here, but /api/addresses
    // is customer-only and 403s for any other role. Left unguarded, that
    // rejection went unhandled and crashed the page instead of just hiding
    // the "delivering to" bar for a role it doesn't apply to.
    if (!user || user.role !== "CUSTOMER") {
      setDefaultAddress(null);
      return;
    }
    apiFetch<{ addresses: Address[] }>("/api/addresses")
      .then((d) => {
        setDefaultAddress(d.addresses.find((a) => a.isDefault) ?? d.addresses[0] ?? null);
      })
      .catch(() => setDefaultAddress(null));
  }, [user]);

  // Close the mobile dropdown whenever the route actually changes (a link
  // tap navigates, but this component stays mounted across pages since
  // it's in the shared layout — without this the menu would stay open).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const accountHref = user ? "/account" : "/login";
  const navItems = [
    { href: "/menu", isActive: pathname.startsWith("/menu"), icon: "🍽️", label: "Menu" },
    { href: "/combos", isActive: pathname.startsWith("/combo"), icon: "🍱", label: "Combos" },
    { href: "/orders", isActive: pathname.startsWith("/orders"), icon: "📦", label: "Track Order" },
    { href: accountHref, isActive: pathname.startsWith(accountHref), icon: "👤", label: user ? user.name.split(" ")[0] : "Login" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b-2 border-spice-200 bg-cream-50/90 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <LogoMark className="h-10 w-10 shrink-0" />
          <span className="font-display text-xl font-semibold tracking-tight text-charcoal">RR Kitchen</span>
        </Link>

        {/* Full pill nav — desktop/tablet only. Mobile gets a hamburger
            instead of squeezing all five items into the header row. */}
        <nav className="hidden items-center gap-1.5 sm:flex">
          {navItems.map((item) => (
            <NavPill key={item.href} href={item.href} isActive={item.isActive}>
              <span aria-hidden="true">{item.icon}</span> {item.label}
            </NavPill>
          ))}
          <Link
            href="/cart"
            className="relative ml-1 flex shrink-0 items-center gap-1.5 rounded-full bg-spice-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-spice-600 hover:shadow-md"
          >
            <CartIcon />
            Cart
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-leaf-600 text-xs font-bold text-white ring-2 ring-cream-50">
                {itemCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Cart + hamburger — mobile only. Cart stays reachable in one tap
            even with the nav collapsed, since it's the primary action. */}
        <div className="flex items-center gap-2 sm:hidden">
          <Link
            href="/cart"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-spice-500 text-white shadow-sm"
            aria-label="Cart"
          >
            <CartIcon />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-leaf-600 text-xs font-bold text-white ring-2 ring-cream-50">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-charcoal transition hover:bg-spice-100/70"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-spice-100 bg-cream-50 px-4 py-3 sm:hidden">
          {navItems.map((item) => (
            <NavPill key={item.href} href={item.href} isActive={item.isActive} onClick={() => setMenuOpen(false)} className="w-full">
              <span aria-hidden="true">{item.icon}</span> {item.label}
            </NavPill>
          ))}
        </nav>
      )}

      <div className="border-t border-leaf-200/60 bg-leaf-50 px-4 py-1.5 text-center text-xs text-leaf-800">
        {!user ? (
          <Link href="/login" className="underline underline-offset-2 hover:text-leaf-900">
            📍 Log in to set your delivery address
          </Link>
        ) : defaultAddress ? (
          <span>
            📍 Delivering to: <span className="font-semibold">{defaultAddress.area}, {defaultAddress.city}</span>{" "}
            <Link href="/account/addresses" className="font-medium underline underline-offset-2 hover:text-leaf-900">
              Change
            </Link>
          </span>
        ) : (
          <Link href="/account/addresses" className="underline underline-offset-2 hover:text-leaf-900">
            📍 Add a delivery address
          </Link>
        )}
      </div>
    </header>
  );
}
