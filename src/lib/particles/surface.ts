export interface SurfaceOptions {
  /** Picks the device pixel ratio for a given CSS size. Defaults to the screen's, capped at 2. */
  pixelRatio?: (width: number, height: number) => number;
  onResize?: (width: number, height: number) => void;
}

const defaultPixelRatio = () => Math.min(devicePixelRatio || 1, 2);

/** Above this height (CSS px) `tallPixelRatio` draws at 1× to keep the backing store small. */
const TALL_CANVAS = 1600;

/** For canvases behind very tall sections: trades sharpness for memory. */
export const tallPixelRatio = (_width: number, height: number) =>
  height > TALL_CANVAS ? 1 : defaultPixelRatio();

/** A canvas whose backing store follows its CSS size, so drawing code works in CSS pixels. */
export class Surface {
  readonly ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  private observer: ResizeObserver;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private options: SurfaceOptions = {},
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas is not supported");
    this.ctx = ctx;
    // The observer's first callback arrives asynchronously, so `onResize` never runs
    // before the owner has finished constructing.
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height || (width === this.width && height === this.height))
      return;
    const ratio = (this.options.pixelRatio ?? defaultPixelRatio)(width, height);
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = width;
    this.height = height;
    this.options.onResize?.(width, height);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /** Converts a DOM rect into this canvas's coordinate space. */
  local(rect: DOMRect) {
    const origin = this.canvas.getBoundingClientRect();
    return {
      left: rect.left - origin.left,
      top: rect.top - origin.top,
      right: rect.right - origin.left,
      bottom: rect.bottom - origin.top,
      width: rect.width,
      height: rect.height,
    };
  }

  destroy() {
    this.observer.disconnect();
  }
}

export type LocalRect = ReturnType<Surface["local"]>;
