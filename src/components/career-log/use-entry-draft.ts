"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hasWords } from "@/lib/career-log/entry";
import type { CareerLogEntry, EntryField } from "@/lib/career-log/types";
import { saveEntry } from "./use-career-log";

export type Draft = Pick<CareerLogEntry, EntryField>;
export type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_AFTER_MS = 700;

export function draftOf(entry: CareerLogEntry | null | undefined): Draft {
  return {
    shipped: entry?.shipped ?? "",
    numbers: entry?.numbers ?? "",
    learned: entry?.learned ?? "",
  };
}

// Saves a moment after typing stops, on blur, and when the tab goes away, one save at a time and in order.
export function useEntryDraft(
  userId: string | null,
  month: string,
  initial: CareerLogEntry | null,
) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(initial));
  const [nothingNew, setNothingNew] = useState(initial?.nothingNew ?? false);
  const [state, setState] = useState<SaveState>("idle");
  const pending = useRef<Partial<CareerLogEntry> | null>(null);
  const timer = useRef<number | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const flush = useCallback(
    (keepalive = false): Promise<unknown> => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      const change = pending.current;
      if (!userId || !change) return queue.current;
      pending.current = null;
      setState("saving");
      queue.current = queue.current
        .then(() => saveEntry(userId, month, change, { keepalive }))
        .then(() => {
          if (!pending.current) setState("saved");
        })
        .catch(() => {
          pending.current = { ...change, ...pending.current };
          setState("error");
        });
      return queue.current;
    },
    [userId, month],
  );

  const change = useCallback(
    (field: EntryField, value: string) => {
      setDraft((current) => ({ ...current, [field]: value }));
      if (value.trim()) setNothingNew(false);
      pending.current = { ...pending.current, [field]: value };
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_AFTER_MS);
    },
    [flush],
  );

  const markNothingNew = useCallback(() => {
    setNothingNew(true);
    pending.current = { ...pending.current, nothingNew: true };
    return flush();
  }, [flush]);

  useEffect(() => {
    const away = () => void flush(true);
    window.addEventListener("pagehide", away);
    return () => {
      window.removeEventListener("pagehide", away);
      away();
    };
  }, [flush]);

  return { draft, nothingNew, empty: !hasWords(draft), state, change, flush, markNothingNew };
}
