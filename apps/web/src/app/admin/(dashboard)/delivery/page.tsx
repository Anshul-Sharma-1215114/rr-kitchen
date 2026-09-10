"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Agent, AdminOrder } from "@/lib/types";
import { getSocket } from "@/lib/socket";

export default function AdminDeliveryPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<AdminOrder[]>([]);
  const [showForm, setShowForm] = useState(false);

  function load() {
    apiFetch<{ agents: Agent[] }>("/api/admin/agents").then((d) => setAgents(d.agents));
    apiFetch<{ orders: AdminOrder[] }>("/api/admin/orders?status=OUT_FOR_DELIVERY").then((d) =>
      setActiveDeliveries(d.orders)
    );
  }
  useEffect(load, []);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("admin:subscribe");
    socket.on("order:status", load);
    return () => {
      socket.off("order:status", load);
    };
  }, []);

  async function toggleActive(agent: Agent) {
    await apiFetch(`/api/admin/agents/${agent.id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !agent.deliveryAgentProfile?.isActive }),
    });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Delivery agents</h1>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-full bg-spice-500 px-4 py-1.5 text-sm text-white">
          + Add agent
        </button>
      </div>

      {showForm && <AgentForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}

      <h2 className="mb-2 font-semibold">Active deliveries</h2>
      {activeDeliveries.length === 0 ? (
        <p className="mb-4 rounded-xl border border-dashed border-charcoal/20 p-4 text-sm text-charcoal/50">
          No orders are out for delivery right now.
        </p>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {activeDeliveries
            .filter((o) => o.address)
            .map((order) => (
              <div key={order.id} className="rounded-xl border border-spice-100 shadow-sm p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold">#{order.orderNumber}</span>
                  <span className="text-charcoal/50">{order.deliveryAgent?.name ?? "Unassigned"}</span>
                </div>
                <p className="text-charcoal/60">
                  {order.address!.line1}, {order.address!.area}, {order.address!.city}
                </p>
              </div>
            ))}
        </div>
      )}

      <h2 className="mb-2 font-semibold">Agents</h2>
      <div className="flex flex-col gap-2">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center justify-between rounded-xl border border-spice-100 shadow-sm p-3">
            <div>
              <p className="font-medium">{agent.name}</p>
              <p className="text-sm text-charcoal/50">
                {agent.phone} · {agent.email}
                {agent.deliveryAgentProfile?.vehicleNumber ? ` · ${agent.deliveryAgentProfile.vehicleNumber}` : ""}
              </p>
              {agent.assignedOrders.length > 0 && (
                <p className="text-xs text-spice-600">
                  Active: {agent.assignedOrders.map((o) => `#${o.orderNumber}`).join(", ")}
                </p>
              )}
            </div>
            <button
              onClick={() => toggleActive(agent)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                agent.deliveryAgentProfile?.isActive ? "bg-leaf-100 text-leaf-700" : "bg-charcoal/10 text-charcoal/50"
              }`}
            >
              {agent.deliveryAgentProfile?.isActive ? "Active" : "Deactivated"}
            </button>
          </div>
        ))}
        {agents.length === 0 && <p className="text-sm text-charcoal/50">No delivery agents yet.</p>}
      </div>
    </div>
  );
}

function AgentForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiFetch("/api/admin/agents", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, password, vehicleNumber: vehicleNumber || undefined }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create agent");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3 rounded-2xl border border-spice-100 p-4">
      <div className="flex flex-wrap gap-3">
        <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-lg border border-charcoal/20 px-3 py-2 text-sm" />
        <input required placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-32 rounded-lg border border-charcoal/20 px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-wrap gap-3">
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 rounded-lg border border-charcoal/20 px-3 py-2 text-sm" />
        <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 rounded-lg border border-charcoal/20 px-3 py-2 text-sm" />
      </div>
      <input placeholder="Vehicle number (optional)" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-full bg-spice-500 px-5 py-1.5 text-sm text-white disabled:opacity-50">
          {saving ? "Creating..." : "Create agent"}
        </button>
        <button type="button" onClick={onClose} className="rounded-full border border-charcoal/20 px-5 py-1.5 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
