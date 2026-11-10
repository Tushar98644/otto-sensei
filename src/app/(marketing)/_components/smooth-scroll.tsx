"use client";

import "lenis/dist/lenis.css";
import { useEffect } from "react";

// A light smooth scroll on the landing page only (owner, 2026-11-10). Lenis loads after the page is
// up, so it adds nothing to first paint, and it stays off for anyone who asks for reduced motion.
// Dialogs, menus and other boxes that scroll on their own keep native scrolling.
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
        // "#pricing" style links glide instead of jumping.
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
