"use client";

import { useEffect, useState } from "react";
import type { OrderStatus } from "@rr-kitchen/shared";
import { getNextOrderStatuses } from "@rr-kitchen/shared";
import { apiFetch, ApiError } from "@/lib/api";
import type { AdminOrder, Agent } from "@/lib/types";
import { formatInr } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { StatusBadge } from "@/components/status-badge";

const ALL_STATUSES: OrderStatus[] = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<{ orderId: string; message: string } | null>(null);

  function load() {
    const params = statusFilter ? `?status=${statusFilter}` : "";
    apiFetch<{ orders: AdminOrder[] }>(`/api/admin/orders${params}`).then((d) => setOrders(d.orders));
  }

  useEffect(load, [statusFilter]);
  useEffect(() => {
    apiFetch<{ agents: Agent[] }>("/api/admin/agents").then((d) => setAgents(d.agents));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("admin:subscribe");
    socket.on("order:new", load);
    socket.on("order:status", load);
    socket.on("order:payment-status", load);
    return () => {
      socket.off("order:new", load);
      socket.off("order:status", load);
      socket.off("order:payment-status", load);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    setStatusError(null);
    try {
      await apiFetch(`/api/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      load();
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      setStatusError({ orderId, message: err.message });
    }
  }

  async function assignAgent(orderId: string, deliveryAgentId: string) {
    if (!deliveryAgentId) return;
    await apiFetch(`/api/admin/orders/${orderId}/assign-agent`, {
      method: "PATCH",
      body: JSON.stringify({ deliveryAgentId }),
    });
    load();
  }

  async function markPaid(orderId: string) {
    await apiFetch(`/api/orders/${orderId}/mark-paid`, { method: "PATCH" });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-charcoal/20 px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-spice-100 shadow-sm p-3">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                className="flex-1 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">#{order.orderNumber}</span>
                  <StatusBadge status={order.status} />
                  <span className="text-xs text-charcoal/40">{order.type}</span>
                </div>
                <p className="text-sm text-charcoal/60">
                  {order.customer.name} · {formatInr(order.totalAmount)}
                </p>
              </button>
              <span className="text-charcoal/40">{expandedId === order.id ? "▲" : "▼"}</span>
            </div>
            {order.customer.phone && (
              <a href={`tel:${order.customer.phone}`} className="mt-1 inline-block text-xs text-spice-600 underline">
                📞 {order.customer.phone}
              </a>
            )}

            {expandedId === order.id && (
              <div className="mt-3 flex flex-col gap-3 border-t border-spice-100 pt-3 text-sm">
                <div>
                  {order.items.map((item) => (
                    <div key={item.id}>
                      <p>
                        {item.quantity}x {item.name} — {formatInr(Number(item.priceAtOrder) * item.quantity)}
                      </p>
                      {item.comboSelections?.swaps.map((swap, i) => (
                        <p key={i} className="pl-4 text-xs font-medium text-spice-700">
                          Swapped {swap.fromName} → {swap.toName}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
                {order.address && (
                  <p className="text-charcoal/60">
                    Deliver to: {order.address.line1}, {order.address.area}, {order.address.city} -{" "}
                    {order.address.pincode}
                  </p>
                )}
                {order.specialInstructions && (
                  <p className="italic text-charcoal/60">Note: {order.specialInstructions}</p>
                )}
                <div className="flex items-center gap-2 text-charcoal/60">
                  <span>
                    Payment: {order.paymentMethod === "COD" ? "Cash" : "UPI"} —{" "}
                    <span className={order.paymentStatus === "PAID" ? "font-medium text-leaf-700" : ""}>
                      {order.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
                    </span>
                  </span>
                  {order.paymentStatus === "UNPAID" && (
                    <button
                      onClick={() => markPaid(order.id)}
                      className="rounded-full border border-leaf-600 px-2 py-0.5 text-xs font-medium text-leaf-700"
                    >
                      Mark as paid
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-charcoal/50">Status:</label>
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                    className="rounded-lg border border-charcoal/20 px-2 py-1 text-xs"
                  >
                    {/* Only the current status plus its legal next steps are offered —
                        showing the full enum let an admin pick a dead-end transition
                        (e.g. READY_FOR_PICKUP on a DELIVERY order), which the server
                        would then reject with a 400 and no obvious reason why. */}
                    <option value={order.status}>{order.status.replace(/_/g, " ")}</option>
                    {getNextOrderStatuses(order.status, order.type).map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  {statusError?.orderId === order.id && (
                    <span className="text-xs text-red-600">{statusError.message}</span>
                  )}

                  {order.type === "DELIVERY" && (
                    <>
                      <label className="ml-2 text-xs text-charcoal/50">Agent:</label>
                      <select
                        defaultValue={order.deliveryAgent?.id ?? ""}
                        onChange={(e) => assignAgent(order.id, e.target.value)}
                        className="rounded-lg border border-charcoal/20 px-2 py-1 text-xs"
                      >
                        <option value="">Unassigned</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="text-sm text-charcoal/50">No orders match this filter.</p>}
      </div>
    </div>
  );
}
