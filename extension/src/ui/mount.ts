import { DEV_BUILD } from "../config";
import { STYLES } from "./styles";
import { render, type Mode, type View } from "./view";

export type UiAction = { action: string; value?: string };

export type Ui = { show: (view: View, mode: Mode) => void };

const HOST_TAG = "otto-for-chrome";
const MAX_RETURNS = 20;

// A shadow root (closed in the store build): the page's scripts and styles can't reach in, and ours can't leak out.
export function mountUi(
  onAction: (action: UiAction) => void,
  options: { framed: boolean; bottom: number },
): Ui {
  const host = document.createElement(HOST_TAG);
  const shadow = host.attachShadow({ mode: DEV_BUILD ? "open" : "closed" });
  // A constructed sheet: pages whose CSP refuses inline <style> still style it.
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(STYLES);
  shadow.adoptedStyleSheets = [sheet];
  const root = document.createElement("div");
  root.className = options.framed ? "root framed" : "root";
  root.style.setProperty("--otto-bottom", `${options.bottom}px`);
  shadow.append(root);

  root.addEventListener("click", (event) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>("[data-action]");
    if (!target || target.tagName === "SELECT") return;
    event.stopPropagation();
    onAction({ action: target.dataset.action ?? "" });
  });
  root.addEventListener("change", (event) => {
    const target = event.target as HTMLSelectElement | null;
    if (target?.dataset.action) onAction({ action: target.dataset.action, value: target.value });
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") onAction({ action: "escape" });
  });

  let last = "";
  const parent = () => (options.framed ? document.body : document.documentElement);
  // Pages that hydrate the whole document (Greenhouse's new boards) drop strangers from it; put Otto back.
  let returns = 0;
  new MutationObserver(() => {
    if (host.isConnected || last === "" || returns >= MAX_RETURNS) return;
    returns += 1;
    parent().append(host);
  }).observe(document, { childList: true, subtree: true });

  return {
    show(view, mode) {
      const html = render(view, mode);
      if (html && !host.isConnected) parent().append(host);
      if (html === last) return;
      const focused = (shadow.activeElement as HTMLElement | null)?.dataset.action;
      last = html;
      root.innerHTML = html;
      for (const bar of root.querySelectorAll<HTMLElement>("[data-width]")) {
        bar.style.width = `${bar.dataset.width}%`;
      }
      if (focused) root.querySelector<HTMLElement>(`[data-action="${focused}"]`)?.focus();
    },
  };
}
