import { CAREER_LOG_LIMITS, ENTRY_FIELDS, type CareerLogEntry, type EntryField } from "./types";

export type EntryChange = Partial<Pick<CareerLogEntry, EntryField | "nothingNew">>;
export type EntryValues = Pick<CareerLogEntry, EntryField | "nothingNew">;

export const PROMPTS: Record<EntryField, { label: string; hint: string; placeholder: string }> = {
  shipped: {
    label: "What did you ship or improve?",
    hint: "A feature, a fix, a process, a deal.",
    placeholder: "Rebuilt the signup flow so new teams can start without a call",
  },
  numbers: {
    label: "Any numbers?",
    hint: "Users, %, money, time saved. Rough is fine.",
    placeholder: "Signups up 18% in three weeks, about 6 hours a week saved",
  },
  learned: {
    label: "Anything you learned or led?",
    hint: "A skill, a tool, a person you helped.",
    placeholder: "Ran the weekly design review and onboarded two new engineers",
  },
};

// Keeps line breaks and tabs, drops other control characters, and caps the length.
export function cleanField(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, CAREER_LOG_LIMITS.fieldChars);
}

export function hasWords(entry: Pick<CareerLogEntry, EntryField>): boolean {
  return ENTRY_FIELDS.some((field) => entry[field].trim() !== "");
}

// Words always win over "Nothing new"; an entry with neither is gone.
export function normalizeEntry(
  before: EntryValues | null,
  change: EntryChange,
): EntryValues | null {
  const text = Object.fromEntries(
    ENTRY_FIELDS.map((field) => [field, cleanField(change[field] ?? before?.[field] ?? "")]),
  ) as Pick<CareerLogEntry, EntryField>;
  const words = hasWords(text);
  const nothingNew = !words && (change.nothingNew ?? before?.nothingNew ?? false);
  if (!words && !nothingNew) return null;
  return { ...text, nothingNew };
}

// The words of one month as one paragraph, for the AI and plain-text copies.
export function entryParagraphs(entry: Pick<CareerLogEntry, EntryField>): string[] {
  return ENTRY_FIELDS.map((field) => entry[field].trim().replace(/\s*\n\s*/g, " ")).filter(Boolean);
}

export function withWordsOnly<T extends Pick<CareerLogEntry, EntryField>>(
  entries: readonly T[],
): T[] {
  return entries.filter(hasWords);
}
