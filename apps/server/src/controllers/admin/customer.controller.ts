import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";

export async function listCustomers(_req: Request, res: Response) {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      isBlocked: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ customers });
}

export async function getCustomer(req: Request, res: Response) {
  const customer = await prisma.user.findUnique({
    where: { id: req.params.id, role: "CUSTOMER" },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { items: true } },
      addresses: true,
    },
  });
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json({ customer });
}

const blockSchema = z.object({ isBlocked: z.boolean() });

export async function setCustomerBlocked(req: Request, res: Response) {
  const parsed = blockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "isBlocked (boolean) is required" });
  const customer = await prisma.user.update({
    where: { id: req.params.id, role: "CUSTOMER" },
    data: { isBlocked: parsed.data.isBlocked },
  });
  res.json({ customer: { id: customer.id, isBlocked: customer.isBlocked } });
}
