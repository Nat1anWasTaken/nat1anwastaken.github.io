import type { Pointer } from "./pointer";

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const TAU = Math.PI * 2;

export const random = (min: number, max: number) =>
  min + Math.random() * (max - min);

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/** Moves `current` a fraction of the way toward `target`; the frame-based easing used everywhere. */
export const approach = (current: number, target: number, rate: number) =>
  current + (target - current) * rate;

/** Pulls a body toward (gx, gy) like a damped spring. */
export function spring(
  body: Body,
  gx: number,
  gy: number,
  stiffness: number,
  damping: number,
) {
  body.vx = (body.vx + (gx - body.x) * stiffness) * damping;
  body.vy = (body.vy + (gy - body.y) * stiffness) * damping;
}

export interface RepelOptions {
  radius: number;
  strength: number;
}

/**
 * Pushes a body away from the smoothed pointer, with a quadratic falloff.
 * Returns how close it is, from 0 (outside the radius) to 1 (on the pointer).
 */
export function repel(
  body: Body,
  pointer: Pointer,
  { radius, strength }: RepelOptions,
): number {
  if (!pointer.active) return 0;
  const dx = body.x - pointer.sx;
  const dy = body.y - pointer.sy;
  const distSq = dx * dx + dy * dy;
  if (distSq >= radius * radius) return 0;
  const dist = Math.sqrt(distSq) || 1;
  const near = 1 - dist / radius;
  const force = near * near * strength;
  body.vx += (dx / dist) * force;
  body.vy += (dy / dist) * force;
  return near;
}

/** Slow sine twinkle in [1 - depth, 1]. */
export const twinkle = (
  time: number,
  phase: number,
  speed = 0.0011,
  depth = 0.35,
) => 1 - depth + depth * Math.sin(time * speed + phase);
