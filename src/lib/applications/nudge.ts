import type { Application } from "./schema";

// Client-safe and pure. Applications left on "applied" for weeks make the win rate look better
// than it is (they read as "still waiting", not as "no"), so the page offers to close them.

export const NO_REPLY_AFTER_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1_000;

// Still on "applied" NO_REPLY_AFTER_DAYS or more after they were sent, oldest first.
export function waitingTooLong<T extends Pick<Application, "status" | "appliedAt">>(
  list: readonly T[],
  now: number,
): T[] {
  const cutoff = now - NO_REPLY_AFTER_DAYS * DAY_MS;
  return list
    .filter((application) => application.status === "applied" && application.appliedAt <= cutoff)
    .sort((a, b) => a.appliedAt - b.appliedAt);
}

// Otto's line: "Stripe, Linear and 3 more haven't replied in 3 weeks. Mark them as no reply?"
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
