"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHeroCtaInView } from "./hero-cta-in-view";
import { IntentLink } from "./intent-link";
import { MAIN_NAV, ROUTES, SIGN_IN_LINK } from "./routes";
import { DASHBOARD_LINK, useSignedIn } from "./use-account-link";

export const NAV_LINK_CLASSES =
  "inline-flex h-11 items-center rounded-full px-3 text-sm text-muted transition-colors hover:text-ink";

export function MainNavLinks() {
  if (useSignedIn()) return null;
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {MAIN_NAV.map((link) => (
        <Link key={link.href} href={link.href} className={NAV_LINK_CLASSES}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

// 40px to sit lightly in the phone header; the ::after keeps a 44px tap area.
const HEADER_KEY = buttonClasses({
  size: "sm",
  className: "max-md:h-10 pointer-coarse:h-10 after:absolute after:inset-x-0 after:-inset-y-0.5",
});

export function HeaderActions() {
  const signedIn = useSignedIn();
  const heroCtaInView = useHeroCtaInView();
  if (signedIn) {
    return (
      <Link href={DASHBOARD_LINK.href} className={HEADER_KEY}>
        {DASHBOARD_LINK.label}
      </Link>
    );
  }
  return (
    <>
      <Link href={SIGN_IN_LINK.href} className={cn(NAV_LINK_CLASSES, "hidden md:inline-flex")}>
        {SIGN_IN_LINK.label}
      </Link>
      <IntentLink
        href={ROUTES.studio}
        className={cn(HEADER_KEY, heroCtaInView && "invisible opacity-0")}
      >
        Check my resume
      </IntentLink>
    </>
  );
}
