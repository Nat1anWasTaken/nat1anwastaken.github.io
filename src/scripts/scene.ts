import { readPalette, type Palette } from "../lib/particles/color";
import { DustField, type DustOptions } from "../lib/particles/dust";
import { box, capsule, Orbit } from "../lib/particles/orbit";
import { Pointer } from "../lib/particles/pointer";
import { Surface, type SurfaceOptions } from "../lib/particles/surface";
import { prefersReducedMotion, ticker } from "../lib/particles/ticker";

export interface SceneOptions {
  /** Defaults to the root's `canvas[data-scene-canvas]`. */
  canvas?: HTMLCanvasElement;
  /** Element whose pointer movement drives the scene. Defaults to the root. */
  pointerHost?: HTMLElement;
  /** Options for the ambient dust, or `false` for none. */
  dust?: Partial<DustOptions> | false;
  pixelRatio?: SurfaceOptions["pixelRatio"];
}

/**
 * A particle canvas behind a page section. It owns the canvas, pointer, ambient dust,
 * and hover orbits, and only runs while the section is on screen.
 *
 * Orbits are declared in markup: hovering or focusing an element with
 * `data-orbit="capsule"` or `data-orbit="box"` draws the dust around it, or around its
 * `data-orbit-target` descendant when one is given.
 *
 * Subclasses add their own layer by overriding `resize` and `render`.
 */
export class Scene {
  protected readonly surface: Surface;
  protected readonly pointer: Pointer;
  protected readonly dust: DustField | null;
  protected readonly orbit = new Orbit();
  protected readonly palette: Palette;
  protected readonly reduced = prefersReducedMotion();
  private orbitTarget: HTMLElement | null = null;
  private abort = new AbortController();
  private visibility?: IntersectionObserver;
  private onScreen = false;
  private suspended = false;
  private running = false;

  constructor(
    protected readonly root: HTMLElement,
    options: SceneOptions = {},
  ) {
    const canvas =
      options.canvas ??
      root.querySelector<HTMLCanvasElement>("canvas[data-scene-canvas]");
    if (!canvas) throw new Error("Scene root has no canvas[data-scene-canvas]");
    this.palette = readPalette();
    this.dust = options.dust === false ? null : new DustField(options.dust);
    this.pointer = new Pointer(options.pointerHost ?? root, canvas);
    this.surface = new Surface(canvas, {
      pixelRatio: options.pixelRatio,
      onResize: (width, height) => {
        this.dust?.seed(width, height);
        this.resize(width, height);
        if (this.reduced) this.frame(0, 0);
      },
    });
    this.bindOrbits();
  }

  /** Begins animating whenever the scene is on screen. */
  start(): this {
    // With reduced motion, the surface's resize callback draws a single still frame instead.
    if (this.reduced) return this;
    this.visibility = new IntersectionObserver(
      ([entry]) => {
        this.onScreen = !!entry?.isIntersecting;
        this.sync();
      },
      {
        rootMargin: "120px",
      },
    );
    this.visibility.observe(this.root);
    return this;
  }

  /** Holds the scene still even while on screen, e.g. while a dialog covers it. */
  suspend(suspended: boolean) {
    this.suspended = suspended;
    this.sync();
  }

  destroy() {
    this.suspend(true);
    this.visibility?.disconnect();
    this.abort.abort();
    this.pointer.destroy();
    this.surface.destroy();
  }

  /** Called with the canvas's CSS size whenever it changes, after the dust is reseeded. */
  protected resize(_width: number, _height: number) {}

  /** Draws the scene's own layer, after the dust. */
  protected render(_time: number, _delta: number) {}

  private sync() {
    const running = this.onScreen && !this.suspended && !this.reduced;
    if (running === this.running) return;
    this.running = running;
    if (running) ticker.add(this.tick);
    else ticker.remove(this.tick);
  }

  private tick = (time: number, delta: number) => this.frame(time, delta);

  protected frame(time: number, delta: number) {
    if (!this.surface.width) return;
    this.surface.clear();
    this.pointer.update();
    this.updateOrbit();
    this.dust?.step({
      ctx: this.surface.ctx,
      time,
      palette: this.palette,
      pointer: this.pointer,
      orbit: this.orbit,
      still: this.reduced,
    });
    this.render(time, delta);
  }

  private updateOrbit() {
    this.orbit.update();
    const target = this.orbitTarget;
    if (!target) return;
    const rect = this.surface.local(target.getBoundingClientRect());
    this.orbit.shape =
      target.dataset.orbitShape === "capsule" ? capsule(rect) : box(rect);
  }

  private bindOrbits() {
    const { signal } = this.abort;
    for (const trigger of this.root.querySelectorAll<HTMLElement>(
      "[data-orbit]",
    )) {
      const selector = trigger.dataset.orbitTarget;
      const target =
        (selector && trigger.querySelector<HTMLElement>(selector)) || trigger;
      target.dataset.orbitShape = trigger.dataset.orbit;
      const engage = () => {
        this.orbitTarget = target;
        this.orbit.engaged = true;
      };
      const release = () => {
        if (this.orbitTarget !== target) return;
        this.orbit.engaged = false;
      };
      trigger.addEventListener("pointerenter", engage, { signal });
      trigger.addEventListener("pointerleave", release, { signal });
      trigger.addEventListener("focusin", engage, { signal });
      trigger.addEventListener("focusout", release, { signal });
    }
  }
}
