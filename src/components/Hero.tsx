import { useEffect, useRef } from "react";
import { createHeroAnimation, type HeroAnimationHandle, WORD } from "./HeroAnimation";

// Decorative background dots: relative positions in % of the hero box.
const DOTS = [
  { x: 12, y: 22, s: 6 },
  { x: 84, y: 18, s: 4 },
  { x: 22, y: 78, s: 5 },
  { x: 76, y: 82, s: 7 },
  { x: 50, y: 12, s: 3 },
  { x: 38, y: 88, s: 4 },
  { x: 66, y: 58, s: 5 },
  { x: 16, y: 50, s: 3 },
];

export function Hero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HeroAnimationHandle | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const handle = createHeroAnimation(rootRef.current);
    handleRef.current = handle;
    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, []);

  const handlePoke = () => {
    handleRef.current?.poke();
  };

  return (
    <section
      ref={rootRef}
      className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden px-6"
      onPointerDown={handlePoke}
    >
      {/* Decorative dots layer */}
      <div className="pointer-events-none absolute inset-0">
        {DOTS.map((d, i) => (
          <span
            key={i}
            className="hero-dot absolute rounded-full bg-[var(--color-accent)]"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: `${d.s}px`,
              height: `${d.s}px`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Wordmark */}
      <h1
        className="select-none text-center font-semibold leading-none tracking-tight"
        style={{ fontSize: "clamp(3rem, 18vw, 8rem)" }}
        aria-label={WORD}
      >
        {WORD.split("").map((ch, i) => (
          <span
            key={i}
            className="hero-letter inline-block opacity-0"
            style={{ transformOrigin: "center bottom" }}
          >
            {ch}
          </span>
        ))}
      </h1>

      {/* Subtle caption, kept minimal for later refinement */}
      <p className="absolute bottom-[calc(env(safe-area-inset-bottom)+2rem)] left-0 right-0 text-center text-xs tracking-[0.3em] uppercase text-[var(--color-muted)]">
        twelve
      </p>
    </section>
  );
}
