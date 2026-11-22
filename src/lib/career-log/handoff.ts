import { readJsonItem, writeJsonItem } from "@/lib/browser-storage";
import { HOUR_MS } from "@/lib/time";
import type { LogLine } from "./types";

// Lines Otto wrote from the log, carried to the studio for the person to accept; kept for this tab only.

export type LinesHandoff = {
  resumeId: string;
  experienceId: string | null;
  role: string;
  lines: LogLine[];
  createdAt: number;
};

const KEY = "otto:career-log-lines";
const KEEP_MS = HOUR_MS;

let held: LinesHandoff | null = null;

function isHandoff(value: unknown): value is LinesHandoff {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.resumeId === "string" &&
    (typeof item.experienceId === "string" || item.experienceId === null) &&
    typeof item.role === "string" &&
    typeof item.createdAt === "number" &&
    Array.isArray(item.lines) &&
    item.lines.every(
      (line: unknown) =>
        typeof line === "object" &&
        line !== null &&
        typeof (line as LogLine).id === "string" &&
        typeof (line as LogLine).text === "string" &&
        typeof (line as LogLine).quote === "string" &&
        Array.isArray((line as LogLine).months),
    )
  );
}

export function holdLines(handoff: Omit<LinesHandoff, "createdAt">, now = Date.now()): void {
  held = { ...handoff, createdAt: now };
  writeJsonItem(KEY, held, "session");
}

export function heldLines(now: number): LinesHandoff | null {
  const stored = held ?? readJsonItem(KEY, "session");
  if (!isHandoff(stored) || now - stored.createdAt > KEEP_MS) return null;
  return stored;
}

export function dropLines(): void {
  held = null;
  writeJsonItem(KEY, null, "session");
}
