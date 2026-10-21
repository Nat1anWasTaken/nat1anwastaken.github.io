import { prefersReducedMotion } from "../lib/particles/ticker";
import { Scene } from "./scene";
import { workDust } from "./scenes/work";
import { mountScreencasts, type Screencast } from "./screencast";
import { SheetDrag } from "./sheet-drag";

/** Longest open/close transition (the dialog's opacity, or the sheet's slide), plus a little slack. */
const CLOSE_FALLBACK = 600;
/** Below Tailwind's `md` breakpoint the dialog is a bottom sheet. */
const SHEET_QUERY = "(width < 48rem)";

export interface ProjectDialogOptions {
  /** Called when the dialog opens (`true`) and once it has fully closed (`false`). */
  onToggle?: (open: boolean) => void;
}

/**
 * The project detail dialog (`dialog[data-project-dialog]`): a native modal holding one
 * `[data-project-detail]` article per project, of which only the current one is shown.
 * It fades in and out, steps through projects with wrap-around, locks page scroll while
 * open, returns focus to its opener, and runs its own dust behind the panel. On narrow
 * screens it is a bottom sheet that slides up and can be dragged down to dismiss.
 */
export class ProjectDialog {
  private readonly articles: HTMLElement[];
  private readonly screencasts: Screencast[][];
  private readonly scene: Scene | null;
  private readonly panel: HTMLElement | null;
  private readonly closeButton: HTMLElement | null;
  private readonly body: HTMLElement | null;
  private readonly sheet: SheetDrag | null;
  private readonly reduced = prefersReducedMotion();
  private current = -1;
  private opener: HTMLElement | null = null;
  private closeTimer = 0;
  private pressedBackdrop = false;

  constructor(
    private readonly dialog: HTMLDialogElement,
    private readonly options: ProjectDialogOptions = {},
  ) {
    this.articles = [
      ...dialog.querySelectorAll<HTMLElement>("[data-project-detail]"),
    ];
    this.screencasts = this.articles.map((article) =>
      mountScreencasts(article),
    );
    const canvas = dialog.querySelector<HTMLCanvasElement>(
      "canvas[data-dialog-canvas]",
    );
    // The dialog is display: none while closed, so the scene's visibility tracking
    // runs it exactly while the dialog is open.
    this.scene = canvas
      ? new Scene(dialog, { canvas, dust: workDust }).start()
      : null;

    this.panel = dialog.querySelector<HTMLElement>("[data-dialog-panel]");
    this.closeButton = dialog.querySelector<HTMLElement>("[data-dialog-close]");
    this.body = dialog.querySelector<HTMLElement>("[data-dialog-body]");
    const handle = dialog.querySelector<HTMLElement>("[data-sheet-handle]");
    const sheetQuery = window.matchMedia(SHEET_QUERY);
    this.sheet =
      this.panel && this.body && handle
        ? new SheetDrag(dialog, {
            sheet: this.panel,
            scroller: this.body,
            handle,
            active: () =>
              sheetQuery.matches && dialog.classList.contains("is-open"),
            onDismiss: () => this.close(),
          })
        : null;
    this.bind();
  }

  get count() {
    return this.articles.length;
  }

  /** Opens the dialog on project `index`, or switches to it if already open. */
  open(index: number, opener: HTMLElement | null = null) {
    window.clearTimeout(this.closeTimer);
    if (!this.dialog.open) {
      this.opener = opener ?? (document.activeElement as HTMLElement | null);
      document.documentElement.style.overflow = "hidden";
      this.dialog.showModal();
      // The dialog takes focus on opening (it has `autofocus`), so nothing is scrolled into
      // view while the panel is still off screen; the close button takes it from there.
      this.closeButton?.focus({ preventScroll: true });
      this.options.onToggle?.(true);
    }
    this.show(index);
    // Let the closed state paint before transitioning to the open one.
    void this.dialog.offsetWidth;
    this.dialog.classList.add("is-open");
  }

  /** Plays the closing transition, then closes the dialog. */
  close() {
    if (!this.dialog.open || !this.dialog.classList.contains("is-open")) return;
    this.dialog.classList.remove("is-open");
    if (this.reduced) {
      this.dialog.close();
      return;
    }
    this.closeTimer = window.setTimeout(
      () => this.dialog.close(),
      CLOSE_FALLBACK,
    );
  }

  /** Moves `step` projects forward or back, wrapping around. */
  step(step: number) {
    const from = Math.max(0, this.current);
    this.show((from + step + this.count) % this.count);
  }

  private show(index: number) {
    const article = this.articles[index];
    if (!article) return;
    const focused = document.activeElement;
    const stepping =
      focused instanceof HTMLElement && focused.dataset.projectStep;

    this.articles.forEach((el, i) => (el.hidden = i !== index));
    this.current = index;
    this.screencasts[index]?.forEach((screencast) => screencast.restart());
    this.dialog.scrollTop = 0;
    if (this.body) this.body.scrollTop = 0;

    // The focused prev/next button was just hidden; keep focus on its twin.
    if (stepping) {
      article
        .querySelector<HTMLElement>(`[data-project-step="${stepping}"]`)
        ?.focus({ preventScroll: true });
    }
  }

  /** Runs however the dialog ended up closed: our transition, or the browser closing it. */
  private finishClose() {
    window.clearTimeout(this.closeTimer);
    this.dialog.classList.remove("is-open");
    this.sheet?.reset();
    document.documentElement.style.overflow = "";
    this.current = -1;
    this.options.onToggle?.(false);
    this.opener?.focus({ preventScroll: true });
    this.opener = null;
  }

  private bind() {
    const { dialog } = this;

    dialog.addEventListener("close", () => this.finishClose());
    // Esc: play the closing transition instead of vanishing.
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.close();
    });
    // The wide dialog is done closing once it has faded out; the sheet once it has slid away.
    dialog.addEventListener("transitionend", (event) => {
      const closing = !dialog.classList.contains("is-open");
      const done =
        (event.target === dialog && event.propertyName === "opacity") ||
        (event.target === this.panel && event.propertyName === "translate");
      if (closing && done) dialog.close();
    });

    // The dialog itself is the backdrop; its panel covers the content. Only close when the
    // press also started on it, so a text selection dragged out of the panel doesn't close it.
    dialog.addEventListener(
      "pointerdown",
      (event) => (this.pressedBackdrop = event.target === dialog),
    );
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog && this.pressedBackdrop) this.close();
    });

    dialog.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("[data-dialog-close]")) {
        this.close();
        return;
      }
      const stepper = target?.closest<HTMLElement>("[data-project-step]");
      if (stepper) this.step(Number(stepper.dataset.projectStep));
    });
  }
}
