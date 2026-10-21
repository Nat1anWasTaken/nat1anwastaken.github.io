import { rgba, type Palette } from "./color";
import type { Orbit } from "./orbit";
import { random, repel, spring, TAU, twinkle, type Body } from "./physics";
import type { Pointer } from "./pointer";

interface Mote extends Body {
  /** Home position; it drifts, and the mote is sprung toward it. */
  hx: number;
  hy: number;
  /** Drift velocity of the home position. */
  bx: number;
  by: number;
  r: number;
  a: number;
  phase: number;
  warm: boolean;
}

export interface DustOptions {
  /** CSS pixels² of canvas per mote. */
  area: number;
  max: number;
  density: number;
  alpha: [min: number, max: number];
  warmRatio: number;
  repelRadius: number;
  repelStrength: number;
}

const defaults: DustOptions = {
  area: 9000,
  max: 220,
  density: 1,
  alpha: [0.14, 0.54],
  warmRatio: 0.45,
  repelRadius: 190,
  repelStrength: 0.9,
};

export interface DustFrame {
  ctx: CanvasRenderingContext2D;
  time: number;
  palette: Palette;
  pointer: Pointer;
  orbit?: Orbit;
  /** Skip the physics and draw every mote at home. */
  still?: boolean;
}

/**
 * Ambient drifting particles. They wander, scatter from the pointer (drawing faint
 * threads to it), and orbit whatever the `Orbit` is engaged on.
 */
export class DustField {
  readonly options: DustOptions;
  private motes: Mote[] = [];
  private width = 0;
  private height = 0;

  constructor(options: Partial<DustOptions> = {}) {
    this.options = { ...defaults, ...options };
  }

  seed(width: number, height: number) {
    this.width = width;
    this.height = height;
    const { area, max, density, alpha, warmRatio } = this.options;
    const count = Math.round(Math.min(max, (width * height) / area) * density);
    this.motes = Array.from({ length: count }, () => {
      const angle = random(0, TAU);
      const speed = random(0.04, 0.2);
      const x = random(0, width);
      const y = random(0, height);
      return {
        x,
        y,
        hx: x,
        hy: y,
        bx: Math.cos(angle) * speed,
        // A slight upward bias, so the dust reads as rising.
        by: Math.sin(angle) * speed - 0.05,
        vx: 0,
        vy: 0,
        r: random(0.5, 1.9),
        a: random(alpha[0], alpha[1]),
        phase: random(0, TAU),
        warm: Math.random() < warmRatio,
      };
    });
  }

  step({ ctx, time, palette, pointer, orbit, still }: DustFrame) {
    const { width: w, height: h } = this;
    const repelling = !still && !orbit?.engaged;
    const repelOptions = {
      radius: this.options.repelRadius,
      strength: this.options.repelStrength,
    };
    ctx.lineWidth = 0.6;

    for (const m of this.motes) {
      if (still) {
        m.x = m.hx;
        m.y = m.hy;
      } else {
        this.drift(m, w, h);
      }

      let near = 0;
      let hold = 1;
      if (!still && orbit) ({ hold, near } = orbit.apply(m));
      if (repelling) {
        const close = repel(m, pointer, repelOptions);
        if (close > 0.04) {
          ctx.strokeStyle = rgba(palette.accent, close * 0.32);
          ctx.beginPath();
          ctx.moveTo(pointer.sx, pointer.sy);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
        near = Math.max(near, close);
      }

      if (!still) {
        spring(m, m.hx, m.hy, 0.0045 * hold, 0.92);
        m.x += m.vx + m.bx;
        m.y += m.vy + m.by;
      }

      const alpha = Math.min(1, m.a * twinkle(time, m.phase) + near * 0.6);
      ctx.fillStyle =
        m.warm || near > 0.2
          ? rgba(palette.accent, alpha)
          : rgba(palette.sand, alpha * 0.5);
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r + near * 1.2, 0, TAU);
      ctx.fill();
    }
  }

  /** Moves the home point and wraps it (and the mote with it) around the edges. */
  private drift(m: Mote, w: number, h: number) {
    m.hx += m.bx;
    m.hy += m.by;
    const pad = 10;
    if (m.hx < -pad) this.shift(m, w + pad * 2, 0);
    else if (m.hx > w + pad) this.shift(m, -(w + pad * 2), 0);
    if (m.hy < -pad) this.shift(m, 0, h + pad * 2);
    else if (m.hy > h + pad) this.shift(m, 0, -(h + pad * 2));
  }

  private shift(m: Mote, dx: number, dy: number) {
    m.hx += dx;
    m.x += dx;
    m.hy += dy;
    m.y += dy;
  }
}
