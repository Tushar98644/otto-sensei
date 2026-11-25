"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHeroCtaInView } from "./hero-cta-in-view";
import { IntentLink } from "./intent-link";
import { ROUTES } from "./routes";
import { dashboardLink, useSignedIn, type HeaderCopy } from "./use-account-link";

export const NAV_LINK_CLASSES =
  "inline-flex h-11 items-center rounded-full px-3 text-sm text-muted transition-colors hover:text-ink";

export function MainNavLinks({ copy }: { copy: HeaderCopy }) {
  if (useSignedIn()) return null;
  return (
    <nav aria-label={copy.navLabel} className="hidden items-center gap-1 md:flex">
      {copy.nav.map((link) => (
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

export function HeaderActions({ copy }: { copy: HeaderCopy }) {
  const signedIn = useSignedIn();
  const heroCtaInView = useHeroCtaInView(copy.homePath);
  if (signedIn) {
    const dashboard = dashboardLink(copy);
    return (
      <Link href={dashboard.href} className={HEADER_KEY}>
        {dashboard.label}
      </Link>
    );
  }
  return (
    <>
      <Link href={copy.signIn.href} className={cn(NAV_LINK_CLASSES, "hidden md:inline-flex")}>
        {copy.signIn.label}
      </Link>
      <IntentLink
        href={ROUTES.studio}
        className={cn(HEADER_KEY, heroCtaInView && "invisible opacity-0")}
      >
        {copy.checkMyResume}
      </IntentLink>
    </>
  );
}
