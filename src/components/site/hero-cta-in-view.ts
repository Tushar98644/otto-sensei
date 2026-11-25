"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES } from "./routes";

export const HERO_CTA_ID = "hero-cta";

// Clears the sticky header, so a button tucked under it counts as scrolled away.
const UNDER_HEADER = "-64px 0px 0px 0px";

// On the home page (homePath: /, or /es and the like) the header's button waits until the hero's own has scrolled away.
export function useHeroCtaInView(homePath: string = ROUTES.home): boolean {
  const onHome = usePathname() === homePath;
  const [inView, setInView] = useState(true);

  useEffect(() => {
    if (!onHome || typeof IntersectionObserver === "undefined") return;
    const target = document.getElementById(HERO_CTA_ID);
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setInView(entry.isIntersecting);
      },
      { rootMargin: UNDER_HEADER },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
      // Coming back to the home page starts hidden again, as the server renders it.
      setInView(true);
    };
  }, [onHome]);

  return onHome && inView;
}
