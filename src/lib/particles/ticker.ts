export type FrameCallback = (time: number, delta: number) => void;

/**
 * One requestAnimationFrame loop shared by every animated thing on the page.
 * It only runs while something is subscribed.
 */
class Ticker {
  private callbacks = new Set<FrameCallback>();
  private handle = 0;
  private last = 0;

  add(callback: FrameCallback): () => void {
    this.callbacks.add(callback);
    if (this.callbacks.size === 1) {
      this.last = performance.now();
      this.handle = requestAnimationFrame(this.tick);
    }
    return () => this.remove(callback);
  }

  remove(callback: FrameCallback) {
    this.callbacks.delete(callback);
    if (this.callbacks.size === 0) cancelAnimationFrame(this.handle);
  }

  private tick = (time: number) => {
    // Clamp so a backgrounded tab doesn't make everything jump on return.
    const delta = Math.min(50, time - this.last);
    this.last = time;
    for (const callback of this.callbacks) callback(time, delta);
    if (this.callbacks.size > 0) this.handle = requestAnimationFrame(this.tick);
  };
}

export const ticker = new Ticker();

export const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
