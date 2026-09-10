export function VegBadge({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      className={`inline-flex h-4 w-4 items-center justify-center border ${
        isVeg ? "border-leaf-600" : "border-spice-600"
      }`}
      title={isVeg ? "Vegetarian" : "Non-vegetarian"}
    >
      <span className={`h-2 w-2 rounded-full ${isVeg ? "bg-leaf-600" : "bg-spice-600"}`} />
    </span>
  );
}
