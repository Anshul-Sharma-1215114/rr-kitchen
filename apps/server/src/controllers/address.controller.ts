import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";

const addressSchema = z.object({
  label: z.enum(["HOME", "WORK", "OTHER"]).default("HOME"),
  line1: z.string().min(1),
  landmark: z.string().optional(),
  area: z.string().min(1),
  city: z.string().min(1),
  pincode: z.string().min(4).max(10),
  isDefault: z.boolean().optional(),
});

export async function listAddresses(req: Request, res: Response) {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  res.json({ addresses });
}

export async function createAddress(req: Request, res: Response) {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid address details" });

  const data = parsed.data;
  const existingCount = await prisma.address.count({ where: { userId: req.user!.id } });
  // The client never sends isDefault on plain "Add address" — without this,
  // a customer's very first address stayed isDefault:false forever (never
  // explicitly chosen via "Set default"), so the header's "Delivering to"
  // banner and the cart's address picker fell back to whichever address
  // was created most recently. That fallback silently changed on every new
  // address added, with no "Default" badge ever shown until the user found
  // and clicked "Set default" themselves. The first address a user ever
  // saves should just be their default from the start.
  const isDefault = data.isDefault || existingCount === 0;
  if (isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  }

  const address = await prisma.address.create({ data: { ...data, isDefault, userId: req.user!.id } });
  res.status(201).json({ address });
}

export async function updateAddress(req: Request, res: Response) {
  const existing = await prisma.address.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) {
    return res.status(404).json({ error: "Address not found" });
  }

  const parsed = addressSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid address details" });

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  }

  const address = await prisma.address.update({ where: { id: existing.id }, data: parsed.data });
  res.json({ address });
}

export async function deleteAddress(req: Request, res: Response) {
  const existing = await prisma.address.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) {
    return res.status(404).json({ error: "Address not found" });
  }
  await prisma.address.delete({ where: { id: existing.id } });
  res.status(204).send();
}
