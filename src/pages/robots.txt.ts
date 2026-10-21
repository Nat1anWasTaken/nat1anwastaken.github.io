import type { APIRoute } from "astro";
import { fetchShortLinks } from "../lib/shortlinks";

/**
 * Keeps crawlers off the short links. The slugs are read from the sheet at build
 * time, so a new slug is only excluded after the next deploy. A failed fetch throws
 * and fails the build rather than shipping a robots.txt without them.
 */
export const GET: APIRoute = async ({ site }) => {
  const sitemap = new URL("sitemap-index.xml", site);
  const disallow = (await fetchShortLinks())
    // `$` anchors the rule to the exact path; without it `/text` would also block `/texture`.
    .map(({ slug }) => `Disallow: /${slug}$\n`)
    .join("");

  return new Response(
    `User-agent: *\nAllow: /\n${disallow}\nSitemap: ${sitemap.href}\n`,
  );
};
