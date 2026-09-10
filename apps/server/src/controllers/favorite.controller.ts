import type { Request, Response } from "express";
import { prisma } from "../prisma";

export async function listFavorites(req: Request, res: Response) {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user!.id },
    include: { menuItem: { include: { category: true } } },
  });
  res.json({ favorites });
}

export async function addFavorite(req: Request, res: Response) {
  const menuItemId = req.params.menuItemId;
  const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!item) return res.status(404).json({ error: "Item not found" });

  await prisma.favorite.upsert({
    where: { userId_menuItemId: { userId: req.user!.id, menuItemId } },
    update: {},
    create: { userId: req.user!.id, menuItemId },
  });
  res.status(201).json({ message: "Added to favorites" });
}

export async function removeFavorite(req: Request, res: Response) {
  await prisma.favorite.deleteMany({
    where: { userId: req.user!.id, menuItemId: req.params.menuItemId },
  });
  res.status(204).send();
}
