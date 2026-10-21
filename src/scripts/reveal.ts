import { prefersReducedMotion } from "../lib/particles/ticker";

/**
 * Adds `.is-in` to each `[data-reveal]` element the first time it scrolls into view,
 * which plays the `.reveal-*` transitions defined in global.css.
 */
export function initReveal(root: ParentNode = document) {
  const targets = root.querySelectorAll<HTMLElement>(
    "[data-reveal]:not(.is-in)",
  );
  if (prefersReducedMotion()) {
    targets.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        // An element over ~8 viewports tall (a long post on a phone) can never be
        // 12% visible, so anything taller than the viewport reveals on entry.
        const viewport = entry.rootBounds?.height ?? window.innerHeight;
        const tall = entry.boundingClientRect.height > viewport;
        if (entry.intersectionRatio < 0.12 && !tall) continue;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    },
    { threshold: [0, 0.12] },
  );
  // Wait a frame so the hidden state paints before the first reveal.
  requestAnimationFrame(() => targets.forEach((el) => observer.observe(el)));
}
