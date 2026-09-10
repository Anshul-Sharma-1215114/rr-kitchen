export function QuantityStepper({
  quantity,
  onChange,
  min = 0,
}: {
  quantity: number;
  onChange: (next: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-spice-300 px-1">
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= min}
        className="h-7 w-7 rounded-full text-spice-600 disabled:opacity-30"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-4 text-center text-sm">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        className="h-7 w-7 rounded-full text-spice-600"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
