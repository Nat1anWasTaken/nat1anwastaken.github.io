import type { DustOptions } from "../../lib/particles/dust";
import { Scene } from "../scene";

const CONTACT_DUST: Partial<DustOptions> = {
  area: 7000,
  max: 300,
  alpha: [0.16, 0.61],
};

/** Dust behind the contact section. The link, CTA and card orbits are declared in markup. */
export class ContactScene extends Scene {
  constructor(root: HTMLElement) {
    super(root, { dust: CONTACT_DUST });
  }
}
