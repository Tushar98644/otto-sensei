// Client-safe. Where a job application stands, and the furthest step it ever reached.

export const APPLICATION_STATUSES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "no_reply",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// The steps forward, in order. Rejected and no reply end an application without moving it on.
export const APPLICATION_STAGES = ["applied", "screening", "interview", "offer"] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const STATUS_NAMES: Record<ApplicationStatus, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  no_reply: "No reply",
};

export const STATUS_HINTS: Record<ApplicationStatus, string> = {
  applied: "Sent, waiting to hear back",
  screening: "They replied or set up a first call",
  interview: "An interview is booked or done",
  offer: "They made you an offer",
  rejected: "They said no, at any step",
  no_reply: "No answer, and you've stopped waiting",
};

const STATUS_SET = new Set<string>(APPLICATION_STATUSES);

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && STATUS_SET.has(value);
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
    applied: { status: "screening", label: "Got a reply" },
    screening: { status: "interview", label: "Got an interview" },
    interview: { status: "offer", label: "Got an offer" },
  };

export function nextStep(
  status: ApplicationStatus,
): { status: ApplicationStatus; label: string } | null {
  return NEXT_STEPS[status] ?? null;
}
