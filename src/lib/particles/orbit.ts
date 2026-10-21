import { approach, type Body } from "./physics";
import type { LocalRect } from "./surface";

/** Where a point sits relative to a shape's outline: signed distance and outward normal. */
export interface Offset {
  /** Distance to the outline; negative when inside the shape. */
  off: number;
  ux: number;
  uy: number;
}

export type OrbitShape = (x: number, y: number) => Offset;

/** A pill: the rect's height is the diameter, plus a margin the particles keep clear of. */
export function capsule(rect: LocalRect, margin = 16): OrbitShape {
  const radius = rect.height / 2;
  const x1 = rect.left + radius;
  const x2 = rect.right - radius;
  const cy = rect.top + radius;
  return (x, y) => {
    const dx = x - Math.max(x1, Math.min(x2, x));
    const dy = y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    return { off: dist - (radius + margin), ux: dx / dist, uy: dy / dist };
  };
}

/** A rectangle grown by `margin` on every side. */
export function box(rect: LocalRect, margin = 16): OrbitShape {
  const x1 = rect.left - margin;
  const y1 = rect.top - margin;
  const x2 = rect.right + margin;
  const y2 = rect.bottom + margin;
  return (x, y) => {
    const inside = x > x1 && x < x2 && y > y1 && y < y2;
    let qx = Math.max(x1, Math.min(x2, x));
    let qy = Math.max(y1, Math.min(y2, y));
    if (inside) {
      // Snap to the nearest edge so particles caught inside get pushed out through it.
      const edges = [x - x1, x2 - x, y - y1, y2 - y];
      const nearest = edges.indexOf(Math.min(...edges));
      if (nearest === 0) qx = x1;
      else if (nearest === 1) qx = x2;
      else if (nearest === 2) qy = y1;
      else qy = y2;
    }
    const dx = x - qx;
    const dy = y - qy;
    const dist = Math.hypot(dx, dy) || 1;
    const sign = inside ? -1 : 1;
    return { off: sign * dist, ux: (sign * dx) / dist, uy: (sign * dy) / dist };
  };
}

export interface OrbitOptions {
  /** How far from the outline particles still feel the pull. */
  reach: number;
  /** Radial spring toward the outline. */
  radial: number;
  /** Tangential push that makes them circle. */
  swirl: number;
  /** Distance from the outline within which particles glow. */
  glowBand: number;
}

const defaults: OrbitOptions = {
  reach: 340,
  radial: 0.0016,
  swirl: 0.11,
  glowBand: 46,
};

/**
 * Draws particles into a slow orbit around a shape while it is engaged,
 * easing in and out with `pull`.
 */
export class Orbit {
  pull = 0;
  shape: OrbitShape | null = null;
  engaged = false;
  private options: OrbitOptions;

  constructor(options: Partial<OrbitOptions> = {}) {
    this.options = { ...defaults, ...options };
  }

  get active() {
    return this.pull > 0.01 && this.shape !== null;
  }

  update(rate = 0.05) {
    this.pull = approach(this.pull, this.engaged ? 1 : 0, rate);
  }

  /**
   * Applies the orbit to a body.
   * Returns how much the body's home spring should be held back (0–1) and how much it glows.
   */
  apply(body: Body): { hold: number; near: number } {
    if (!this.active || !this.shape) return { hold: 1, near: 0 };
    const { reach, radial, swirl, glowBand } = this.options;
    const { off, ux, uy } = this.shape(body.x, body.y);
    const distance = Math.abs(off);
    if (distance >= reach) return { hold: 1, near: 0 };
    const k = (1 - distance / reach) * this.pull;
    body.vx += (-ux * off * radial - uy * swirl) * k;
    body.vy += (-uy * off * radial + ux * swirl) * k;
    return {
      hold: 1 - k * 0.9,
      near: Math.max(0, 1 - distance / glowBand) * this.pull * 0.8,
    };
  }
}
