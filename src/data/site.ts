export interface SocialLink {
  label: string;
  /** Shown under the label on the contact cards. */
  handle: string;
  href: string;
}

export const site = {
  name: "Nathan",
  /** Default page title, kept under 60 characters so search results show it whole. */
  title: "Nathan — Software Developer & SITCON Organiser in Taiwan",
  /** Job title in the Person structured data. */
  jobTitle: "Software developer and SITCON organiser",
  /** Other names people search for, such as the GitHub handle. */
  alternateNames: ["Nat1anWasTaken", "nat1an"],
  description:
    "Nathan builds software, and the communities around it, in the open. Computer science student, percussionist and SITCON organiser in Taiwan.",
  /** Social card shown when the site is shared, served from `public/`. */
  ogImage: {
    src: "/og.png",
    alt: "Nathan — I build software, and the communities around it, in the open.",
    width: 1200,
    height: 630,
  },
  blog: {
    title: "Nathan's blog",
    description:
      "Notes from Nathan on building software and communities, in English and Chinese.",
  },
  email: "me@nath.tw",
  calendar: { href: "https://nath.tw/cal", label: "nath.tw/cal" },
  /**
   * Short links (nath.tw/<slug>) live in a Google Sheet published to the web as CSV.
   * `sheetId` is the published ID (the `2PACX-…` part of the publish URL), not the
   * spreadsheet's edit ID.
   */
  shortLinks: {
    sheetId:
      "2PACX-1vQifCR1HYsHL8PHOMVp86yYKo2F3qhdj2SJXotioKZ4aaEnpgqbAvw_pdNuIJ6puOgCU6j2lpcawuoC",
  },
  /** Root-relative, so the links also work from the blog. */
  nav: [
    { label: "Work", href: "/#work" },
    { label: "About", href: "/#about" },
    { label: "Blog", href: "/blog/" },
    { label: "Contact", href: "/#contact" },
  ],
} as const;

/** Languages posts are written in, with their Open Graph locales. */
export const ogLocales = { en: "en_US", "zh-TW": "zh_TW" } as const;
export type Lang = keyof typeof ogLocales;
export const langs = Object.keys(ogLocales) as [Lang, ...Lang[]];

const allSocials: SocialLink[] = [
  { label: "Email", handle: site.email, href: `mailto:${site.email}` },
  {
    label: "Instagram",
    handle: "@nat1an.xyz",
    href: "https://www.instagram.com/nat1an.xyz",
  },
  {
    label: "Discord",
    handle: "@nat1an",
    href: "https://discord.com/users/731146912975159427",
  },
  { label: "Telegram", handle: "@Nathan2045", href: "https://t.me/Nathan2045" },
  {
    label: "GitHub",
    handle: "Nat1anWasTaken",
    href: "https://github.com/Nat1anWasTaken",
  },
];

export const socials = allSocials.filter((link) => link.href !== "");

export const isExternal = (href: string) => /^https?:/.test(href);
