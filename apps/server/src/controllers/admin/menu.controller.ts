import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { publicUrlFor } from "../../middleware/upload";

function getIo(req: Request) {
  return req.app.get("io");
}

function broadcastMenuUpdate(req: Request, menuItemId: string) {
  getIo(req)?.emit("menu:item-updated", { menuItemId });
}

// --- Categories ---

const categorySchema = z.object({ name: z.string().min(1), sortOrder: z.number().int().optional() });

export async function createCategory(req: Request, res: Response) {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A category name is required" });
  const category = await prisma.category.create({ data: parsed.data });
  res.status(201).json({ category });
}

export async function updateCategory(req: Request, res: Response) {
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid category data" });
  const category = await prisma.category.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ category });
}

export async function deleteCategory(req: Request, res: Response) {
  const itemCount = await prisma.menuItem.count({ where: { categoryId: req.params.id } });
  if (itemCount > 0) {
    return res.status(400).json({ error: "Move or delete this category's items first" });
  }
  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

// --- Menu items ---

const menuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  categoryId: z.string().min(1),
  isVeg: z.boolean().default(true),
  available: z.boolean().default(true),
  imageUrl: z.string().optional(),
});

export async function listMenuItemsAdmin(_req: Request, res: Response) {
  const items = await prisma.menuItem.findMany({ include: { category: true }, orderBy: { name: "asc" } });
  res.json({ items });
}

export async function createMenuItem(req: Request, res: Response) {
  const body = { ...req.body, price: Number(req.body.price), isVeg: req.body.isVeg === "true" || req.body.isVeg === true };
  const parsed = menuItemSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid item details" });

  const imageUrl = req.file ? publicUrlFor(req.file.filename) : parsed.data.imageUrl;
  const item = await prisma.menuItem.create({ data: { ...parsed.data, imageUrl } });
  res.status(201).json({ item });
}

export async function updateMenuItem(req: Request, res: Response) {
  const body: Record<string, unknown> = { ...req.body };
  if (body.price !== undefined) body.price = Number(body.price);
  if (body.isVeg !== undefined) body.isVeg = body.isVeg === "true" || body.isVeg === true;
  if (body.available !== undefined) body.available = body.available === "true" || body.available === true;

  const parsed = menuItemSchema.partial().safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid item details" });

  const imageUrl = req.file ? publicUrlFor(req.file.filename) : parsed.data.imageUrl;
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { ...parsed.data, ...(imageUrl ? { imageUrl } : {}) },
  });

  broadcastMenuUpdate(req, item.id);
  res.json({ item });
}

const availabilitySchema = z.object({ available: z.boolean() });

export async function setMenuItemAvailability(req: Request, res: Response) {
  const parsed = availabilitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "available (boolean) is required" });
  const item = await prisma.menuItem.update({ where: { id: req.params.id }, data: parsed.data });
  broadcastMenuUpdate(req, item.id);
  res.json({ item });
}

export async function deleteMenuItem(req: Request, res: Response) {
  await prisma.menuItem.delete({ where: { id: req.params.id } });
  broadcastMenuUpdate(req, req.params.id);
  res.status(204).send();
}

// --- Combos ---

const comboItemInputSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  swappable: z.boolean().default(false),
});

const comboSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  available: z.boolean().default(true),
  imageUrl: z.string().optional(),
  items: z.array(comboItemInputSchema).min(1),
});

export async function listCombosAdmin(_req: Request, res: Response) {
  const combos = await prisma.combo.findMany({
    include: { items: { include: { menuItem: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ combos });
}

// Multipart form submissions (used when an image file is attached) carry
// `items`/`available` as JSON/string fields rather than native types.
function parseComboFormFields(body: Record<string, unknown>): Record<string, unknown> {
  const parsed = { ...body };
  if (typeof parsed.price === "string") parsed.price = Number(parsed.price);
  if (typeof parsed.items === "string") {
    try {
      parsed.items = JSON.parse(parsed.items);
    } catch {
      parsed.items = undefined;
    }
  }
  if (typeof parsed.available === "string") parsed.available = parsed.available === "true";
  return parsed;
}

export async function createCombo(req: Request, res: Response) {
  const body = parseComboFormFields(req.body);
  const parsed = comboSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid combo details" });

  const imageUrl = req.file ? publicUrlFor(req.file.filename) : parsed.data.imageUrl;
  const combo = await prisma.combo.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      available: parsed.data.available,
      imageUrl,
      items: { create: parsed.data.items },
    },
    include: { items: { include: { menuItem: true } } },
  });
  res.status(201).json({ combo });
}

export async function updateCombo(req: Request, res: Response) {
  const body = parseComboFormFields(req.body);
  const parsed = comboSchema.partial().safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid combo details" });

  const imageUrl = req.file ? publicUrlFor(req.file.filename) : parsed.data.imageUrl;
  const { items, ...rest } = parsed.data;

  const combo = await prisma.$transaction(async (tx) => {
    if (items) {
      await tx.comboItem.deleteMany({ where: { comboId: req.params.id } });
    }
    return tx.combo.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(imageUrl ? { imageUrl } : {}),
        ...(items ? { items: { create: items } } : {}),
      },
      include: { items: { include: { menuItem: true } } },
    });
  });

  res.json({ combo });
}

export async function deleteCombo(req: Request, res: Response) {
  await prisma.combo.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
