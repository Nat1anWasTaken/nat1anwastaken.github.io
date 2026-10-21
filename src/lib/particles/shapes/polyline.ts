import { TAU } from "../physics";

export type Point = readonly [x: number, y: number];

/** An open polyline with a tag, so particles sampled from it remember which part they belong to. */
export interface TaggedLine<Tag extends string = string> {
  tag: Tag;
  points: Point[];
}

export interface SampledPoint<Tag extends string = string> {
  x: number;
  y: number;
  tag: Tag;
}

/** Points along an ellipse from angle `from` to `to`, both ends included. */
export function ellipseArc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from = 0,
  to = TAU,
  segments = 32,
): Point[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = from + ((to - from) * i) / segments;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}

/** A polyline measured once, so points can be looked up by distance along it. */
export class Path {
  readonly length: number;
  /** Distance from the start to the beginning of each segment. */
  private readonly starts: number[] = [];
  private readonly lengths: number[] = [];

  constructor(readonly points: readonly Point[]) {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1]!;
      const [bx, by] = points[i]!;
      const length = Math.hypot(bx - ax, by - ay);
      this.starts.push(total);
      this.lengths.push(length);
      total += length;
    }
    this.length = total;
  }

  /** Length of the first `count` segments. */
  lengthOf(count: number) {
    return this.lengths
      .slice(0, count)
      .reduce((sum, length) => sum + length, 0);
  }

  /** The point `distance` along the path, clamped to its ends. */
  at(distance: number): Point {
    const last = this.lengths.length - 1;
    if (last < 0) return this.points[0] ?? [0, 0];
    let i = 0;
    while (i < last && this.starts[i]! + this.lengths[i]! < distance) i++;
    const length = this.lengths[i]!;
    const u = length
      ? Math.max(0, Math.min(1, (distance - this.starts[i]!) / length))
      : 0;
    const [ax, ay] = this.points[i]!;
    const [bx, by] = this.points[i + 1]!;
    return [ax + (bx - ax) * u, ay + (by - ay) * u];
  }

  /** The point at fraction `t` (0–1) of the way along the path. */
  atFraction(t: number): Point {
    return this.at(t * this.length);
  }
}

/**
 * Spreads about `total` points evenly by arc length over a set of lines. Each line gets
 * a share proportional to its length (at least 3, so short strokes still read), with
 * points on both of its ends.
 */
export function sampleLines<Tag extends string>(
  lines: readonly TaggedLine<Tag>[],
  total: number,
): SampledPoint<Tag>[] {
  const paths = lines.map((line) => new Path(line.points));
  const length = paths.reduce((sum, path) => sum + path.length, 0) || 1;
  return lines.flatMap((line, i) => {
    const path = paths[i]!;
    const count = Math.max(3, Math.round((total * path.length) / length));
    return Array.from({ length: count }, (_, k) => {
      const [x, y] = path.atFraction(k / (count - 1));
      return { x, y, tag: line.tag };
    });
  });
}
