import { prefersReducedMotion, ticker } from "../lib/particles/ticker";

/** One step of a screencast, in 1400×800 screen pixels (see `src/content.config.ts`). */
export interface Keyframe {
  /** Index of the screenshot shown. */
  screen: number;
  /** How far that screenshot is scrolled. */
  scroll: number;
  /** Cursor position. */
  x: number;
  y: number;
  /** Duration of the cursor move and scroll into this keyframe, in ms. */
  move: number;
  /** How long to rest after arriving, in ms. */
  hold: number;
  /** Press the cursor on arrival. */
  click: boolean;
  /** Cross-fade to this keyframe's screen instead of scrolling to it. */
  cut: boolean;
}

/** Width of the virtual screen; the viewport scales it to fit. */
const SCREEN_WIDTH = 1400;
/** Duration of the move back to the first keyframe that closes the loop. */
const LOOP_MOVE = 900;
const CUT_FADE = 520;
const PRESS_LEAD = 60;
const PRESS_TAIL = 170;
const PRESS_SCALE = 0.82;
const RIPPLE_DURATION = 520;
const RIPPLE_OPACITY = 0.9;
const RIPPLE_SCALE_FROM = 0.4;
const RIPPLE_SCALE_GROWTH = 1.5;

/** Everything needed to draw one moment of a screencast. */
interface Frame {
  x: number;
  y: number;
  screen: number;
  scroll: number;
  /** The screen being cut away from, still showing underneath while `fade` < 1. */
  previous: { screen: number; scroll: number } | null;
  /** Opacity of the current screen, from 0 to 1 over a cut. */
  fade: number;
  pressed: boolean;
  /** Ripple progress from 0 to 1, or null when there is none. */
  ripple: number | null;
}

const easeInOutCubic = (u: number) =>
  u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** The keyframes laid out in time, closed into a loop with a cut back to the first frame. */
class Timeline {
  readonly duration: number;
  private readonly keys: Keyframe[];
  private readonly starts: number[] = [];

  constructor(keyframes: Keyframe[]) {
    const [first] = keyframes;
    if (!first) throw new Error("A screencast needs at least one keyframe");
    this.keys = [
      ...keyframes,
      { ...first, move: LOOP_MOVE, click: false, cut: true },
    ];
    let time = 0;
    for (const key of this.keys) {
      this.starts.push(time);
      time += key.move + key.hold;
    }
    this.duration = time;
  }

  at(time: number): Frame {
    const t = ((time % this.duration) + this.duration) % this.duration;
    let i = 0;
    while (i < this.keys.length - 1 && this.starts[i + 1]! <= t) i++;
    const key = this.keys[i]!;
    const from = this.keys[i - 1] ?? key;
    const local = t - this.starts[i]!;
    const eased = easeInOutCubic(key.move ? Math.min(1, local / key.move) : 1);
    const cutting = key.cut && i > 0;

    return {
      x: lerp(from.x, key.x, eased),
      y: lerp(from.y, key.y, eased),
      screen: key.screen,
      scroll: cutting ? key.scroll : lerp(from.scroll, key.scroll, eased),
      previous: cutting ? { screen: from.screen, scroll: from.scroll } : null,
      fade: cutting ? Math.min(1, local / CUT_FADE) : 1,
      pressed:
        key.click &&
        local >= key.move - PRESS_LEAD &&
        local <= key.move + PRESS_TAIL,
      ripple:
        key.click && local >= key.move && local < key.move + RIPPLE_DURATION
          ? (local - key.move) / RIPPLE_DURATION
          : null,
    };
  }
}

/**
 * Plays a fake screen recording (`[data-screencast]`): stacked screenshots scroll and
 * cross-fade while a cursor moves, presses and ripples. It runs only while on screen
 * and not held, and shows the first frame still under reduced motion.
 */
export class Screencast {
  private readonly timeline: Timeline;
  private readonly screen: HTMLElement;
  private readonly shots: HTMLElement[];
  private readonly cursor: HTMLElement | null;
  private readonly arrow: HTMLElement | null;
  private readonly ripple: HTMLElement | null;
  private readonly reduced = prefersReducedMotion();
  private readonly observers: (ResizeObserver | IntersectionObserver)[] = [];
  private elapsed = 0;
  private visible = false;
  private held = false;
  private running = false;

  constructor(private readonly root: HTMLElement) {
    const screen = root.querySelector<HTMLElement>("[data-screencast-screen]");
    if (!screen) throw new Error("Screencast has no [data-screencast-screen]");
    this.screen = screen;
    this.shots = [
      ...root.querySelectorAll<HTMLElement>("[data-screencast-shot]"),
    ];
    this.cursor = root.querySelector("[data-screencast-cursor]");
    this.arrow = root.querySelector("[data-screencast-arrow]");
    this.ripple = root.querySelector("[data-screencast-ripple]");
    this.timeline = new Timeline(
      JSON.parse(root.dataset.keyframes ?? "[]") as Keyframe[],
    );

    const resize = new ResizeObserver(() => this.fit());
    resize.observe(root);
    this.observers.push(resize);

    if (!this.reduced) {
      const visibility = new IntersectionObserver(
        ([entry]) => {
          this.visible = !!entry?.isIntersecting;
          this.update();
        },
        { rootMargin: "120px" },
      );
      visibility.observe(root);
      this.observers.push(visibility);
    }

    this.render();
  }

  /** Pauses the screencast regardless of visibility, e.g. while a dialog covers it. */
  hold(held: boolean) {
    this.held = held;
    this.update();
  }

  /** Rewinds to the first frame. */
  restart() {
    this.elapsed = 0;
    this.render();
  }

  destroy() {
    this.held = true;
    this.update();
    this.observers.forEach((observer) => observer.disconnect());
  }

  private update() {
    const running = this.visible && !this.held && !this.reduced;
    if (running === this.running) return;
    this.running = running;
    if (running) ticker.add(this.tick);
    else ticker.remove(this.tick);
  }

  private tick = (_time: number, delta: number) => {
    this.elapsed = (this.elapsed + delta) % this.timeline.duration;
    this.render();
  };

  /** Scales the virtual screen to the viewport's width. */
  private fit() {
    const width = this.root.clientWidth;
    if (width)
      this.screen.style.transform = `scale(${(width / SCREEN_WIDTH).toFixed(5)})`;
  }

  private render() {
    const frame = this.timeline.at(this.elapsed);

    this.shots.forEach((shot, index) => {
      let opacity = 0;
      let scroll = 0;
      if (index === frame.screen) {
        opacity = frame.fade;
        scroll = frame.scroll;
      } else if (index === frame.previous?.screen) {
        opacity = 1;
        scroll = frame.previous.scroll;
      }
      shot.style.opacity = String(opacity);
      shot.style.zIndex = index === frame.screen ? "2" : "1";
      if (opacity > 0)
        shot.style.transform = `translate3d(0, ${(-scroll).toFixed(1)}px, 0)`;
    });

    if (this.cursor) {
      this.cursor.style.transform = `translate3d(${frame.x.toFixed(1)}px, ${frame.y.toFixed(1)}px, 0)`;
    }
    if (this.arrow)
      this.arrow.style.transform = frame.pressed ? `scale(${PRESS_SCALE})` : "";
    if (this.ripple) {
      const progress = frame.ripple;
      this.ripple.style.opacity =
        progress === null ? "0" : ((1 - progress) * RIPPLE_OPACITY).toFixed(3);
      if (progress !== null) {
        const scale = RIPPLE_SCALE_FROM + progress * RIPPLE_SCALE_GROWTH;
        this.ripple.style.transform = `scale(${scale.toFixed(3)})`;
      }
    }
  }
}

/** Starts every `[data-screencast]` inside `root`. */
export function mountScreencasts(root: ParentNode): Screencast[] {
  return [...root.querySelectorAll<HTMLElement>("[data-screencast]")].map(
    (el) => new Screencast(el),
  );
}
