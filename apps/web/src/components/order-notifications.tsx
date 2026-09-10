"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";

const ACTIVE_CUSTOMER_STATUSES = ["PLACED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"];

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "confirmed",
  PREPARING: "being prepared",
  READY_FOR_PICKUP: "ready for pickup",
  OUT_FOR_DELIVERY: "out for delivery",
  DELIVERED: "delivered",
  COMPLETED: "completed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

// Renders nothing — just wires up toast notifications for order status
// changes (customers) and new delivery assignments (agents), anywhere in
// the app, not only while the relevant page happens to be open.
export function OrderNotifications() {
  const { user } = useAuth();
  const { notify } = useToast();

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    if (user.role === "CUSTOMER") {
      apiFetch<{ orders: { id: string; orderNumber: string; status: string }[] }>("/api/orders")
        .then((d) => {
          for (const order of d.orders) {
            if (ACTIVE_CUSTOMER_STATUSES.includes(order.status)) {
              socket.emit("order:subscribe", order.id);
            }
          }
        })
        .catch(() => {});

      function onStatus(payload: { orderId: string; status: string }) {
        const label = STATUS_LABEL[payload.status];
        if (label) notify(`Order update: your order is now ${label}`, `/orders/${payload.orderId}`);
      }
      socket.on("order:status", onStatus);
      return () => {
        socket.off("order:status", onStatus);
      };
    }

    if (user.role === "DELIVERY_AGENT") {
      socket.emit("agent:subscribe-self");
      function onAssigned() {
        notify(`New delivery assigned to you`, "/delivery");
      }
      socket.on("order:agent-assigned", onAssigned);
      return () => {
        socket.off("order:agent-assigned", onAssigned);
      };
    }
  }, [user, notify]);

  return null;
}
