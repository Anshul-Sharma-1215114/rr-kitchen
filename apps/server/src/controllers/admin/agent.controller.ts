import type { Request, Response } from "express";
import { prisma } from "../../prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function listAgents(_req: Request, res: Response) {
  const agents = await prisma.user.findMany({
    where: { role: "DELIVERY_AGENT" },
    include: {
      deliveryAgentProfile: true,
      assignedOrders: {
        where: { status: { in: ["OUT_FOR_DELIVERY", "CONFIRMED", "PREPARING"] } },
        select: { id: true, orderNumber: true, status: true },
      },
    },
  });
  res.json({ agents });
}

const createAgentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
  vehicleNumber: z.string().optional(),
});

export async function createAgent(req: Request, res: Response) {
  const parsed = createAgentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Name, email, phone and a 6+ char password are required" });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: "An account with this email already exists" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const agent = await prisma.user.create({
    data: {
      role: "DELIVERY_AGENT",
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      passwordHash,
      deliveryAgentProfile: { create: { vehicleNumber: parsed.data.vehicleNumber } },
    },
    include: { deliveryAgentProfile: true },
  });

  res.status(201).json({ agent });
}

const setActiveSchema = z.object({ isActive: z.boolean() });

export async function setAgentActive(req: Request, res: Response) {
  const parsed = setActiveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "isActive (boolean) is required" });
  const profile = await prisma.deliveryAgentProfile.update({
    where: { userId: req.params.id },
    data: { isActive: parsed.data.isActive },
  });
  res.json({ profile });
}
