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
  // TODO: fill in the Instagram, Discord and Telegram links. Entries with an empty href are not rendered.
  { label: "Instagram", handle: "", href: "" },
  { label: "Discord", handle: "", href: "" },
  { label: "Telegram", handle: "", href: "" },
  {
    label: "GitHub",
    handle: "Nat1anWasTaken",
    href: "https://github.com/Nat1anWasTaken",
  },
];

export const socials = allSocials.filter((link) => link.href !== "");

export const isExternal = (href: string) => /^https?:/.test(href);
