/** Share of the sheet's height it must be pulled down for a slow release to dismiss it. */
const DISMISS_DISTANCE = 0.3;
/** Downward speed (px/ms) at release that dismisses the sheet however far it moved. */
const DISMISS_VELOCITY = 0.5;
/** Release speed is measured over the last stretch of the drag, so a pause resets it. */
const VELOCITY_WINDOW = 100;

export interface SheetDragOptions {
  /** The element that moves. */
  sheet: HTMLElement;
  /** The sheet's scrolling content: pulling it down drags the sheet only from its top. */
  scroller: HTMLElement;
  /** The grip area, which drags the sheet from anywhere. */
  handle: HTMLElement;
  /** Whether the sheet can be dragged right now (it is a sheet, and open). */
  active: () => boolean;
  /** Called when a release should dismiss the sheet. */
  onDismiss: () => void;
}

/**
 * Touch dragging for a bottom sheet. Pulling down on its handle, or on its content while
 * that is scrolled to the top, moves the sheet with the finger. Letting go far enough
 * down, or flicking down, dismisses it; letting go after a pause or an upward flick
 * springs it back. Touching it mid-spring catches it where it is.
 *
 * It sets `--sheet-offset` (px below rest) and `--sheet-drag` (that offset as a share of
 * the sheet's height, 0–1) on `host`, with `.is-dragging` while a finger holds the
 * sheet. The stylesheet turns those into movement.
 */
export class SheetDrag {
  private state: "idle" | "pending" | "dragging" | "ignored" = "idle";
  private startX = 0;
  private startY = 0;
  /** Where the sheet was when the touch began: 0 at rest, more if caught mid-spring. */
  private base = 0;
  private offset = 0;
  private height = 1;
  private fromHandle = false;
  private samples: { offset: number; time: number }[] = [];

  constructor(
    private readonly host: HTMLElement,
    private readonly options: SheetDragOptions,
  ) {
    const { sheet } = options;
    sheet.addEventListener("touchstart", (event) => this.start(event), {
      passive: true,
    });
    // Not passive, so a drag can stop the content from scrolling.
    sheet.addEventListener("touchmove", (event) => this.move(event), {
      passive: false,
    });
    sheet.addEventListener("touchend", (event) => this.end(event));
    sheet.addEventListener("touchcancel", (event) => this.end(event));
  }

  /** Drops any drag and puts the sheet back at rest, without a transition of its own. */
  reset() {
    this.state = "idle";
    this.host.classList.remove("is-dragging");
    this.host.style.removeProperty("--sheet-offset");
    this.host.style.removeProperty("--sheet-drag");
  }

  private start(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch || event.touches.length > 1 || !this.options.active()) {
      // A second finger lets go of the sheet rather than pinching it.
      if (this.state === "dragging") this.release(false);
      this.state = "ignored";
      return;
    }
    const { sheet, handle } = this.options;
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.height = sheet.offsetHeight || 1;
    this.fromHandle =
      event.target instanceof Node && handle.contains(event.target);
    this.samples = [];
    this.base = currentOffset(sheet);
    this.state = "pending";
    // Still moving (springing back or opening): catch it.
    if (this.base > 1) this.grab(this.base, event.timeStamp);
  }

  private move(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch || this.state === "idle" || this.state === "ignored") return;
    const dx = touch.clientX - this.startX;
    const dy = touch.clientY - this.startY;

    if (this.state === "pending") {
      if (!dx && !dy) return;
      const vertical = Math.abs(dy) > Math.abs(dx);
      const atTop = this.options.scroller.scrollTop <= 0;
      // Once the browser has started scrolling, the gesture is its to keep.
      if (
        !vertical ||
        !event.cancelable ||
        !(this.fromHandle || (dy > 0 && atTop))
      ) {
        this.state = "ignored";
        return;
      }
      this.grab(this.base, event.timeStamp);
    }

    event.preventDefault();
    this.follow(this.base + dy, event.timeStamp);
  }

  private end(event: TouchEvent) {
    if (this.state !== "dragging") {
      if (event.touches.length === 0) this.state = "idle";
      return;
    }
    const recent = this.samples.filter(
      (sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW,
    );
    const first = recent[0];
    const last = recent.at(-1);
    const velocity =
      first && last && last.time > first.time
        ? (last.offset - first.offset) / (last.time - first.time)
        : 0;
    // A tap that only caught the sheet mid-spring lets it settle open.
    const moved = this.samples.length > 1;
    const dismiss =
      event.type !== "touchcancel" &&
      moved &&
      (velocity > DISMISS_VELOCITY ||
        (this.offset > this.height * DISMISS_DISTANCE && velocity > -0.1));
    this.release(dismiss);
  }

  private grab(offset: number, time: number) {
    this.state = "dragging";
    this.host.classList.add("is-dragging");
    this.follow(offset, time);
  }

  private follow(offset: number, time: number) {
    // Above its rest the sheet resists, moving less the further it is pulled.
    this.offset = offset >= 0 ? offset : -3 * Math.sqrt(-offset);
    this.samples.push({ offset, time });
    this.host.style.setProperty("--sheet-offset", `${this.offset}px`);
    this.host.style.setProperty(
      "--sheet-drag",
      String(Math.min(1, Math.max(0, this.offset / this.height))),
    );
  }

  private release(dismiss: boolean) {
    this.state = "idle";
    // Dropping the class restores the transitions, so the sheet animates from where it
    // was let go: off screen if dismissed, back to rest otherwise.
    this.host.classList.remove("is-dragging");
    if (dismiss) {
      this.options.onDismiss();
    } else {
      this.host.style.removeProperty("--sheet-offset");
      this.host.style.removeProperty("--sheet-drag");
    }
  }
}

/** The sheet's current vertical translation, mid-transition included. */
function currentOffset(sheet: HTMLElement) {
  const [, y = "0"] = getComputedStyle(sheet).translate.split(" ");
  return Number.parseFloat(y) || 0;
}
