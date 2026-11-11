"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  isThinPage,
  parsePreviewSource,
  previewSourceFor,
  SAMPLE_NAME,
  type PreviewSource,
} from "@/lib/portfolio/preview-source";
import { cn } from "@/lib/utils";
import type { TemplateSample } from "./live-template";

// One choice per browser, shared by every design preview. Kept in memory too, so the switch still
// works when storage is blocked (private windows, strict privacy settings).

const STORAGE_KEY = "otto.portfolio.preview-source";
const listeners = new Set<() => void>();
let current: PreviewSource | null | undefined;

function readStored(): PreviewSource | null {
  try {
    return parsePreviewSource(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function getSnapshot(): PreviewSource | null {
  if (current === undefined) current = readStored();
  return current;
}

// The server can't know the choice, so it draws the default; the browser settles it on hydration.
function getServerSnapshot(): PreviewSource | null {
  return null;
}

function notify() {
  for (const listener of listeners) listener();
}

// A pick in another tab moves this one too.
function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  current = parsePreviewSource(event.newValue);
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function setPreviewSource(source: PreviewSource): void {
  current = source;
  try {
    window.localStorage.setItem(STORAGE_KEY, source);
  } catch {
    // Not remembered after a reload, but still applied now.
  }
  notify();
}

export type PreviewChoice = {
  source: PreviewSource;
  sample: TemplateSample | null;
  // Only someone with a page of their own has anything to switch to.
  canSwitch: boolean;
};

export function usePreviewSource(own: TemplateSample | null): PreviewChoice {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const thin = useMemo(() => (own ? isThinPage(own.content) : true), [own]);
  const source = previewSourceFor({ hasOwn: own !== null, thin, stored });
  return { source, sample: source === "own" ? own : null, canSwitch: own !== null };
}

const OPTIONS: readonly { value: PreviewSource; label: string }[] = [
  { value: "own", label: "Your page" },
  { value: "sample", label: "Sample page" },
];

export function PreviewSourceSwitch({
  source,
  className,
}: {
  source: PreviewSource;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Page shown in the previews"
      className={cn("flex shrink-0 items-center rounded-full bg-surface-muted p-0.5", className)}
    >
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={source === value}
          onClick={() => setPreviewSource(value)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs/4 font-medium whitespace-nowrap text-muted transition-colors hover:text-ink",
            source === value && "bg-surface text-ink shadow-xs",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Says plainly whose page is on screen, so nobody takes the sample for their own. */
export function PreviewSourceNote({
  source,
  short = false,
  className,
}: {
  source: PreviewSource;
  // For a phone-width bar: drops the name, keeps "made-up".
  short?: boolean;
  className?: string;
}) {
  return (
    <p className={cn("text-xs/4 text-muted", className)}>
      {source === "own" ? (
        "Your page, with your own content"
      ) : (
        <>
          <span className="font-medium text-ink">{short ? "Sample:" : "Sample page:"}</span>{" "}
          {short ? "a made-up person" : `${SAMPLE_NAME}, a made-up person`}
        </>
      )}
    </p>
  );
}

export function PreviewSourceBar({
  choice,
  className,
}: {
  choice: PreviewChoice;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      {choice.canSwitch ? <PreviewSourceSwitch source={choice.source} /> : null}
      <PreviewSourceNote source={choice.source} />
    </div>
  );
}
