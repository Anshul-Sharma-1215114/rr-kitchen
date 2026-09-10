import type { Request, Response } from "express";
import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "../../prisma";

const ORDER_STATUSES: OrderStatus[] = [
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

export async function listAllOrders(req: Request, res: Response) {
  const { status } = req.query;
  const statusFilter =
    typeof status === "string" && ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;
  const orders = await prisma.order.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      items: true,
      address: true,
      customer: { select: { id: true, name: true, phone: true } },
      deliveryAgent: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ orders });
}

const assignSchema = z.object({ deliveryAgentId: z.string().min(1) });

export async function assignDeliveryAgent(req: Request, res: Response) {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "deliveryAgentId is required" });

  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Order not found" });
  if (existing.type !== "DELIVERY") {
    return res.status(400).json({ error: "Only delivery orders can be assigned to an agent" });
  }
  if (["CANCELLED", "REJECTED", "DELIVERED", "COMPLETED"].includes(existing.status)) {
    return res.status(400).json({ error: "This order is already finished and can't be reassigned" });
  }

  const agent = await prisma.user.findUnique({
    where: { id: parsed.data.deliveryAgentId },
    include: { deliveryAgentProfile: true },
  });
  if (!agent || agent.role !== "DELIVERY_AGENT") {
    return res.status(400).json({ error: "That user isn't a delivery agent" });
  }
  if (!agent.deliveryAgentProfile?.isActive) {
    return res.status(400).json({ error: "This agent is deactivated" });
  }

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { deliveryAgentId: agent.id },
  });

  const io = req.app.get("io");
  // Carries the full agent identity (not just the name) so the customer's
  // order page can render the "call your delivery partner" button the
  // moment this arrives, without a separate refetch.
  const payload = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    agentId: agent.id,
    agentName: agent.name,
    agentPhone: agent.phone,
  };
  io?.to(`order:${order.id}`).emit("order:agent-assigned", payload);
  io?.to("admin").emit("order:agent-assigned", payload);
  io?.to(`agent:${agent.id}`).emit("order:agent-assigned", payload);

  res.json({ order });
}
