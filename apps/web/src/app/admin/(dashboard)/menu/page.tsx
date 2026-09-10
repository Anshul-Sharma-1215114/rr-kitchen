"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/api";
import type { Category, MenuItem, Combo } from "@/lib/types";
import { formatInr } from "@/lib/format";
import { VegBadge } from "@/components/veg-badge";

type Tab = "items" | "combos";

export default function AdminMenuPage() {
  const [tab, setTab] = useState<Tab>("items");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);

  function loadCategories() {
    apiFetch<{ categories: Category[] }>("/api/categories").then((d) => setCategories(d.categories));
  }
  function loadItems() {
    apiFetch<{ items: MenuItem[] }>("/api/admin/menu-items").then((d) => setItems(d.items));
  }
  function loadCombos() {
    apiFetch<{ combos: Combo[] }>("/api/admin/combos").then((d) => setCombos(d.combos));
  }

  useEffect(() => {
    loadCategories();
    loadItems();
    loadCombos();
  }, []);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("items")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === "items" ? "bg-spice-500 text-white" : "bg-spice-50 text-spice-700"}`}
        >
          Items
        </button>
        <button
          onClick={() => setTab("combos")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === "combos" ? "bg-spice-500 text-white" : "bg-spice-50 text-spice-700"}`}
        >
          Combos
        </button>
      </div>

      {tab === "items" ? (
        <ItemsTab categories={categories} items={items} onCategoriesChange={loadCategories} onItemsChange={loadItems} />
      ) : (
        <CombosTab items={items} combos={combos} onCombosChange={loadCombos} />
      )}
    </div>
  );
}

function ItemsTab({
  categories,
  items,
  onCategoriesChange,
  onItemsChange,
}: {
  categories: Category[];
  items: MenuItem[];
  onCategoriesChange: () => void;
  onItemsChange: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [categoryError, setCategoryError] = useState<string | null>(null);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await apiFetch("/api/admin/categories", { method: "POST", body: JSON.stringify({ name: newCategoryName }) });
    setNewCategoryName("");
    onCategoriesChange();
  }

  async function deleteCategory(category: Category) {
    setCategoryError(null);
    if (!confirm(`Delete category "${category.name}"?`)) return;
    try {
      await apiFetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      onCategoriesChange();
    } catch (err) {
      setCategoryError(err instanceof ApiError ? err.message : "Failed to delete category");
    }
  }

  async function toggleAvailability(item: MenuItem) {
    await apiFetch(`/api/admin/menu-items/${item.id}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ available: !item.available }),
    });
    onItemsChange();
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await apiFetch(`/api/admin/menu-items/${item.id}`, { method: "DELETE" });
    onItemsChange();
  }

  return (
    <div>
      <form onSubmit={addCategory} className="mb-2 flex items-center gap-2">
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name"
          className="rounded-lg border border-charcoal/20 px-3 py-1.5 text-sm"
        />
        <button className="rounded-lg border border-spice-400 px-3 py-1.5 text-sm text-spice-600">+ Category</button>
        <div className="ml-auto">
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded-full bg-spice-500 px-4 py-1.5 text-sm text-white"
          >
            + Add item
          </button>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <span
            key={c.id}
            className="flex items-center gap-1.5 rounded-full bg-spice-50 py-1 pl-3 pr-2 text-xs text-spice-700"
          >
            {c.name}
            <button
              onClick={() => deleteCategory(c)}
              aria-label={`Delete category ${c.name}`}
              className="text-spice-400 hover:text-red-600"
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      {categoryError && <p className="mb-4 text-sm text-red-600">{categoryError}</p>}

      {showForm && (
        <ItemForm
          categories={categories}
          existing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            onItemsChange();
          }}
        />
      )}

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-spice-100 shadow-sm p-3">
            <div className="flex items-center gap-2">
              <VegBadge isVeg={item.isVeg} />
              <div>
                <p className="font-medium">
                  {item.name} <span className="text-charcoal/40">· {item.category?.name}</span>
                </p>
                <p className="text-sm text-spice-700">{formatInr(item.price)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAvailability(item)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  item.available ? "bg-leaf-100 text-leaf-700" : "bg-charcoal/10 text-charcoal/50"
                }`}
              >
                {item.available ? "Available" : "Sold out"}
              </button>
              <button
                onClick={() => {
                  setEditing(item);
                  setShowForm(true);
                }}
                className="text-xs text-spice-600 underline"
              >
                Edit
              </button>
              <button onClick={() => handleDelete(item)} className="text-xs text-red-600 underline">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemForm({
  categories,
  existing,
  onClose,
  onSaved,
}: {
  categories: Category[];
  existing: MenuItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [price, setPrice] = useState(existing?.price ?? "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id ?? "");
  const [isVeg, setIsVeg] = useState(existing?.isVeg ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("description", description);
      formData.set("price", String(price));
      formData.set("categoryId", categoryId);
      formData.set("isVeg", String(isVeg));
      if (imageFile) formData.set("image", imageFile);

      if (existing) {
        await apiUpload(`/api/admin/menu-items/${existing.id}`, formData, "PATCH");
      } else {
        await apiUpload("/api/admin/menu-items", formData, "POST");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3 rounded-2xl border border-spice-100 p-4">
      <div className="flex flex-wrap gap-3">
        <input
          required
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
        />
        <input
          required
          type="number"
          step="0.01"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-28 rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
        />
      </div>
      <textarea
        placeholder="Description"
        value={description ?? ""}
        onChange={(e) => setDescription(e.target.value)}
        className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
        rows={2}
      />
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={isVeg} onChange={(e) => setIsVeg(e.target.checked)} />
          Vegetarian
        </label>
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="text-sm" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-spice-500 px-5 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onClose} className="rounded-full border border-charcoal/20 px-5 py-1.5 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

function CombosTab({
  items,
  combos,
  onCombosChange,
}: {
  items: MenuItem[];
  combos: Combo[];
  onCombosChange: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Combo | null>(null);

  async function handleDelete(combo: Combo) {
    if (!confirm(`Delete combo "${combo.name}"?`)) return;
    await apiFetch(`/api/admin/combos/${combo.id}`, { method: "DELETE" });
    onCombosChange();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="rounded-full bg-leaf-600 px-4 py-1.5 text-sm text-white"
        >
          + Add combo
        </button>
      </div>

      {showForm && (
        <ComboForm
          items={items}
          existing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            onCombosChange();
          }}
        />
      )}

      <div className="flex flex-col gap-2">
        {combos.map((combo) => (
          <div key={combo.id} className="rounded-xl border border-leaf-200 bg-leaf-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{combo.name}</p>
                <p className="text-sm text-leaf-800">{formatInr(combo.price)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(combo);
                    setShowForm(true);
                  }}
                  className="text-xs text-spice-600 underline"
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(combo)} className="text-xs text-red-600 underline">
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-charcoal/60">
              {combo.items.map((ci) => `${ci.menuItem.name}${ci.swappable ? " (swappable)" : ""}`).join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ComboItemDraft {
  menuItemId: string;
  quantity: number;
  swappable: boolean;
}

function ComboForm({
  items,
  existing,
  onClose,
  onSaved,
}: {
  items: MenuItem[];
  existing: Combo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [price, setPrice] = useState(existing?.price ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [comboItems, setComboItems] = useState<ComboItemDraft[]>(
    existing?.items.map((ci) => ({ menuItemId: ci.menuItemId, quantity: ci.quantity, swappable: ci.swappable })) ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addRow() {
    if (items.length === 0) return;
    setComboItems((prev) => [...prev, { menuItemId: items[0].id, quantity: 1, swappable: false }]);
  }
  function updateRow(index: number, patch: Partial<ComboItemDraft>) {
    setComboItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function removeRow(index: number) {
    setComboItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (comboItems.length === 0) {
      setError("Add at least one item to this combo");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("description", description);
      formData.set("price", String(price));
      formData.set("items", JSON.stringify(comboItems));
      if (imageFile) formData.set("image", imageFile);

      if (existing) {
        await apiUpload(`/api/admin/combos/${existing.id}`, formData, "PATCH");
      } else {
        await apiUpload("/api/admin/combos", formData, "POST");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save combo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3 rounded-2xl border border-leaf-200 bg-leaf-50 p-4">
      <div className="flex flex-wrap gap-3">
        <input
          required
          placeholder="Combo name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
        />
        <input
          required
          type="number"
          step="0.01"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-28 rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
        />
      </div>
      <textarea
        placeholder="Description"
        value={description ?? ""}
        onChange={(e) => setDescription(e.target.value)}
        className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
        rows={2}
      />
      <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="text-sm" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Included items</span>
          <button type="button" onClick={addRow} className="text-xs text-leaf-700 underline">
            + Add item
          </button>
        </div>
        {comboItems.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select
              value={row.menuItemId}
              onChange={(e) => updateRow(i, { menuItemId: e.target.value })}
              className="min-w-[10rem] flex-1 rounded-lg border border-charcoal/20 px-2 py-1 text-sm"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={row.quantity}
              onChange={(e) => updateRow(i, { quantity: Number(e.target.value) })}
              className="w-16 rounded-lg border border-charcoal/20 px-2 py-1 text-sm"
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={row.swappable}
                onChange={(e) => updateRow(i, { swappable: e.target.checked })}
              />
              Swappable
            </label>
            <button type="button" onClick={() => removeRow(i)} className="text-xs text-red-600">
              Remove
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-leaf-600 px-5 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save combo"}
        </button>
        <button type="button" onClick={onClose} className="rounded-full border border-charcoal/20 px-5 py-1.5 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
