"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/delivery", label: "Delivery" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/settings", label: "Settings" },
];

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
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        isActive ? "bg-spice-500 text-white shadow-sm" : "text-spice-700 hover:bg-spice-100/70"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // This component stays mounted across every /admin/* route (it lives in
  // the shared dashboard layout), so without this the mobile dropdown would
  // stay open after tapping a link to navigate rather than closing itself.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-20 border-b-2 border-spice-200 bg-cream-50/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <span className="font-display text-lg font-semibold text-spice-600">RR Kitchen Admin</span>
        <div className="flex items-center gap-3">
          <button onClick={logout} className="hidden text-sm text-charcoal/50 underline sm:inline">
            Log out
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-charcoal transition hover:bg-spice-100/70 sm:hidden"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {/* Full pill nav — desktop/tablet only, horizontally scrollable as a
          fallback if the window is ever narrower than the tab list. Mobile
          gets an explicit dropdown instead: a scrolling nav with no visual
          cue silently hid Customers/Analytics/Settings off-screen. */}
      <nav className="mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm sm:flex">
        {LINKS.map((link) => (
          <NavPill key={link.href} href={link.href} isActive={pathname === link.href}>
            {link.label}
          </NavPill>
        ))}
      </nav>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-spice-100 bg-cream-50 px-4 py-3 sm:hidden">
          {LINKS.map((link) => (
            <NavPill key={link.href} href={link.href} isActive={pathname === link.href} className="w-full">
              {link.label}
            </NavPill>
          ))}
          <button onClick={logout} className="mt-1 px-3.5 py-1.5 text-left text-sm text-charcoal/50 underline">
            Log out
          </button>
        </nav>
      )}
    </header>
  );
}
