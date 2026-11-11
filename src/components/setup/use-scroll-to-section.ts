"use client";

import { useEffect } from "react";

// The browser scrolls to a #section on arrival, but the Account page draws its cards only once
// the account has loaded, so it does it here instead, once, and moves focus there for keyboard
// and screen reader users.
export function useScrollToSection(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(id);
      if (!target) return;
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready]);
}
