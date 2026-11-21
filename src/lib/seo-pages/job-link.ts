import { hiringSystemOf } from "@/lib/ats/detect";
import type { HiringSystemId } from "@/lib/ats/types";

export type JobLinkRead =
  | { kind: "empty" }
  | { kind: "unknown" }
  | { kind: "system"; id: HiringSystemId };

export type SystemNames = Readonly<Record<HiringSystemId, string>>;

const LOOKS_LIKE_LINK = /^\S+\.[a-z]{2,}(?:[/?#:]\S*)?$/i;

export function readJobLink(value: string): JobLinkRead {
  const text = value.trim();
  if (!text) return { kind: "empty" };
  const id = hiringSystemOf(null, text);
  if (id) return { kind: "system", id };
  return LOOKS_LIKE_LINK.test(text) ? { kind: "unknown" } : { kind: "empty" };
}

export function jobLinkLine(read: JobLinkRead, guide: HiringSystemId, names: SystemNames): string {
  const name = names[guide];
  if (read.kind === "empty") return `Paste a job link and I'll tell you if the job uses ${name}.`;
  if (read.kind === "unknown") {
    return "I can't tell the hiring system from this link. The general advice below still applies.";
  }
  if (read.id === guide) return `This job uses ${name}, so the notes on this page apply to it.`;
  return `This job uses ${names[read.id]}, not ${name}. Its own guide has the notes for it.`;
}
