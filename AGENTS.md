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

## Hover effects

Interactive text uses one shared hover effect, the letter wave. Reuse it instead of writing new hover styles.

- **Letter wave:** put `letter-wave` on the element that reacts (the link, card or row) and wrap its text in `<SplitLetters text="…" />` from `src/components/ui/SplitLetters.astro`. On hover or keyboard focus, the letters turn caramel and lift one after another. The colour lives in `src/styles/global.css`. The lift runs in `src/scripts/letter-wave.ts` with the Web Animations API, so letters settle smoothly when the pointer leaves mid-wave. Don't move it back to a CSS animation, which snaps letters down when `:hover` drops.
- **Several pieces of text:** to carry one wave across several `<SplitLetters>` inside the same `letter-wave` element, pass each one an `offset` equal to the number of letters before it, not counting spaces. See `Contact.astro`.
- **Small labels:** meta lines and labels next to a wave, such as dates or "View project", get a plain colour change instead, using `transition-colors duration-300 group-hover:text-caramel` with a matching `group-focus-visible` or `group-focus-within` variant.
- **Accessibility:** every hover state also needs a keyboard-focus state. The wave already covers `:focus-visible` and turns its motion off under `prefers-reduced-motion`. Keep `<SplitLetters>` as is: it hides the split letters from screen readers and gives them the full text instead.

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
