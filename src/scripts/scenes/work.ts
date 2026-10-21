import type { DustOptions } from "../../lib/particles/dust";
import { tallPixelRatio } from "../../lib/particles/surface";
import { Scene } from "../scene";

/** Dust shared by the Work section and the project dialog behind it. */
export const workDust: Partial<DustOptions> = {
  area: 9000,
  max: 320,
  alpha: [0.14, 0.54],
};

/**
 * The Work section's dust. The section is very tall, so it trades sharpness for memory;
 * hovering a card orbits the dust around its screencast (declared in the markup).
 */
export class WorkScene extends Scene {
  constructor(root: HTMLElement) {
    super(root, { dust: workDust, pixelRatio: tallPixelRatio });
  }
}
