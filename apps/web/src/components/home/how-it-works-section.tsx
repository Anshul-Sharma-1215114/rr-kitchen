const STEPS = [
  { icon: "📋", title: "Choose your meal", description: "Browse the menu or grab a complete thali." },
  { icon: "👩‍🍳", title: "We cook it fresh", description: "Nothing is pre-made — cooking starts after you order." },
  { icon: "🛵", title: "Delivered locally", description: "Hyperlocal delivery gets it to you hot, fast." },
  { icon: "😋", title: "Enjoy & rate", description: "Dine-in, takeaway, or at your door — your call." },
];

export function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-center font-display text-xl font-semibold text-charcoal sm:text-2xl">How It Works</h2>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-4 sm:gap-4">
        {STEPS.map((step, i) => (
          <div key={step.title} className="relative flex flex-col items-center text-center">
            {i < STEPS.length - 1 && (
              <div className="absolute left-1/2 top-7 hidden h-0.5 w-full bg-spice-200 sm:block" />
            )}
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-spice-500 text-2xl text-white shadow-sm">
              {step.icon}
            </div>
            <h3 className="mt-3 font-display text-sm font-semibold text-charcoal">
              {i + 1}. {step.title}
            </h3>
            <p className="mt-1 text-xs text-charcoal/60">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
