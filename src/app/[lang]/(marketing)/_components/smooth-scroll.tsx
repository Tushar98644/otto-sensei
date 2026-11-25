"use client";

import { useEffect } from "react";

type LoadLenis = () => Promise<typeof import("lenis")>;

// Lenis leaves touch scrolling native, so phones get CSS smooth anchors instead of its per-frame loop.
export function startSmoothScroll(load: LoadLenis = () => import("lenis")): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  if (window.matchMedia("(pointer: coarse)").matches) {
    const root = document.documentElement;
    root.dataset.scrollBehavior = "smooth";
    return () => {
      delete root.dataset.scrollBehavior;
    };
  }
  let stop: (() => void) | undefined;
  let cancelled = false;
  void load().then(({ default: Lenis }) => {
    if (cancelled) return;
    const lenis = new Lenis({
      lerp: 0.12,
      autoRaf: true,
      anchors: true,
      // Every public page uses it now, so a pasted job post's box or a scrolling panel scrolls itself.
      allowNestedScroll: true,
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
}

export function SmoothScroll() {
  useEffect(() => startSmoothScroll(), []);
  return null;
}
