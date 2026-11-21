"use client";

import { useEffect } from "react";

// Sections can render after their data loads, so a link's #section is retried for a while, not looked up once.
const WAIT_MS = 10_000;
const RETRY_MS = 100;

export function useScrollToSection(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    // Only the visitor's own press or key ends the wait; focus the page moves by itself doesn't.
    let acted = false;
    const act = () => {
      acted = true;
    };
    let scrolled = false;
    const land = (): boolean => {
      if (acted) return true;
      const target = document.getElementById(id);
      if (!target) return false;
      if (!scrolled) {
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
        scrolled = true;
      }
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      return document.activeElement === target;
    };
    const started = Date.now();
    const stop = () => {
      window.clearInterval(retry);
      window.removeEventListener("pointerdown", act, true);
      window.removeEventListener("keydown", act, true);
    };
    window.addEventListener("pointerdown", act, true);
    window.addEventListener("keydown", act, true);
    const retry = window.setInterval(() => {
      if (land() || Date.now() - started > WAIT_MS) stop();
    }, RETRY_MS);
    return stop;
  }, [ready]);
}
