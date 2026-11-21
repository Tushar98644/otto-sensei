"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { OttoMark } from "@/components/site/otto-mark";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { fitsBand, placeTip, visibleBand, type Placement } from "./place";
import type { StopShape, TourStop } from "./tours";
import "./tour.css";

export type TourEnd = { finished: boolean; reached: number; total: number };

export type StartTourOptions = {
  stops: readonly TourStop[];
  onShown: () => void;
  onEnd: (end: TourEnd) => void;
};

const MAX_TIPS = 3;
const REVEAL_ATTRIBUTE = "data-otto-tour-reveal";
const SCREEN_TIMEOUT_MS = 6_000;
// Bars that stay on screen while the page scrolls; the step bars carry data-tour-edge.
const EDGE_SELECTOR = "header, nav, [data-tour-edge]";
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
    host.remove();
    // end() can run in a React cleanup, where unmounting another root at once makes React warn.
    queueMicrotask(() => root.unmount());
    onEnd({ finished, reached, total: stops.length });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && !event.defaultPrevented) end(false);
  }

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
      // After paint: the new screen's own scroll and focus would otherwise undo ours.
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
    const box = target.getBoundingClientRect();
    if (!fitsBand(box, bandAround(target, box))) {
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

function Tip({ stop, target, position, total, onBack, onNext, onSkip }: TipProps) {
  const card = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Placement | null>(null);
  const last = position === total;
  const ring = RING[stop.shape];

  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const tip = card.current;
      if (!tip) return;
      const box = target.getBoundingClientRect();
      setPlace(
        placeTip({
          target: box,
          tip: tip.getBoundingClientRect(),
          band: bandAround(target, box),
          viewWidth: window.innerWidth,
          ringPadding: ring.padding,
        }),
      );
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [target, ring.padding]);

  return (
    <>
      {place ? (
        <div
          aria-hidden
          className={`pointer-events-none fixed z-40 ring-2 ring-ink ${ring.radius}`}
          style={place.ring}
        />
      ) : null}
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby="otto-tip-title"
        aria-describedby="otto-tip-body"
        className="fixed z-50 w-[min(22rem,calc(100vw-2rem))] animate-pop rounded-2xl bg-surface p-5 shadow-float ring-1 ring-ink/6"
        style={
          place ? { top: place.top, left: place.left } : { top: 0, left: 0, visibility: "hidden" }
        }
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
            <p
              id="otto-tip-body"
              aria-live="polite"
              className="mt-1 text-sm/6 text-pretty text-muted"
            >
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

// The part of the screen no sticky bar covers; a bar holding the target doesn't count.
function bandAround(target: Element, box: DOMRect) {
  const edges: DOMRect[] = [];
  for (const element of document.querySelectorAll(EDGE_SELECTOR)) {
    if (element.contains(target)) continue;
    const { position } = window.getComputedStyle(element);
    if (position !== "sticky" && position !== "fixed") continue;
    const edge = element.getBoundingClientRect();
    if (edge.height > 0) edges.push(edge);
  }
  return visibleBand(edges, box, window.innerHeight);
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
