export function formatInr(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
