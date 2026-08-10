/**
 * Lightweight, GPU-friendly particle burst used to celebrate a tap.
 * Renders absolutely inside a `relative` parent and self-destructs via the
 * parent's key/mount cycle — no timers, no layout impact.
 */
const PARTICLES = 12;

const CelebrationBurst = ({ radius = 34 }: { radius?: number }) => (
  <span aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
    <span className="bloom-ring" />
    {Array.from({ length: PARTICLES }).map((_, i) => {
      const angle = (i / PARTICLES) * Math.PI * 2;
      const dist = radius + (i % 3) * 8;
      return (
        <span
          key={i}
          className="burst-particle"
          style={
            {
              "--bx": `${Math.cos(angle) * dist}px`,
              "--by": `${Math.sin(angle) * dist}px`,
              background:
                i % 3 === 0
                  ? "hsl(var(--accent))"
                  : i % 3 === 1
                    ? "hsl(var(--primary))"
                    : "hsl(var(--accent) / 0.6)",
              animationDelay: `${(i % 4) * 25}ms`,
            } as React.CSSProperties
          }
        />
      );
    })}
  </span>
);

export default CelebrationBurst;