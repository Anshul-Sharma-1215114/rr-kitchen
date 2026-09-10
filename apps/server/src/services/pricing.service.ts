import type { Coupon } from "@prisma/client";

export function computeCouponDiscount(coupon: Coupon, itemsTotal: number): number {
  if (coupon.type === "FLAT") {
    return Math.min(Number(coupon.value), itemsTotal);
  }
  const raw = (itemsTotal * Number(coupon.value)) / 100;
  const capped = coupon.maxDiscount ? Math.min(raw, Number(coupon.maxDiscount)) : raw;
  return Math.min(capped, itemsTotal);
}

export function isCouponUsable(coupon: Coupon, itemsTotal: number, now: Date = new Date()): string | null {
  if (!coupon.active) return "This coupon is no longer active";
  if (now < coupon.validFrom || now > coupon.validTo) return "This coupon has expired";
  if (itemsTotal < Number(coupon.minOrderValue)) {
    return `Minimum order value for this coupon is ₹${coupon.minOrderValue}`;
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return "This coupon has reached its usage limit";
  }
  return null;
}
