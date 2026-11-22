import { DEV_BUILD } from "../config";
import { ottoHead } from "../ui/otto";

// "Draft with Otto" beside each question written in words: one shadow layer over the page, never inside the form's own markup.

export type DraftSpot = { key: string; field: HTMLElement; busy: boolean };

const HOST_TAG = "otto-for-chrome-drafts";
const BUTTON_HEIGHT = 26;
const REPOSITION_MS = 1_000;

const STYLES = `
:host { all: initial; }
.layer { position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483645; }
button {
  position: absolute; display: inline-flex; align-items: center; gap: 5px; height: ${BUTTON_HEIGHT}px; padding: 0 10px 0 4px;
  border: 1px solid #c9d4cd; border-radius: 999px; background: #ffffff; color: #12241d; cursor: pointer;
  font: 500 12px/1 "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; white-space: nowrap;
  box-shadow: 0 1px 2px rgb(18 36 29 / 0.08), 0 4px 10px -6px rgb(18 36 29 / 0.25);
  transition: background 150ms ease-out, border-color 150ms ease-out;
}
button:hover { background: #f5f8f6; border-color: #aebdb4; }
button:focus-visible { outline: 2px solid #12241d; outline-offset: 2px; }
button[aria-busy="true"] { color: #475850; cursor: default; }
button svg { flex: none; }
@media (prefers-reduced-motion: reduce) { button { transition: none; } }
`;

export type DraftButtons = {
  show: (spots: DraftSpot[]) => void;
  clear: () => void;
};

export function mountDraftButtons(onDraft: (key: string) => void): DraftButtons {
  let host: HTMLElement | null = null;
  let layer: HTMLDivElement | null = null;
  let spots: DraftSpot[] = [];
  let frame = 0;
  let timer = 0;

  function ensure(): HTMLDivElement {
    if (layer && host?.isConnected) return layer;
    host = document.createElement(HOST_TAG);
    const shadow = host.attachShadow({ mode: DEV_BUILD ? "open" : "closed" });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(STYLES);
    shadow.adoptedStyleSheets = [sheet];
    layer = document.createElement("div");
    layer.className = "layer";
    layer.addEventListener("click", (event) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>(
        "button[data-key]",
      );
      if (!button || button.getAttribute("aria-busy") === "true") return;
      event.stopPropagation();
      onDraft(button.dataset.key ?? "");
    });
    shadow.append(layer);
    document.documentElement.append(host);
    return layer;
  }

  function place() {
    frame = 0;
    if (!layer) return;
    for (const button of Array.from(
      layer.querySelectorAll<HTMLButtonElement>("button[data-key]"),
    )) {
      const spot = spots.find((item) => item.key === button.dataset.key);
      const box = spot?.field.isConnected ? spot.field.getBoundingClientRect() : null;
      if (!box || box.width === 0) {
        button.hidden = true;
        continue;
      }
      button.hidden = false;
      // Beside the field when there's room; else inside a box's bottom corner, or just under a line.
      const width = button.offsetWidth;
      const beside = box.right + 8 + width <= document.documentElement.clientWidth - 8;
      const tall = spot?.field.tagName === "TEXTAREA";
      const left = beside ? box.right + 8 : box.left + (tall ? 6 : 0);
      const top = beside ? box.top : tall ? box.bottom - BUTTON_HEIGHT - 6 : box.bottom + 4;
      button.style.top = `${Math.max(0, top + window.scrollY)}px`;
      button.style.left = `${Math.max(0, left + window.scrollX)}px`;
    }
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(place);
  }

  return {
    show(next) {
      spots = next;
      if (spots.length === 0) return this.clear();
      const root = ensure();
      root.innerHTML = spots
        .map(
          (spot) =>
            `<button type="button" data-key="${spot.key.replace(/"/g, "&quot;")}"${spot.busy ? ' aria-busy="true"' : ""}>${ottoHead(18)}${spot.busy ? "Drafting…" : "Draft with Otto"}</button>`,
        )
        .join("");
      place();
      if (!timer) {
        window.addEventListener("scroll", schedule, { passive: true, capture: true });
        window.addEventListener("resize", schedule, { passive: true });
        timer = window.setInterval(schedule, REPOSITION_MS);
      }
    },
    clear() {
      spots = [];
      host?.remove();
      host = null;
      layer = null;
      if (timer) {
        window.clearInterval(timer);
        timer = 0;
        window.removeEventListener("scroll", schedule, { capture: true });
        window.removeEventListener("resize", schedule);
      }
    },
  };
}
