import { DAY_MS } from "@/lib/time";
import type { Application } from "./schema";

// Applications left on "applied" for weeks read as "still waiting", flattering the win rate.

export const NO_REPLY_AFTER_DAYS = 21;

export function waitingTooLong<T extends Pick<Application, "status" | "appliedAt">>(
  list: readonly T[],
  now: number,
): T[] {
  const cutoff = now - NO_REPLY_AFTER_DAYS * DAY_MS;
  return list
    .filter((application) => application.status === "applied" && application.appliedAt <= cutoff)
    .sort((a, b) => a.appliedAt - b.appliedAt);
}

export function nudgeMessage(stale: readonly Pick<Application, "company">[]): string {
  const names = [
    ...new Set(stale.map((application) => application.company.trim()).filter(Boolean)),
  ];
  const weeks = `${NO_REPLY_AFTER_DAYS / 7} weeks`;
  if (stale.length === 1) {
    return `${names[0] ?? "One company"} hasn't replied in ${weeks}. Mark it as no reply?`;
  }
  const shown = names.slice(0, 2);
  const rest = stale.length - shown.length;
  const who =
    shown.length === 0
      ? `${stale.length} companies`
      : rest > 0
        ? `${shown.join(", ")} and ${rest} more`
        : shown.join(" and ");
  return `${who} haven't replied in ${weeks}. Mark them as no reply?`;
}
