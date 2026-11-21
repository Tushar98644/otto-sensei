"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { HERO_CTA_ID, PAGE_CTA_ATTRIBUTE } from "./page-cta";
import { ROUTES } from "./routes";

// Pages that open on their own main action, so the server can render the header's button hidden.
const OWN_CTA_PAGES: ReadonlySet<string> = new Set([ROUTES.home, SEO_PATHS.jobMatch]);

// Clears the sticky header, so a button tucked under it counts as scrolled away.
const UNDER_HEADER = "-64px 0px 0px 0px";

export function useHeroCtaInView(): boolean {
  const ownCta = OWN_CTA_PAGES.has(usePathname());
  const [inView, setInView] = useState(true);

  useEffect(() => {
    if (!ownCta || typeof IntersectionObserver === "undefined") return;
    const targets = document.querySelectorAll(`#${HERO_CTA_ID}, [${PAGE_CTA_ATTRIBUTE}]`);
    if (targets.length === 0) return;
    const showing = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) showing.add(entry.target);
          else showing.delete(entry.target);
        }
        setInView(showing.size > 0);
      },
      { rootMargin: UNDER_HEADER },
    );
    for (const target of targets) observer.observe(target);
    return () => {
      observer.disconnect();
      // Coming back to the page starts hidden again, as the server renders it.
      setInView(true);
    };
  }, [ownCta]);

  return ownCta && inView;
}
