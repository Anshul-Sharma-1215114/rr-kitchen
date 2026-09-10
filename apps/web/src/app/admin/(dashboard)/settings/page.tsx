"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { UpiQrCode } from "@/components/upi-qr-code";
import { formatInr } from "@/lib/format";

interface ShopConfigAdmin {
  id: string;
  name: string;
  deliveryFee: string;
  minOrderValue: string;
  taxPercent: string;
  openTime: string;
  closeTime: string;
  address: string | null;
  upiId: string | null;
  whatsappNumber: string | null;
}

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <ShopConfigSection />
      <CouponsSection />
    </div>
  );
}

function ShopConfigSection() {
  const [config, setConfig] = useState<ShopConfigAdmin | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    apiFetch<{ config: ShopConfigAdmin }>("/api/admin/shop-config").then((d) => setConfig(d.config));
  }
  useEffect(load, []);

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      await apiFetch("/api/admin/shop-config", {
        method: "PATCH",
        body: JSON.stringify({
          name: config.name,
          deliveryFee: Number(config.deliveryFee),
          minOrderValue: Number(config.minOrderValue),
          taxPercent: Number(config.taxPercent),
          openTime: config.openTime,
          closeTime: config.closeTime,
          address: config.address || undefined,
          upiId: config.upiId || undefined,
          whatsappNumber: config.whatsappNumber || undefined,
        }),
      });
      setSaved(true);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!config) return <p className="text-sm text-charcoal/50">Loading settings...</p>;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">Shop settings</h2>
      <form onSubmit={saveConfig} className="flex flex-col gap-4 rounded-2xl border border-spice-100 p-4">
        <label className="flex flex-col gap-1 text-xs text-charcoal/50">
          Shop address (shown in the footer)
          <input
            value={config.address ?? ""}
            onChange={(e) => setConfig({ ...config, address: e.target.value })}
            placeholder="12 Temple Street, Indiranagar, Bengaluru 560038"
            className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm text-charcoal"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-charcoal/50">
          WhatsApp number (powers the customer-facing chat button — include country code)
          <input
            value={config.whatsappNumber ?? ""}
            onChange={(e) => setConfig({ ...config, whatsappNumber: e.target.value })}
            placeholder="+919000000000"
            className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm text-charcoal"
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs">
            Delivery fee (₹)
            <input
              type="number"
              step="1"
              value={config.deliveryFee}
              onChange={(e) => setConfig({ ...config, deliveryFee: e.target.value })}
              className="rounded-lg border border-charcoal/20 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Min order value (₹)
            <input
              type="number"
              value={config.minOrderValue}
              onChange={(e) => setConfig({ ...config, minOrderValue: e.target.value })}
              className="rounded-lg border border-charcoal/20 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Tax (%)
            <input
              type="number"
              step="0.1"
              value={config.taxPercent}
              onChange={(e) => setConfig({ ...config, taxPercent: e.target.value })}
              className="rounded-lg border border-charcoal/20 px-2 py-1.5 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs">
              Opens
              <input
                type="time"
                value={config.openTime}
                onChange={(e) => setConfig({ ...config, openTime: e.target.value })}
                className="rounded-lg border border-charcoal/20 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs">
              Closes
              <input
                type="time"
                value={config.closeTime}
                onChange={(e) => setConfig({ ...config, closeTime: e.target.value })}
                className="rounded-lg border border-charcoal/20 px-2 py-1.5 text-sm"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-charcoal/50">
            UPI ID (shown to customers as a QR for "pay via UPI on delivery/pickup")
          </label>
          <input
            value={config.upiId ?? ""}
            onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
            placeholder="rrkitchen@upi"
            className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
          />
          {config.upiId && (
            <div className="mt-3">
              <UpiQrCode upiId={config.upiId} shopName={config.name} />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-leaf-700">Saved!</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-full bg-spice-500 px-5 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </form>
    </section>
  );
}

function CouponsSection() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);

  function load() {
    apiFetch<{ coupons: Coupon[] }>("/api/admin/coupons").then((d) => setCoupons(d.coupons));
  }
  useEffect(load, []);

  async function toggleActive(coupon: Coupon) {
    await apiFetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !coupon.active }),
    });
    load();
  }

  async function handleDelete(coupon: Coupon) {
    if (!confirm(`Delete coupon "${coupon.code}"?`)) return;
    await apiFetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
    load();
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Coupons</h2>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-full bg-spice-500 px-4 py-1.5 text-sm text-white">
          + New coupon
        </button>
      </div>

      {showForm && <CouponForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}

      <div className="flex flex-col gap-2">
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-spice-100 shadow-sm p-3">
            <div>
              <p className="font-mono font-semibold">{c.code}</p>
              <p className="text-sm text-charcoal/60">
                {c.type === "FLAT" ? formatInr(c.value) : `${c.value}%`} off · min {formatInr(c.minOrderValue)} · used{" "}
                {c.usedCount}
                {c.usageLimit ? `/${c.usageLimit}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActive(c)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  c.active ? "bg-leaf-100 text-leaf-700" : "bg-charcoal/10 text-charcoal/50"
                }`}
              >
                {c.active ? "Active" : "Inactive"}
              </button>
              <button onClick={() => handleDelete(c)} className="text-xs text-red-600 underline">
                Delete
              </button>
            </div>
          </div>
        ))}
        {coupons.length === 0 && <p className="text-sm text-charcoal/50">No coupons yet.</p>}
      </div>
    </section>
  );
}

function CouponForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [value, setValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [validTo, setValidTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiFetch("/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify({
          code,
          type,
          value: Number(value),
          minOrderValue: Number(minOrderValue),
          maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
          validFrom: new Date().toISOString(),
          validTo: new Date(validTo).toISOString(),
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create coupon");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3 rounded-2xl border border-spice-100 p-4">
      <div className="flex flex-wrap gap-3">
        <input required placeholder="CODE" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="flex-1 rounded-lg border border-charcoal/20 px-3 py-2 text-sm" />
        <select value={type} onChange={(e) => setType(e.target.value as "FLAT" | "PERCENT")} className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm">
          <option value="FLAT">Flat ₹ off</option>
          <option value="PERCENT">% off</option>
        </select>
        <input required type="number" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} className="w-24 rounded-lg border border-charcoal/20 px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-wrap gap-3">
        <input type="number" placeholder="Min order value" value={minOrderValue} onChange={(e) => setMinOrderValue(e.target.value)} className="flex-1 rounded-lg border border-charcoal/20 px-3 py-2 text-sm" />
        {type === "PERCENT" && (
          <input type="number" placeholder="Max discount (optional)" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} className="flex-1 rounded-lg border border-charcoal/20 px-3 py-2 text-sm" />
        )}
        <input required type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-full bg-spice-500 px-5 py-1.5 text-sm text-white disabled:opacity-50">
          {saving ? "Creating..." : "Create coupon"}
        </button>
        <button type="button" onClick={onClose} className="rounded-full border border-charcoal/20 px-5 py-1.5 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
