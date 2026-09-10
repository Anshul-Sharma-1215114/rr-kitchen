"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Address } from "@/lib/types";
import { RoleGuard } from "@/components/role-guard";

const emptyForm = {
  label: "HOME" as Address["label"],
  line1: "",
  landmark: "",
  area: "",
  city: "",
  pincode: "",
};

export default function AddressesPage() {
  return (
    <RoleGuard role="CUSTOMER" loginPath="/login">
      <AddressesContent />
    </RoleGuard>
  );
}

function AddressesContent() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    apiFetch<{ addresses: Address[] }>("/api/addresses").then((d) => setAddresses(d.addresses));
  }

  useEffect(load, []);

  function startEdit(address: Address) {
    setEditingId(address.id);
    setForm({
      label: address.label,
      line1: address.line1,
      landmark: address.landmark ?? "",
      area: address.area,
      city: address.city,
      pincode: address.pincode,
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/api/addresses/${editingId}`, { method: "PATCH", body: JSON.stringify(form) });
      } else {
        await apiFetch("/api/addresses", { method: "POST", body: JSON.stringify(form) });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save address");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await apiFetch(`/api/addresses/${id}`, { method: "DELETE" });
    load();
  }

  async function handleSetDefault(id: string) {
    await apiFetch(`/api/addresses/${id}`, { method: "PATCH", body: JSON.stringify({ isDefault: true }) });
    load();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Saved addresses</h1>
        {!showForm && (
          <button onClick={startNew} className="rounded-full bg-spice-500 px-4 py-1.5 text-sm text-white">
            + Add address
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3 rounded-2xl border border-spice-100 p-4">
          <div className="flex gap-2">
            {(["HOME", "WORK", "OTHER"] as const).map((l) => (
              <button
                type="button"
                key={l}
                onClick={() => setForm((f) => ({ ...f, label: l }))}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  form.label === l ? "bg-spice-500 text-white" : "bg-spice-50 text-spice-700"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <input
            required
            placeholder="House / flat no., building"
            value={form.line1}
            onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
            className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
          />
          <input
            placeholder="Landmark (optional)"
            value={form.landmark}
            onChange={(e) => setForm((f) => ({ ...f, landmark: e.target.value }))}
            className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-3">
            <input
              required
              placeholder="Area"
              value={form.area}
              onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
              className="flex-1 rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="flex-1 rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Pincode"
              value={form.pincode}
              onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
              className="w-28 rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-spice-500 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save address"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-charcoal/20 px-5 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {addresses.map((address) => (
          <div key={address.id} className="flex items-start justify-between rounded-xl border border-spice-100 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-spice-50 px-2 py-0.5 text-xs font-semibold text-spice-700">
                  {address.label}
                </span>
                {address.isDefault && (
                  <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-xs text-leaf-700">Default</span>
                )}
              </div>
              <p className="mt-1 text-sm">
                {address.line1}, {address.area}, {address.city} - {address.pincode}
              </p>
              {address.landmark && <p className="text-xs text-charcoal/50">Near {address.landmark}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
              <button onClick={() => startEdit(address)} className="text-spice-600 underline">
                Edit
              </button>
              {!address.isDefault && (
                <button onClick={() => handleSetDefault(address.id)} className="text-spice-600 underline">
                  Set default
                </button>
              )}
              <button onClick={() => handleDelete(address.id)} className="text-red-600 underline">
                Delete
              </button>
            </div>
          </div>
        ))}
        {addresses.length === 0 && !showForm && (
          <p className="text-sm text-charcoal/50">No saved addresses yet.</p>
        )}
      </div>
    </main>
  );
}
