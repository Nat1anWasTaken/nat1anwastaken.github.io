# Nat1an — nath.tw

My personal site and portfolio at [nath.tw](https://nath.tw), featuring software projects, SITCON organising experience, and ways to get in touch.

Built as a static site with Astro, TypeScript, and Tailwind CSS. Deployed to GitHub Pages.

## Development

Use Node.js 22.22.0 or later and pnpm 12 or later.

```sh
pnpm install
pnpm astro dev --background
```

Use `pnpm astro dev status`, `pnpm astro dev logs`, and `pnpm astro dev stop` to manage the background server.

| Command             | Purpose                            |
| :------------------ | :--------------------------------- |
| `pnpm build`        | Build the static site into `dist/` |
| `pnpm preview`      | Preview the production build       |
| `pnpm check`        | Type-check Astro and TypeScript    |
| `pnpm format`       | Format the project with Prettier   |
| `pnpm format:check` | Check formatting without changes   |

Before submitting changes, run the same checks as CI:

```sh
pnpm format:check && pnpm check && pnpm build
```

## Content

- `src/components/sections/About.astro`: biography and interests.
- `src/content/experience.yaml`: community roles and affiliations.
- `src/content/projects/*.md`: project descriptions, years, technology stacks, links, and screencast keyframes, loaded through Astro content collections.
- `src/assets/projects/`: project screenshots.
- `src/data/site.ts`: site metadata, social links, contact details, and the published short-link sheet ID.
- `src/styles/global.css`: shared styles and Tailwind theme tokens.

Project stacks are based on their repositories' package manifests. The years for S.T.A (2026) and when2meet.app (2025) reflect the start of development recorded in Git history, not a claimed launch date.

## Deployment

`.github/workflows/ci.yml` checks formatting, types, and the static build on pushes to `main` and pull requests. `.github/workflows/deploy.yml` deploys pushes to `main` to GitHub Pages using `withastro/action`.

The custom 404 page resolves short links from the published Google Sheet configured in `src/data/site.ts`. The build also reads this sheet to exclude short-link paths from `robots.txt`, so building requires network access.
