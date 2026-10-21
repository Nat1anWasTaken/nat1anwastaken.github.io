/**
 * Marks the table-of-contents link of the section being read with
 * `aria-current="true"`: the last heading that has scrolled past the top third.
 */
export function initToc(root: ParentNode = document) {
  const toc = root.querySelector<HTMLElement>("[data-toc]");
  // The table of contents is hidden on small screens.
  if (!toc || toc.offsetParent === null) return;

  const links = new Map(
    [...toc.querySelectorAll<HTMLAnchorElement>("a[href^='#']")].map(
      (link) => [link.hash.slice(1), link] as const,
    ),
  );
  const headings = [...links.keys()]
    .map((id) => document.getElementById(id))
    .filter((heading) => heading !== null);

  // Headings past the reading line: inside the top third, or scrolled above it.
  const above = new Set<Element>();
  let current: HTMLAnchorElement | undefined;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting, boundingClientRect } of entries) {
        if (isIntersecting || boundingClientRect.top < 0) above.add(target);
        else above.delete(target);
      }
      const heading = headings.findLast((heading) => above.has(heading));
      const next = heading && links.get(heading.id);
      if (next === current) return;
      current?.setAttribute("aria-current", "false");
      next?.setAttribute("aria-current", "true");
      current = next;
    },
    { rootMargin: "0px 0px -67% 0px" },
  );
  headings.forEach((heading) => observer.observe(heading));
}
