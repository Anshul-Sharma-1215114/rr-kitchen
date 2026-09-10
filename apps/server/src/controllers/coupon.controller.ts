import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { computeCouponDiscount, isCouponUsable } from "../services/pricing.service";

const validateSchema = z.object({
  code: z.string().min(1),
  orderTotal: z.number().nonnegative(),
});

export async function validateCoupon(req: Request, res: Response) {
  const parsed = validateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "code and orderTotal are required" });

  const coupon = await prisma.coupon.findUnique({ where: { code: parsed.data.code.toUpperCase() } });
  if (!coupon) return res.status(404).json({ error: "Invalid coupon code" });

  const problem = isCouponUsable(coupon, parsed.data.orderTotal);
  if (problem) return res.status(400).json({ error: problem });

  const discountAmount = computeCouponDiscount(coupon, parsed.data.orderTotal);
  res.json({ valid: true, discountAmount, coupon: { code: coupon.code, type: coupon.type, value: coupon.value } });
}
