import type { ShikiConfig } from "astro";
import Slugger from "github-slugger";
import katex from "katex";
import readingTime from "reading-time";
import {
  htmlToHast,
  type Custom,
  type HastNode,
  type HastPluginEntry,
  type MdastContent,
  type MdastPluginDefinition,
  type MdastPluginEntry,
  type MdastTarget,
  type MdastVisitorContext,
} from "satteri";

/*
 * Sätteri plugins for blog posts, used by both `.md` and `.mdx` (see astro.config.mjs).
 * Sätteri parses math and `:::` directives itself; these turn them into HTML.
 *
 * Generated HTML is added as structured nodes rather than raw HTML: MDX can't compile
 * raw HTML, and Sätteri's `rawHtml` feature, which would parse it, drops the meta
 * (`title="…"`, `{2}`) from code blocks.
 */

/** Mdast nodes that render to the given HTML, through each node's `hName`/`hProperties`. */
function fromHtml(html: string): MdastContent[] {
  const convert = (node: HastNode): MdastContent[] => {
    if (node.type === "text") return [{ type: "text", value: node.value }];
    if (node.type !== "element") return [];
    // `htmlToHast` keeps <math>'s namespace as a `:xmlns` property, which isn't a valid
    // attribute. HTML parsers give the element its namespace anyway.
    const { ":xmlns": _, ...properties } = node.properties;
    return [
      {
        type: "generated",
        data: { hName: node.tagName, hProperties: properties },
        children: node.children.flatMap(convert) as Custom[],
      },
    ];
  };
  const tree = htmlToHast(html, { fragment: true });
  return "children" in tree ? tree.children.flatMap(convert) : [];
}

/**
 * `$…$` and `$$…$$` rendered to KaTeX HTML at build time. Sets
 * `remarkPluginFrontmatter.hasMath`, so only posts with math load KaTeX's stylesheet.
 */
const math: MdastPluginDefinition = {
  name: "math",
  inlineMath(node, ctx) {
    renderMath(node, ctx, false);
  },
  math(node, ctx) {
    renderMath(node, ctx, true);
  },
};

function renderMath(
  node: Readonly<MdastTarget & { value: string }>,
  ctx: MdastVisitorContext,
  displayMode: boolean,
) {
  const html = katex.renderToString(node.value, {
    displayMode,
    throwOnError: false,
  });
  ctx.replaceNode(
    node,
    fromHtml(displayMode ? `<div class="math-display">${html}</div>` : html),
  );
  const frontmatter = ctx.data.astro?.frontmatter;
  if (frontmatter) frontmatter.hasMath = true;
}

/** ```mermaid blocks, left as source for scripts/mermaid.ts to draw in the browser. */
const mermaid: MdastPluginDefinition = {
  name: "mermaid",
  code(node, ctx) {
    if (node.lang !== "mermaid") return;
    ctx.replaceNode(node, {
      type: "generated",
      data: { hName: "pre", hProperties: { className: ["mermaid"] } },
      children: [{ type: "text", value: node.value }],
    });
  },
};

export const calloutKinds = ["note", "tip", "warning", "danger"] as const;
const isCalloutKind = new Set<string>(calloutKinds);

/**
 * `:::note[Optional title]` … `:::` asides. The kind shows as a mono label above
 * the optional title.
 */
const callouts: MdastPluginDefinition = {
  name: "callouts",
  containerDirective(node, ctx) {
    if (!isCalloutKind.has(node.name)) return;
    ctx.setProperty(node, "data", {
      hName: "aside",
      hProperties: { className: ["callout"], dataCallout: node.name },
    });
    const [label] = node.children;
    if (label?.type === "paragraph" && label.data?.directiveLabel) {
      ctx.setProperty(label, "data", {
        ...label.data,
        hProperties: { className: ["callout-title"] },
      });
    }
  },
};

/** Minutes to read, exposed as `remarkPluginFrontmatter.minutesRead`. Counts CJK by character. */
const minutesRead: MdastPluginDefinition = {
  name: "minutes-read",
  before(root, ctx) {
    const { minutes } = readingTime(ctx.textContent(root));
    const frontmatter = ctx.data.astro?.frontmatter;
    if (frontmatter) frontmatter.minutesRead = Math.max(1, Math.round(minutes));
  },
};

/**
 * A `#` link after each h2–h4. Sets the heading's id with the same slugger Astro
 * uses, since Astro's own id pass runs after these plugins.
 */
const headingAnchors: HastPluginEntry = () => {
  const slugger = new Slugger();
  return {
    name: "heading-anchors",
    element: {
      filter: ["h2", "h3", "h4"],
      visit(node, ctx) {
        const id =
          typeof node.properties?.id === "string"
            ? node.properties.id
            : slugger.slug(ctx.textContent(node));
        ctx.setProperty(node, "id", id);
        ctx.appendChild(node, {
          type: "element",
          tagName: "a",
          properties: {
            href: `#${id}`,
            className: ["heading-anchor"],
            ariaLabel: "Link to this section",
          },
          children: [],
        });
      },
    },
  };
};

export const mdastPlugins: MdastPluginEntry[] = [
  math,
  mermaid,
  callouts,
  minutesRead,
];
export const hastPlugins: HastPluginEntry[] = [headingAnchors];

/** ```ts title="src/env.ts" shows the file name above the block, as `data-title`. */
export const codeTitle: NonNullable<ShikiConfig["transformers"]>[number] = {
  name: "code-title",
  pre(node) {
    const title = this.options.meta?.__raw?.match(/title="([^"]+)"/)?.[1];
    if (title) node.properties["data-title"] = title;
  },
};
