export function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `RRK-${datePart}-${randomPart}`;
}
