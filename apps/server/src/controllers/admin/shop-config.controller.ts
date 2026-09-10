import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { getShopConfig } from "../../services/shop-config.service";

export async function getShopConfigAdmin(_req: Request, res: Response) {
  res.json({ config: await getShopConfig() });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  deliveryFee: z.number().nonnegative().optional(),
  minOrderValue: z.number().nonnegative().optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  address: z.string().min(3).max(300).optional(),
  upiId: z.string().min(3).max(100).optional(),
  whatsappNumber: z.string().min(8).max(20).optional(),
});

export async function updateShopConfig(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid shop config" });
  const config = await prisma.shopConfig.update({
    where: { id: "shop_config" },
    data: parsed.data,
  });
  res.json({ config });
}
