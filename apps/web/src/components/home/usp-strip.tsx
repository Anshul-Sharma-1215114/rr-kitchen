const USPS = [
  { icon: "🍲", title: "Fresh & Home-made", description: "Cooked to order, never mass-prepped or frozen." },
  { icon: "🧼", title: "100% Hygienic Kitchen", description: "Clean prep, clean packaging, every single order." },
  { icon: "🌿", title: "Healthy Ingredients", description: "No preservatives — real spices, real vegetables." },
  { icon: "🚲", title: "Low Delivery Cost", description: "Hyperlocal delivery keeps your bill down." },
];

export function UspStrip() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {USPS.map((usp) => (
          <div
            key={usp.title}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-spice-100 bg-white px-3 py-5 text-center shadow-sm"
          >
            <span className="text-3xl" aria-hidden="true">
              {usp.icon}
            </span>
            <h3 className="font-display text-sm font-semibold text-charcoal">{usp.title}</h3>
            <p className="text-xs text-charcoal/60">{usp.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
