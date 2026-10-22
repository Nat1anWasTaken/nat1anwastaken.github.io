import { rgba } from "../../lib/particles/color";
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
  measureGlyphs,
  sampleGlyphs,
  type GlyphPlacement,
  type TextFont,
} from "../../lib/particles/shapes/text";
import { Scene } from "../scene";

const WORD = [..."NAT1AN"];

/** Below this width the letters sit in one row along the bottom instead of a staircase. */
const STAIRCASE_MIN_WIDTH = 760;
/** How far below the top edge the last step of the staircase reaches. */
const STAIRCASE_TOP = 40;
const WIDE_SAMPLE_WIDTH = 1000;

/** The text waits this long after it first draws before it starts to assemble. */
const ASSEMBLE_DELAY = 400;
const ASSEMBLE_RATE = 0.03;
const SPRING = 0.0045;
const DAMPING = 0.92;
const DRIFT = 0.8;
const REPEL = { radius: 190, strength: 0.9 };
/** Only every Nth glyph particle draws a thread to the pointer, so the text doesn't become a web. */
const THREAD_EVERY = 7;

interface GlyphParticle extends Body {
  /** Scattered start position. */
  sx: number;
  sy: number;
  /** Position within the text. */
  gx: number;
  gy: number;
  r: number;
  a: number;
  phase: number;
  warm: boolean;
  thread: boolean;
}

/** Lays out the word across the width with even gaps, climbing as a staircase when there's room. */
function layout(
  font: TextFont,
  width: number,
  height: number,
  gutter: number,
): GlyphPlacement[] {
  const content = width - gutter * 2;
  const staircase = width >= STAIRCASE_MIN_WIDTH;
  const size = staircase
    ? Math.min(content * 0.18, height * 0.5)
    : content * 0.215;
  const { widths, capHeight } = measureGlyphs(WORD, font, size);
  const total = widths.reduce((sum, w) => sum + w, 0);
  const gap = Math.max(0, (width - gutter * 2 - total) / (WORD.length - 1));

  const bottom = height + size * (staircase ? 0.12 : 0.1);
  const rise = staircase
    ? (bottom - capHeight - STAIRCASE_TOP) / (WORD.length - 1)
    : 0;

  let x = gutter;
  return WORD.map((text, i) => {
    const glyph = { text, x, baseline: bottom - rise * i, size };
    x += (widths[i] ?? 0) + gap;
    return glyph;
  });
}

/** Reads the display font from an element styled with it (the Fonts API generates the family name). */
function readFont(el: Element): TextFont {
  const style = getComputedStyle(el);
  return { family: style.fontFamily, weight: style.fontWeight };
}

async function loadFont(font: TextFont) {
  try {
    await document.fonts.load(`${font.weight} 200px ${font.family}`);
  } catch {
    // Sample with whatever fallback is available.
  }
}

/**
 * The footer's "NAT1AN", made of particles sampled from the glyphs. They gather from
 * random positions, drift gently in place, and scatter from the pointer.
 */
export class FooterScene extends Scene {
  private glyphs: GlyphParticle[] = [];
  private font?: TextFont;
  private fontReady?: Promise<void>;
  private assembly = 0;
  private firstFrame: number | null = null;

  constructor(root: HTMLElement) {
    super(root, { dust: { max: 160 } });
  }

  protected override resize(width: number, height: number) {
    this.font ??= readFont(this.surface.canvas);
    this.fontReady ??= loadFont(this.font);
    void this.fontReady.then(() => {
      // A later resize has superseded this one.
      if (width !== this.surface.width || height !== this.surface.height)
        return;
      this.sample(width, height);
      if (this.reduced) this.frame(0, 0);
    });
  }

  /** The page gutter, read from the footer columns so the word lines up with the content. */
  private gutter() {
    const column = this.root.querySelector(".px-gutter");
    return column ? parseFloat(getComputedStyle(column).paddingLeft) : 0;
  }

  private sample(width: number, height: number) {
    if (!this.font) return;
    const step = width > WIDE_SAMPLE_WIDTH ? 6 : 5;
    const points = sampleGlyphs(
      layout(this.font, width, height, this.gutter()),
      width,
      height,
      this.font,
      { step },
    );
    this.glyphs = points.map((point, i) => {
      const sx = random(0, width);
      const sy = random(0, height);
      return {
        sx,
        sy,
        gx: point.x,
        gy: point.y,
        x: this.reduced ? point.x : sx,
        y: this.reduced ? point.y : sy,
        vx: 0,
        vy: 0,
        r: random(0.6, 1.7),
        a: random(0.4, 0.9),
        phase: random(0, TAU),
        warm: Math.random() < 0.55,
        thread: i % THREAD_EVERY === 0,
      };
    });
    this.assembly = this.reduced ? 1 : 0;
    this.firstFrame = null;
  }

  protected override render(time: number) {
    const { ctx } = this.surface;
    const { palette, pointer, reduced } = this;
    this.firstFrame ??= time;
    if (!reduced && time - this.firstFrame > ASSEMBLE_DELAY) {
      this.assembly = approach(this.assembly, 1, ASSEMBLE_RATE);
    }
    const pull = this.assembly;
    ctx.lineWidth = 0.6;

    for (const p of this.glyphs) {
      let near = 0;
      if (reduced) {
        p.x = p.gx;
        p.y = p.gy;
      } else {
        near = repel(p, pointer, REPEL);
        if (p.thread && near > 0.04) {
          ctx.strokeStyle = rgba(palette.accent, near * 0.32);
          ctx.beginPath();
          ctx.moveTo(pointer.sx, pointer.sy);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        const hx =
          p.sx +
          (p.gx - p.sx) * pull +
          Math.sin(time * 0.00025 + p.phase) * DRIFT;
        const hy =
          p.sy +
          (p.gy - p.sy) * pull +
          Math.cos(time * 0.0002 + p.phase) * DRIFT;
        spring(p, hx, hy, SPRING, DAMPING);
        p.x += p.vx;
        p.y += p.vy;
      }

      const alpha = Math.min(
        1,
        p.a * twinkle(time, p.phase) * (0.35 + 0.65 * pull) + near * 0.6,
      );
      ctx.fillStyle =
        p.warm || near > 0.2
          ? rgba(palette.accent, alpha)
          : rgba(palette.sand, alpha * 0.7);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + near * 1.2, 0, TAU);
      ctx.fill();
    }
  }
}
