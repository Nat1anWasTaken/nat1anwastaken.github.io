import { ellipseArc, type Point, type TaggedLine } from "./polyline";

/**
 * Line-art icons for the About pillars, in unit coordinates: (0, 0) is the centre
 * and ±1 reaches the edge of the anchor box.
 *
 * Tags mark the parts that animate on their own: the drum's `head` wobbles when it is hit.
 */
export type IconPart = "line" | "head" | "stick";
export type IconLines = TaggedLine<IconPart>[];

/** `</>` */
function code(): IconLines {
  return [
    {
      tag: "line",
      points: [
        [-0.38, -0.5],
        [-0.86, 0],
        [-0.38, 0.5],
      ],
    },
    {
      tag: "line",
      points: [
        [0.16, -0.62],
        [-0.16, 0.62],
      ],
    },
    {
      tag: "line",
      points: [
        [0.38, -0.5],
        [0.86, 0],
        [0.38, 0.5],
      ],
    },
  ];
}

/** A snare drum seen from slightly above, with zig-zag lacing and two crossed sticks. */
function drum(): IconLines {
  const shift = 0.13;
  const rx = 0.8;
  const ry = 0.22;
  const top = -0.12 + shift;
  const bottom = 0.5 + shift;
  // The y of the ellipse's front edge at x, for a rim centred at `cy`.
  const front = (x: number, cy: number) =>
    cy + ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));

  const lacing: Point[] = Array.from({ length: 10 }, (_, i) => {
    const x = -0.72 + i * 0.16;
    return [x, i % 2 ? front(x, bottom) - 0.05 : front(x, top) + 0.05];
  });

  return [
    { tag: "head", points: ellipseArc(0, top, rx, ry, 0, Math.PI * 2, 48) },
    {
      tag: "line",
      points: [
        [-rx, top],
        [-rx, bottom],
      ],
    },
    {
      tag: "line",
      points: [
        [rx, top],
        [rx, bottom],
      ],
    },
    // Only the front half of the bottom rim is visible.
    { tag: "line", points: ellipseArc(0, bottom, rx, ry, 0, Math.PI, 24) },
    { tag: "line", points: lacing },
    {
      tag: "stick",
      points: [
        [-0.74, -0.98 + shift],
        [0.18, -0.44 + shift],
      ],
    },
    {
      tag: "stick",
      points: [
        [0.74, -0.98 + shift],
        [-0.18, -0.44 + shift],
      ],
    },
  ];
}

/** Head and shoulders of one person, centred on (x, y) and scaled by `scale`. */
function person(x: number, y: number, scale: number): IconLines {
  const head = 0.17 * scale;
  return [
    {
      tag: "line",
      points: ellipseArc(x, y - 0.36 * scale, head, head, 0, Math.PI * 2, 22),
    },
    {
      tag: "line",
      points: ellipseArc(
        x,
        y + 0.42 * scale,
        0.38 * scale,
        0.36 * scale,
        Math.PI,
        Math.PI * 2,
        22,
      ),
    },
  ];
}

/** Three people, the middle one in front. */
function people(): IconLines {
  return [
    ...person(-0.6, -0.08, 0.72),
    ...person(0.6, -0.08, 0.72),
    ...person(0, 0.04, 1),
  ];
}

export const icons = { code, drum, people } satisfies Record<
  string,
  () => IconLines
>;

export type LineIcon = keyof typeof icons;

export const isLineIcon = (name: string | undefined): name is LineIcon =>
  name !== undefined && Object.hasOwn(icons, name);
