"use client";

import { QRCodeSVG } from "qrcode.react";

// A standard UPI intent URI. Deliberately excludes an amount — this is the
// one static QR for the shop (same every time), not a per-transaction code
// from a payment gateway. The customer pays the delivery agent/cashier
// directly; nothing here calls out to any payment API.
export function UpiQrCode({ upiId, shopName }: { upiId: string; shopName: string }) {
  const uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&cu=INR`;

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-spice-100 bg-white p-4">
      <QRCodeSVG value={uri} size={176} />
      <p className="font-mono text-sm font-medium">{upiId}</p>
      <p className="text-xs text-charcoal/50">Scan with any UPI app to pay</p>
    </div>
  );
}
