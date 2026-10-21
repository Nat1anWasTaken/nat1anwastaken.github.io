// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import {
  transformerMetaHighlight,
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import tailwindcss from "@tailwindcss/vite";
import { codeTitle, hastPlugins, mdastPlugins } from "./src/lib/markdown";

// https://astro.build/config
export default defineConfig({
  site: "https://nath.tw",
  integrations: [sitemap(), mdx()],
  // `.mdx` files inherit this processor, so both formats get the same features.
  markdown: {
    processor: satteri({
      mdastPlugins,
      hastPlugins,
      features: {
        math: true,
        directive: true,
        definitionList: true,
        superscript: true,
        subscript: true,
      },
    }),
    syntaxHighlight: { type: "shiki", excludeLangs: ["mermaid"] },
    shikiConfig: {
      theme: "vesper",
      transformers: [
        codeTitle,
        transformerMetaHighlight(),
        transformerMetaWordHighlight(),
        transformerNotationHighlight(),
        transformerNotationDiff(),
        transformerNotationFocus(),
      ],
    },
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Geist",
      cssVariable: "--font-geist",
      weights: [300, 500],
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "Geist Mono",
      cssVariable: "--font-geist-mono",
      weights: [400, 500],
      fallbacks: ["ui-monospace", "monospace"],
    },
    {
      provider: fontProviders.google(),
      name: "Archivo",
      cssVariable: "--font-archivo",
      weights: [800],
      fallbacks: ["Arial Narrow", "sans-serif"],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
