import type { Request, Response } from "express";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "../../prisma";

const COMPLETED_STATUSES: OrderStatus[] = ["DELIVERED", "COMPLETED"];
const EXCLUDED_STATUSES: OrderStatus[] = ["CANCELLED", "REJECTED"];

export async function getAnalytics(req: Request, res: Response) {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { notIn: EXCLUDED_STATUSES } },
    select: { id: true, createdAt: true, totalAmount: true, status: true },
  });

  const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const orderVolume = orders.length;
  const averageOrderValue = orderVolume > 0 ? totalSales / orderVolume : 0;

  const salesByDayMap = new Map<string, number>();
  for (const o of orders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    salesByDayMap.set(day, (salesByDayMap.get(day) ?? 0) + Number(o.totalAmount));
  }
  const salesByDay = Array.from(salesByDayMap.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const orderIds = orders.map((o) => o.id);
  const itemAgg = orderIds.length
    ? await prisma.orderItem.groupBy({
        by: ["name"],
        where: { orderId: { in: orderIds } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      })
    : [];

  const bestSellingItems = itemAgg.map((i) => ({ name: i.name, quantity: i._sum.quantity ?? 0 }));

  const deliveredCount = orders.filter((o) => COMPLETED_STATUSES.includes(o.status)).length;

  res.json({
    rangeDays: days,
    totalSales: Math.round(totalSales * 100) / 100,
    orderVolume,
    completedOrders: deliveredCount,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    salesByDay,
    bestSellingItems,
  });
}
