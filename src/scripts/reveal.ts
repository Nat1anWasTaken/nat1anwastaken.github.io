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
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12 },
  );
  // Wait a frame so the hidden state paints before the first reveal.
  requestAnimationFrame(() => targets.forEach((el) => observer.observe(el)));
}

/** Replays the reveal transitions inside `el`, e.g. when a dialog shows new content. */
export function replayReveal(el: HTMLElement) {
  el.classList.remove("is-in");
  void el.offsetWidth;
  requestAnimationFrame(() => el.classList.add("is-in"));
}
