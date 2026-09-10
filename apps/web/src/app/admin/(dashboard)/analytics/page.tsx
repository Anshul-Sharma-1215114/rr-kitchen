"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Analytics } from "@/lib/types";
import { formatInr } from "@/lib/format";

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    apiFetch<Analytics>(`/api/admin/analytics?days=${days}`).then(setData);
  }, [days]);

  const maxSale = data ? Math.max(1, ...data.salesByDay.map((d) => d.total)) : 1;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Analytics</h1>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-charcoal/20 px-3 py-1.5 text-sm">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total sales" value={formatInr(data.totalSales)} />
            <StatCard label="Order volume" value={String(data.orderVolume)} />
            <StatCard label="Avg order value" value={formatInr(data.averageOrderValue)} />
            <StatCard label="Completed" value={String(data.completedOrders)} />
          </div>

          <h2 className="mb-2 font-semibold">Sales by day</h2>
          <div className="mb-6 flex h-40 items-end gap-1 rounded-xl border border-spice-100 shadow-sm p-4">
            {data.salesByDay.length === 0 ? (
              <p className="text-sm text-charcoal/50">No sales in this period.</p>
            ) : (
              data.salesByDay.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-spice-400"
                    style={{ height: `${Math.max(4, (d.total / maxSale) * 100)}px` }}
                    title={`${d.date}: ${formatInr(d.total)}`}
                  />
                  <span className="text-[9px] text-charcoal/40">{d.date.slice(5)}</span>
                </div>
              ))
            )}
          </div>

          <h2 className="mb-2 font-semibold">Best-selling items</h2>
          <div className="flex flex-col gap-1">
            {data.bestSellingItems.map((item) => (
              <div key={item.name} className="flex justify-between rounded-lg border border-spice-100 px-3 py-2 text-sm">
                <span>{item.name}</span>
                <span className="font-medium">{item.quantity} sold</span>
              </div>
            ))}
            {data.bestSellingItems.length === 0 && <p className="text-sm text-charcoal/50">No data yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-spice-100 shadow-sm p-3">
      <p className="text-xs text-charcoal/50">{label}</p>
      <p className="text-lg font-bold text-spice-700">{value}</p>
    </div>
  );
}
