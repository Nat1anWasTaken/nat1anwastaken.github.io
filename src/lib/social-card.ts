import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";
import { site } from "../data/site";

/** An image cropped to the site's social card size, ready for BaseLayout's `image`. */
export async function socialCard(
  src: ImageMetadata,
  alt: string,
  position?: string,
) {
  const { width, height } = site.ogImage;
  const card = await getImage({
    src,
    width,
    height,
    fit: "cover",
    position,
    format: "jpg",
  });
  return { src: card.src, width, height, alt };
}
