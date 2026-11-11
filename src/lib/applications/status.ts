export const APPLICATION_STATUSES = ["applied", "interview", "offer", "rejected", "no_reply"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

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

export function readStatus(value: unknown): ApplicationStatus | null {
  if (value === "screening") return "interview";
  return isApplicationStatus(value) ? value : null;
}

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

export function stageAfter(current: ApplicationStage, next: ApplicationStatus): ApplicationStage {
  return isStage(next) ? next : current;
}

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

export type StatusEvent = { status: ApplicationStatus; at: number };

export const STATUS_HISTORY_LIMIT = 30;

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
