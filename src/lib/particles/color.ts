export type RGB = readonly [r: number, g: number, b: number];

export interface Palette {
  accent: RGB;
  caramel: RGB;
  sand: RGB;
}

let probe: CanvasRenderingContext2D | null = null;

/** Resolves any CSS color (hex, rgb(), oklch(), …) to RGB by painting it onto a 1×1 canvas. */
export function parseColor(value: string): RGB {
  probe ??= document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  if (!probe) return [0, 0, 0];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** Reads the palette from the Tailwind theme variables, so `global.css` stays the single source of truth. */
export function readPalette(el: Element = document.documentElement): Palette {
  const style = getComputedStyle(el);
  const token = (name: string) =>
    parseColor(style.getPropertyValue(`--color-${name}`).trim());
  return {
    accent: token("accent"),
    caramel: token("caramel"),
    sand: token("sand"),
  };
}

export const rgba = ([r, g, b]: RGB, alpha: number) =>
  `rgba(${r | 0},${g | 0},${b | 0},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;

/** Linear blend from `a` (t = 0) to `b` (t = 1). */
export const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
