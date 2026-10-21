import type { APIRoute } from "astro";
import { site } from "../data/site";

/** The web app manifest, for "Add to Home Screen" and browsers' install prompts. */
export const GET: APIRoute = () =>
  Response.json({
    name: site.title,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "browser",
    background_color: "#0d0b09",
    theme_color: "#0d0b09",
    icons: [
      { src: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512" },
      {
        src: "/icon-maskable-512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  });
