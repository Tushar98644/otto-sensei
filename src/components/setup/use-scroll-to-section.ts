"use client";

import { useEffect } from "react";

// Sections can render after their data loads, so a link's #section is awaited for a while, not looked up once.
const WAIT_MS = 10_000;

export function useScrollToSection(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const startedOn = document.activeElement;
    let done = false;
    const observer = new MutationObserver(() => {
      if (land()) stop();
    });
    const giveUp = window.setTimeout(() => stop(), WAIT_MS);
    function stop() {
      done = true;
      observer.disconnect();
      window.clearTimeout(giveUp);
    }
    function land(): boolean {
      if (done) return true;
      // Once the visitor has moved focus themselves, the page is theirs.
      const active = document.activeElement;
      if (active !== startedOn && active !== document.body) return true;
      const target = document.getElementById(id);
      if (!target) return false;
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      return true;
    }
    const first = window.setTimeout(() => {
      if (land()) stop();
      else if (!done) observer.observe(document.body, { childList: true, subtree: true });
    }, 0);
    return () => {
      window.clearTimeout(first);
      stop();
    };
  }, [ready]);
}
