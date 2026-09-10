// A code recreation of the RR Kitchen mark (steam rising from a bowl,
// inside a circular badge) in the brand palette — scalable SVG rather than
// a raster asset, so it stays crisp at any size (header, footer, favicon).
// Swap in the real logo file at any time by dropping it in /public and
// replacing this component's usage with an <Image>.
export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="#FDF6EC" stroke="#D97748" strokeWidth="3" />
      {[35, 50, 65].map((x, i) => (
        <path
          key={x}
          d={`M${x},32 C${x - 6},26 ${x + 6},20 ${x},14 C${x - 6},8 ${x + 6},4 ${x},0`}
          fill="none"
          stroke="#4A7C59"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity={i === 1 ? 1 : 0.75}
        />
      ))}
      <ellipse cx="50" cy="70" rx="29" ry="8" fill="#D97748" opacity="0.55" />
      <ellipse cx="48" cy="62" rx="25" ry="13.5" fill="#D97748" />
      <circle cx="40" cy="58" r="2.6" fill="#FDF6EC" />
      <circle cx="52" cy="55" r="2.2" fill="#4A7C59" />
      <circle cx="44" cy="66" r="1.8" fill="#4A7C59" />
      <circle cx="58" cy="61" r="2.4" fill="#FDF6EC" />
      <circle cx="49" cy="68" r="1.6" fill="#D97748" opacity="0.7" />
      <path d="M68,64 C74,62 78,66 79,71 C74,71 69,69 68,64 Z" fill="#4A7C59" />
    </svg>
  );
}
