"use client";

import { useEffect, useRef } from "react";

// Scroll reveals for templates whose reference fades sections in (v4, Hamish). The server's HTML
// shows everything; only elements still below the fold get data-shown="false", so readers
// without JavaScript or with reduced motion see a plain page, never a flash above the fold.
export function RevealOnScroll({ selector = "[data-reveal]" }: { selector?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current?.parentElement;
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "true");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    const fold = window.innerHeight * 0.9;
    for (const item of root.querySelectorAll<HTMLElement>(selector)) {
      if (item.getBoundingClientRect().top < fold) continue;
      item.setAttribute("data-shown", "false");
      observer.observe(item);
    }
    return () => observer.disconnect();
  }, [selector]);

  return <span ref={ref} hidden />;
}
