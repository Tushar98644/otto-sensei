import { useSyncExternalStore } from "react";
import { readJsonItem, removeItem, writeJsonItem } from "@/lib/browser-storage";

export type PracticeMark = "got" | "again";

export type PracticeRecord = {
  marks: Readonly<Record<string, PracticeMark>>;
  answers: Readonly<Record<string, string>>;
};

const KEY_PREFIX = "otto-prep-practice-v1:";
const MAX_ANSWER_CHARS = 4_000;
const EMPTY: PracticeRecord = { marks: {}, answers: {} };

// One record per pack: a new pack for the same job starts its practice fresh.
export function practiceKey(applicationId: string, createdAt: number): string {
  return `${KEY_PREFIX}${applicationId}:${createdAt}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePractice(value: unknown): PracticeRecord {
  if (!isRecord(value)) return EMPTY;
  const marks: Record<string, PracticeMark> = {};
  const answers: Record<string, string> = {};
  if (isRecord(value.marks)) {
    for (const [question, mark] of Object.entries(value.marks)) {
      if (mark === "got" || mark === "again") marks[question] = mark;
    }
  }
  if (isRecord(value.answers)) {
    for (const [question, answer] of Object.entries(value.answers)) {
      if (typeof answer === "string" && answer !== "")
        answers[question] = answer.slice(0, MAX_ANSWER_CHARS);
    }
  }
  return { marks, answers };
}

const cache = new Map<string, PracticeRecord>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function read(key: string): PracticeRecord {
  let record = cache.get(key);
  if (!record) {
    record = parsePractice(readJsonItem(key));
    cache.set(key, record);
  }
  return record;
}

function write(key: string, change: (record: PracticeRecord) => PracticeRecord) {
  const record = change(read(key));
  cache.set(key, record);
  if (Object.keys(record.marks).length === 0 && Object.keys(record.answers).length === 0)
    removeItem(key);
  else writeJsonItem(key, record);
  notify();
}

function onStorage(event: StorageEvent) {
  if (event.key === null) cache.clear();
  else if (cache.has(event.key)) cache.delete(event.key);
  else return;
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

export function usePractice(key: string | null): PracticeRecord {
  return useSyncExternalStore(
    subscribe,
    () => (key ? read(key) : EMPTY),
    () => EMPTY,
  );
}

export function markQuestion(key: string, question: string, mark: PracticeMark): void {
  write(key, (record) => ({ ...record, marks: { ...record.marks, [question]: mark } }));
}

export function saveAnswer(key: string, question: string, answer: string): void {
  write(key, (record) => {
    const answers = { ...record.answers };
    if (answer.trim() === "") delete answers[question];
    else answers[question] = answer.slice(0, MAX_ANSWER_CHARS);
    return { ...record, answers };
  });
}

// Starting over clears the marks; answers stay, so each try can build on the last.
export function clearMarks(key: string): void {
  write(key, (record) => ({ ...record, marks: {} }));
}

export function practiceCount(record: PracticeRecord, questions: readonly string[]): number {
  return questions.filter((question) => record.marks[question] === "got").length;
}

// For a list of packs: how many questions are marked got, without knowing their wording.
export function gotCount(record: PracticeRecord): number {
  return Object.values(record.marks).filter((mark) => mark === "got").length;
}
