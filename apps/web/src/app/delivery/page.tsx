"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import type { DeliveryOrder } from "@/lib/types";
import { formatInr } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { OrderStatusStepper } from "@/components/order-status-stepper";
import { StatusBadge } from "@/components/status-badge";

const ACTIVE_STATUSES = ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function DeliveryDashboardPage() {
  return (
    <RoleGuard role="DELIVERY_AGENT" loginPath="/delivery/login">
      <DeliveryDashboardContent />
    </RoleGuard>
  );
}

function DeliveryDashboardContent() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function load() {
    apiFetch<{ orders: DeliveryOrder[] }>("/api/delivery/orders").then((d) => setOrders(d.orders));
  }

  useEffect(load, []);

  // Join each active assigned order's room so status/payment changes made
  // by admin (not just this agent's own actions) arrive here live.
  useEffect(() => {
    const socket = getSocket();
    for (const order of orders) {
      if (!["DELIVERED", "COMPLETED", "REJECTED", "CANCELLED"].includes(order.status)) {
        socket.emit("order:subscribe", order.id);
      }
    }
  }, [orders]);

  useEffect(() => {
    const socket = getSocket();
    socket.on("order:status", load);
    socket.on("order:payment-status", load);
    return () => {
      socket.off("order:status", load);
      socket.off("order:payment-status", load);
    };
  }, []);

  async function markPickedUp(orderId: string) {
    try {
      await apiFetch(`/api/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status: "OUT_FOR_DELIVERY" }) });
      load();
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    }
  }

  async function markDelivered(orderId: string) {
    try {
      await apiFetch(`/api/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status: "DELIVERED" }) });
      load();
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    }
  }

  async function markPaid(orderId: string) {
    try {
      await apiFetch(`/api/orders/${orderId}/mark-paid`, { method: "PATCH" });
      load();
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    }
  }

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="sticky top-0 z-10 border-b-2 border-spice-200 bg-cream-50/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-spice-500 font-display text-lg font-semibold text-white">
              {user ? initials(user.name) : ""}
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold leading-tight text-charcoal">Delivery Portal</h1>
              <p className="text-sm text-charcoal/50">{user?.name}</p>
            </div>
          </div>
          <button onClick={logout} className="text-sm font-medium text-charcoal/50 underline">
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-charcoal">Active deliveries</h2>
          {activeOrders.length > 0 && (
            <span className="rounded-full bg-spice-500 px-2 py-0.5 text-xs font-bold text-white">{activeOrders.length}</span>
          )}
        </div>

        <div className="mb-8 flex flex-col gap-4">
          {activeOrders.map((order) => (
            <div key={order.id} className="overflow-hidden rounded-2xl border border-spice-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-spice-50 bg-spice-50/50 px-4 py-3">
                <span className="font-display text-base font-semibold text-charcoal">#{order.orderNumber}</span>
                <StatusBadge status={order.status} />
              </div>

              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-charcoal">{order.customer.name}</span>
                  <span className="font-display text-lg font-semibold text-spice-700">{formatInr(order.totalAmount)}</span>
                </div>

                {order.customer.phone && (
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="flex w-fit items-center gap-1.5 rounded-full bg-spice-500 px-3.5 py-1.5 text-sm font-medium text-white"
                  >
                    📞 {order.customer.phone}
                  </a>
                )}

                <p className="text-sm text-charcoal/70">{order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}</p>

                {order.address && (
                  <div className="rounded-xl border border-dashed border-spice-200 bg-cream-50 px-3 py-2.5 text-sm font-medium text-charcoal/80">
                    📍 {order.address.line1}, {order.address.area}, {order.address.city} - {order.address.pincode}
                  </div>
                )}

                {order.paymentStatus === "PAID" ? (
                  <p className="text-sm font-semibold text-leaf-700">✓ Paid</p>
                ) : (
                  <p className="text-sm font-semibold text-spice-700">
                    {order.paymentMethod === "COD"
                      ? `Collect ${formatInr(order.totalAmount)} in cash`
                      : `Confirm UPI payment of ${formatInr(order.totalAmount)}`}
                  </p>
                )}

                <div className="mt-1 flex flex-wrap gap-2">
                  {order.status !== "OUT_FOR_DELIVERY" ? (
                    <button
                      onClick={() => markPickedUp(order.id)}
                      className="flex-1 rounded-full bg-spice-500 py-2.5 text-sm font-semibold text-white shadow-sm"
                    >
                      Mark picked up
                    </button>
                  ) : (
                    <button
                      onClick={() => markDelivered(order.id)}
                      className="flex-1 rounded-full bg-leaf-600 py-2.5 text-sm font-semibold text-white shadow-sm"
                    >
                      Mark delivered
                    </button>
                  )}
                  {order.paymentStatus === "UNPAID" && (
                    <button
                      onClick={() => markPaid(order.id)}
                      className="rounded-full border border-leaf-600 px-4 py-2.5 text-sm font-semibold text-leaf-700"
                    >
                      Mark as paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {activeOrders.length === 0 && (
            <p className="rounded-2xl border border-dashed border-charcoal/15 py-8 text-center text-sm text-charcoal/50">
              No active deliveries right now.
            </p>
          )}
        </div>

        <h2 className="mb-3 font-display text-lg font-semibold text-charcoal">History</h2>
        <div className="flex flex-col gap-2">
          {pastOrders.map((order) => {
            const isOpen = expandedId === order.id;
            return (
              <div key={order.id} className="overflow-hidden rounded-2xl border border-spice-100 bg-white">
                <button
                  onClick={() => setExpandedId(isOpen ? null : order.id)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-charcoal">#{order.orderNumber}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-charcoal/50">
                      {new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}
                      {order.customer.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold text-charcoal">{formatInr(order.totalAmount)}</span>
                    <span className={`text-charcoal/40 transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-4 border-t border-spice-100 px-4 py-4 text-sm">
                    <OrderStatusStepper type={order.type} status={order.status} />

                    <div>
                      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal/40">Items</h3>
                      <div className="flex flex-col gap-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>
                              {item.quantity}x {item.name}
                            </span>
                            <span>{formatInr(Number(item.priceAtOrder) * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.customer.phone && (
                      <div>
                        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal/40">Customer</h3>
                        <div className="flex items-center justify-between">
                          <span>{order.customer.name}</span>
                          <a href={`tel:${order.customer.phone}`} className="text-spice-600 underline">
                            📞 {order.customer.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {order.address && (
                      <div>
                        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal/40">
                          {order.type === "DELIVERY" ? "Delivered to" : "Order type"}
                        </h3>
                        <p className="text-charcoal/80">
                          📍 {order.address.line1}, {order.address.area}, {order.address.city} - {order.address.pincode}
                        </p>
                      </div>
                    )}

                    {order.specialInstructions && (
                      <div>
                        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal/40">Note</h3>
                        <p className="italic text-charcoal/70">{order.specialInstructions}</p>
                      </div>
                    )}

                    <div>
                      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal/40">Payment</h3>
                      <div className="flex items-center justify-between">
                        <span>{order.paymentMethod === "COD" ? "Cash" : "UPI"}</span>
                        <span className={order.paymentStatus === "PAID" ? "font-semibold text-leaf-700" : "font-semibold text-spice-700"}>
                          {order.paymentStatus === "PAID" ? "✓ Paid" : "Unpaid"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-cream-50 p-3">
                      <div className="flex justify-between text-charcoal/70">
                        <span>Item total</span>
                        <span>{formatInr(order.itemsTotal)}</span>
                      </div>
                      {Number(order.deliveryFee) > 0 && (
                        <div className="flex justify-between text-charcoal/70">
                          <span>Delivery fee</span>
                          <span>{formatInr(order.deliveryFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-charcoal/70">
                        <span>Taxes</span>
                        <span>{formatInr(order.taxAmount)}</span>
                      </div>
                      <div className="mt-1 flex justify-between border-t border-charcoal/10 pt-1 font-semibold text-charcoal">
                        <span>Total</span>
                        <span>{formatInr(order.totalAmount)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-charcoal/40">
                      Placed {new Date(order.placedAt).toLocaleString("en-IN")}
                      {order.completedAt && ` · Completed ${new Date(order.completedAt).toLocaleString("en-IN")}`}
                      {order.cancelledAt && ` · ${order.status === "REJECTED" ? "Rejected" : "Cancelled"} ${new Date(order.cancelledAt).toLocaleString("en-IN")}`}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          {pastOrders.length === 0 && (
            <p className="rounded-2xl border border-dashed border-charcoal/15 py-8 text-center text-sm text-charcoal/50">
              No past deliveries yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
