import { DEV_BUILD } from "../config";
import type { Toast } from "../forms/session";
import { toastHtml } from "./fill-view";
import { STYLES } from "./styles";
import { render, type Mode, type View } from "./view";

export type UiAction = { action: string; value?: string; fields?: Record<string, string> };

export type Ui = { show: (view: View, mode: Mode, toast?: Toast | null) => void };

const HOST_TAG = "otto-for-chrome";
const MAX_RETURNS = 20;

// Every field in the block a button belongs to; ticked boxes that share a name join with new lines.
function fieldsOf(scope: Element): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const element of Array.from(scope.querySelectorAll<HTMLElement>("[data-field]"))) {
    const name = element.dataset.field ?? "";
    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      if (!element.checked) continue;
      fields[name] = fields[name] ? `${fields[name]}\n${element.value}` : element.value;
      continue;
    }
    const value = (element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
    if (typeof value === "string") fields[name] = value;
  }
  return fields;
}

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
    const scope = target.closest("[data-form]");
    onAction({
      action: target.dataset.action ?? "",
      value: target.dataset.value,
      fields: scope ? fieldsOf(scope) : undefined,
    });
  });
  root.addEventListener("change", (event) => {
    const target = event.target as HTMLSelectElement | null;
    if (target?.dataset.action) onAction({ action: target.dataset.action, value: target.value });
  });
  // What the person typed into Otto's fields survives a redraw that happens meanwhile.
  const edited = new Map<string, string | boolean>();
  const editKey = (element: HTMLElement) =>
    element instanceof HTMLInputElement && element.type === "checkbox"
      ? `${element.dataset.field}=${element.value}`
      : (element.dataset.field ?? "");
  const remember = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.dataset.field) return;
    edited.set(
      editKey(target),
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : (target as HTMLInputElement).value,
    );
  };
  root.addEventListener("input", remember, true);
  root.addEventListener("change", remember, true);
  // Typing in Otto's fields stays in Otto: the page's own shortcuts never see it.
  for (const type of ["keydown", "keyup", "keypress", "input"]) {
    root.addEventListener(type, (event) => {
      if (type === "keydown" && (event as KeyboardEvent).key === "Escape")
        onAction({ action: "escape" });
      const target = event.target as HTMLElement | null;
      if (target && /^(?:INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) event.stopPropagation();
    });
  }

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
    show(view, mode, toast = null) {
      const html = toastHtml(toast) + render(view, mode);
      if (html && !host.isConnected) parent().append(host);
      if (html === last) return;
      const active = shadow.activeElement as HTMLElement | null;
      const focused = active?.dataset.action;
      const field = active?.dataset.field;
      last = html;
      root.innerHTML = html;
      for (const bar of root.querySelectorAll<HTMLElement>("[data-width]")) {
        bar.style.width = `${bar.dataset.width}%`;
      }
      const present = new Set<string>();
      for (const element of Array.from(root.querySelectorAll<HTMLElement>("[data-field]"))) {
        const key = editKey(element);
        present.add(key);
        const value = edited.get(key);
        if (value === undefined) continue;
        if (typeof value === "boolean") (element as HTMLInputElement).checked = value;
        else (element as HTMLInputElement).value = value;
      }
      // Edits to a block that's gone (saved, closed) don't come back in the next one.
      for (const key of [...edited.keys()]) if (!present.has(key)) edited.delete(key);
      if (field) root.querySelector<HTMLElement>(`[data-field="${CSS.escape(field)}"]`)?.focus();
      else if (focused) root.querySelector<HTMLElement>(`[data-action="${focused}"]`)?.focus();
    },
  };
}
