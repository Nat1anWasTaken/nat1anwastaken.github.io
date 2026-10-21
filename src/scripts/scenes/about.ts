import { mix, rgba } from "../../lib/particles/color";
import {
  approach,
  random,
  repel,
  spring,
  TAU,
  twinkle,
  type Body,
} from "../../lib/particles/physics";
import {
  icons,
  isLineIcon,
  type IconLines,
  type IconPart,
} from "../../lib/particles/shapes/icons";
import { sampleLines } from "../../lib/particles/shapes/polyline";
import { Scene } from "../scene";

/** Particles per icon. */
const FIGURE_PARTICLES = 140;
/** How assembled the icons are at rest: half way between scattered and drawn. */
const REST_PULL = 0.5;
/** Assembly of the other icons while one is hovered. */
const LOOSE_PULL = 0.2;
/** The icons stay scattered for this long before drifting to their rest state. */
const INTRO_MS = 700;
const REPEL = { radius: 110, strength: 0.9 };
/** Re-measure the anchors this often (in frames) to follow layout shifts. */
const MEASURE_EVERY = 30;
/** Padding around the cached glow image, so the blur isn't clipped. */
const GLOW_PAD = 20;
const HALO_SIZE = 32;

interface FigureParticle extends Body {
  /** Target on the icon, in unit coordinates. */
  tx: number;
  ty: number;
  tag: IconPart;
  /** Scattered home, in unit coordinates; where the particle sits when the icon is apart. */
  hx: number;
  hy: number;
  placed: boolean;
  r: number;
  a: number;
  phase: number;
  /** Speed of the particle's own wander around its target. */
  wander: number;
  warm: boolean;
}

interface Figure {
  pillar: HTMLElement;
  anchor: HTMLElement;
  lines: IconLines;
  particles: FigureParticle[];
  /** 0 = scattered, 1 = fully drawn. */
  pull: number;
  /** 0–1; only rises once a hovered icon has settled. */
  glow: number;
  /** Whether the icon has a drum head that gets hit when it lights up. */
  hittable: boolean;
  /** Decaying wobble on the drum head after it lights up. */
  hit: number;
  /** Anchor centre and half-size, in canvas coordinates. */
  cx: number;
  cy: number;
  scale: number;
  glowCache: { canvas: HTMLCanvasElement; size: number; scale: number } | null;
}

function createFigure(
  pillar: HTMLElement,
  anchor: HTMLElement,
  lines: IconLines,
): Figure {
  const particles = sampleLines(lines, FIGURE_PARTICLES).map(
    (point): FigureParticle => ({
      tx: point.x,
      ty: point.y,
      tag: point.tag,
      hx: random(-1.9, 1.9),
      hy: random(-1.3, 1.3),
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      placed: false,
      r: random(0.7, 1.6),
      a: random(0.45, 0.95),
      phase: random(0, TAU),
      wander: random(0.0011, 0.0023),
      warm: Math.random() < 0.7,
    }),
  );
  return {
    pillar,
    anchor,
    lines,
    particles,
    pull: 0,
    glow: 0,
    hittable: lines.some((line) => line.tag === "head"),
    hit: 0,
    cx: 0,
    cy: 0,
    scale: 0,
    glowCache: null,
  };
}

/**
 * The About section: each pillar's icon is drawn in particles that hover half
 * assembled, snap together and glow when the pillar is hovered, and scatter from the
 * pointer otherwise. The drum gets hit when it lights up.
 */
export class AboutScene extends Scene {
  private readonly figures: Figure[] = [];
  private hovered: Figure | null = null;
  private startTime: number | null = null;
  private frameCount = 0;
  private halo: HTMLCanvasElement | null = null;

  constructor(root: HTMLElement) {
    super(root, {
      dust: { area: 9000, max: 220, alpha: [0.12, 0.48], warmRatio: 0.4 },
    });
    for (const anchor of root.querySelectorAll<HTMLElement>("[data-figure]")) {
      const name = anchor.dataset.figure;
      const pillar = anchor.closest<HTMLElement>("[data-pillar]");
      if (!isLineIcon(name) || !pillar) continue;
      const figure = createFigure(pillar, anchor, icons[name]());
      if (this.reduced) figure.pull = REST_PULL;
      this.figures.push(figure);
      pillar.addEventListener("pointerenter", () => (this.hovered = figure));
      pillar.addEventListener("pointerleave", () => {
        if (this.hovered === figure) this.hovered = null;
      });
    }
  }

  protected override resize() {
    this.measure();
  }

  protected override render(time: number) {
    this.startTime ??= time;
    if (++this.frameCount % MEASURE_EVERY === 0) this.measure();
    const resting = this.reduced || time - this.startTime > INTRO_MS;
    for (const figure of this.figures) {
      if (!figure.scale) continue;
      this.step(figure, time, resting ? REST_PULL : 0);
      this.draw(figure, time);
    }
  }

  private measure() {
    for (const figure of this.figures) {
      const rect = this.surface.local(figure.anchor.getBoundingClientRect());
      figure.cx = rect.left + rect.width / 2;
      figure.cy = rect.top + rect.height / 2;
      figure.scale = rect.width / 2;
    }
  }

  /** Moves one icon's particles toward their blend of scattered home and icon target. */
  private step(figure: Figure, time: number, restPull: number) {
    const on = this.hovered === figure;
    const goal = this.reduced
      ? REST_PULL
      : on
        ? 1
        : this.hovered
          ? LOOSE_PULL
          : restPull;
    figure.pull = approach(figure.pull, goal, on ? 0.06 : 0.035);
    if (figure.pull > 0.995) figure.pull = 1;

    const { pull, cx, cy, scale } = figure;
    // Hovered icons use a stiffer, more damped spring so they snap into shape.
    const stiffness = on ? 0.012 : 0.006;
    const damping = on ? 0.86 : 0.9;
    // Each particle wanders around its target, less so the more assembled the icon is.
    const wobble = 0.028 + 0.02 * (1 - pull);
    const repelling = !on && !this.reduced;
    let error = 0;

    for (const p of figure.particles) {
      let tx = p.tx + Math.sin(time * p.wander + p.phase) * wobble;
      let ty = p.ty + Math.cos(time * p.wander * 0.8 + p.phase * 1.7) * wobble;
      if (p.tag === "head" && figure.hit > 0.01) {
        // A ripple across the drum head, decaying with `hit`.
        ty += Math.sin(time * 0.03 + p.tx * 4) * 0.04 * figure.hit;
      }
      const hx = p.hx + Math.sin(time * 0.00025 + p.phase) * 0.2;
      const hy = p.hy + Math.cos(time * 0.0002 + p.phase) * 0.15;
      const gx = cx + (hx + (tx - hx) * pull) * scale;
      const gy = cy + (hy + (ty - hy) * pull) * scale;

      if (!p.placed || this.reduced) {
        p.x = gx;
        p.y = gy;
        p.placed = true;
      }
      if (repelling) {
        // Assembled icons hold together more against the pointer.
        repel(p, this.pointer, {
          ...REPEL,
          strength: REPEL.strength * (1 - 0.65 * pull),
        });
      }
      spring(p, gx, gy, stiffness, damping);
      p.x += p.vx;
      p.y += p.vy;
      error += Math.abs(gx - p.x) + Math.abs(gy - p.y);
    }

    // 1 once the particles are within a small fraction of the icon size of their goals.
    const settled =
      1 - Math.min(1, error / figure.particles.length / (scale * 0.08));
    const glowGoal = on && pull > 0.97 ? Math.max(0, settled) : 0;
    const previous = figure.glow;
    figure.glow = approach(
      figure.glow,
      glowGoal,
      glowGoal > figure.glow ? 0.07 : 0.12,
    );
    if (figure.hittable && previous < 0.6 && figure.glow >= 0.6) {
      figure.hit = 1;
    }
    figure.hit *= 0.94;
  }

  private draw(figure: Figure, time: number) {
    const { ctx } = this.surface;
    const { accent, caramel, sand } = this.palette;
    const { glow, pull } = figure;

    if (glow > 0.01) {
      const cache = this.glowImage(figure);
      ctx.globalAlpha = glow * 0.85;
      ctx.drawImage(
        cache.canvas,
        figure.cx - cache.size / 2,
        figure.cy - cache.size / 2,
        cache.size,
        cache.size,
      );
      ctx.globalAlpha = 1;
    }

    for (const p of figure.particles) {
      const alpha = Math.min(
        1,
        p.a * twinkle(time, p.phase) * (0.4 + 0.6 * pull) + glow * 0.4,
      );
      const lit = glow > 0.3;
      ctx.fillStyle = lit
        ? rgba(caramel, alpha)
        : p.warm
          ? rgba(accent, alpha)
          : rgba(sand, alpha * 0.6);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + glow * 0.3, 0, TAU);
      ctx.fill();
    }

    if (glow > 0.05) {
      const halo = this.haloSprite();
      ctx.globalCompositeOperation = "lighter";
      for (const p of figure.particles) {
        const size = (p.r + 1) * 6;
        ctx.globalAlpha = glow * 0.35 * twinkle(time, p.phase, 0.003, 0.3);
        ctx.drawImage(halo, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /** The icon's line art stroked with a soft blur, rendered once per size. */
  private glowImage(figure: Figure) {
    const { scale } = figure;
    if (figure.glowCache?.scale === scale) return figure.glowCache;

    const ratio = Math.min(devicePixelRatio || 1, 2);
    const size = Math.ceil(scale * 2 + GLOW_PAD * 2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    const g = canvas.getContext("2d");
    if (g) {
      g.setTransform(ratio, 0, 0, ratio, 0, 0);
      g.lineCap = "round";
      g.lineJoin = "round";
      const stroke = (blur: number, alpha: number, width: number) => {
        g.shadowColor = g.strokeStyle = rgba(this.palette.caramel, alpha);
        g.shadowBlur = blur;
        g.lineWidth = width;
        for (const line of figure.lines) {
          g.beginPath();
          line.points.forEach(([x, y], i) => {
            const px = size / 2 + x * scale;
            const py = size / 2 + y * scale;
            if (i) g.lineTo(px, py);
            else g.moveTo(px, py);
          });
          g.stroke();
        }
      };
      // A wide faint bloom, then a tighter brighter line on top.
      stroke(14, 0.35, 3);
      stroke(6, 0.45, 1.2);
    }
    figure.glowCache = { canvas, size, scale };
    return figure.glowCache;
  }

  /** A small radial gradient, drawn additively around each particle while an icon glows. */
  private haloSprite() {
    if (this.halo) return this.halo;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = HALO_SIZE;
    const g = canvas.getContext("2d");
    if (g) {
      const { caramel, sand } = this.palette;
      const half = HALO_SIZE / 2;
      const gradient = g.createRadialGradient(half, half, 0, half, half, half);
      gradient.addColorStop(0, rgba(mix(caramel, sand, 0.35), 0.9));
      gradient.addColorStop(0.35, rgba(caramel, 0.35));
      gradient.addColorStop(1, rgba(caramel, 0));
      g.fillStyle = gradient;
      g.fillRect(0, 0, HALO_SIZE, HALO_SIZE);
    }
    this.halo = canvas;
    return canvas;
  }
}
