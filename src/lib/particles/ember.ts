import { rgba, type Palette } from "./color";
import { approach, random, TAU, twinkle } from "./physics";

interface Spark {
  x: number;
  y: number;
  /** Offset from the flow path, pushed by the pointer and relaxed back. */
  ox: number;
  oy: number;
  speed: number;
  r: number;
  a: number;
  phase: number;
  warm: boolean;
}

/**
 * The bright particles that stream through a pill button's dark fill while it is hovered.
 * Coordinates are local to the button.
 */
export class EmberField {
  pull = 0;
  engaged = false;
  /** Pointer position local to the button; far away when it isn't over it. */
  px = -999;
  py = -999;
  private sparks: Spark[] = [];
  private width = 0;
  private height = 0;

  get visible() {
    return this.engaged || this.pull > 0.01;
  }

  seed(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.sparks = Array.from(
      { length: Math.round((width * height) / 110) },
      () => ({
        x: random(0, width),
        y: random(0, height),
        ox: 0,
        oy: 0,
        speed: random(0.25, 1.35),
        r: random(0.5, 1.8),
        a: random(0.35, 0.95),
        phase: random(0, TAU),
        warm: Math.random() < 0.65,
      }),
    );
  }

  step(ctx: CanvasRenderingContext2D, time: number, palette: Palette) {
    this.pull = approach(this.pull, this.engaged ? 1 : 0, 0.05);
    const { width: w, height: h, pull } = this;
    ctx.clearRect(0, 0, w, h);
    if (pull < 0.01) return;

    const radius = 52;
    ctx.globalCompositeOperation = "lighter";
    for (const s of this.sparks) {
      s.x += s.speed * (0.35 + pull);
      s.y += Math.sin(time * 0.002 + s.phase) * 0.22;

      const dx = s.x + s.ox - this.px;
      const dy = s.y + s.oy - this.py;
      const distSq = dx * dx + dy * dy;
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq) || 1;
        const force = (1 - dist / radius) * 2.4;
        s.ox += (dx / dist) * force;
        s.oy += (dy / dist) * force;
      }
      s.ox *= 0.9;
      s.oy *= 0.9;

      if (s.x > w + 4) {
        s.x = -4;
        s.y = random(0, h);
      }
      if (s.y < -4) s.y = h + 4;
      else if (s.y > h + 4) s.y = -4;

      const alpha = s.a * twinkle(time, s.phase, 0.004, 0.4) * pull;
      ctx.fillStyle = s.warm
        ? rgba(palette.accent, alpha)
        : rgba(palette.sand, alpha * 0.6);
      ctx.beginPath();
      ctx.arc(s.x + s.ox, s.y + s.oy, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }
}
