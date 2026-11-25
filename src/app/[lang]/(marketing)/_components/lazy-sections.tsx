"use client";

import { useEffect } from "react";

// Keeps loops running a little past the edge, so none visibly restarts as it scrolls in.
const PAUSE_MARGIN = "200px 0px";

function samePageHash(target: EventTarget | null): boolean {
  const link = target instanceof Element ? target.closest("a[href*='#']") : null;
  if (!(link instanceof HTMLAnchorElement)) return false;
  return link.pathname === window.location.pathname && link.hash.length > 1;
}

// Mounted once on the home page: pauses [data-pause] sections off screen and renders [data-lazy] ones before an in-page jump.
export function LazySections() {
  useEffect(() => {
    const paused = document.querySelectorAll<HTMLElement>("[data-pause]");
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting);
          }
        },
        { rootMargin: PAUSE_MARGIN },
      );
      for (const section of paused) observer.observe(section);
    }

    // A jump measures where its target is, and a skipped section above it only has a guessed height.
    const renderAll = (event: MouseEvent) => {
      if (!samePageHash(event.target)) return;
      for (const section of document.querySelectorAll("[data-lazy]")) {
        section.setAttribute("data-rendered", "");
      }
    };
    window.addEventListener("click", renderAll, { capture: true });
    return () => {
      observer?.disconnect();
      for (const section of paused) section.removeAttribute("data-offscreen");
      window.removeEventListener("click", renderAll, { capture: true });
    };
  }, []);
  return null;
}
