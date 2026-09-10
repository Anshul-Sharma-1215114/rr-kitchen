// Types shared between apps/server and apps/web. These mirror the Prisma
// enums in apps/server/prisma/schema.prisma — kept in sync by hand since the
// web app doesn't generate a Prisma client of its own.

export type Role = "CUSTOMER" | "ADMIN" | "DELIVERY_AGENT";

export type AddressLabel = "HOME" | "WORK" | "OTHER";

export type OrderType = "DELIVERY" | "TAKEAWAY" | "DINE_IN";

export type OrderStatus =
  | "PLACED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

// A third value (e.g. "GATEWAY") can be added later for Razorpay or similar
// without restructuring the Order model.
export type PaymentMethod = "COD" | "UPI_MANUAL";

export type PaymentStatus = "UNPAID" | "PAID";

export type CouponType = "FLAT" | "PERCENT";

// Which statuses an order can legally move to next — the single source of
// truth for both the server (enforced) and the admin UI (which options to
// even offer), so the two can't drift apart.
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

// READY_FOR_PICKUP only leads to COMPLETED or CANCELLED — a dead end for a
// DELIVERY order, which needs OUT_FOR_DELIVERY -> DELIVERED instead. Hiding
// it as a next step for delivery orders stops it being picked by mistake
// and stranding the order (it would otherwise still show as a legal
// PREPARING -> READY_FOR_PICKUP move even though nothing after that
// eventually gets the order delivered).
export function getNextOrderStatuses(current: OrderStatus, orderType: OrderType): OrderStatus[] {
  const next = ORDER_STATUS_TRANSITIONS[current];
  return orderType === "DELIVERY" ? next.filter((s) => s !== "READY_FOR_PICKUP") : next;
}

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  phone?: string | null;
  email?: string | null;
}
