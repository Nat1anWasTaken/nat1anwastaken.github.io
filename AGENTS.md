# AGENTS.md

Personal site built with Astro and deployed to GitHub Pages at https://nath.tw.

## Tech stack

Use these tools. Don't introduce alternatives that do the same job.

- **Framework:** [Astro](https://docs.astro.build) 7, as a static site (no SSR adapter). Pages live in `src/pages/` and follow file-based routing.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/docs) 4, loaded through the `@tailwindcss/vite` plugin in `astro.config.mjs`. There is no `tailwind.config.js`: configure theme tokens with `@theme` in `src/styles/global.css`. Every page or layout must import that stylesheet.
- **Language:** TypeScript in strict mode (`astro/tsconfigs/strict`).
- **Formatting:** Prettier with `prettier-plugin-astro` and `prettier-plugin-tailwindcss`, which sorts class names. Don't hand-sort classes or add another formatter.
- **Package manager:** pnpm only. npm and yarn are blocked through `engines` and `only-allow`.

## Don't reinvent the wheel

Before writing custom code, check whether Astro, Tailwind or a maintained package already does the job:

- **Integrations:** add them with `pnpm astro add <name>` (for example `mdx`, `sitemap`, `react`) instead of wiring them up by hand.
- **Content:** use [content collections](https://docs.astro.build/en/guides/content-collections/) for blog posts or other content, not hand-rolled file globbing or frontmatter parsing.
- **Images:** use `astro:assets` (`<Image />`, `<Picture />`) instead of plain `<img>` tags or a custom image pipeline.
- **Feeds, SEO and fonts:** use `@astrojs/rss`, `@astrojs/sitemap` and Astro's fonts API.
- **Styling:** use Tailwind utilities and theme tokens. Write custom CSS only when no utility fits.
- **Interactivity:** prefer plain `<script>` tags in `.astro` components. Add a UI framework (`astro add react`, etc.) only when a component really needs one.

## Commands

| Command                       | Purpose                                                                                  |
| :---------------------------- | :--------------------------------------------------------------------------------------- |
| `pnpm astro dev --background` | Start the dev server in the background (`astro dev stop`, `status`, `logs` to manage it) |
| `pnpm build`                  | Build the static site into `dist/`                                                       |
| `pnpm preview`                | Serve the built site locally                                                             |
| `pnpm check`                  | Type-check `.astro` and `.ts` files with `astro check`                                   |
| `pnpm format`                 | Format everything with Prettier                                                          |
| `pnpm format:check`           | Check formatting without changing files (used by CI)                                     |

There is no test suite yet. Before you finish a change, run `pnpm format:check && pnpm check && pnpm build`, which matches what CI runs.

## CI and deployment

- `.github/workflows/ci.yml` runs the format check, type check and build on pushes to `main` and on pull requests.
- `.github/workflows/deploy.yml` deploys to GitHub Pages on each push to `main` using `withastro/action`.
- Dependabot opens weekly updates for npm packages and Actions.

## Version pins

- Keep `prettier-plugin-astro` on `^0.14`. Version 1.x reads Astro files in a new format that `prettier-plugin-tailwindcss` doesn't support yet, so class names in `.astro` files silently stop being sorted.
- Keep `typescript` on `^6`, because `@astrojs/check` doesn't support TypeScript 7 yet.

## Astro docs

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
