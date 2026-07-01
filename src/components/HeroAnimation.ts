import { animate, createTimeline, stagger } from "animejs";

const WORD = "twelve";

export interface HeroAnimationHandle {
  destroy: () => void;
  poke: () => void;
}

/**
 * Build the hero entrance + ambient loop animation for the `twelve` wordmark.
 * Returns a handle to tear everything down (for React StrictMode + unmount).
 */
export function createHeroAnimation(root: HTMLElement): HeroAnimationHandle {
  const letters = Array.from(
    root.querySelectorAll<HTMLElement>(".hero-letter"),
  );
  const dots = Array.from(root.querySelectorAll<HTMLElement>(".hero-dot"));

  // Entrance: letters fly in from below with rotation + scale, staggered from center.
  const intro = createTimeline({
    defaults: { ease: "inOutQuint" },
  });

  intro
    .add(
      letters,
      {
        translateY: [120, 0],
        rotate: [-180, 0],
        scale: [0.3, 1],
        opacity: [0, 1],
        duration: 900,
        delay: stagger(80, { from: "center" }),
      },
      0,
    )
    .add(
      dots,
      {
        opacity: [0, 0.7],
        scale: [0, 1],
        duration: 700,
        delay: stagger(60, { from: "random" }),
      },
      200,
    );

  // Ambient loop: gentle floating + dot breathing. Starts after entrance settles.
  const ambient = createTimeline({
    defaults: { ease: "inOutSine", loop: true, alternate: true },
  });

  const ambientStart = 1200;

  ambient
    .add(
      letters,
      {
        translateY: [0, -8],
        duration: 2400,
        delay: stagger(120, { from: "center" }),
      },
      ambientStart,
    )
    .add(
      dots,
      {
        scale: [1, 1.4],
        opacity: [0.7, 0.25],
        duration: 1800,
        delay: stagger(90, { from: "random" }),
      },
      ambientStart,
    );

  let pokeAnim: ReturnType<typeof animate> | null = null;

  const poke = () => {
    if (pokeAnim) pokeAnim.revert();
    pokeAnim = animate(letters, {
      translateY: () => [0, -24 - Math.random() * 16],
      rotate: () => [0, (Math.random() - 0.5) * 30],
      duration: 600,
      ease: "outElastic(1, 0.6)",
      delay: stagger(40, { from: "center" }),
      alternate: true,
      loop: false,
      onComplete: () => {
        pokeAnim = null;
      },
    });
  };

  const destroy = () => {
    intro.revert();
    ambient.revert();
    if (pokeAnim) {
      pokeAnim.revert();
      pokeAnim = null;
    }
  };

  return { destroy, poke };
}

export { WORD };
