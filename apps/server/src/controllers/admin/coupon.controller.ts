import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";

export async function listCouponsAdmin(_req: Request, res: Response) {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ coupons });
}

const couponSchema = z.object({
  code: z.string().min(3).max(20),
  type: z.enum(["FLAT", "PERCENT"]),
  value: z.number().positive(),
  minOrderValue: z.number().nonnegative().default(0),
  maxDiscount: z.number().positive().optional(),
  validFrom: z.string(),
  validTo: z.string(),
  usageLimit: z.number().int().positive().optional(),
  active: z.boolean().default(true),
});

export async function createCoupon(req: Request, res: Response) {
  const parsed = couponSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid coupon details" });

  const existing = await prisma.coupon.findUnique({ where: { code: parsed.data.code.toUpperCase() } });
  if (existing) return res.status(409).json({ error: "A coupon with this code already exists" });

  const coupon = await prisma.coupon.create({
    data: {
      ...parsed.data,
      code: parsed.data.code.toUpperCase(),
      validFrom: new Date(parsed.data.validFrom),
      validTo: new Date(parsed.data.validTo),
    },
  });
  res.status(201).json({ coupon });
}

export async function updateCoupon(req: Request, res: Response) {
  const parsed = couponSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid coupon details" });

  const { validFrom, validTo, ...rest } = parsed.data;
  const coupon = await prisma.coupon.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(validFrom ? { validFrom: new Date(validFrom) } : {}),
      ...(validTo ? { validTo: new Date(validTo) } : {}),
    },
  });
  res.json({ coupon });
}

export async function deleteCoupon(req: Request, res: Response) {
  await prisma.coupon.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
