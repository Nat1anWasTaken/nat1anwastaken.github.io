export interface SocialLink {
  label: string;
  /** Shown under the label on the contact cards. */
  handle: string;
  href: string;
}

export const site = {
  name: "Nathan",
  title: "Nathan — Portfolio",
  description:
    "Nathan builds software, and the communities around it, in the open. Computer science student, percussionist and SITCON organiser in Taiwan.",
  locale: "en_US",
  /** Social card shown when the site is shared, served from `public/`. */
  ogImage: {
    src: "/og.png",
    alt: "Nathan — I build software, and the communities around it, in the open.",
    width: 1200,
    height: 630,
  },
  email: "me@nath.tw",
  calendar: { href: "https://nath.tw/cal", label: "nath.tw/cal" },
  nav: [
    { label: "Work", href: "#work" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
  ],
} as const;

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
