"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  anchorOf,
  DEFAULT_TAB,
  isAccountTab,
  tabForAnchor,
  tabFromLocation,
  tabUrl,
  type AccountTab,
} from "./account-tab-state";

type NavigationTarget = { navigation?: EventTarget };
type ScrollTarget = { id: string; at: number };

function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

export function useAccountTab(): [AccountTab, (tab: AccountTab) => void] {
  const searchParams = useSearchParams();
  const asked = searchParams.get("tab");
  const [tab, setTab] = useState<AccountTab>(() =>
    tabFromLocation(
      searchParams.toString(),
      typeof window === "undefined" ? "" : window.location.hash,
    ),
  );
  const opened = useRef(tab);
  const [seen, setSeen] = useState(asked);
  const [scrollTo, setScrollTo] = useState<ScrollTarget | null>(null);
  if (asked !== seen) {
    setSeen(asked);
    setTab(isAccountTab(asked) ? asked : DEFAULT_TAB);
  }

  // The page can open before the router writes the anchor into the address, and a link from the sidebar can land while it's open.
  useEffect(() => {
    const follow = (mounting: boolean) => {
      const id = anchorOf(window.location.hash);
      const next = tabForAnchor(id);
      if (!next) return;
      setTab(next);
      // The first anchor of a page load is scrolled to by the page itself once its tab is open.
      if (!mounting || next !== opened.current) setScrollTo({ id, at: Date.now() });
    };
    const onChange = () => follow(false);
    const navigation = (window as NavigationTarget).navigation;
    window.addEventListener("hashchange", onChange);
    window.addEventListener("popstate", onChange);
    navigation?.addEventListener("currententrychange", onChange);
    const mount = window.setTimeout(() => follow(true), 0);
    return () => {
      window.clearTimeout(mount);
      window.removeEventListener("hashchange", onChange);
      window.removeEventListener("popstate", onChange);
      navigation?.removeEventListener("currententrychange", onChange);
    };
  }, []);

  useEffect(() => {
    if (!scrollTo) return;
    const timer = window.setTimeout(() => scrollToSection(scrollTo.id), 0);
    return () => window.clearTimeout(timer);
  }, [scrollTo]);

  const select = useCallback((next: AccountTab) => {
    setTab(next);
    window.history.replaceState(null, "", tabUrl(window.location.href, next));
  }, []);

  return [tab, select];
}
