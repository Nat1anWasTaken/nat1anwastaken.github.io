import { defineCollection, reference } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { langs } from "./data/site";

const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      order: z.number(),
      year: z.number().optional(),
      stack: z.array(z.string()).optional(),
      links: z.array(z.object({ label: z.string(), href: z.url() })),
      screens: z.array(image()).min(1),
      screencast: z
        .array(
          z.object({
            screen: z.number().int().nonnegative(),
            scroll: z.number(),
            x: z.number(),
            y: z.number(),
            move: z.number().nonnegative(),
            hold: z.number().nonnegative(),
            click: z.boolean().default(false),
            cut: z.boolean().default(false),
          }),
        )
        .min(1),
    }),
});

const experience = defineCollection({
  loader: file("./src/content/experience.yaml"),
  schema: z.object({
    /** Display order; `getCollection` returns entries sorted by id. */
    order: z.number().int(),
    period: z.string(),
    org: z.string(),
    role: z.string(),
    href: z.url().optional(),
    current: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  // A post is `<slug>.md(x)` or `<slug>/index.md(x)` with its images beside it.
  // Set `slug` in the frontmatter to choose the URL yourself.
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Shown in the post list and used as the meta description. */
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      tags: z.array(z.string()).default([]),
      lang: z.enum(langs).default("en"),
      /** The same post in another language. Set it on the translation, pointing at the original. */
      translationOf: reference("blog").optional(),
      /** Shown by the dev server, left out of builds. */
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects, experience, blog };
