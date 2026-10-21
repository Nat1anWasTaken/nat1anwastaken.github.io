/**
 * Draws the post's ```mermaid blocks (left as `pre.mermaid` by lib/markdown.ts) in
 * the site's colours. Mermaid is large, so it only loads on posts that have one.
 */
export async function renderMermaid(root: ParentNode = document) {
  const blocks = root.querySelectorAll<HTMLElement>("pre.mermaid");
  if (blocks.length === 0) return;

  const { default: mermaid } = await import("mermaid");
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(`--${name}`).trim();
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    fontFamily: token("font-geist") || "sans-serif",
    themeVariables: {
      darkMode: true,
      background: token("color-ink"),
      primaryColor: token("color-ember"),
      primaryTextColor: token("color-sand"),
      primaryBorderColor: token("color-caramel"),
      secondaryColor: token("color-accent"),
      lineColor: token("color-caramel"),
      textColor: token("color-sand"),
      fontSize: "15px",
    },
  });
  await mermaid.run({ nodes: [...blocks] });
}
