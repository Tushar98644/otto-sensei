"use client";

import "lenis/dist/lenis.css";
import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const lenis = new Lenis({
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
