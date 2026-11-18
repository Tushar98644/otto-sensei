"use client";

import {
  Bell,
  BriefcaseBusiness,
  CircleUser,
  CreditCard,
  Gift,
  Palette,
  Trash,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";
import {
  pickActive,
  SECTION_ROW_HIDDEN,
  SETTINGS_NAV_WIDTH,
  SIDE_NAV_SHOWN,
  type AccountGroup,
  type SettingsSection,
} from "./sections";

const ICONS: Record<AccountGroup, LucideIcon> = {
  profile: CircleUser,
  writingStyle: Palette,
  jobSearch: BriefcaseBusiness,
  notifications: Bell,
  plan: CreditCard,
  invite: Gift,
  danger: Trash,
};

// A thin band a little above the middle of the window: the section crossing it is the one being read.
const READING_BAND = "-35% 0px -60% 0px";
const LOCK_MS = 1_200;
const SETTLE_MS = 150;

function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const lockedUntil = useRef(0);
  const idsKey = ids.join(" ");

  useEffect(() => {
    const order = idsKey.split(" ");
    const inBand = new Set<string>();
    let frame = 0;
    const update = () => {
      frame = 0;
      if (performance.now() < lockedUntil.current) return;
      const root = document.documentElement;
      const atTop = window.scrollY <= 1;
      const atEnd = !atTop && window.innerHeight + window.scrollY >= root.scrollHeight - 2;
      const next = pickActive(order, inBand, { atTop, atEnd });
      if (next) setActive(next);
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) inBand.add(entry.target.id);
                else inBand.delete(entry.target.id);
              }
              schedule();
            },
            { rootMargin: READING_BAND },
          );
    for (const id of order) {
      const element = document.getElementById(id);
      if (element) observer?.observe(element);
    }
    // Only the page's two ends need the scroll event: the first and last sections may never sit in the band.
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", schedule);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [idsKey]);

  function jumpTo(id: string) {
    setActive(id);
    lockedUntil.current = performance.now() + LOCK_MS;
    window.addEventListener(
      "scrollend",
      () => {
        lockedUntil.current = performance.now() + SETTLE_MS;
      },
      { once: true },
    );
  }

  return { active, jumpTo };
}

function goToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  window.history.replaceState(window.history.state, "", `#${id}`);
}

export function SectionNav({ sections }: { sections: readonly SettingsSection[] }) {
  const { active, jumpTo } = useActiveSection(sections.map((section) => section.id));

  function follow(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    jumpTo(id);
    goToSection(id);
  }

  return (
    <>
      <PhoneSections sections={sections} active={active} onFollow={follow} />
      <nav
        aria-label="On this page"
        className={cn(
          "sticky top-24 hidden self-start rounded-2xl bg-surface p-2 in-data-dashboard:top-10",
          SETTINGS_NAV_WIDTH,
          SIDE_NAV_SHOWN,
        )}
      >
        <Eyebrow className="px-2.5 pt-2 pb-1">On this page</Eyebrow>
        <ul role="list" className="flex flex-col gap-0.5">
          {sections.map((section) => {
            const Icon = ICONS[section.key];
            const current = section.id === active;
            return (
              <li
                key={section.id}
                className={cn(section.key === "danger" && "mt-1 border-t border-border pt-1.5")}
              >
                <a
                  href={`#${section.id}`}
                  onClick={(event) => follow(event, section.id)}
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    "flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-muted hover:text-ink",
                    current ? "bg-surface-muted font-medium text-ink" : "text-muted",
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn("size-4 shrink-0", current ? "text-ink" : "text-subtle")}
                  />
                  {section.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function PhoneSections({
  sections,
  active,
  onFollow,
}: {
  sections: readonly SettingsSection[];
  active: string | null;
  onFollow: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  const rowRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    const chip = active
      ? row?.querySelector<HTMLElement>(`[data-id="${CSS.escape(active)}"]`)
      : null;
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    const left = chip.offsetLeft - row.clientWidth / 2 + chip.offsetWidth / 2;
    row.scrollTo({ left: Math.max(0, left) });
  }, [active]);

  return (
    <nav
      aria-label="On this page"
      className={cn(
        "sticky top-16 z-20 bg-surface-muted py-2 in-data-dashboard:top-29 in-data-dashboard:lg:top-0",
        SECTION_ROW_HIDDEN,
      )}
    >
      <ul
        ref={rowRef}
        role="list"
        className="relative flex gap-1 overflow-x-auto overscroll-x-contain rounded-xl bg-surface-strong p-1"
      >
        {sections.map((section) => {
          const current = section.id === active;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                data-id={section.id}
                onClick={(event) => onFollow(event, section.id)}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium whitespace-nowrap -outline-offset-2 transition-colors pointer-coarse:h-11",
                  current
                    ? "bg-surface text-ink shadow-control ring-1 ring-ink/5"
                    : "text-muted hover:text-ink",
                )}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
