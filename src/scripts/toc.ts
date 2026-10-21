/**
 * Marks the table-of-contents link of the section being read with
 * `aria-current="true"` and slides the indicator beside it. The section being
 * read starts at the last heading above the top third of the viewport, or is
 * the last one once the page is scrolled to the bottom.
 */
export function initToc(root: ParentNode = document) {
  const toc = root.querySelector<HTMLElement>("[data-toc]");
  // The table of contents is hidden on small screens.
  if (!toc || toc.offsetParent === null) return;
  const indicator = toc.querySelector<HTMLElement>("[data-toc-indicator]");

  const entries = [...toc.querySelectorAll<HTMLAnchorElement>("a[href^='#']")]
    .map((link) => ({
      link,
      heading: document.getElementById(decodeURIComponent(link.hash.slice(1))),
    }))
    .filter((entry) => entry.heading !== null);

  let current: HTMLAnchorElement | undefined;

  const place = (link: HTMLAnchorElement) => {
    if (!indicator) return;
    // The links' offset parent is the list, which also holds the indicator.
    indicator.style.setProperty("--toc-y", `${link.offsetTop}px`);
    indicator.style.setProperty("--toc-h", `${link.offsetHeight}px`);
  };

  const update = () => {
    const line = innerHeight / 3;
    const atBottom =
      scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
    const next = atBottom
      ? entries.at(-1)?.link
      : entries.findLast(
          ({ heading }) => heading!.getBoundingClientRect().top < line,
        )?.link;
    if (next === current) return;

    current?.setAttribute("aria-current", "false");
    next?.setAttribute("aria-current", "true");
    if (next && indicator) {
      if (!current) {
        // Appear in place rather than sliding down from the top of the rail.
        indicator.style.transitionProperty = "opacity";
        place(next);
        void indicator.offsetHeight;
        indicator.style.transitionProperty = "";
      } else {
        place(next);
      }
    }
    indicator?.toggleAttribute("data-active", next !== undefined);
    current = next;
  };

  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", () => {
    if (current) place(current);
    schedule();
  });
  update();
}
