import { STATUS_NAMES } from "@/lib/applications/status";
import type { EmailEvent, EmailTrackingState, TrackingAddress } from "@/lib/inbound/types";

export type SetupStage = "address" | "confirm" | "filter" | "working";

// Where setup stands: Gmail's email came (confirm), forwarding works (filter), or a job email arrived.
export function setupStage(address: TrackingAddress): SetupStage {
  if (address.confirm && address.confirmedAt === null) return "confirm";
  if (address.lastEmailAt !== null) return "working";
  return address.confirmedAt !== null ? "filter" : "address";
}

// Until forwarding is confirmed a test goes straight to the address; after, to the person's Gmail so the filter carries it.
export function testTarget(address: TrackingAddress): { to: string; viaFilter: boolean } {
  const stage = setupStage(address);
  const gmail = address.confirm?.source ?? address.sources.at(-1) ?? null;
  if ((stage === "filter" || stage === "working") && gmail) return { to: gmail, viaFilter: true };
  return { to: address.email, viaFilter: false };
}

// Setup finished while the page was open, not on a later visit.
export function justFinished(before: SetupStage | null, now: SetupStage | null): boolean {
  return before !== null && before !== "working" && now === "working";
}

export const SETUP_STEPS = 3;

// The step to do now, 1 to 3; past the last once a job email has come in.
export function setupStep(stage: SetupStage): number {
  if (stage === "address") return 1;
  if (stage === "confirm") return 2;
  return stage === "filter" ? 3 : SETUP_STEPS + 1;
}

// Read but not placed: not a hiring update, or no company to put a card under.
export function isUnread(event: EmailEvent): boolean {
  return event.kind === "unknown" || (event.change === "none" && event.applicationId === null);
}

export function isPending(event: EmailEvent): boolean {
  return event.change === "pending";
}

export function splitEvents(state: EmailTrackingState): {
  pending: EmailEvent[];
  changes: EmailEvent[];
  unread: EmailEvent[];
} {
  return {
    pending: state.events.filter(isPending),
    changes: state.events.filter((event) => !isPending(event) && !isUnread(event)),
    unread: state.events.filter((event) => !isPending(event) && isUnread(event)),
  };
}

// What Apply would do, said plainly: "Move Northwind to Rejected".
export function proposalLine(event: EmailEvent): string {
  const proposal = event.proposal;
  if (!proposal) return "Nothing to change";
  const name = proposal.company || event.company || "this job";
  const to = proposal.toStatus ? STATUS_NAMES[proposal.toStatus] : "";
  const when = event.eventAt !== null ? ` on ${interviewLine(event)}` : "";
  if (proposal.change === "created")
    return `Add ${name} to ${to}${to === "Interviewing" ? when : ""}`;
  if (proposal.change === "moved")
    return `Move ${name} to ${to}${to === "Interviewing" ? when : ""}`;
  if (proposal.change === "dated") return `Set ${name}'s interview to ${interviewLine(event)}`;
  return `${name} is already ${to ? `in ${to}` : "on your board"}, so nothing would change`;
}

const DAY_TIME = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function interviewLine(event: EmailEvent): string {
  if (event.eventText) return event.eventText;
  return event.eventAt === null ? "" : DAY_TIME.format(event.eventAt);
}

export function changeLine(event: EmailEvent): string {
  const to = event.toStatus ? STATUS_NAMES[event.toStatus] : "";
  if (event.undoneAt !== null) return "Undone";
  if (event.change === "created") return `Added to ${to}`;
  if (event.change === "moved") return `Moved to ${to}`;
  if (event.change === "dated") return "Interview day updated";
  if (event.change === "pending") return "Waiting for you to check";
  if (!event.applicationId) return "Nothing to change";
  if (event.kind === "applied") return "Already on your board";
  return to ? `Already in ${to}, so nothing moved` : "Nothing moved";
}

export const KIND_NAMES: Record<EmailEvent["kind"], string> = {
  applied: "Application received",
  rejected: "Rejection",
  interview: "Interview invite",
  assessment: "Assessment",
  offer: "Offer",
  unknown: "Not a hiring update",
};

export function canUndo(event: EmailEvent): boolean {
  return (
    event.undoneAt === null &&
    event.change !== "none" &&
    event.change !== "pending" &&
    event.applicationId !== null
  );
}

export const TRUST_LINES: Record<NonNullable<EmailEvent["trust"]>, string> = {
  source: "From your Gmail",
  sender: "Signed by the sender",
  you: "You applied it",
};

// The newest change that still stands, else the newest email read.
export function lastRead(state: EmailTrackingState): EmailEvent | null {
  return (
    state.events.find(
      (event) => event.change !== "none" && event.change !== "pending" && event.undoneAt === null,
    ) ??
    state.events[0] ??
    null
  );
}
