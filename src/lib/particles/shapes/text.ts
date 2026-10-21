import { random } from "../physics";

export interface TextFont {
  /** A CSS font-family list, e.g. from `getComputedStyle(el).fontFamily`. */
  family: string;
  weight: string | number;
}

/** One piece of text drawn at an alphabetic baseline. */
export interface GlyphPlacement {
  text: string;
  x: number;
  baseline: number;
  size: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface SampleOptions {
  /** Grid spacing in CSS pixels; one point per filled grid cell. */
  step: number;
  /** Random offset per point, as a fraction of `step`, so the grid doesn't read as a grid. */
  jitter?: number;
  /** Minimum alpha (0–255) for a pixel to count as filled. */
  threshold?: number;
}

export const fontString = (font: TextFont, size: number) =>
  `${font.weight} ${size}px ${font.family}`;

let scratch: CanvasRenderingContext2D | null = null;

function context(
  width: number,
  height: number,
): CanvasRenderingContext2D | null {
  scratch ??= document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  if (!scratch) return null;
  scratch.canvas.width = width;
  scratch.canvas.height = height;
  return scratch;
}

/** Measures each string at `size`, plus the cap height (ascent of the first string). */
export function measureGlyphs(
  texts: readonly string[],
  font: TextFont,
  size: number,
) {
  const ctx = context(1, 1);
  if (!ctx)
    return { widths: texts.map(() => size * 0.7), capHeight: size * 0.72 };
  ctx.font = fontString(font, size);
  const widths = texts.map((text) => ctx.measureText(text).width);
  const capHeight =
    ctx.measureText(texts[0] ?? "N").actualBoundingBoxAscent || size * 0.72;
  return { widths, capHeight };
}

/**
 * Rasterises glyphs onto an offscreen canvas and returns a point for every grid cell
 * they cover. Coordinates are in the same space as the placements.
 */
export function sampleGlyphs(
  glyphs: readonly GlyphPlacement[],
  width: number,
  height: number,
  font: TextFont,
  { step, jitter = 0.6, threshold = 128 }: SampleOptions,
): Point[] {
  const w = Math.ceil(width);
  const h = Math.ceil(height);
  const ctx = context(w, h);
  if (!ctx || !w || !h) return [];

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  for (const glyph of glyphs) {
    ctx.font = fontString(font, glyph.size);
    ctx.fillText(glyph.text, glyph.x, glyph.baseline);
  }

  const { data } = ctx.getImageData(0, 0, w, h);
  const spread = (step * jitter) / 2;
  const points: Point[] = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if ((data[(y * w + x) * 4 + 3] ?? 0) < threshold) continue;
      points.push({
        x: x + random(-spread, spread),
        y: y + random(-spread, spread),
      });
    }
  }
  return points;
}
