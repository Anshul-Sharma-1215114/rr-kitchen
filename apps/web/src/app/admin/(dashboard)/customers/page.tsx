"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { CustomerSummary } from "@/lib/types";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);

  function load() {
    apiFetch<{ customers: CustomerSummary[] }>("/api/admin/customers").then((d) => setCustomers(d.customers));
  }
  useEffect(load, []);

  async function toggleBlock(customer: CustomerSummary) {
    await apiFetch(`/api/admin/customers/${customer.id}/block`, {
      method: "PATCH",
      body: JSON.stringify({ isBlocked: !customer.isBlocked }),
    });
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Customers</h1>
      <div className="flex flex-col gap-2">
        {customers.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-spice-100 shadow-sm p-3">
            <Link href={`/admin/customers/${c.id}`} className="hover:text-spice-600">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-charcoal/50">
                {c.phone} · {c._count.orders} order(s)
              </p>
            </Link>
            <button
              onClick={() => toggleBlock(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                c.isBlocked ? "bg-red-100 text-red-700" : "bg-leaf-100 text-leaf-700"
              }`}
            >
              {c.isBlocked ? "Blocked" : "Active"}
            </button>
          </div>
        ))}
        {customers.length === 0 && <p className="text-sm text-charcoal/50">No customers yet.</p>}
      </div>
    </div>
  );
}
