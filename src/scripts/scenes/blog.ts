import type { DustOptions } from "../../lib/particles/dust";
import { tallPixelRatio } from "../../lib/particles/surface";
import { Scene } from "../scene";

/** Sparser and fainter than the home page's dust, so it stays behind long reads. */
const BLOG_DUST: Partial<DustOptions> = {
  area: 11000,
  max: 280,
  alpha: [0.12, 0.46],
};

/**
 * Dust behind the blog index and posts. A post can run very tall, so tall canvases
 * draw at 1×. Row orbits are declared in markup.
 */
export class BlogScene extends Scene {
  constructor(root: HTMLElement) {
    super(root, { dust: BLOG_DUST, pixelRatio: tallPixelRatio });
  }
}
