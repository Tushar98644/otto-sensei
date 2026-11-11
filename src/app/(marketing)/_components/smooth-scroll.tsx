"use client";

import "lenis/dist/lenis.css";
import { useEffect } from "react";

// Owner, 2026-11-10. Lenis loads after first paint and stays off for reduced motion. Boxes that
// scroll on their own keep native scrolling.
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const lenis = new Lenis({
        // Close to native: a soft ease, never floaty.
        lerp: 0.12,
        autoRaf: true,
        anchors: true,
        prevent: (node) =>
          node.closest("dialog, [popover], [role=menu], [role=listbox], [data-lenis-prevent]") !==
          null,
      });
      stop = () => lenis.destroy();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return null;
}
