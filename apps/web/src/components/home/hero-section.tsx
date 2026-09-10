import Link from "next/link";

// Decorative "appetizing food" placeholder — a warm gradient with the
// bowl-and-steam motif from the logo, scaled up. Swap the <div> below for
// a real <Image> of the food once photography is available; nothing else
// on the page depends on this being a raster image.
function HeroVisual() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-spice-400 via-spice-500 to-spice-700 shadow-xl sm:aspect-square">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -left-6 -top-6 h-40 w-40 rounded-full bg-cream-50" />
        <div className="absolute bottom-10 right-0 h-24 w-24 rounded-full bg-leaf-300" />
      </div>
      <div className="relative flex h-full items-center justify-center p-8">
        <svg viewBox="0 0 200 160" className="h-full w-full max-w-xs" aria-hidden="true">
          {[70, 100, 130].map((x, i) => (
            <path
              key={x}
              d={`M${x},60 C${x - 10},48 ${x + 10},36 ${x},24 C${x - 10},12 ${x + 10},4 ${x},-4`}
              fill="none"
              stroke="#FDF6EC"
              strokeWidth="5"
              strokeLinecap="round"
              opacity={i === 1 ? 0.95 : 0.6}
            />
          ))}
          <ellipse cx="100" cy="128" rx="72" ry="16" fill="#3E2723" opacity="0.15" />
          <ellipse cx="97" cy="112" rx="62" ry="26" fill="#FDF6EC" />
          <circle cx="80" cy="104" r="5" fill="#D97748" />
          <circle cx="105" cy="98" r="4.5" fill="#4A7C59" />
          <circle cx="120" cy="112" r="4" fill="#D97748" />
          <circle cx="90" cy="120" r="3.5" fill="#4A7C59" />
          <circle cx="115" cy="124" r="4" fill="#D97748" opacity="0.8" />
        </svg>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:pt-14">
      <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-2 sm:gap-12">
        <div className="order-2 sm:order-1">
          <h1 className="font-display text-3xl font-semibold leading-tight text-charcoal sm:text-4xl lg:text-5xl">
            Home-cooked food, made fresh for your neighborhood
          </h1>
          <p className="mt-4 text-base text-charcoal/70 sm:text-lg">
            Healthy, hygienic and truly home-made — cooked to order and kept low-cost by delivering only to our
            immediate neighborhood.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className="rounded-full bg-spice-500 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-spice-600"
            >
              View Menu
            </Link>
            <Link
              href="/combos"
              className="rounded-full border border-spice-300 px-7 py-3 text-sm font-semibold text-spice-700 transition hover:bg-spice-50"
            >
              See Combo Meals
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-1.5 text-sm text-leaf-700">
            <span aria-hidden="true">🍽️</span>
            Delivering fresh, home-style meals to your neighborhood.
          </p>
        </div>
        <div className="order-1 sm:order-2">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
