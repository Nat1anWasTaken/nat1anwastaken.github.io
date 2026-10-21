import type { DustOptions } from "../../lib/particles/dust";
import { Scene } from "../scene";

const HERO_DUST: Partial<DustOptions> = {
  area: 6500,
  max: 420,
  alpha: [0.18, 0.68],
  warmRatio: 0.45,
};

/** The hero's dense dust. The CTA's capsule orbit is declared in markup (`data-orbit`). */
export class HeroScene extends Scene {
  constructor(root: HTMLElement) {
    super(root, { dust: HERO_DUST });
  }
}
