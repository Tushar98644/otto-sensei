"use client";

import { useEffect, useRef } from "react";

// Ported from Nuu-maan/portfolio-template (MIT, see ./LICENSE.txt): stickers pop in as they scroll into view.

export function PopIn() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".pf-bubble");
    if (!root || root.closest("[inert], [data-pf-still]")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "true");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.2 },
    );
    const fold = window.innerHeight * 0.9;
    for (const item of root.querySelectorAll<HTMLElement>(".reveal")) {
      if (item.getBoundingClientRect().top < fold) continue;
      item.setAttribute("data-shown", "false");
      observer.observe(item);
    }
    return () => observer.disconnect();
  }, []);

  return <span ref={ref} hidden />;
}
