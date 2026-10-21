/**
 * Tracks the pointer over `host`, in the coordinate space of `frame`.
 * `x`/`y` are raw; `sx`/`sy` trail behind them and are what effects should read.
 */
export class Pointer {
  x = -9999;
  y = -9999;
  sx = -9999;
  sy = -9999;
  active = false;
  private abort = new AbortController();

  constructor(host: HTMLElement, frame: HTMLElement = host) {
    const { signal } = this.abort;
    host.addEventListener(
      "pointermove",
      (event) => {
        const rect = frame.getBoundingClientRect();
        this.x = event.clientX - rect.left;
        this.y = event.clientY - rect.top;
        if (!this.active) {
          this.sx = this.x;
          this.sy = this.y;
        }
        this.active = true;
      },
      { signal },
    );
    host.addEventListener("pointerleave", () => (this.active = false), {
      signal,
    });
  }

  /** Eases the smoothed position toward the raw one. Call once per frame. */
  update(ease = 0.1) {
    this.sx += (this.x - this.sx) * ease;
    this.sy += (this.y - this.sy) * ease;
  }

  destroy() {
    this.abort.abort();
  }
}
