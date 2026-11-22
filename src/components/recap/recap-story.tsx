"use client";

import { ArrowLeft, ArrowRight, Check, Download, X } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Otto, type OttoPose } from "@/components/mascot/otto";
import { Button, buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { registerModalHost } from "@/components/ui/modal-stack";
import { STATUS_NAMES, type ApplicationStatus } from "@/lib/applications/status";
import { formatCount } from "@/lib/applications/stats";
import { effortLines, recapSummary } from "@/lib/recap/summary";
import type { Recap, RecapStep, RecapViews } from "@/lib/recap/types";
import { weekDays, weekdayName, weekLabel } from "@/lib/recap/week";
import { cn } from "@/lib/utils";
import { RecapImagePanel } from "./recap-image-panel";
import {
  effortComparison,
  momentumLine,
  sinceText,
  slidesOf,
  stepCopy,
  type Slide,
} from "./slides";

export type RecapStoryProps = { recap: Recap; onClose: () => void };

const SWIPE_PX = 48;
const TAP_PX = 10;
const ENTER_MS = 360;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function RecapStory({ recap, onClose }: RecapStoryProps) {
  const slides = useMemo(() => slidesOf(recap), [recap]);
  const [at, setAt] = useState(0);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLElement>(null);
  const direction = useRef(0);
  const press = useRef<{ x: number; y: number } | null>(null);
  const titleId = useId();
  const label = weekLabel(recap.week);
  const slide = slides[Math.min(at, slides.length - 1)]!;
  const last = at >= slides.length - 1;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    const unregister = hostRef.current ? registerModalHost(hostRef.current) : () => {};
    return () => {
      unregister();
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  useLayoutEffect(() => {
    slideRef.current?.focus({ preventScroll: true });
    const sheet = sheetRef.current;
    if (!sheet || direction.current === 0 || reducedMotion()) return;
    const from = direction.current * 28;
    sheet.animate(
      [
        { opacity: 0, transform: `translateX(${from}px) rotate(${direction.current * 0.8}deg)` },
        { opacity: 1, transform: "none" },
      ],
      { duration: ENTER_MS, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" },
    );
  }, [at]);

  function go(next: number) {
    const target = Math.max(0, Math.min(slides.length - 1, next));
    if (target === at) return;
    direction.current = target > at ? 1 : -1;
    setSaving(false);
    setAt(target);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    const typing = target.matches("input, textarea, select");
    const pressable = target.matches("button, a, input, label, summary");
    if (typing) return;
    switch (event.key) {
      case "ArrowRight":
      case "PageDown":
        event.preventDefault();
        go(at + 1);
        break;
      case "ArrowLeft":
      case "PageUp":
        event.preventDefault();
        go(at - 1);
        break;
      case " ":
        if (pressable) return;
        event.preventDefault();
        go(event.shiftKey ? at - 1 : at + 1);
        break;
      case "Home":
        event.preventDefault();
        go(0);
        break;
      case "End":
        event.preventDefault();
        go(slides.length - 1);
        break;
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    press.current = { x: event.clientX, y: event.clientY };
  }

  // A swipe or a tap anywhere but a control turns the page; the left third goes back.
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = press.current;
    press.current = null;
    if (!start) return;
    if ((event.target as HTMLElement).closest("a, button, input, label, [data-recap-keep]")) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? at + 1 : at - 1);
      return;
    }
    if (Math.abs(dx) > TAP_PX || Math.abs(dy) > TAP_PX) return;
    const box = event.currentTarget.getBoundingClientRect();
    go(event.clientX - box.left < box.width / 3 ? at - 1 : at + 1);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={onKeyDown}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden bg-surface-muted p-0 text-ink backdrop:bg-surface-muted"
    >
      <div ref={hostRef} className="flex h-dvh flex-col">
        <h2 id={titleId} className="sr-only">
          Your week with Otto, {label}
        </h2>
        <header className="flex items-center gap-4 px-4 pt-3 sm:px-8 sm:pt-6">
          <Progress count={slides.length} at={at} />
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
            <X aria-hidden />
          </Button>
        </header>
        <div
          className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-3 pt-3 pb-2 select-none sm:px-8 sm:pt-6"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (press.current = null)}
        >
          <Button
            variant="secondary"
            size="icon"
            aria-label="Previous slide"
            className="absolute top-1/2 left-[max(1rem,calc(50%-23rem))] hidden -translate-y-1/2 rounded-full disabled:opacity-0 md:inline-flex"
            disabled={at === 0}
            onClick={() => go(at - 1)}
          >
            <ArrowLeft aria-hidden />
          </Button>
          <div ref={sheetRef} className="relative flex h-full max-h-[44rem] w-full max-w-xl">
            <PaperBehind />
            <div className="relative flex min-h-0 w-full flex-col">
              <div
                aria-hidden
                className="flex h-9 items-center self-start rounded-t-2xl bg-surface px-4 text-xs/4 font-medium tracking-widest text-subtle uppercase"
              >
                {slide.tab}
              </div>
              <section
                ref={slideRef}
                key={at}
                tabIndex={-1}
                aria-roledescription="slide"
                aria-label={`${at + 1} of ${slides.length}: ${slide.tab}`}
                className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-3xl rounded-tl-none bg-surface p-6 shadow-page outline-none sm:p-10"
              >
                <SlideBody
                  slide={slide}
                  recap={recap}
                  onNext={() => go(at + 1)}
                  onClose={onClose}
                />
                {last ? (
                  <Finish
                    recap={recap}
                    saving={saving}
                    onSave={() => setSaving(true)}
                    onBack={() => setSaving(false)}
                    onClose={onClose}
                  />
                ) : null}
              </section>
            </div>
          </div>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Next slide"
            className="absolute top-1/2 right-[max(1rem,calc(50%-23rem))] hidden -translate-y-1/2 rounded-full disabled:opacity-0 md:inline-flex"
            disabled={last}
            onClick={() => go(at + 1)}
          >
            <ArrowRight aria-hidden />
          </Button>
        </div>
        <footer className="flex items-center justify-between gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-6">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous slide"
            className="md:invisible"
            disabled={at === 0}
            onClick={() => go(at - 1)}
          >
            <ArrowLeft aria-hidden />
          </Button>
          <p className="text-sm/5 text-subtle">
            {last ? (
              "That's your week."
            ) : (
              <>
                <span className="pointer-fine:hidden">Tap or swipe to turn the page</span>
                <span className="hidden pointer-fine:inline">
                  Press → or Space for the next page
                </span>
              </>
            )}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next slide"
            className="md:invisible"
            disabled={last}
            onClick={() => go(at + 1)}
          >
            <ArrowRight aria-hidden />
          </Button>
        </footer>
        <p className="sr-only" aria-live="polite">
          {`${at + 1} of ${slides.length}. ${slide.text}`}
        </p>
      </div>
    </dialog>
  );
}

// Folder tabs, one per page: read ones in ink, this one in forest.
function Progress({ count, at }: { count: number; at: number }) {
  return (
    <ol aria-hidden className="flex flex-1 items-end gap-1.5">
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          className={cn(
            "h-2 flex-1 rounded-t-md transition-colors duration-300",
            index < at ? "bg-ink/40" : index === at ? "bg-primary" : "bg-ink/10",
          )}
        />
      ))}
    </ol>
  );
}

function PaperBehind() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 top-9">
      <div className="absolute inset-x-6 top-3 -bottom-1 rotate-[2.5deg] rounded-3xl bg-surface/60 shadow-page" />
      <div className="absolute inset-x-3 top-1.5 bottom-0 -rotate-[1.5deg] rounded-3xl bg-surface/80 shadow-page" />
    </div>
  );
}

function useCountUp(value: number): number {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (value <= 1 || reducedMotion()) return;
    let frame = 0;
    const started = performance.now();
    const tick = (time: number) => {
      const progress = Math.min(1, (time - started) / 700);
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame((time) => {
      setShown(0);
      tick(time);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

const number = new Intl.NumberFormat("en-US");

function BigNumber({ value, className }: { value: number; className?: string }) {
  const shown = useCountUp(value);
  return (
    <span
      className={cn(
        "block font-display text-8xl/none font-normal tracking-tight text-ink lining-nums tabular-nums sm:text-9xl/none",
        className,
      )}
    >
      <span aria-hidden>{number.format(shown)}</span>
      <span className="sr-only">{number.format(value)}</span>
    </span>
  );
}

function OttoCorner({ pose, children }: { pose: OttoPose; children?: ReactNode }) {
  return (
    <div className="mt-auto flex items-end justify-between gap-4 pt-6">
      <div className="min-w-0 flex-1">{children}</div>
      <span aria-hidden className="-mr-2 -mb-2 shrink-0 sm:-mb-3">
        <Otto pose={pose} size={88} className="sm:hidden" />
        <Otto pose={pose} size={112} className="hidden sm:block" />
      </span>
    </div>
  );
}

function SlideBody({
  slide,
  recap,
  onNext,
  onClose,
}: {
  slide: Slide;
  recap: Recap;
  onNext: () => void;
  onClose: () => void;
}) {
  switch (slide.kind) {
    case "opening":
      return <Opening recap={recap} onNext={onNext} onClose={onClose} />;
    case "effort":
      return <Effort recap={recap} />;
    case "momentum":
      return <Momentum recap={recap} />;
    case "attention":
      return <Attention recap={recap} />;
    case "working":
      return <Working recap={recap} />;
    case "jobs":
      return <Jobs recap={recap} />;
    case "days":
      return <Days recap={recap} />;
    case "next":
      return <Next recap={recap} />;
    case "quiet":
      return <Quiet recap={recap} />;
  }
}

function Opening({
  recap,
  onNext,
  onClose,
}: {
  recap: Recap;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <span aria-hidden className="-mt-2 -ml-3 self-start motion-safe:animate-pop">
        <Otto pose="wave" size={132} />
      </span>
      <div className="mt-6 flex flex-col gap-4">
        <Eyebrow>Your week with Otto</Eyebrow>
        <p className="font-display text-6xl/none font-normal tracking-tight text-balance text-ink lining-nums sm:text-8xl/none">
          {weekLabel(recap.week)}
        </p>
        <p className="max-w-prose text-lg/7 text-pretty text-muted sm:text-xl/8">
          {recapSummary(recap)} Here&apos;s how it went, page by page.
        </p>
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-8">
        <Button onClick={onNext}>
          See your week
          <ArrowRight aria-hidden />
        </Button>
        <Button variant="ghost" onClick={onClose}>
          See it later
        </Button>
      </div>
    </div>
  );
}

function Comparison({ recap }: { recap: Recap }) {
  const compared = effortComparison(recap);
  if (!compared) return null;
  return (
    <p
      className={cn(
        "inline-flex h-8 items-center gap-2 self-start rounded-full px-3.5 text-sm font-medium motion-safe:animate-pop",
        compared.up ? "bg-lavender text-ink" : "bg-surface-muted text-muted",
      )}
    >
      {compared.up ? <span aria-hidden className="size-1.5 rounded-full bg-accent" /> : null}
      {compared.text}
    </p>
  );
}

function Effort({ recap }: { recap: Recap }) {
  const [lead, ...rest] = effortLines(recap);
  if (!lead) return null;
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3">
        <BigNumber value={lead.count} />
        <p className="text-xl/8 font-medium text-ink">{lead.label}</p>
        <Comparison recap={recap} />
      </div>
      {rest.length > 0 ? (
        <ul className="mt-8 flex flex-col divide-y divide-border border-y border-border">
          {rest.map((line, index) => (
            <li
              key={line.label}
              className="flex items-baseline gap-4 py-3 motion-safe:animate-fade-in"
              style={{ animationDelay: `${200 + index * 90}ms` }}
            >
              <span className="w-14 font-display text-4xl/10 text-ink lining-nums tabular-nums">
                {number.format(line.count)}
              </span>
              <span className="text-base/6 text-muted">{line.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <OttoCorner pose="read" />
    </div>
  );
}

const STOPS: ApplicationStatus[] = ["applied", "interview", "offer"];

function Journey({ path }: { path: readonly ApplicationStatus[] }) {
  const reached = new Set(path);
  const end = Math.max(...path.map((status) => STOPS.indexOf(status)));
  const start = STOPS.indexOf(path[0] ?? "applied");
  return (
    <div className="relative mt-3 grid grid-cols-3">
      <svg
        aria-hidden
        viewBox="0 0 300 12"
        preserveAspectRatio="none"
        className="absolute inset-x-[16.6%] top-1 h-3 w-[66.8%] overflow-visible"
      >
        <path
          d="M0 6H300"
          className="stroke-border-strong"
          strokeWidth={1.5}
          strokeDasharray="4 5"
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
        <path
          d={`M${start * 150} 6H${end * 150}`}
          className="stroke-primary motion-safe:animate-draw"
          strokeWidth={3}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
      </svg>
      {STOPS.map((stop, index) => {
        const on = reached.has(stop) || (index >= start && index <= end);
        return (
          <div key={stop} className="relative flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full ring-2 ring-surface",
                on ? "bg-primary text-white" : "bg-surface-strong",
              )}
            >
              {on ? <Check aria-hidden className="size-3" strokeWidth={2.5} /> : null}
            </span>
            <span className={cn("text-xs/4", on ? "font-medium text-ink" : "text-subtle")}>
              {stop === "offer" && on ? (
                <mark className="highlighter text-ink motion-safe:animate-highlight-in">
                  {STATUS_NAMES[stop]}
                </mark>
              ) : (
                STATUS_NAMES[stop]
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Momentum({ recap }: { recap: Recap }) {
  const { moves } = recap.momentum;
  return (
    <div className="flex flex-1 flex-col">
      <p className="font-display text-4xl/10 font-normal tracking-tight text-balance text-ink sm:text-5xl/13">
        {momentumLine(recap)}
      </p>
      {moves.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-3">
          {moves.map((move, index) => (
            <li
              key={`${move.company}-${index}`}
              className="rounded-2xl bg-surface-muted px-4 pt-3 pb-3.5 motion-safe:animate-fade-in"
              style={{ animationDelay: `${150 + index * 120}ms` }}
            >
              <p className="truncate text-sm/5">
                <span className="font-medium text-ink">{move.company}</span>
                {move.role ? <span className="text-muted"> · {move.role}</span> : null}
              </p>
              <Journey path={move.path} />
            </li>
          ))}
        </ul>
      ) : null}
      <OttoCorner pose="point" />
    </div>
  );
}

function ViewsBlock({ views, kind }: { views: RecapViews; kind: "share" | "portfolio" }) {
  const sentence =
    kind === "share"
      ? views.since === null
        ? "times your resume link has been opened"
        : `${views.views === 1 ? "time" : "times"} your resume was opened`
      : views.since === null
        ? `${views.views === 1 ? "view" : "views"} on your portfolio so far`
        : `${views.views === 1 ? "view" : "views"} on your portfolio`;
  return (
    <div className="flex flex-col gap-2">
      <BigNumber value={views.views} className="text-7xl/none sm:text-8xl/none" />
      <p className="text-lg/7 font-medium text-ink">{sentence}</p>
      <p className="text-sm/5 text-subtle">{sinceText(views)}</p>
    </div>
  );
}

function Attention({ recap }: { recap: Recap }) {
  const { share, portfolio } = recap.attention;
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-8">
        {share ? <ViewsBlock views={share} kind="share" /> : null}
        {portfolio ? <ViewsBlock views={portfolio} kind="portfolio" /> : null}
      </div>
      <OttoCorner pose="read">
        <p className="text-sm/5 text-subtle">
          Counted without you, link previews or search engines.
        </p>
      </OttoCorner>
    </div>
  );
}

function Working({ recap }: { recap: Recap }) {
  const working = recap.working;
  if (!working) return null;
  return (
    <div className="flex flex-1 flex-col">
      <Eyebrow>From your own applications</Eyebrow>
      {working.kind === "finding" ? (
        <>
          <p className="mt-5 font-display text-4xl/11 font-normal tracking-tight text-pretty text-ink sm:text-5xl/14">
            {working.lead}
            <mark className="highlighter text-ink motion-safe:animate-highlight-in">
              {working.mark}
            </mark>
            {working.tail}
          </p>
          <p className="mt-4 text-lg/7 text-muted">{working.rest}</p>
        </>
      ) : (
        <p className="mt-5 font-display text-3xl/10 font-normal tracking-tight text-pretty text-ink sm:text-4xl/11">
          {working.text}
        </p>
      )}
      <OttoCorner pose="think">
        <p className="text-sm/5 text-subtle">
          Otto only says which does better once there are enough to tell.
        </p>
      </OttoCorner>
    </div>
  );
}

function Jobs({ recap }: { recap: Recap }) {
  const jobs = recap.jobs;
  if (!jobs) return null;
  const lead = jobs.matches ? jobs.matches : jobs.saved;
  const leadLabel = jobs.matches
    ? `new ${jobs.matches === 1 ? "match" : "matches"} posted this week`
    : `${jobs.saved === 1 ? "job" : "jobs"} saved`;
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3">
        <BigNumber value={lead} />
        <p className="text-xl/8 font-medium text-ink">{leadLabel}</p>
      </div>
      {jobs.best ? (
        <div className="mt-8 rounded-2xl bg-surface-muted p-4 motion-safe:animate-fade-in sm:p-5">
          <Eyebrow>Your best match</Eyebrow>
          <p className="mt-2 text-lg/7 font-medium text-pretty text-ink">{jobs.best.title}</p>
          <p className="text-base/6 text-muted">{jobs.best.company}</p>
        </div>
      ) : null}
      {jobs.matches && jobs.saved ? (
        <p className="mt-4 text-base/6 text-muted">
          You saved {formatCount(jobs.saved, "job")} to come back to.
        </p>
      ) : null}
      <OttoCorner pose="read" />
    </div>
  );
}

function daysLine(days: number): string {
  if (days >= 7) return "Every single day.";
  if (days >= 5) return "Most of the week.";
  if (days >= 3) return "A steady week.";
  return "Every visit moves it along.";
}

function Days({ recap }: { recap: Recap }) {
  const active = new Set(recap.activeDays);
  const count = recap.activeDays.length;
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3">
        <BigNumber value={count} />
        <p className="text-xl/8 font-medium text-ink">
          {count === 1 ? "day with Otto" : "days with Otto"}. {daysLine(count)}
        </p>
      </div>
      <ol className="mt-8 grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {weekDays(recap.week).map((day, index) => {
          const on = active.has(day);
          return (
            <li key={day} className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  "flex aspect-[3/4] w-full items-center justify-center rounded-lg motion-safe:animate-pop",
                  on ? "bg-primary text-white shadow-page" : "bg-surface-muted",
                )}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {on ? <Check aria-hidden className="size-4" strokeWidth={2.5} /> : null}
              </span>
              <span className="text-xs/4 text-subtle">
                {weekdayName(day)}
                <span className="sr-only">{on ? ": with Otto" : ": a day off"}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <OttoCorner pose={count >= 3 ? "cheer" : "wave"} />
    </div>
  );
}

function StepRow({ step }: { step: RecapStep }) {
  const copy = stepCopy(step);
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl bg-surface-muted p-4">
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-base/6 font-medium text-pretty text-ink">{copy.title}</p>
        <p className="text-sm/5 text-pretty text-muted">{copy.detail}</p>
      </div>
      <Link href={step.href} className={buttonClasses({ variant: "secondary", size: "sm" })}>
        {copy.cta}
        <ArrowRight aria-hidden />
      </Link>
    </li>
  );
}

function Next({ recap }: { recap: Recap }) {
  return (
    <div className="flex flex-col">
      <p className="font-display text-4xl/10 font-normal tracking-tight text-balance text-ink sm:text-5xl/13">
        {recap.next.length === 1
          ? "One thing to do next."
          : `${recap.next.length} things to do next.`}
      </p>
      <ul className="mt-6 flex flex-col gap-2.5">
        {recap.next.map((step, index) => (
          <StepRow key={index} step={step} />
        ))}
      </ul>
    </div>
  );
}

function Quiet({ recap }: { recap: Recap }) {
  const step = recap.next[0];
  return (
    <div className="flex flex-col">
      <span aria-hidden className="-mt-2 -ml-3 self-start">
        <Otto pose="read" size={120} />
      </span>
      <Eyebrow className="mt-6">Your week with Otto · {weekLabel(recap.week)}</Eyebrow>
      <p className="mt-4 font-display text-5xl/13 font-normal tracking-tight text-ink sm:text-6xl/none">
        A quiet week.
      </p>
      <p className="mt-4 max-w-prose text-lg/7 text-pretty text-muted">
        Weeks like this happen, and your resumes and jobs are right where you left them.
        {step ? " When you're ready, here's one small step." : ""}
      </p>
      {step ? (
        <ul className="mt-6">
          <StepRow step={step} />
        </ul>
      ) : null}
    </div>
  );
}

function Finish({
  recap,
  saving,
  onSave,
  onBack,
  onClose,
}: {
  recap: Recap;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  if (saving) return <RecapImagePanel recap={recap} onBack={onBack} />;
  return (
    <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-8">
      {recap.quiet ? null : (
        <Button variant="secondary" onClick={onSave}>
          <Download aria-hidden />
          Save as image
        </Button>
      )}
      <Button onClick={onClose}>Done</Button>
    </div>
  );
}
