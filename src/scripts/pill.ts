import { readPalette, type Palette } from "../lib/particles/color";
import { EmberField } from "../lib/particles/ember";
import { prefersReducedMotion, ticker } from "../lib/particles/ticker";

/**
 * Pill buttons (`[data-pill]`): a dark fill grows out from the pointer as a circle,
 * with embers streaming through it. When `data-pill-trigger` names an ancestor
 * selector, hovering that ancestor drives the pill instead of the pill itself.
 */
class Pill {
  private readonly fill: HTMLElement | null;
  private readonly canvas: HTMLCanvasElement | null;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly embers = new EmberField();
  private width = 0;
  private height = 0;
  private ticking = false;

  constructor(
    private readonly el: HTMLElement,
    private readonly palette: Palette,
  ) {
    this.fill = el.querySelector(".pill-fill");
    this.canvas = el.querySelector(".pill-fill canvas");
    this.ctx = this.canvas?.getContext("2d") ?? null;
    const selector = el.dataset.pillTrigger;
    const trigger = (selector && el.closest<HTMLElement>(selector)) || el;

    trigger.addEventListener("pointerenter", (event) => this.engage(event));
    trigger.addEventListener("pointermove", (event) => this.track(event));
    trigger.addEventListener("pointerleave", (event) => this.release(event));
    trigger.addEventListener("focusin", () => this.engage());
    trigger.addEventListener("focusout", () => this.release());
  }

  private engage(event?: PointerEvent) {
    this.track(event);
    this.setOrigin(event);
    // Restart the circle from the entry point instead of animating from the last exit point.
    if (this.fill) {
      this.fill.style.transition = "none";
      void this.fill.offsetWidth;
      this.fill.style.transition = "";
    }
    this.el.classList.add("is-on");
    this.embers.engaged = true;
    if (!this.ticking && this.ctx && !prefersReducedMotion()) {
      this.ticking = true;
      ticker.add(this.tick);
    }
  }

  private release(event?: PointerEvent) {
    this.setOrigin(event);
    this.el.classList.remove("is-on");
    this.embers.engaged = false;
    this.embers.px = this.embers.py = -999;
  }

  private track(event?: PointerEvent) {
    if (!event) return;
    const rect = this.el.getBoundingClientRect();
    this.embers.px = event.clientX - rect.left;
    this.embers.py = event.clientY - rect.top;
  }

  private setOrigin(event?: PointerEvent) {
    const rect = this.el.getBoundingClientRect();
    const x = event
      ? Math.max(0, Math.min(rect.width, event.clientX - rect.left)) + "px"
      : "50%";
    const y = event
      ? Math.max(0, Math.min(rect.height, event.clientY - rect.top)) + "px"
      : "50%";
    this.el.style.setProperty("--cx", x);
    this.el.style.setProperty("--cy", y);
  }

  private tick = (time: number) => {
    const { canvas, ctx } = this;
    if (!canvas || !ctx) return;
    const width = this.el.offsetWidth;
    const height = this.el.offsetHeight;
    if (width !== this.width || height !== this.height) {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.width = width;
      this.height = height;
      this.embers.seed(width, height);
    }
    this.embers.step(ctx, time, this.palette);
    if (!this.embers.visible) {
      this.ticking = false;
      ticker.remove(this.tick);
    }
  };
}

const bound = new WeakSet<HTMLElement>();

export function initPills(root: ParentNode = document) {
  const palette = readPalette();
  for (const el of root.querySelectorAll<HTMLElement>("[data-pill]")) {
    if (bound.has(el)) continue;
    bound.add(el);
    new Pill(el, palette);
  }
}
