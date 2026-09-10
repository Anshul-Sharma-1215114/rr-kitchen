import type { Request, Response } from "express";
import { prisma } from "../prisma";

export async function listCategories(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ categories });
}

export async function listMenuItems(req: Request, res: Response) {
  const { category, veg, search, minPrice, maxPrice } = req.query;

  const parsedMinPrice = typeof minPrice === "string" ? Number(minPrice) : undefined;
  const parsedMaxPrice = typeof maxPrice === "string" ? Number(maxPrice) : undefined;
  if ((parsedMinPrice !== undefined && Number.isNaN(parsedMinPrice)) || (parsedMaxPrice !== undefined && Number.isNaN(parsedMaxPrice))) {
    return res.status(400).json({ error: "minPrice and maxPrice must be numbers" });
  }

  const items = await prisma.menuItem.findMany({
    where: {
      available: true,
      ...(typeof category === "string" ? { categoryId: category } : {}),
      ...(veg === "true" ? { isVeg: true } : veg === "false" ? { isVeg: false } : {}),
      ...(typeof search === "string" && search.trim()
        ? { name: { contains: search.trim(), mode: "insensitive" } }
        : {}),
      ...(parsedMinPrice !== undefined || parsedMaxPrice !== undefined
        ? {
            price: {
              ...(parsedMinPrice !== undefined ? { gte: parsedMinPrice } : {}),
              ...(parsedMaxPrice !== undefined ? { lte: parsedMaxPrice } : {}),
            },
          }
        : {}),
    },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  res.json({ items });
}

const POPULAR_ITEMS_LIMIT = 8;

// Ranks by real order volume (sum of OrderItem.quantity across all orders),
// so this reflects what customers actually buy rather than a hand-picked
// list. Pads with other available items (newest first) if there isn't
// enough order history yet — e.g. right after a fresh seed/launch.
export async function listPopularMenuItems(_req: Request, res: Response) {
  const ranked = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: { menuItemId: { not: null } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: POPULAR_ITEMS_LIMIT,
  });

  const rankedIds = ranked.map((r) => r.menuItemId).filter((id): id is string => id !== null);
  const rankedItems = rankedIds.length
    ? await prisma.menuItem.findMany({
        where: { id: { in: rankedIds }, available: true },
        include: { category: true },
      })
    : [];
  const rankedById = new Map(rankedItems.map((item) => [item.id, item]));
  const orderedResults = rankedIds.map((id) => rankedById.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (orderedResults.length < POPULAR_ITEMS_LIMIT) {
    const fillerItems = await prisma.menuItem.findMany({
      where: { available: true, id: { notIn: orderedResults.map((item) => item.id) } },
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: POPULAR_ITEMS_LIMIT - orderedResults.length,
    });
    orderedResults.push(...fillerItems);
  }

  res.json({ items: orderedResults });
}

export async function getMenuItem(req: Request, res: Response) {
  const item = await prisma.menuItem.findUnique({
    where: { id: req.params.id },
    include: { category: true },
  });
  if (!item) return res.status(404).json({ error: "Item not found" });
  res.json({ item });
}

export async function listCombos(_req: Request, res: Response) {
  const combos = await prisma.combo.findMany({
    where: { available: true },
    include: { items: { include: { menuItem: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ combos });
}

export async function getCombo(req: Request, res: Response) {
  const combo = await prisma.combo.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { menuItem: true } } },
  });
  if (!combo) return res.status(404).json({ error: "Combo not found" });

  // For each swappable slot, offer other available items from the same
  // category as substitutes.
  const categoryIds = [...new Set(combo.items.map((ci) => ci.menuItem.categoryId))];
  const candidatesByCategory = await prisma.menuItem.findMany({
    where: { categoryId: { in: categoryIds }, available: true },
  });

  const substitutionOptions: Record<string, typeof candidatesByCategory> = {};
  for (const comboItem of combo.items) {
    if (!comboItem.swappable) continue;
    // Capped at the original slot's own price — same category isn't a
    // strong enough guarantee of comparable value (this menu's categories
    // are broad, e.g. "Main Course" spans individual rotis up to a full
    // Thali), so without this a free swap could upsize the combo for
    // nothing. Matches the same check enforced again at order creation.
    substitutionOptions[comboItem.id] = candidatesByCategory.filter(
      (c) =>
        c.categoryId === comboItem.menuItem.categoryId &&
        c.id !== comboItem.menuItemId &&
        Number(c.price) <= Number(comboItem.menuItem.price)
    );
  }

  res.json({ combo, substitutionOptions });
}
