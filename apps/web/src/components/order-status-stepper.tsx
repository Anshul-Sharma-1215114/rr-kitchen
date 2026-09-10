import type { OrderStatus, OrderType } from "@rr-kitchen/shared";

const DELIVERY_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PLACED", label: "Placed" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PREPARING", label: "Preparing" },
  { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { status: "DELIVERED", label: "Delivered" },
];

const PICKUP_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PLACED", label: "Placed" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PREPARING", label: "Preparing" },
  { status: "READY_FOR_PICKUP", label: "Ready" },
  { status: "COMPLETED", label: "Completed" },
];

export function OrderStatusStepper({ type, status }: { type: OrderType; status: OrderStatus }) {
  if (status === "CANCELLED" || status === "REJECTED") {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        This order was {status === "CANCELLED" ? "cancelled" : "rejected"}.
      </div>
    );
  }

  const steps = type === "DELIVERY" ? DELIVERY_STEPS : PICKUP_STEPS;
  const currentIndex = steps.findIndex((s) => s.status === status);

  return (
    <div className="flex items-center">
      {steps.map((step, i) => (
        <div key={step.status} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`h-3 w-3 rounded-full ${
                i <= currentIndex ? "bg-spice-500" : "bg-charcoal/15"
              }`}
            />
            <span className={`text-[10px] ${i <= currentIndex ? "text-spice-700" : "text-charcoal/40"}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-1 h-0.5 flex-1 ${i < currentIndex ? "bg-spice-500" : "bg-charcoal/15"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
