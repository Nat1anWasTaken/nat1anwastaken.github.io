import { prefersReducedMotion } from "../lib/particles/ticker";

/** Delay between neighbouring letters, matching the colour stagger in global.css. */
const STAGGER = 30;
const DURATION = 1000;
/** Length of the settle once the pointer leaves before a letter has lifted. */
const SETTLE = 700;
/** --ease-expo, applied to each leg of the lift like a CSS keyframe easing. */
const EASE = "cubic-bezier(0.19, 1, 0.22, 1)";
const LIFT = "translateY(-0.14em)";

interface Letter {
  el: HTMLElement;
  delay: number;
  animation?: Animation;
}

/**
 * Letter wave (`.letter-wave`): the lift half of the hover effect, whose colour lives in
 * global.css. It runs here rather than as a CSS animation so that leaving mid-wave lets
 * each letter finish its lift and settle, instead of snapping down when `:hover` drops.
 * Re-entering starts each letter from wherever it is, so the wave never jumps either.
 */
class LetterWave {
  private readonly letters: Letter[];
  private hovered = false;
  private focused = false;
  private active = false;

  constructor(el: HTMLElement) {
    this.letters = Array.from(
      el.querySelectorAll<HTMLElement>("[data-letter]"),
      (letter) => ({
        el: letter,
        delay: Number(letter.style.getPropertyValue("--i")) * STAGGER,
      }),
    );

    el.addEventListener("pointerenter", () => {
      this.hovered = true;
      this.update();
    });
    el.addEventListener("pointerleave", (event) => {
      this.hovered = false;
      // A tap leaves straight after pointerup, while :hover keeps the colour on, so let the wave play out.
      this.update(event.pointerType !== "touch");
    });
    // Mirrors the :focus-visible and :has(:focus-visible) triggers in global.css.
    el.addEventListener("focusin", (event) => {
      this.focused = (event.target as Element).matches(":focus-visible");
      this.update();
    });
    el.addEventListener("focusout", (event) => {
      if (el.contains(event.relatedTarget as Node | null)) return;
      this.focused = false;
      this.update();
    });
  }

  private update(settle = true) {
    const active = this.hovered || this.focused;
    if (active === this.active) return;
    this.active = active;
    if (prefersReducedMotion()) return;
    if (active) this.lift();
    else if (settle) this.settle();
  }

  /** Starts the wave, with each letter rising from its current position. */
  private lift() {
    // Read every position before replacing any animation, to avoid a layout per letter.
    const from = this.letters.map((letter) =>
      letter.animation ? getComputedStyle(letter.el).transform : "none",
    );
    this.letters.forEach((letter, i) =>
      this.play(
        letter,
        [
          { transform: from[i], easing: EASE },
          { transform: LIFT, offset: 0.3, easing: EASE },
          { transform: "none" },
        ],
        { duration: DURATION, delay: letter.delay, fill: "backwards" },
      ),
    );
  }

  /**
   * Stops the wave where the pointer left it. Letters already moving finish their lift;
   * letters still waiting for their turn don't lift, and ease back if a previous wave
   * left them off their baseline.
   */
  private settle() {
    const waiting = this.letters.filter(
      ({ animation, delay }) =>
        animation && Number(animation.currentTime ?? 0) < delay,
    );
    const from = waiting.map(({ el }) => getComputedStyle(el).transform);
    waiting.forEach((letter, i) => {
      if (from[i] === "none") {
        letter.animation?.cancel();
        letter.animation = undefined;
        return;
      }
      this.play(
        letter,
        [{ transform: from[i], easing: EASE }, { transform: "none" }],
        { duration: SETTLE },
      );
    });
  }

  private play(
    letter: Letter,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    letter.animation?.cancel();
    const animation = letter.el.animate(keyframes, options);
    letter.animation = animation;
    animation.onfinish = () => {
      if (letter.animation === animation) letter.animation = undefined;
    };
  }
}

const bound = new WeakSet<HTMLElement>();

export function initLetterWaves(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>(".letter-wave")) {
    if (bound.has(el)) continue;
    bound.add(el);
    new LetterWave(el);
  }
}
