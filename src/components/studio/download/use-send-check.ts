"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";
import { loadResult } from "@/components/studio/tailor/session";
import { useNow } from "@/components/studio/use-now";
import { readJsonItem, writeJsonItem } from "@/lib/browser-storage";
import { savedJobText } from "@/lib/insights/saved-job";
import type { Resume } from "@/lib/resume/schema";
import { runSendCheck, type SendCheckItem } from "@/lib/sendcheck";
import { useStudioStore } from "@/lib/store/resume-store";

const STORAGE_KEY = "otto-send-check-ok-v1";
const MAX_RESUMES = 50;
const MAX_PER_RESUME = 100;
const EMPTY: Readonly<Record<string, readonly string[]>> = {};

const listeners = new Set<() => void>();
let marks: Record<string, readonly string[]> | null = null;

function readStored(): Record<string, readonly string[]> {
  const parsed = readJsonItem(STORAGE_KEY);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: Record<string, readonly string[]> = {};
  for (const [id, list] of Object.entries(parsed)) {
    if (Array.isArray(list)) out[id] = list.filter((item) => typeof item === "string");
  }
  return out;
}

function getSnapshot() {
  marks ??= readStored();
  return marks;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function save(next: Record<string, readonly string[]>) {
  const ids = Object.keys(next);
  marks = Object.fromEntries(ids.slice(-MAX_RESUMES).map((id) => [id, next[id]!]));
  writeJsonItem(STORAGE_KEY, marks);
  for (const listener of listeners) listener();
}

const jobTexts = new WeakMap<object, string>();

function jobTextFor(resume: Resume): string {
  const tailor = resume.tailor;
  if (!tailor) return "";
  let text = jobTexts.get(tailor);
  if (text === undefined) {
    const saved = savedJobText(resume);
    const last = saved ? null : loadResult(tailor.baseResumeId);
    text = saved || (last?.copyId === resume.id ? last.job.text : "");
    jobTexts.set(tailor, text);
  }
  return text;
}

export type SendCheck = {
  items: SendCheckItem[];
  okCount: number;
  markOk: (id: string) => void;
  restore: () => void;
};

export function useSendCheck(resume: Resume): SendCheck {
  const now = useNow();
  const all = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const others = useStudioStore(
    useShallow((s) =>
      Object.values(s.resumes)
        .filter((other) => other.id !== resume.id && other.tailor)
        .map((other) => other.tailor?.company ?? ""),
    ),
  );
  const jobText = jobTextFor(resume);
  const found = useMemo(
    () => (now === 0 ? [] : runSendCheck(resume, { now, jobText, otherCompanies: others })),
    [resume, now, jobText, others],
  );
  const ok = all[resume.id];
  const okSet = useMemo(() => new Set(ok ?? []), [ok]);
  const items = useMemo(() => found.filter((item) => !okSet.has(item.id)), [found, okSet]);
  const okCount = found.length - items.length;

  const markOk = useCallback(
    (id: string) => {
      const current = getSnapshot();
      const list = [...(current[resume.id] ?? []).filter((item) => item !== id), id];
      const rest = { ...current };
      delete rest[resume.id];
      save({ ...rest, [resume.id]: list.slice(-MAX_PER_RESUME) });
    },
    [resume.id],
  );

  const restore = useCallback(() => {
    const rest = { ...getSnapshot() };
    delete rest[resume.id];
    save(rest);
  }, [resume.id]);

  return { items, okCount, markOk, restore };
}
