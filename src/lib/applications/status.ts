// Client-safe. Where a job application stands, and the furthest step it ever reached.

export const APPLICATION_STATUSES = ["applied", "interview", "offer", "rejected", "no_reply"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// The steps forward, in order. Rejected and no reply end an application without moving it on.
export const APPLICATION_STAGES = ["applied", "interview", "offer"] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const STATUS_NAMES: Record<ApplicationStatus, string> = {
  applied: "Applied",
  interview: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  no_reply: "No reply",
};

export const STATUS_HINTS: Record<ApplicationStatus, string> = {
  applied: "Sent, waiting to hear back",
  interview: "A recruiter call or an interview is booked or done",
  offer: "They made you an offer",
  rejected: "They said no, at any step",
  no_reply: "No answer, and you've stopped waiting",
};

const STATUS_SET = new Set<string>(APPLICATION_STATUSES);

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && STATUS_SET.has(value);
}

/**
 * A stored status as one of today's, or null. "screening" was its own step until
 * 20261109005000_merge_screening.sql folded it into interview; rows and timelines written before
 * that ran still say it.
 */
export function readStatus(value: unknown): ApplicationStatus | null {
  if (value === "screening") return "interview";
  return isApplicationStatus(value) ? value : null;
}

/** A stored furthest step, read the same way; anything unknown counts as applied. */
export function readStage(value: unknown): ApplicationStage {
  const status = readStatus(value);
  return status !== null && isStage(status) ? status : "applied";
}

export function isStage(status: ApplicationStatus): status is ApplicationStage {
  return status !== "rejected" && status !== "no_reply";
}

export function stageIndex(stage: ApplicationStage): number {
  return APPLICATION_STAGES.indexOf(stage);
}

/**
 * The furthest step after a status change. A step forward, or back (fixing a wrong click), becomes
 * the furthest step; an ending keeps the step it ended at, so an interview that ends in a "no"
 * still counts as an interview in the win rate.
 */
export function stageAfter(current: ApplicationStage, next: ApplicationStatus): ApplicationStage {
  return isStage(next) ? next : current;
}

// The one-click step forward each status offers in the list, with its button label.
const NEXT_STEPS: Partial<Record<ApplicationStatus, { status: ApplicationStatus; label: string }>> =
  {
    applied: { status: "interview", label: "Got an interview" },
    interview: { status: "offer", label: "Got an offer" },
  };

export function nextStep(
  status: ApplicationStatus,
): { status: ApplicationStatus; label: string } | null {
  return NEXT_STEPS[status] ?? null;
}

// One entry of an application's timeline: the status it moved to and when (epoch ms).
export type StatusEvent = { status: ApplicationStatus; at: number };

// Entries kept per application; the oldest go first. Matches the column's check.
export const STATUS_HISTORY_LIMIT = 30;

/** The stored history as a clean list, oldest first. A hand-edited entry is skipped, not fatal. */
export function readHistory(value: unknown): StatusEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item: unknown): StatusEvent[] => {
      if (typeof item !== "object" || item === null) return [];
      const { status, at } = item as Record<string, unknown>;
      const known = readStatus(status);
      return known !== null && Number.isSafeInteger(at) ? [{ status: known, at: at as number }] : [];
    })
    .sort((a, b) => a.at - b.at)
    .slice(-STATUS_HISTORY_LIMIT);
}
