import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";

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

export const collections = { projects, experience };
