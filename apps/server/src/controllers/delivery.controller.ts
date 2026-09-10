import type { Request, Response } from "express";
import { prisma } from "../prisma";

export async function listMyDeliveries(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { deliveryAgentId: req.user!.id },
    include: {
      items: true,
      address: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { placedAt: "desc" },
    take: 100,
  });
  res.json({ orders });
}
