"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { useMarketingLinks, useSignedIn } from "./use-account-link";

// Disclosure menu for small screens. The panel is positioned against the sticky header, so it must
// render inside <SiteHeader> with no positioned element in between.
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const links = useMarketingLinks();
  const signedIn = useSignedIn();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Signed in, the header's one pill already goes to the dashboard; a menu would only repeat it.
  if (signedIn) return null;

  return (
    <div ref={rootRef} className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        // The 20px icon sits centered in a 44px target. Pulling the target 12px into the gutter puts
        // the icon flush with the page edge, like the logo opposite, and frees room at 360px.
        className={buttonClasses({ variant: "ghost", size: "icon", className: "-mr-3" })}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
        <span className="sr-only">Menu</span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-border bg-background shadow-float"
      >
        <nav aria-label="Main" className="container-page flex flex-col py-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              // Same-page links like /#how don't navigate, so close explicitly.
              onClick={() => setOpen(false)}
              className="flex h-12 items-center rounded-full px-3 text-base font-medium text-ink transition-colors hover:bg-surface-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
