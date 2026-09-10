import type { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { getShopConfig, isShopOpenNow } from "../services/shop-config.service";
import { getNextOrderStatuses } from "@rr-kitchen/shared";
import { computeCouponDiscount, isCouponUsable } from "../services/pricing.service";
import { generateOrderNumber } from "../utils/order-number";
import type { Server as SocketServer } from "socket.io";

const orderItemSchema = z.union([
  z.object({ menuItemId: z.string(), quantity: z.number().int().positive() }),
  z.object({
    comboId: z.string(),
    quantity: z.number().int().positive(),
    swaps: z.array(z.object({ comboItemId: z.string(), toMenuItemId: z.string() })).optional(),
  }),
]);

const createOrderSchema = z.object({
  type: z.enum(["DELIVERY", "TAKEAWAY", "DINE_IN"]),
  addressId: z.string().optional(),
  paymentMethod: z.enum(["COD", "UPI_MANUAL"]),
  couponCode: z.string().optional(),
  specialInstructions: z.string().max(500).optional(),
  items: z.array(orderItemSchema).min(1),
});

function getIo(req: Request): SocketServer {
  return req.app.get("io");
}

export async function createOrder(req: Request, res: Response) {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid order payload" });
  const body = parsed.data;

  const shop = await getShopConfig();

  if (!isShopOpenNow(shop.openTime, shop.closeTime)) {
    return res.status(400).json({
      error: `We're currently closed. Ordering is available ${shop.openTime}-${shop.closeTime}.`,
    });
  }

  let addressId: string | null = null;
  let deliveryFee = 0;
  if (body.type === "DELIVERY") {
    if (!body.addressId) return res.status(400).json({ error: "An address is required for delivery orders" });
    const address = await prisma.address.findUnique({ where: { id: body.addressId } });
    if (!address || address.userId !== req.user!.id) {
      return res.status(404).json({ error: "Address not found" });
    }
    // Flat fee, same for every delivery address — the app doesn't collect
    // or compute distance, so there's no per-address variation.
    deliveryFee = Number(shop.deliveryFee);
    addressId = address.id;
  }

  // Resolve items against the database — never trust client-supplied prices.
  type ResolvedItem = {
    menuItemId: string | null;
    comboId: string | null;
    name: string;
    quantity: number;
    priceAtOrder: number;
    comboSelections: Prisma.InputJsonValue | undefined;
  };
  const resolvedItems: ResolvedItem[] = [];

  for (const item of body.items) {
    if ("menuItemId" in item) {
      const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
      if (!menuItem || !menuItem.available) {
        return res.status(400).json({ error: `"${menuItem?.name ?? item.menuItemId}" is no longer available` });
      }
      resolvedItems.push({
        menuItemId: menuItem.id,
        comboId: null,
        name: menuItem.name,
        quantity: item.quantity,
        priceAtOrder: Number(menuItem.price),
        comboSelections: undefined,
      });
    } else {
      const combo = await prisma.combo.findUnique({
        where: { id: item.comboId },
        include: { items: { include: { menuItem: true } } },
      });
      if (!combo || !combo.available) {
        return res.status(400).json({ error: `"${combo?.name ?? item.comboId}" is no longer available` });
      }

      const swaps: { fromMenuItemId: string; toMenuItemId: string; fromName: string; toName: string }[] = [];
      for (const swap of item.swaps ?? []) {
        const comboItem = combo.items.find((ci) => ci.id === swap.comboItemId);
        if (!comboItem || !comboItem.swappable) {
          return res.status(400).json({ error: "Invalid substitution requested for this combo" });
        }
        const substitute = await prisma.menuItem.findUnique({ where: { id: swap.toMenuItemId } });
        if (!substitute || !substitute.available || substitute.categoryId !== comboItem.menuItem.categoryId) {
          return res.status(400).json({ error: `"${substitute?.name ?? swap.toMenuItemId}" isn't a valid substitute` });
        }
        // Same category isn't a strong enough guarantee of comparable value —
        // this menu's categories are broad (e.g. "Main Course" covers
        // individual rotis all the way up to a full Thali), so without this
        // a free swap could trade a ₹15 roti slot for a ₹100+ item at no
        // extra charge. Capping substitutes to the original slot's price (or
        // less) keeps "swap" meaning "pick a similar option" rather than a
        // way to upsize a combo for free.
        if (Number(substitute.price) > Number(comboItem.menuItem.price)) {
          return res.status(400).json({
            error: `"${substitute.name}" costs more than "${comboItem.menuItem.name}" — it can't be swapped in for free`,
          });
        }
        // Names are snapshotted here (like priceAtOrder elsewhere) rather
        // than resolved from the current menu at display time — the kitchen
        // and customer both need to see exactly what was substituted on
        // *this* order, even if the menu item is later renamed or removed.
        swaps.push({
          fromMenuItemId: comboItem.menuItemId,
          toMenuItemId: substitute.id,
          fromName: comboItem.menuItem.name,
          toName: substitute.name,
        });
      }

      resolvedItems.push({
        menuItemId: null,
        comboId: combo.id,
        name: combo.name,
        quantity: item.quantity,
        priceAtOrder: Number(combo.price),
        comboSelections: swaps.length > 0 ? { swaps } : undefined,
      });
    }
  }

  const itemsTotal = resolvedItems.reduce((sum, i) => sum + i.priceAtOrder * i.quantity, 0);

  if (itemsTotal < Number(shop.minOrderValue)) {
    return res.status(400).json({ error: `Minimum order value is ₹${shop.minOrderValue}` });
  }

  let discountAmount = 0;
  let couponId: string | null = null;
  let couponUsageLimit: number | null = null;
  if (body.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: body.couponCode.toUpperCase() } });
    if (!coupon) return res.status(400).json({ error: "Invalid coupon code" });
    const problem = isCouponUsable(coupon, itemsTotal);
    if (problem) return res.status(400).json({ error: problem });
    discountAmount = computeCouponDiscount(coupon, itemsTotal);
    couponId = coupon.id;
    couponUsageLimit = coupon.usageLimit;
  }

  const taxAmount = Math.round(itemsTotal * (Number(shop.taxPercent) / 100) * 100) / 100;
  const totalAmount = Math.round((itemsTotal + deliveryFee + taxAmount - discountAmount) * 100) / 100;

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      if (couponId) {
        // Atomically claim one use of the coupon — only succeeds if it's
        // still under its limit at this exact moment. Closes the
        // check-then-act race where two concurrent orders both read the
        // same usedCount before either commits and both slip through a
        // usageLimit of 1.
        const claim = await tx.coupon.updateMany({
          where: {
            id: couponId,
            ...(couponUsageLimit !== null ? { usedCount: { lt: couponUsageLimit } } : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (claim.count === 0) throw new Error("COUPON_LIMIT_REACHED");
      }

      return tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: req.user!.id,
          addressId,
          type: body.type,
          paymentMethod: body.paymentMethod,
          itemsTotal,
          deliveryFee,
          taxAmount,
          discountAmount,
          totalAmount,
          couponId,
          specialInstructions: body.specialInstructions,
          items: { create: resolvedItems },
        },
        include: { items: true, address: true },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "COUPON_LIMIT_REACHED") {
      return res.status(400).json({ error: "This coupon just reached its usage limit — please remove it and try again" });
    }
    throw err;
  }

  getIo(req)?.to("admin").emit("order:new", { orderId: order.id, orderNumber: order.orderNumber, totalAmount });

  res.status(201).json({ order });
}

export async function listMyOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { customerId: req.user!.id },
    include: { items: true, address: true, review: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
}

export async function getOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      items: true,
      address: true,
      review: true,
      // Explicit select rather than a bare `include` — the latter returns
      // every scalar column on the related User row, including
      // passwordHash, straight into a JSON response the customer (and the
      // agent, and the admin) can all read from devtools.
      deliveryAgent: { select: { id: true, name: true, phone: true, deliveryAgentProfile: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });

  const isOwner = order.customerId === req.user!.id;
  const isAgent = order.deliveryAgentId === req.user!.id;
  const isAdmin = req.user!.role === "ADMIN";
  if (!isOwner && !isAgent && !isAdmin) return res.status(403).json({ error: "Not authorized" });

  res.json({ order });
}

const STATUS_TIMESTAMP_FIELD: Partial<Record<string, string>> = {
  CONFIRMED: "confirmedAt",
  PREPARING: "preparingAt",
  READY_FOR_PICKUP: "readyAt",
  OUT_FOR_DELIVERY: "outForDeliveryAt",
  DELIVERED: "completedAt",
  COMPLETED: "completedAt",
  CANCELLED: "cancelledAt",
  REJECTED: "cancelledAt",
};

const AGENT_ALLOWED_STATUSES = new Set(["OUT_FOR_DELIVERY", "DELIVERED"]);

const updateStatusSchema = z.object({
  status: z.enum([
    "PLACED",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
  ]),
});

export async function updateOrderStatus(req: Request, res: Response) {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A valid status is required" });

  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (req.user!.role === "DELIVERY_AGENT") {
    if (order.deliveryAgentId !== req.user!.id) return res.status(403).json({ error: "Not assigned to you" });
    if (!AGENT_ALLOWED_STATUSES.has(parsed.data.status)) {
      return res.status(403).json({ error: "Delivery agents can only update pickup/delivery status" });
    }
  }

  if (!getNextOrderStatuses(order.status, order.type).includes(parsed.data.status)) {
    return res.status(400).json({
      error: `Order is ${order.status.replace(/_/g, " ").toLowerCase()} and can't move directly to ${parsed.data.status.replace(/_/g, " ").toLowerCase()}`,
    });
  }

  const timestampField = STATUS_TIMESTAMP_FIELD[parsed.data.status];
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: parsed.data.status,
      ...(timestampField ? { [timestampField]: new Date() } : {}),
    },
  });

  getIo(req)?.to(`order:${order.id}`).emit("order:status", { orderId: order.id, status: updated.status });
  getIo(req)?.to("admin").emit("order:status", { orderId: order.id, status: updated.status });

  res.json({ order: updated });
}

// Customer self-service cancellation — deliberately stricter than what
// getNextOrderStatuses permits an admin to do: only before the kitchen has
// started cooking (PLACED/CONFIRMED), not once PREPARING has begun. Frees
// up the coupon's usage slot if one was applied, since the order it was
// spent on never happened.
const CUSTOMER_CANCELLABLE_STATUSES = new Set(["PLACED", "CONFIRMED"]);

export async function cancelOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order || order.customerId !== req.user!.id) return res.status(404).json({ error: "Order not found" });

  if (!CUSTOMER_CANCELLABLE_STATUSES.has(order.status)) {
    return res.status(400).json({
      error: "This order can no longer be cancelled — the kitchen has likely started preparing it. Please contact us directly.",
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (order.couponId) {
      await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { decrement: 1 } } });
    }
    return tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
      // Matches getOrder's include shape — the customer's order-detail page
      // replaces its whole `order` state with this response, and its render
      // (order.items.map, order.deliveryAgent?.deliveryAgentProfile, etc.)
      // expects the same relations to be present. Without this, cancelling
      // returned a bare Order row with items/address/etc. all undefined and
      // crashed the page on the very next render.
      include: {
        items: true,
        address: true,
        review: true,
        deliveryAgent: { select: { id: true, name: true, phone: true, deliveryAgentProfile: true } },
      },
    });
  });

  getIo(req)?.to(`order:${order.id}`).emit("order:status", { orderId: order.id, status: "CANCELLED" });
  getIo(req)?.to("admin").emit("order:status", { orderId: order.id, status: "CANCELLED" });

  res.json({ order: updated });
}

// Both payment methods are settled in person (cash, or UPI shown/confirmed
// at the door) — there's no gateway to confirm payment automatically, so
// whoever collects it marks the order paid: the assigned delivery agent for
// DELIVERY orders, or admin/cashier for dine-in/takeaway.
export async function markOrderPaid(req: Request, res: Response) {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (req.user!.role === "DELIVERY_AGENT" && order.deliveryAgentId !== req.user!.id) {
    return res.status(403).json({ error: "Not assigned to you" });
  }
  if (["CANCELLED", "REJECTED"].includes(order.status)) {
    return res.status(400).json({ error: "Can't mark a cancelled or rejected order as paid" });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: "PAID" },
  });

  getIo(req)?.to(`order:${order.id}`).emit("order:payment-status", { orderId: order.id, paymentStatus: "PAID" });
  getIo(req)?.to("admin").emit("order:payment-status", { orderId: order.id, paymentStatus: "PAID" });

  res.json({ order: updated });
}

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  itemRatings: z.record(z.string(), z.number().int().min(1).max(5)).optional(),
});

export async function submitReview(req: Request, res: Response) {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order || order.customerId !== req.user!.id) return res.status(404).json({ error: "Order not found" });
  if (!["DELIVERED", "COMPLETED"].includes(order.status)) {
    return res.status(400).json({ error: "You can only review completed orders" });
  }

  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A rating from 1-5 is required" });

  const review = await prisma.review.upsert({
    where: { orderId: order.id },
    update: parsed.data,
    create: { ...parsed.data, orderId: order.id, customerId: req.user!.id },
  });

  res.status(201).json({ review });
}
