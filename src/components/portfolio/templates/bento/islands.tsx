"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Bento's live parts, after Ladvace/astro-bento-portfolio (MIT).

// The clock ticks from an external store, so the server (and the first client render) draw
// "--:--" and the real time arrives right after hydration without a mismatch.
const subscribeClock = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 5_000);
  return () => window.clearInterval(timer);
};
const clockSnapshot = () => Math.floor(Date.now() / 5_000) * 5_000;
const serverClock = () => 0;

function timeIn(ms: number, timeZone: string, h24: boolean): string {
  return new Intl.DateTimeFormat(navigator.language, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !h24,
    timeZone,
  }).format(ms);
}

function zoneName(ms: number, timeZone: string): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(ms)
    .find((item) => item.type === "timeZoneName");
  return part?.value ?? timeZone.split("/").pop() ?? timeZone;
}

function offsetLabel(ms: number, home: string, visitor: string): string {
  const minutes = (timeZone: string) => {
    const date = new Date(new Date(ms).toLocaleString("en-US", { timeZone }));
    return date.getHours() * 60 + date.getMinutes();
  };
  let diff = minutes(home) - minutes(visitor);
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  if (diff === 0) return "same timezone";
  const abs = Math.abs(diff);
  const label = abs % 60 ? `${Math.floor(abs / 60)}h ${abs % 60}m` : `${abs / 60}h`;
  return diff > 0 ? `${label} ahead of you` : `${label} behind you`;
}

function prefers24h(): boolean {
  const parts = new Intl.DateTimeFormat(navigator.language, { hour: "numeric" }).formatToParts(0);
  return !parts.some((part) => part.type === "dayPeriod");
}

export function TimeZoneTile({
  timeZone,
  place,
  country,
}: {
  timeZone: string;
  place: string;
  country: string;
}) {
  const now = useSyncExternalStore(subscribeClock, clockSnapshot, serverClock);
  const [override, setOverride] = useState<boolean | null>(null);
  const live = now > 0;
  const h24 = live ? (override ?? prefers24h()) : false;
  const visitor = live ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  return (
    <div className="tz">
      <div className="tz-block">
        <div className="tz-head">
          <span className="dot" aria-hidden />
          <span className="tz-label">In {place}</span>
          <button type="button" className="tz-format" onClick={() => setOverride(!h24)}>
            {h24 ? "12h" : "24h"}
          </button>
        </div>
        <time className="clock">{live ? timeIn(now, timeZone, h24) : "--:--"}</time>
        <div className="tz-sub">
          <span>{live ? zoneName(now, timeZone) : ""}</span>
          {country ? (
            <>
              <span className="sep">·</span>
              <span>{country}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="tz-rule">
        <span>{live ? offsetLabel(now, timeZone, visitor) : ""}</span>
      </div>
      <div className="tz-block">
        <span className="tz-label">Where you are</span>
        <time className="clock">{live ? timeIn(now, visitor, h24) : "--:--"}</time>
        <span className="tz-sub">{live ? zoneName(now, visitor) : ""}</span>
      </div>
    </div>
  );
}

const ACCENTS = ["red", "yellow", "blue", "purple", "green"] as const;
type Accent = (typeof ACCENTS)[number];
const KEY = "pf-bento-accent";
let remembered: Accent = "red";
const listeners = new Set<() => void>();

function readAccent(): Accent {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored && (ACCENTS as readonly string[]).includes(stored)) return stored as Accent;
  } catch {}
  return remembered;
}

// Remembered per browser; when storage is blocked the choice still holds for this visit.
function chooseAccent(next: Accent) {
  remembered = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {}
  for (const listener of listeners) listener();
}

export function AccentSwatches() {
  const ref = useRef<HTMLDivElement>(null);
  const accent = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    readAccent,
    () => "red" as Accent,
  );

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".pf-bento");
    if (!root) return;
    root.classList.remove(...ACCENTS);
    if (accent !== "red") root.classList.add(accent);
  }, [accent]);

  return (
    <div ref={ref} className="swatches">
      {ACCENTS.map((name) => (
        <button
          key={name}
          type="button"
          className={`swatch ${name}`}
          aria-label={`${name} accent`}
          aria-pressed={accent === name}
          onClick={() => chooseAccent(name)}
        />
      ))}
    </div>
  );
}
