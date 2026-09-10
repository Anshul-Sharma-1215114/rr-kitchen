import { prisma } from "../prisma";

export async function getShopConfig() {
  const config = await prisma.shopConfig.findUnique({ where: { id: "shop_config" } });
  if (!config) throw new Error("Shop config has not been seeded");
  return config;
}

// Simple same-day open/close window compared against server local time.
// Good enough until Phase 5, where multi-day schedules/holidays can replace it.
export function isShopOpenNow(openTime: string, closeTime: string, at: Date = new Date()): boolean {
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  const minutesNow = at.getHours() * 60 + at.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  return minutesNow >= openMinutes && minutesNow <= closeMinutes;
}
