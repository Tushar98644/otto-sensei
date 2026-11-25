import { fmt } from "@/i18n/format";
import type ENGLISH from "@/i18n/messages/en/ats";
import type { Translation } from "@/i18n/types";
import { hiringSystemOf } from "@/lib/ats/detect";
import type { HiringSystemId } from "@/lib/ats/types";

export type JobLinkRead =
  { kind: "empty" } | { kind: "unknown" } | { kind: "system"; id: HiringSystemId };

export type SystemNames = Readonly<Record<HiringSystemId, string>>;

// The job link check's words: the ats namespace in the page's language.
export type JobLinkWords = Translation<typeof ENGLISH.jobLink>;

const LOOKS_LIKE_LINK = /^\S+\.[a-z]{2,}(?:[/?#:]\S*)?$/i;

export function readJobLink(value: string): JobLinkRead {
  const text = value.trim();
  if (!text) return { kind: "empty" };
  const id = hiringSystemOf(null, text);
  if (id) return { kind: "system", id };
  return LOOKS_LIKE_LINK.test(text) ? { kind: "unknown" } : { kind: "empty" };
}

export function jobLinkLine(
  read: JobLinkRead,
  guide: HiringSystemId,
  names: SystemNames,
  t: JobLinkWords,
): string {
  const name = names[guide];
  if (read.kind === "empty") return fmt(t.empty, { name });
  if (read.kind === "unknown") return t.unknown;
  if (read.id === guide) return fmt(t.same, { name });
  return fmt(t.other, { name, other: names[read.id] });
}
