"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CustomerDetail } from "@/lib/types";
import { formatInr } from "@/lib/format";

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);

  useEffect(() => {
    apiFetch<{ customer: CustomerDetail }>(`/api/admin/customers/${id}`).then((d) => setCustomer(d.customer));
  }, [id]);

  if (!customer) return <p className="text-sm text-charcoal/50">Loading...</p>;

  return (
    <div>
      <h1 className="text-xl font-bold">{customer.name}</h1>
      <p className="text-sm text-charcoal/50">
        {customer.phone}
        {customer.email ? ` · ${customer.email}` : ""}
      </p>

      <h2 className="mb-2 mt-6 font-semibold">Addresses</h2>
      <div className="flex flex-col gap-1 text-sm">
        {customer.addresses.map((a) => (
          <p key={a.id}>
            {a.label}: {a.line1}, {a.area}, {a.city} - {a.pincode}
          </p>
        ))}
        {customer.addresses.length === 0 && <p className="text-charcoal/50">No saved addresses.</p>}
      </div>

      <h2 className="mb-2 mt-6 font-semibold">Order history</h2>
      <div className="flex flex-col gap-2">
        {customer.orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-spice-100 shadow-sm p-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">#{order.orderNumber}</span>
              <span>{formatInr(order.totalAmount)}</span>
            </div>
            <p className="text-charcoal/50">
              {order.status.replace(/_/g, " ")} · {new Date(order.placedAt).toLocaleDateString("en-IN")}
            </p>
          </div>
        ))}
        {customer.orders.length === 0 && <p className="text-sm text-charcoal/50">No orders yet.</p>}
      </div>
    </div>
  );
}
