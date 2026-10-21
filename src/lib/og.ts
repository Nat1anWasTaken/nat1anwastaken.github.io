import satori, { type Font } from "satori";
import sharp from "sharp";
import { site } from "../data/site";
import { formatDate, type Post } from "./posts";

const colors = {
  ink: "#0d0b09",
  ember: "#16100b",
  sand: "#e9e1d6",
  accent: "#9c6b47",
  caramel: "#c49a74",
  hairline: "rgb(196 154 116 / 0.45)",
};

/**
 * One weight of a Google font, cut down to the glyphs in `text`. Without a browser
 * user agent the CSS API serves TrueType, which satori can read (it can't read WOFF2).
 * Resolves to `undefined` when the font has none of the glyphs, such as Geist for an
 * all-Chinese title, so the next font in the family list draws the text instead.
 */
const googleFont = async (
  family: string,
  weight: Font["weight"],
  text: string,
): Promise<Font | undefined> => {
  const query = new URLSearchParams({
    family: `${family}:wght@${weight}`,
    text,
  });
  const css = await fetch(`https://fonts.googleapis.com/css2?${query}`).then(
    (res) => res.text(),
  );
  const url = css.match(
    /src: url\((.+?)\) format\('(?:truetype|opentype)'\)/,
  )?.[1];
  if (!url) throw new Error(`No TrueType file for ${family} ${weight}`);
  const res = await fetch(url);
  // Google answers a subset with no glyphs in it with a 400 page instead of a font.
  if (res.status === 400) return undefined;
  if (!res.ok) throw new Error(`Couldn't download ${family} ${weight}`);
  const data = await res.arrayBuffer();
  return { name: family, data, weight, style: "normal" };
};

/** Shorthand for satori's React-like element objects, so this file needs no JSX. */
const h = (
  type: string,
  style: Record<string, string | number>,
  children?: unknown,
) => ({ type, props: { style: { display: "flex", ...style }, children } });

/** A post's social card, laid out like the site's own `og.png`. */
export const renderCard = async (post: Post) => {
  const { title, pubDate } = post.data;
  const header = `${site.name} — Blog`.toUpperCase();
  const date = formatDate(pubDate).toUpperCase();
  const wordmark = site.name.toUpperCase();

  const svg = await satori(
    h(
      "div",
      {
        position: "relative",
        boxSizing: "border-box",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "60px 72px 0",
        backgroundImage: `linear-gradient(135deg, ${colors.ember}, ${colors.ink} 60%)`,
        color: colors.sand,
      },
      [
        h(
          "div",
          {
            justifyContent: "space-between",
            paddingBottom: 24,
            borderBottom: `1px solid ${colors.hairline}`,
            fontFamily: "Geist Mono",
            fontSize: 20,
            letterSpacing: "0.1em",
            color: colors.caramel,
          },
          [h("span", {}, header), h("span", {}, date)],
        ),
        h(
          "div",
          {
            marginTop: 48,
            maxWidth: 1000,
            fontFamily: "Geist, Noto Sans TC",
            fontWeight: 300,
            fontSize: 60,
            lineHeight: 1.12,
            letterSpacing: "-0.03em",
            lineClamp: 3,
          },
          title,
        ),
        h(
          "div",
          {
            position: "absolute",
            left: 72,
            right: 72,
            // Cropped by the bottom edge, as on the site's own card.
            bottom: -33,
            justifyContent: "space-between",
            fontFamily: "Archivo",
            fontWeight: 800,
            fontSize: 212,
            lineHeight: 1,
            color: colors.accent,
          },
          Array.from(wordmark, (letter) => h("span", {}, letter)),
        ),
      ],
    ) as Parameters<typeof satori>[0],
    {
      width: site.ogImage.width,
      height: site.ogImage.height,
      fonts: (
        await Promise.all([
          googleFont("Geist Mono", 400, header + date),
          googleFont("Geist", 300, title),
          googleFont("Noto Sans TC", 300, title),
          googleFont("Archivo", 800, wordmark),
        ])
      ).filter((font) => font !== undefined),
    },
  );

  return sharp(Buffer.from(svg)).png().toBuffer();
};
