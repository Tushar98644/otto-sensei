import type { MouseEvent } from "react";

// hooks/useScrollToHash: in-page links glide to their section instead of jumping, and the address
// follows. An open project page (shown by :target) is left to the browser, which closes it.
export function scrollToHash(event: MouseEvent<HTMLAnchorElement>, reduceMotion: boolean) {
  const href = event.currentTarget.getAttribute("href");
  if (!href?.startsWith("#") || href.length < 2) return;
  const root = event.currentTarget.closest(".pf-reel");
  if (!root || root.querySelector(".project:target")) return;
  const target = root.querySelector(`[id="${CSS.escape(href.slice(1))}"]`);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  // Inside a preview dialog the app's own address stays as it is.
  if (!root.closest("dialog")) window.history.pushState(window.history.state, "", href);
}
