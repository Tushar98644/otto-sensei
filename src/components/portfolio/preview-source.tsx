"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { readItem, writeItem } from "@/lib/browser-storage";
import {
  isThinPage,
  parsePreviewSource,
  previewSourceFor,
  SAMPLE_NAME,
  type PreviewSource,
} from "@/lib/portfolio/preview-source";
import { cn } from "@/lib/utils";
import type { TemplateSample } from "./live-template";

const STORAGE_KEY = "otto.portfolio.preview-source";
const listeners = new Set<() => void>();
let current: PreviewSource | null | undefined;

function readStored(): PreviewSource | null {
  return parsePreviewSource(readItem(STORAGE_KEY));
}

function getSnapshot(): PreviewSource | null {
  if (current === undefined) current = readStored();
  return current;
}

function getServerSnapshot(): PreviewSource | null {
  return null;
}

function notify() {
  for (const listener of listeners) listener();
}

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
  writeItem(STORAGE_KEY, source);
  notify();
}

export type PreviewChoice = {
  source: PreviewSource;
  sample: TemplateSample | null;
  canSwitch: boolean;
};

export function usePreviewSource(own: TemplateSample | null): PreviewChoice {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const thin = useMemo(() => (own ? isThinPage(own.content) : true), [own]);
  const source = previewSourceFor({ hasOwn: own !== null, thin, stored });
  return { source, sample: source === "own" ? own : null, canSwitch: own !== null };
}

const OPTIONS: readonly { value: PreviewSource; label: "yours" | "sample" }[] = [
  { value: "own", label: "yours" },
  { value: "sample", label: "sample" },
];

export function PreviewSourceSwitch({
  source,
  className,
}: {
  source: PreviewSource;
  className?: string;
}) {
  const words = useMessages("portfolio").source;
  return (
    <div
      role="group"
      aria-label={words.group}
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
          {words[label]}
        </button>
      ))}
    </div>
  );
}

export function PreviewSourceNote({
  source,
  short = false,
  className,
}: {
  source: PreviewSource;
  short?: boolean;
  className?: string;
}) {
  const words = useMessages("portfolio").source;
  return (
    <p className={cn("text-xs/4 text-muted", className)}>
      {source === "own" ? (
        words.own
      ) : (
        <>
          <span className="font-medium text-ink">
            {short ? words.sampleShort : words.sampleLong}
          </span>{" "}
          {short ? words.madeUpShort : fmt(words.madeUpLong, { name: SAMPLE_NAME })}
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
