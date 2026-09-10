const STATUS_STYLES: Record<string, string> = {
  DELIVERED: "bg-leaf-100 text-leaf-700",
  COMPLETED: "bg-leaf-100 text-leaf-700",
  CANCELLED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
  PLACED: "bg-spice-100 text-spice-700",
  CONFIRMED: "bg-amber-100 text-amber-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY_FOR_PICKUP: "bg-blue-100 text-blue-700",
  OUT_FOR_DELIVERY: "bg-blue-100 text-blue-700",
};

// Color-coded so an order list scans at a glance (green = done, red = did
// not happen, amber/blue = in progress) instead of every status reading as
// the same flat pill regardless of what it means.
export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-charcoal/10 text-charcoal/60"} ${className}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
