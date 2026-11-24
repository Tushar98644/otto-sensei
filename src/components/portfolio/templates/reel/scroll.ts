import type { MouseEvent } from "react";

// After HamishMW/portfolio hooks/useScrollToHash (MIT, see ./LICENSE.txt).
export function scrollToHash(event: MouseEvent<HTMLAnchorElement>, reduceMotion: boolean) {
  const href = event.currentTarget.getAttribute("href");
  if (!href?.startsWith("#") || href.length < 2) return;
  const root = event.currentTarget.closest(".pf-reel");
  if (!root || root.querySelector(".project:target")) return;
  const target = root.querySelector(`[id="${CSS.escape(href.slice(1))}"]`);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  if (!root.closest("dialog, [data-pf-preview]"))
    window.history.pushState(window.history.state, "", href);
}
