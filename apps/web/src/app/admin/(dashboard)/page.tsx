"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import type { AdminOrder, Analytics } from "@/lib/types";
import { formatInr } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { playOrderAlert } from "@/lib/beep";
import { StatusBadge } from "@/components/status-badge";

export default function AdminOverviewPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [today, setToday] = useState<Analytics | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  function load() {
    apiFetch<{ orders: AdminOrder[] }>("/api/admin/orders").then((d) => setOrders(d.orders.slice(0, 20)));
    apiFetch<Analytics>("/api/admin/analytics?days=1").then(setToday);
  }

  useEffect(load, []);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("admin:subscribe");

    function onNewOrder(payload: { orderId: string }) {
      playOrderAlert();
      setFlashIds((prev) => new Set(prev).add(payload.orderId));
      load();
    }
    function onStatusChange() {
      load();
    }

    socket.on("order:new", onNewOrder);
    socket.on("order:status", onStatusChange);
    return () => {
      socket.off("order:new", onNewOrder);
      socket.off("order:status", onStatusChange);
    };
  }, []);

  async function quickUpdate(orderId: string, status: "CONFIRMED" | "REJECTED") {
    try {
      await apiFetch(`/api/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      load();
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Dashboard</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Today's sales" value={today ? formatInr(today.totalSales) : "-"} />
        <StatCard label="Orders today" value={today ? String(today.orderVolume) : "-"} />
        <StatCard label="Avg order value" value={today ? formatInr(today.averageOrderValue) : "-"} />
        <StatCard label="Completed" value={today ? String(today.completedOrders) : "-"} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="mb-2 font-semibold">Live orders</h2>
        <Link href="/admin/orders" className="text-sm text-spice-600 underline">
          View all
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {orders.map((order) => (
          <div
            key={order.id}
            className={`flex flex-col gap-2 rounded-xl border p-3 transition sm:flex-row sm:items-center sm:justify-between ${
              flashIds.has(order.id) ? "border-spice-400 bg-spice-50" : "border-spice-100"
            }`}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">#{order.orderNumber}</span>
                <StatusBadge status={order.status} />
                <span className="text-xs text-charcoal/40">{order.type}</span>
              </div>
              <p className="mt-0.5 text-sm text-charcoal/70">
                {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-charcoal/60">
                <span>{order.customer.name}</span>
                {order.customer.phone && (
                  <a href={`tel:${order.customer.phone}`} className="text-spice-600 underline">
                    📞 {order.customer.phone}
                  </a>
                )}
                <span>· {formatInr(order.totalAmount)}</span>
              </div>
            </div>
            {order.status === "PLACED" && (
              <div className="flex gap-2">
                <button
                  onClick={() => quickUpdate(order.id, "CONFIRMED")}
                  className="rounded-full bg-leaf-600 px-3 py-1 text-xs font-medium text-white"
                >
                  Accept
                </button>
                <button
                  onClick={() => quickUpdate(order.id, "REJECTED")}
                  className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="text-sm text-charcoal/50">No orders yet.</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-spice-100 shadow-sm p-3">
      <p className="text-xs text-charcoal/50">{label}</p>
      <p className="text-lg font-bold text-spice-700">{value}</p>
    </div>
  );
}
