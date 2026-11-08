"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { OttoMark } from "@/components/site/otto-mark";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import type { StopShape, TourStop } from "./tours";
import "./tour.css";

// Draws a tour as a small tip beside each stop: Otto's head, "Otto · 1 of 3", his line, and Skip
// and Next. It is never modal: no dimmed page, no focus trap, and everything on the page keeps
// working under it. The tip sits above or below the thing it points at, never on top of it, and a
// thin ring marks that thing. Escape skips.

export type TourEnd = { finished: boolean; reached: number; total: number };

export type StartTourOptions = {
  stops: readonly TourStop[];
  // The first stop is on screen: from here the tour counts as seen.
  onShown: () => void;
  onEnd: (end: TourEnd) => void;
};

const MAX_TIPS = 3;
const REVEAL_ATTRIBUTE = "data-otto-tour-reveal";
// A studio step's code loads on demand; past this the tour ends instead of waiting forever.
const SCREEN_TIMEOUT_MS = 6_000;
const GAP_PX = 12;
const EDGE_PX = 16;
// The ring hugs a card's or a key's corners, just outside them.
const RING: Record<StopShape, { padding: number; radius: string }> = {
  card: { padding: 6, radius: "rounded-3xl" },
  control: { padding: 4, radius: "rounded-2xl" },
};

export function startTour({
  stops: planned,
  onShown,
  onEnd,
}: StartTourOptions): (() => void) | null {
  const start = planned[0];
  if (!start) return null;
  // Stops on the starting screen are known now; later screens are checked as they come up.
  const stops = planned
    .filter((stop) => stop.screen !== start.screen || stop.target() !== null)
    .slice(0, MAX_TIPS);
  if (stops[0]?.screen !== start.screen) return null;

  const host = document.createElement("div");
  host.dataset.ottoTour = "";
  document.body.append(host);
  const root: Root = createRoot(host);
  let index = -1;
  let reached = 0;
  let ended = false;
  let moving = false;

  function end(finished: boolean) {
    if (ended) return;
    ended = true;
    clearReveal();
    document.removeEventListener("keydown", onKeyDown);
    root.unmount();
    host.remove();
    onEnd({ finished, reached, total: stops.length });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && !event.defaultPrevented) end(false);
  }

  // The next stop in this direction whose target is on screen, without leaving its screen. A
  // folded section, for one, hides the line a stop meant to show.
  function nextShown(to: number, direction: 1 | -1): number | null {
    const screen = stops[to]?.screen;
    for (let at = to; at >= 0 && at < stops.length; at += direction) {
      const stop = stops[at];
      if (!stop || stop.screen !== screen) return null;
      if (stop.target() !== null) return at;
    }
    return null;
  }

  async function go(to: number) {
    if (moving || ended) return;
    const direction = to > index ? 1 : -1;
    const current = stops[index];
    const next = stops[to];
    if (!next) {
      end(direction === 1);
      return;
    }
    if (current && next.screen !== current.screen && next.enter) {
      moving = true;
      root.render(null);
      next.enter();
      const ready = await waitUntil(() => ended || (next.ready?.() ?? true), SCREEN_TIMEOUT_MS);
      // Let the new screen's own effects run first (the studio scrolls to the top and moves focus
      // to its heading), or they would undo the scroll to the next stop.
      await afterPaint();
      moving = false;
      if (ended) return;
      if (!ready) {
        end(false);
        return;
      }
    }
    const shown = nextShown(to, direction);
    if (shown === null) {
      end(direction === 1);
      return;
    }
    show(shown);
  }

  function show(at: number) {
    const stop = stops[at];
    const target = stop?.target();
    if (!stop || !target) {
      end(false);
      return;
    }
    index = at;
    reached = Math.max(reached, at + 1);
    clearReveal();
    if (stop.reveal) target.closest(".sr-only")?.setAttribute(REVEAL_ATTRIBUTE, "");
    if (!inView(target)) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }
    root.render(
      <Tip
        key={stop.id}
        stop={stop}
        target={target}
        position={at + 1}
        total={stops.length}
        onBack={at > 0 ? () => void go(at - 1) : null}
        onNext={() => void go(at + 1)}
        onSkip={() => end(false)}
      />,
    );
    if (at === 0) onShown();
  }

  document.addEventListener("keydown", onKeyDown);
  show(0);
  return () => end(false);
}

type TipProps = {
  stop: TourStop;
  target: Element;
  position: number;
  total: number;
  onBack: (() => void) | null;
  onNext: () => void;
  onSkip: () => void;
};

type Place = { top: number; left: number; ring: DOMRect };

function Tip({ stop, target, position, total, onBack, onNext, onSkip }: TipProps) {
  const card = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const last = position === total;
  const ring = RING[stop.shape];

  // Follows the target as the page scrolls or resizes. Measured after layout, so the tip never
  // paints on top of what it points at.
  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const box = card.current;
      if (!box) return;
      setPlace(placeBeside(target.getBoundingClientRect(), box.getBoundingClientRect()));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    // The first measure waits a frame too: the card's own size is only known once it is drawn.
    schedule();
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [target]);

  return (
    <>
      {place ? (
        <div
          aria-hidden
          className={`pointer-events-none fixed z-40 ring-2 ring-ink ${ring.radius}`}
          style={{
            top: place.ring.top - ring.padding,
            left: place.ring.left - ring.padding,
            width: place.ring.width + ring.padding * 2,
            height: place.ring.height + ring.padding * 2,
          }}
        />
      ) : null}
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby="otto-tip-title"
        aria-describedby="otto-tip-body"
        className="fixed z-50 w-[min(22rem,calc(100vw-2rem))] animate-pop rounded-2xl bg-surface p-5 shadow-float ring-1 ring-ink/6"
        style={place ? { top: place.top, left: place.left } : { top: 0, left: 0, visibility: "hidden" }}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-border">
            <OttoMark className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm/5 text-subtle tabular-nums">
              <span className="font-medium text-ink">{BRAND.mascotName}</span> · {position} of{" "}
              {total}
            </p>
            <p id="otto-tip-title" className="mt-1 text-base/6 font-semibold text-ink">
              {stop.title}
            </p>
            <p id="otto-tip-body" aria-live="polite" className="mt-1 text-sm/6 text-pretty text-muted">
              {stop.body}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {last ? null : (
            <Button variant="ghost" size="sm" onClick={onSkip} className="-ml-3 text-muted">
              Skip tips
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            {onBack ? (
              <Button variant="secondary" size="sm" onClick={onBack}>
                Back
              </Button>
            ) : null}
            <Button size="sm" onClick={onNext}>
              {last ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// Below the target when it fits, else above, else whichever side has more room; kept inside the
// screen sideways. Only a target taller than the screen can end up under the tip, and then the
// tip keeps to the screen's bottom edge, away from the top where the target starts.
function placeBeside(target: DOMRect, tip: DOMRect): Place {
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const below = target.bottom + GAP_PX;
  const above = target.top - GAP_PX - tip.height;
  let top: number;
  if (below + tip.height <= viewH - EDGE_PX) top = below;
  else if (above >= EDGE_PX) top = above;
  else top = Math.max(EDGE_PX, viewH - EDGE_PX - tip.height);
  const left = Math.min(Math.max(EDGE_PX, target.left), Math.max(EDGE_PX, viewW - EDGE_PX - tip.width));
  return { top, left, ring: target };
}

function inView(element: Element): boolean {
  const box = element.getBoundingClientRect();
  return box.top >= 0 && box.bottom <= window.innerHeight;
}

function clearReveal() {
  for (const element of document.querySelectorAll(`[${REVEAL_ATTRIBUTE}]`)) {
    element.removeAttribute(REVEAL_ATTRIBUTE);
  }
}

function waitUntil(check: () => boolean, timeoutMs: number): Promise<boolean> {
  const started = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      if (check()) resolve(true);
      else if (performance.now() - started > timeoutMs) resolve(false);
      else window.setTimeout(tick, 100);
    };
    tick();
  });
}

function afterPaint(): Promise<void> {
  return new Promise((resolve) =>
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())),
  );
}
