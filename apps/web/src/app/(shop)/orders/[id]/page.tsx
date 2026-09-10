"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { OrderStatus, PaymentStatus } from "@rr-kitchen/shared";
import { apiFetch, ApiError } from "@/lib/api";
import type { Order, ShopConfigPublic } from "@/lib/types";
import { formatInr } from "@/lib/format";
import { OrderStatusStepper } from "@/components/order-status-stepper";
import { UpiQrCode } from "@/components/upi-qr-code";
import { getSocket } from "@/lib/socket";
import { RoleGuard } from "@/components/role-guard";
import { DetailPageSkeleton } from "@/components/skeleton";

const ETA_BY_STATUS: Partial<Record<OrderStatus, string>> = {
  PLACED: "Waiting for the kitchen to confirm — usually within a few minutes.",
  CONFIRMED: "Confirmed! Your food will start cooking shortly.",
  PREPARING: "Freshly cooking — ready in about 15-20 minutes.",
  READY_FOR_PICKUP: "Ready! Please collect it from the counter.",
  OUT_FOR_DELIVERY: "On the way — should arrive in about 15-20 minutes.",
  DELIVERED: "Delivered — enjoy your meal!",
  COMPLETED: "Order completed — enjoy your meal!",
};

export default function OrderDetailPage() {
  return (
    <RoleGuard role="CUSTOMER" loginPath="/login">
      <OrderDetailContent />
    </RoleGuard>
  );
}

const CANCELLABLE_STATUSES: OrderStatus[] = ["PLACED", "CONFIRMED"];

function OrderDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [shopConfig, setShopConfig] = useState<ShopConfigPublic | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ order: Order }>(`/api/orders/${id}`)
      .then((d) => setOrder(d.order))
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    apiFetch<ShopConfigPublic>("/api/shop-config/public").then(setShopConfig);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("order:subscribe", id);
    function onStatus(payload: { orderId: string; status: OrderStatus }) {
      if (payload.orderId === id) {
        setOrder((prev) => (prev ? { ...prev, status: payload.status } : prev));
      }
    }
    function onPaymentStatus(payload: { orderId: string; paymentStatus: PaymentStatus }) {
      if (payload.orderId === id) {
        setOrder((prev) => (prev ? { ...prev, paymentStatus: payload.paymentStatus } : prev));
      }
    }
    // Without this, a newly-assigned agent's name/call button only showed
    // up after a manual page refresh — assigning an agent doesn't change
    // order.status, so onStatus alone never caught it, even though the
    // server was already broadcasting an "order:agent-assigned" event into
    // this exact room.
    function onAgentAssigned(payload: { orderId: string; agentId: string; agentName: string; agentPhone: string | null }) {
      if (payload.orderId === id) {
        setOrder((prev) =>
          prev
            ? { ...prev, deliveryAgentId: payload.agentId, deliveryAgent: { id: payload.agentId, name: payload.agentName, phone: payload.agentPhone } }
            : prev
        );
      }
    }
    socket.on("order:status", onStatus);
    socket.on("order:payment-status", onPaymentStatus);
    socket.on("order:agent-assigned", onAgentAssigned);
    return () => {
      socket.off("order:status", onStatus);
      socket.off("order:payment-status", onPaymentStatus);
      socket.off("order:agent-assigned", onAgentAssigned);
    };
  }, [id]);

  if (notFound) return <p className="p-6 text-center text-charcoal/60">Order not found.</p>;
  if (!order) return <DetailPageSkeleton />;

  async function handleCancel() {
    if (!order || !confirm("Cancel this order? This can't be undone.")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const data = await apiFetch<{ order: Order }>(`/api/orders/${order.id}/cancel`, { method: "PATCH" });
      setOrder(data.order);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">#{order.orderNumber}</h1>
        <span className="text-sm text-charcoal/50">{new Date(order.placedAt).toLocaleString("en-IN")}</span>
      </div>

      <div className="mt-6 rounded-2xl border border-spice-100 p-4">
        <OrderStatusStepper type={order.type} status={order.status} />
        <p className="mt-4 text-center text-sm text-charcoal/70">{ETA_BY_STATUS[order.status]}</p>
        {CANCELLABLE_STATUSES.includes(order.status) && (
          <div className="mt-4 flex flex-col items-center gap-2 border-t border-spice-100 pt-4">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-full border border-red-300 px-5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Cancel order"}
            </button>
            {cancelError && <p className="text-xs text-red-600">{cancelError}</p>}
          </div>
        )}
      </div>

      {order.type === "DELIVERY" && order.status === "OUT_FOR_DELIVERY" && order.address && (
        <div className="mt-4 flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-charcoal/20 p-4 text-center text-sm text-charcoal/60">
          {order.deliveryAgent ? (
            <>
              <span>{order.deliveryAgent.name} is out for your delivery.</span>
              {order.deliveryAgent.phone && (
                <a
                  href={`tel:${order.deliveryAgent.phone}`}
                  className="rounded-full bg-spice-500 px-4 py-1.5 text-xs font-medium text-white"
                >
                  📞 Call delivery partner
                </a>
              )}
            </>
          ) : (
            "Waiting for a delivery agent to be assigned."
          )}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 font-semibold">Items</h2>
        <div className="flex flex-col gap-2">
          {order.items.map((item) => (
            <div key={item.id} className="text-sm">
              <div className="flex justify-between">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span>{formatInr(Number(item.priceAtOrder) * item.quantity)}</span>
              </div>
              {item.comboSelections?.swaps.map((swap, i) => (
                <p key={i} className="text-xs text-charcoal/50">
                  Swapped {swap.fromName} → {swap.toName}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>

      {order.address && (
        <div className="mt-4">
          <h2 className="mb-1 font-semibold">Delivering to</h2>
          <p className="text-sm text-charcoal/70">
            {order.address.line1}, {order.address.area}, {order.address.city} - {order.address.pincode}
          </p>
        </div>
      )}

      <div className="mt-4">
        <h2 className="mb-2 font-semibold">Payment</h2>
        {order.paymentStatus === "PAID" ? (
          <p className="rounded-xl bg-leaf-100 px-4 py-2 text-sm font-medium text-leaf-700">✓ Paid</p>
        ) : order.paymentMethod === "UPI_MANUAL" ? (
          <div className="flex flex-col items-center gap-2">
            {shopConfig?.upiId ? (
              <UpiQrCode upiId={shopConfig.upiId} shopName={shopConfig.name} />
            ) : (
              <p className="text-sm text-charcoal/50">UPI details aren't set up yet — please pay by cash.</p>
            )}
            <p className="text-center text-sm text-charcoal/70">
              Pay {formatInr(order.totalAmount)} via UPI to{" "}
              {order.type === "DELIVERY" ? "the delivery agent" : "the cashier"} and show them the confirmation.
            </p>
          </div>
        ) : (
          <p className="text-sm text-charcoal/70">
            Pay {formatInr(order.totalAmount)} in cash{" "}
            {order.type === "DELIVERY" ? "to the delivery agent" : "at the counter"}.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-spice-100 p-4 text-sm">
        <div className="flex justify-between">
          <span>Item total</span>
          <span>{formatInr(order.itemsTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery fee</span>
          <span>{formatInr(order.deliveryFee)}</span>
        </div>
        <div className="flex justify-between">
          <span>Taxes</span>
          <span>{formatInr(order.taxAmount)}</span>
        </div>
        {Number(order.discountAmount) > 0 && (
          <div className="flex justify-between text-leaf-700">
            <span>Discount</span>
            <span>-{formatInr(order.discountAmount)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-spice-100 pt-2 font-bold">
          <span>Total ({order.paymentMethod === "COD" ? "Cash" : "UPI"})</span>
          <span>{formatInr(order.totalAmount)}</span>
        </div>
      </div>

      {["DELIVERED", "COMPLETED"].includes(order.status) && (
        <ReviewSection orderId={order.id} existing={order.review ?? null} />
      )}
    </main>
  );
}

function ReviewSection({ orderId, existing }: { orderId: string; existing: { rating: number; comment: string | null } | null }) {
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [submitted, setSubmitted] = useState(Boolean(existing));
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      await apiFetch(`/api/orders/${orderId}/review`, {
        method: "POST",
        body: JSON.stringify({ rating, comment: comment || undefined }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit review");
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-leaf-200 bg-leaf-50 p-4">
      <h2 className="mb-2 font-semibold">{submitted ? "Your review" : "Rate this order"}</h2>
      <div className="flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={submitted}
            onClick={() => setRating(n)}
            className={n <= rating ? "text-spice-500" : "text-charcoal/20"}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        disabled={submitted}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us what you thought (optional)"
        rows={2}
        className="mt-2 w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm disabled:bg-transparent"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {!submitted && (
        <button onClick={submit} className="mt-2 rounded-full bg-leaf-600 px-5 py-1.5 text-sm text-white">
          Submit review
        </button>
      )}
    </div>
  );
}
