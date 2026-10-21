import { mix, rgba, type Palette } from "../../lib/particles/color";
import {
  approach,
  clamp,
  random,
  repel,
  spring,
  TAU,
  twinkle,
  type Body,
} from "../../lib/particles/physics";
import { Path, type Point } from "../../lib/particles/shapes/polyline";
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
/** Link particle spacing along the paths to the org and role text. */
const LINK_SPACING = [10, 11] as const;
/** The thread scatters less from the pointer than the dust does. */
const REPEL = { radius: 190, strength: 0.35 };
/** Re-measure the rows this often (in frames) to follow layout shifts. */
const MEASURE_EVERY = 60;

interface Letter {
  el: HTMLElement;
  /** Which of the row's two paths runs under this letter. */
  path: 0 | 1;
  /** Distance along that path to the letter's centre. */
  distance: number;
  lit: boolean;
}

interface Row {
  node: HTMLElement;
  org: HTMLElement;
  role: HTMLElement;
  current: boolean;
  /** Eases to 1 while the row is hovered or focused. */
  expand: number;
  center: Point;
  /** Node → under the org text, and node → under the role text. */
  paths: [Path, Path] | null;
  letters: Letter[];
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

/** What a particle draws: the timeline line, a node's ring or core, or a hover link. */
type ThreadPart =
  | { kind: "line"; t: number; jitter: number }
  | { kind: "ring"; row: number; angle: number }
  | { kind: "core"; row: number; ox: number; oy: number }
  | {
      kind: "link";
      row: number;
      path: 0 | 1;
      t: number;
      jitter: number;
      visible: number;
    };

type ThreadParticle = ParticleBase & ThreadPart;

/**
 * How far along its path a link particle at `t` (0–1) has travelled for a row expanded
 * by `expand`: particles near the node set off first, so the link draws out in order.
 */
const reach = (expand: number, t: number) =>
  clamp(expand * 1.8 - t * 0.8, 0, 1);

/** The furthest any link particle reaches, as a fraction of the path. */
function linkExtent(expand: number) {
  let extent = 0;
  for (let t = 0; t <= 1.0001; t += 0.05)
    extent = Math.max(extent, t * reach(expand, t));
  return extent;
}

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
 * node. Hovering a row widens its ring and sends particles out under its org and role,
 * lighting the letters as they pass.
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
      const [org, role] = el.querySelectorAll<HTMLElement>("[data-letters]");
      if (!node || !org || !role) return;
      const i = this.rows.length;
      this.rows.push({
        node,
        org,
        role,
        current: el.hasAttribute("data-current"),
        expand: 0,
        center: [0, 0],
        paths: null,
        letters: [],
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
    // Web fonts change the letter positions the links trace.
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
    this.rows.forEach((row, i) => {
      if (!this.reduced)
        row.expand = approach(row.expand, this.hovered === i ? 1 : 0, 0.08);
      this.lightLetters(row);
    });
    this.drawThread(time);
  }

  /** Reads node, path and letter positions from the layout. */
  private measure() {
    for (const row of this.rows) {
      const node = this.surface.local(row.node.getBoundingClientRect());
      const org = this.surface.local(row.org.getBoundingClientRect());
      const role = this.surface.local(row.role.getBoundingClientRect());
      row.center = [node.left, node.top];

      // Out from the node, down to just under the org text, then along it; the role
      // path continues down to under the role text.
      const start: Point = [node.left + 14, node.top];
      const x = org.left - 12;
      const orgY = org.bottom + 4;
      const roleY = role.bottom + 4;
      const orgPath = new Path([start, [x, orgY], [org.right, orgY]]);
      const rolePath = new Path([
        start,
        [x, orgY],
        [x, roleY],
        [role.right, roleY],
      ]);
      row.paths = [orgPath, rolePath];

      const letters = (el: HTMLElement, path: 0 | 1, before: number) =>
        Array.from(
          el.querySelectorAll<HTMLElement>("[data-letter]"),
          (letter): Letter => {
            const rect = this.surface.local(letter.getBoundingClientRect());
            const previous = row.letters.find((l) => l.el === letter);
            return {
              el: letter,
              path,
              distance: before + (rect.left + rect.width / 2 - x),
              lit: previous?.lit ?? false,
            };
          },
        );
      row.letters = [
        ...letters(row.org, 0, orgPath.lengthOf(1)),
        ...letters(row.role, 1, rolePath.lengthOf(2)),
      ];
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
      row.paths?.forEach((path, p) => {
        const index = p as 0 | 1;
        const count = Math.round(path.length / LINK_SPACING[index]);
        for (let j = 0; j < count; j++) {
          add({
            kind: "link",
            row: i,
            path: index,
            t: j / Math.max(1, count - 1),
            jitter: random(-1.1, 1.1),
            visible: 0,
            r: random(0.5, 1.2),
            warm: Math.random() < 0.7,
          });
        }
      });
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
    if (p.kind === "core") return [cx + p.ox, cy + p.oy];
    if (p.kind === "ring") {
      // Hovered rings widen and start to turn.
      const radius = RING_RADIUS * (1 + 0.8 * row.expand);
      const angle = p.angle + time * 0.0004 * row.expand;
      return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    }
    const path = row.paths?.[p.path];
    if (!path) return [cx, cy];
    const k = reach(row.expand, p.t);
    const [x, y] = path.atFraction(p.t * k);
    return [x + Math.sin(time * 0.002 + p.t * 9) * 0.8 * k, y + p.jitter * k];
  }

  /** Lights each letter once the furthest link particle has passed under it. */
  private lightLetters(row: Row) {
    if (!row.paths) return;
    const extent = linkExtent(row.expand);
    for (const letter of row.letters) {
      const lit =
        row.expand > 0.05 &&
        letter.distance <= extent * row.paths[letter.path].length;
      if (lit === letter.lit) continue;
      letter.lit = lit;
      letter.el.classList.toggle("is-lit", lit);
    }
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
      if (p.kind === "link") {
        const k = reach(lit, p.t);
        // Hidden links rest on the node; skip them once they have come to a stop.
        if (k < 0.02 && Math.abs(p.vx) + Math.abs(p.vy) < 0.05) continue;
        p.visible = k;
      }
      p.heat = approach(p.heat, Math.max(near, lit), 0.12);

      let alpha = Math.min(
        1,
        p.a * twinkle(time, p.phase, 0.0011, 0.3) * (0.35 + 0.65 * assembly) +
          p.heat * 0.4,
      );
      if (p.kind === "link") alpha *= Math.max(0.15, p.visible);
      ctx.fillStyle = heatColor(this.palette, p.heat * 1.4, p.warm, alpha, 0.6);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + p.heat * 0.9, 0, TAU);
      ctx.fill();
    }
  }
}
