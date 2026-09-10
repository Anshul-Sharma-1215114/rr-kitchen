"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderType, PaymentMethod } from "@rr-kitchen/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatInr } from "@/lib/format";
import { QuantityStepper } from "@/components/quantity-stepper";
import { getSocket } from "@/lib/socket";
import type { Address, ShopConfigPublic, Order } from "@/lib/types";

export default function CartPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { lines, updateQuantity, removeLine, itemsTotal, clear } = useCart();

  const [orderType, setOrderType] = useState<OrderType>("DELIVERY");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shopConfig, setShopConfig] = useState<ShopConfigPublic | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [unavailableKeys, setUnavailableKeys] = useState<Set<string>>(new Set());

  function checkAvailability() {
    Promise.all([
      apiFetch<{ items: { id: string }[] }>("/api/menu-items"),
      apiFetch<{ combos: { id: string }[] }>("/api/combos"),
    ]).then(([itemsRes, combosRes]) => {
      const availableItemIds = new Set(itemsRes.items.map((i) => i.id));
      const availableComboIds = new Set(combosRes.combos.map((c) => c.id));
      setUnavailableKeys(
        new Set(
          lines
            .filter((l) => !(l.kind === "item" ? availableItemIds : availableComboIds).has(l.refId))
            .map((l) => l.key)
        )
      );
    });
  }

  // Re-check whenever the cart changes and live whenever the seller edits
  // the menu (sold-out toggle, item deleted) while this page is open.
  useEffect(checkAvailability, [lines]);
  useEffect(() => {
    const socket = getSocket();
    socket.on("menu:item-updated", checkAvailability);
    return () => {
      socket.off("menu:item-updated", checkAvailability);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  useEffect(() => {
    apiFetch<ShopConfigPublic>("/api/shop-config/public").then(setShopConfig);
    // /api/addresses is customer-only — an admin/delivery-agent session
    // landing on this page (same site, same cookie) still has a truthy
    // `user`, and the resulting 403 would otherwise go unhandled.
    if (user?.role === "CUSTOMER") {
      apiFetch<{ addresses: Address[] }>("/api/addresses")
        .then((d) => {
          setAddresses(d.addresses);
          const def = d.addresses.find((a) => a.isDefault) ?? d.addresses[0];
          if (def) setSelectedAddressId(def.id);
        })
        .catch(() => setAddresses([]));
    }
  }, [user]);

  const deliveryFee = useMemo(() => {
    if (orderType !== "DELIVERY" || !shopConfig) return 0;
    return Number(shopConfig.deliveryFee);
  }, [orderType, shopConfig]);

  const taxAmount = useMemo(() => {
    if (!shopConfig) return 0;
    return Math.round(itemsTotal * (Number(shopConfig.taxPercent) / 100) * 100) / 100;
  }, [itemsTotal, shopConfig]);

  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const totalAmount = Math.max(0, itemsTotal + deliveryFee + taxAmount - discountAmount);
  const minOrderValue = shopConfig ? Number(shopConfig.minOrderValue) : 0;
  const belowMinimum = itemsTotal < minOrderValue;
  const addressRequired = orderType === "DELIVERY";
  const shopClosed = shopConfig !== null && !shopConfig.isOpenNow;
  const canPlaceOrder =
    lines.length > 0 &&
    !belowMinimum &&
    !shopClosed &&
    unavailableKeys.size === 0 &&
    (!addressRequired || selectedAddressId);

  async function applyCoupon() {
    setCouponError(null);
    try {
      const data = await apiFetch<{ discountAmount: number }>("/api/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: couponCode, orderTotal: itemsTotal }),
      });
      setAppliedCoupon({ code: couponCode.toUpperCase(), discountAmount: data.discountAmount });
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof ApiError ? err.message : "Failed to apply coupon");
    }
  }

  // A coupon's discount depends on itemsTotal (percent coupons, min-order
  // thresholds) — re-check it against the server whenever the cart total
  // changes after it was applied, rather than leaving a stale discount
  // computed against a total that no longer matches the cart.
  useEffect(() => {
    if (!appliedCoupon) return;
    apiFetch<{ discountAmount: number }>("/api/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code: appliedCoupon.code, orderTotal: itemsTotal }),
    })
      .then((data) => setAppliedCoupon((prev) => (prev ? { ...prev, discountAmount: data.discountAmount } : prev)))
      .catch((err) => {
        setAppliedCoupon(null);
        setCouponError(
          `"${appliedCoupon.code}" no longer applies: ${err instanceof ApiError ? err.message : "cart changed"}`
        );
      });
    // Only itemsTotal changing should trigger a re-check — re-running this
    // when appliedCoupon itself changes (e.g. right after applying it)
    // would immediately re-fetch what was just fetched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsTotal]);

  async function placeOrder() {
    if (!user) return router.push("/login");
    setPlaceError(null);
    setPlacing(true);
    try {
      const payload = {
        type: orderType,
        addressId: orderType === "DELIVERY" ? selectedAddressId : undefined,
        paymentMethod,
        couponCode: appliedCoupon?.code,
        specialInstructions: specialInstructions || undefined,
        items: lines.map((l) =>
          l.kind === "item"
            ? { menuItemId: l.refId, quantity: l.quantity }
            : {
                comboId: l.refId,
                quantity: l.quantity,
                swaps: l.swaps?.map((s) => ({ comboItemId: s.comboItemId, toMenuItemId: s.toMenuItemId })),
              }
        ),
      };

      const data = await apiFetch<{ order: Order }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      clear();
      router.push(`/orders/${data.order.id}`);
    } catch (err) {
      setPlaceError(err instanceof ApiError ? err.message : "Failed to place order");
      setPlacing(false);
    }
  }

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-lg font-semibold">Your cart is empty</p>
        <Link href="/" className="mt-3 inline-block text-spice-600 underline">
          Browse the menu
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">Your cart</h1>

      {shopClosed && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          We're currently closed. Ordering is available {shopConfig?.openTime}-{shopConfig?.closeTime}. You can
          still browse and build your cart.
        </div>
      )}
      {unavailableKeys.size > 0 && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Some items in your cart are no longer available. Remove them to continue.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {lines.map((line) => {
          const isUnavailable = unavailableKeys.has(line.key);
          return (
            <div
              key={line.key}
              className={`rounded-xl border p-3 ${isUnavailable ? "border-red-200 bg-red-50" : "border-spice-100"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{line.name}</p>
                  {isUnavailable && (
                    <p className="text-xs font-medium text-red-600">No longer available</p>
                  )}
                  {line.swaps?.map((s) => (
                    <p key={s.comboItemId} className="text-xs text-charcoal/50">
                      Swapped {s.fromName} → {s.toName}
                    </p>
                  ))}
                  <p className="text-sm text-spice-700">{formatInr(line.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {!isUnavailable && (
                    <QuantityStepper quantity={line.quantity} onChange={(q) => updateQuantity(line.key, q)} />
                  )}
                  <button onClick={() => removeLine(line.key)} className="text-xs text-red-600 underline">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 font-semibold">Order type</h2>
        <div className="flex flex-wrap gap-2">
          {(["DELIVERY", "TAKEAWAY", "DINE_IN"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                orderType === t ? "bg-spice-500 text-white" : "bg-spice-50 text-spice-700"
              }`}
            >
              {t === "DELIVERY" ? "Delivery" : t === "TAKEAWAY" ? "Takeaway" : "Dine-in"}
            </button>
          ))}
        </div>
      </div>

      {orderType === "DELIVERY" && (
        <div className="mt-4">
          <h2 className="mb-2 font-semibold">Deliver to</h2>
          {!user ? (
            <p className="text-sm text-charcoal/50">
              <Link href="/login" className="text-spice-600 underline">
                Log in
              </Link>{" "}
              to choose a delivery address.
            </p>
          ) : addresses.length === 0 ? (
            <Link href="/account/addresses" className="text-sm text-spice-600 underline">
              + Add a delivery address
            </Link>
          ) : (
            <div className="flex flex-col gap-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${
                    selectedAddressId === a.id ? "border-spice-400 bg-spice-50" : "border-charcoal/10"
                  }`}
                >
                  <input
                    type="radio"
                    checked={selectedAddressId === a.id}
                    onChange={() => setSelectedAddressId(a.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{a.label}</span> — {a.line1}, {a.area}, {a.city}
                  </span>
                </label>
              ))}
              <Link href="/account/addresses" className="text-xs text-spice-600 underline">
                + Add another address
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <h2 className="mb-2 font-semibold">Coupon</h2>
        {appliedCoupon ? (
          <p className="text-sm text-leaf-700">
            "{appliedCoupon.code}" applied — you saved {formatInr(appliedCoupon.discountAmount)}
            <button
              onClick={() => setAppliedCoupon(null)}
              className="ml-2 text-xs text-charcoal/50 underline"
            >
              remove
            </button>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter coupon code"
              className="flex-1 rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
            />
            <button onClick={applyCoupon} className="rounded-lg border border-spice-400 px-4 py-2 text-sm text-spice-600">
              Apply
            </button>
          </div>
        )}
        {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
      </div>

      <div className="mt-4">
        <h2 className="mb-2 font-semibold">Payment method</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPaymentMethod("COD")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              paymentMethod === "COD" ? "bg-spice-500 text-white" : "bg-spice-50 text-spice-700"
            }`}
          >
            Cash on {orderType === "DELIVERY" ? "Delivery" : "Pickup"}
          </button>
          <button
            onClick={() => setPaymentMethod("UPI_MANUAL")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              paymentMethod === "UPI_MANUAL" ? "bg-spice-500 text-white" : "bg-spice-50 text-spice-700"
            }`}
          >
            Pay via UPI on {orderType === "DELIVERY" ? "delivery" : "pickup"}
          </button>
        </div>
        {paymentMethod === "UPI_MANUAL" && (
          <p className="mt-2 text-xs text-charcoal/50">
            You'll see the shop's UPI QR code on the next screen — scan it with any UPI app and pay{" "}
            {orderType === "DELIVERY" ? "the delivery agent" : "at the counter"} directly. No online payment is
            processed through this app.
          </p>
        )}
      </div>

      <textarea
        value={specialInstructions}
        onChange={(e) => setSpecialInstructions(e.target.value)}
        placeholder="Any special instructions? (optional)"
        className="mt-4 w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
        rows={2}
      />

      <div className="mt-6 rounded-2xl border border-spice-100 p-4 text-sm">
        <div className="flex justify-between">
          <span>Item total</span>
          <span>{formatInr(itemsTotal)}</span>
        </div>
        {orderType === "DELIVERY" && (
          <div className="flex justify-between">
            <span>Delivery fee</span>
            <span>{formatInr(deliveryFee)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Taxes</span>
          <span>{formatInr(taxAmount)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-leaf-700">
            <span>Discount</span>
            <span>-{formatInr(discountAmount)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-spice-100 pt-2 font-bold">
          <span>Total</span>
          <span>{formatInr(totalAmount)}</span>
        </div>
      </div>

      {belowMinimum && (
        <p className="mt-2 text-sm text-red-600">
          Add {formatInr(minOrderValue - itemsTotal)} more to meet the {formatInr(minOrderValue)} minimum order
          value.
        </p>
      )}
      {placeError && <p className="mt-2 text-sm text-red-600">{placeError}</p>}

      <button
        onClick={placeOrder}
        disabled={!canPlaceOrder || placing || authLoading}
        className="mt-4 w-full rounded-full bg-spice-500 py-3 font-semibold text-white disabled:opacity-40"
      >
        {placing
          ? "Placing order..."
          : !user
            ? "Log in to place order"
            : shopClosed
              ? "We're currently closed"
              : unavailableKeys.size > 0
                ? "Remove unavailable items to continue"
                : `Place order — ${formatInr(totalAmount)}`}
      </button>
    </main>
  );
}
