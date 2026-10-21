import { mix, rgba, type Palette } from "../../lib/particles/color";
import {
  approach,
  random,
  repel,
  spring,
  TAU,
  twinkle,
  type Body,
} from "../../lib/particles/physics";
import type { Point } from "../../lib/particles/shapes/polyline";
import { Scene } from "../scene";

/** The thread stays scattered for this long before assembling. */
const INTRO_MS = 500;
/** Vertical spacing of the particles along the timeline line. */
const LINE_SPACING = 9;
/** The line runs this far past the last node. */
const LINE_TAIL = 40;
const RING_PARTICLES = 18;
const CORE_PARTICLES = 5;
const RING_RADIUS = 8;
/** The thread scatters less from the pointer than the dust does. */
const REPEL = { radius: 190, strength: 0.35 };
/** Re-measure the rows this often (in frames) to follow layout shifts. */
const MEASURE_EVERY = 60;

interface Row {
  node: HTMLElement;
  current: boolean;
  /** Eases to 1 while the row is hovered or focused. */
  expand: number;
  center: Point;
}

interface ParticleBase extends Body {
  /** Scattered start position, blended into the goal as the thread assembles. */
  sx: number;
  sy: number;
  r: number;
  a: number;
  phase: number;
  warm: boolean;
  /** Eases toward how close the pointer is or how lit its row is; tints and grows it. */
  heat: number;
}

/** What a particle draws: the timeline line, or a node's ring or core. */
type ThreadPart =
  | { kind: "line"; t: number; jitter: number }
  | { kind: "ring"; row: number; angle: number }
  | { kind: "core"; row: number; ox: number; oy: number };

type ThreadParticle = ParticleBase & ThreadPart;

/** Sand warms to accent with heat; warm particles are accent already. */
function heatColor(
  { accent, sand }: Palette,
  heat: number,
  warm: boolean,
  alpha: number,
  sandAlpha: number,
) {
  if (warm) return rgba(accent, alpha);
  const u = Math.min(1, heat);
  return rgba(mix(sand, accent, u), alpha * (sandAlpha + (1 - sandAlpha) * u));
}

/**
 * The Experience timeline: a particle thread down the row nodes, with a ring at each
 * node. Hovering a row widens its ring and starts it turning.
 */
export class ExperienceScene extends Scene {
  private readonly rows: Row[] = [];
  private particles: ThreadParticle[] = [];
  private hovered = -1;
  /** 0 = scattered, 1 = assembled. */
  private assembly = 0;
  private startTime: number | null = null;
  private lineX = 0;
  private lineTop = 0;
  private lineBottom = 0;
  private frameCount = 0;

  constructor(root: HTMLElement) {
    super(root);
    root.querySelectorAll<HTMLElement>("[data-exp-row]").forEach((el) => {
      const node = el.querySelector<HTMLElement>("[data-thread-node]");
      if (!node) return;
      const i = this.rows.length;
      this.rows.push({
        node,
        current: el.hasAttribute("data-current"),
        expand: 0,
        center: [0, 0],
      });
      const enter = () => (this.hovered = i);
      const leave = () => {
        if (this.hovered === i) this.hovered = -1;
      };
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointerleave", leave);
      el.addEventListener("focusin", enter);
      el.addEventListener("focusout", leave);
    });
    // Web fonts change the row heights the nodes sit at.
    document.fonts?.ready.then(() => this.measure());
  }

  protected override resize() {
    this.measure();
    this.seed();
  }

  protected override render(time: number) {
    if (!this.particles.length) return;
    this.startTime ??= time;
    if (++this.frameCount % MEASURE_EVERY === 0) this.measure();

    const assembled = this.reduced || time - this.startTime > INTRO_MS;
    this.assembly = this.reduced
      ? 1
      : approach(this.assembly, assembled ? 1 : 0, 0.03);
    if (!this.reduced)
      this.rows.forEach((row, i) => {
        row.expand = approach(row.expand, this.hovered === i ? 1 : 0, 0.08);
      });
    this.drawThread(time);
  }

  /** Reads the node positions from the layout. */
  private measure() {
    for (const row of this.rows) {
      const node = this.surface.local(row.node.getBoundingClientRect());
      row.center = [node.left, node.top];
    }

    const first = this.rows[0];
    const last = this.rows[this.rows.length - 1];
    if (first && last) {
      this.lineX = first.center[0];
      this.lineTop = first.center[1];
      this.lineBottom = last.center[1] + LINE_TAIL;
    }
  }

  /** Scatters a fresh thread across the canvas; it assembles after the intro delay. */
  private seed() {
    const { width, height } = this.surface;
    const particles: ThreadParticle[] = [];
    const add = (part: ThreadPart & Pick<ParticleBase, "r" | "warm">) => {
      particles.push({
        sx: random(0, width),
        sy: random(0, height),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        a: random(0.45, 0.95),
        phase: random(0, TAU),
        heat: 0,
        ...part,
      });
    };

    if (this.rows.length) {
      const lineCount =
        Math.floor((this.lineBottom - this.lineTop) / LINE_SPACING) + 1;
      for (let j = 0; j < lineCount; j++) {
        add({
          kind: "line",
          t: lineCount > 1 ? j / (lineCount - 1) : 0,
          jitter: random(-1.2, 1.2),
          r: random(0.6, 1.4),
          warm: Math.random() < 0.5,
        });
      }
    }

    this.rows.forEach((row, i) => {
      for (let j = 0; j < RING_PARTICLES; j++) {
        add({
          kind: "ring",
          row: i,
          angle: (j / RING_PARTICLES) * TAU,
          r: random(0.9, 1.8),
          warm: row.current,
        });
      }
      for (let j = 0; j < CORE_PARTICLES; j++) {
        add({
          kind: "core",
          row: i,
          ox: random(-2, 2),
          oy: random(-2, 2),
          r: random(0.9, 1.7),
          warm: row.current,
        });
      }
    });

    const start = this.reduced ? 1 : 0;
    for (const p of particles) {
      const [gx, gy] = this.goal(p, 0);
      p.x = p.sx + (gx - p.sx) * start;
      p.y = p.sy + (gy - p.sy) * start;
    }
    this.particles = particles;
    this.assembly = start;
    this.startTime = null;
  }

  /** Where a particle belongs in the assembled thread at `time`. */
  private goal(p: ThreadParticle, time: number): Point {
    if (p.kind === "line") {
      return [
        this.lineX + p.jitter,
        this.lineTop + p.t * (this.lineBottom - this.lineTop),
      ];
    }
    const row = this.rows[p.row];
    if (!row) return [0, 0];
    const [cx, cy] = row.center;
    if (p.kind === "core") return [cx + p.ox, cy + p.oy]; // Hovered rings widen and start to turn.
    const radius = RING_RADIUS * (1 + 0.8 * row.expand);
    const angle = p.angle + time * 0.0004 * row.expand;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  }

  private drawThread(time: number) {
    const { ctx } = this.surface;
    const { assembly } = this;
    const snapped = assembly > 0.98;
    // Once assembled, a much stiffer spring holds the thread to its shape.
    const stiffness = snapped ? 0.03 : 0.0045;
    const damping = snapped ? 0.84 : 0.92;

    for (const p of this.particles) {
      const [gx, gy] = this.goal(p, time);
      const hx =
        p.sx + (gx - p.sx) * assembly + Math.sin(time * 0.0006 + p.phase) * 0.5;
      const hy =
        p.sy + (gy - p.sy) * assembly + Math.cos(time * 0.0005 + p.phase) * 0.5;

      let near = 0;
      if (this.reduced) {
        p.x = hx;
        p.y = hy;
      } else {
        near = repel(p, this.pointer, REPEL);
        spring(p, hx, hy, stiffness, damping);
        p.x += p.vx;
        p.y += p.vy;
      }

      const lit = p.kind === "line" ? 0 : (this.rows[p.row]?.expand ?? 0);
      p.heat = approach(p.heat, Math.max(near, lit), 0.12);

      const alpha = Math.min(
        1,
        p.a * twinkle(time, p.phase, 0.0011, 0.3) * (0.35 + 0.65 * assembly) +
          p.heat * 0.4,
      );
      ctx.fillStyle = heatColor(this.palette, p.heat * 1.4, p.warm, alpha, 0.6);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + p.heat * 0.9, 0, TAU);
      ctx.fill();
    }
  }
}
