// A simple decorative mark (steam rising from a bowl) rather than a real
// map or radius diagram — this section is about the "home-style, made
// fresh" selling point, not a claim about how far delivery reaches.
function KitchenMark() {
  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-40 w-40 sm:h-48 sm:w-48" aria-hidden="true">
      <circle cx="100" cy="100" r="90" fill="#4A7C59" opacity="0.08" />
      <circle cx="100" cy="100" r="65" fill="#4A7C59" opacity="0.12" />
      <ellipse cx="100" cy="128" rx="46" ry="12" fill="#3E2723" opacity="0.15" />
      <ellipse cx="97" cy="116" rx="40" ry="18" fill="#FDF6EC" />
      <path
        d="M78,95 C72,90 76,82 82,84 C86,72 104,72 108,84 C116,80 122,90 114,95"
        fill="none"
        stroke="#D97748"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LocalAreaCallout() {
  return (
    <section className="bg-spice-500 py-10 text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-6 px-4 sm:grid-cols-2">
        <KitchenMark />
        <div className="text-center sm:text-left">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">Proudly Home-Style</h2>
          <p className="mt-3 text-sm text-spice-50/90 sm:text-base">
            Every order is cooked fresh, the same way you'd cook at home — no mass-prepping, no shortcuts. We keep
            things local and hands-on because that's what keeps it tasting home-made.
          </p>
        </div>
      </div>
    </section>
  );
}
