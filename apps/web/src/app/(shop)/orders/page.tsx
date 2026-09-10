"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Order } from "@/lib/types";
import { formatInr } from "@/lib/format";
import { RoleGuard } from "@/components/role-guard";
import { useCart } from "@/lib/cart-context";
import { OrderRowSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";

export default function OrdersPage() {
  return (
    <RoleGuard role="CUSTOMER" loginPath="/login">
      <OrdersContent />
    </RoleGuard>
  );
}

function OrdersContent() {
  const router = useRouter();
  const { addLine } = useCart();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    apiFetch<{ orders: Order[] }>("/api/orders").then((d) => setOrders(d.orders));
  }, []);

  function reorder(order: Order) {
    for (const item of order.items) {
      addLine({
        kind: item.menuItemId ? "item" : "combo",
        refId: (item.menuItemId ?? item.comboId)!,
        name: item.name,
        price: Number(item.priceAtOrder),
        imageUrl: null,
        isVeg: true,
        quantity: item.quantity,
      });
    }
    router.push("/cart");
  }

  if (orders === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">Your orders</h1>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <OrderRowSkeleton key={i} />
          ))}
        </div>
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-charcoal/60">You haven&apos;t placed any orders yet.</p>
        <Link href="/" className="mt-3 inline-block text-spice-600 underline">
          Browse the menu
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">Your orders</h1>
      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-spice-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <Link href={`/orders/${order.id}`} className="font-semibold hover:text-spice-600">
                #{order.orderNumber}
              </Link>
              <StatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-charcoal/60">
              {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-lg font-semibold text-spice-700">{formatInr(order.totalAmount)}</span>
              <button onClick={() => reorder(order)} className="text-sm text-spice-600 underline">
                Reorder
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
