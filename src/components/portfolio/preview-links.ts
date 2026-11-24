import type { MouseEvent } from "react";

export type PreviewLinkAction = { kind: "section"; id: string } | { kind: "own" } | { kind: "tab" };

// What a click on a template's link does inside a preview, from its href and target.
export function previewLinkAction(href: string, target: string): PreviewLinkAction {
  if (href.startsWith("#")) {
    let id = href.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {}
    return { kind: "section", id };
  }
  if (target === "_blank" || /^(mailto|tel):/i.test(href)) return { kind: "own" };
  return { kind: "tab" };
}

// A preview shares the app's page, where the editor's own preview may hold the same ids: a section link scrolls this box, and a page link opens in a new tab.
export function followPreviewLink(event: MouseEvent<HTMLElement>): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const box = event.currentTarget;
  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(link instanceof HTMLAnchorElement) || !box.contains(link)) return;
  const action = previewLinkAction(link.getAttribute("href") ?? "", link.target);
  if (action.kind === "own") return;
  event.preventDefault();
  if (action.kind === "tab") {
    window.open(link.href, "_blank", "noopener,noreferrer");
    return;
  }
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
  if (!action.id) {
    box.scrollTo({ top: 0, behavior });
    return;
  }
  const section = box.querySelector<HTMLElement>(`[id="${CSS.escape(action.id)}"]`);
  if (!section) return;
  const at = section.getBoundingClientRect();
  // A zoomed preview draws the page smaller than it lays it out, and the section's scroll margin shrinks with it.
  const scale = section.offsetHeight > 0 ? at.height / section.offsetHeight : 1;
  const margin = (Number.parseFloat(getComputedStyle(section).scrollMarginTop) || 0) * scale;
  box.scrollTo({
    top: box.scrollTop + at.top - box.getBoundingClientRect().top - margin,
    behavior,
  });
}
