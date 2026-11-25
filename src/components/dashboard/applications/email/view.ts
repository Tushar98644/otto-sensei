import { fmt } from "@/i18n/format";
import { formatFor, type Format } from "@/i18n/intl";
import EN_APPLICATIONS from "@/i18n/messages/en/applications";
import EN_EMAIL from "@/i18n/messages/en/email";
import type { EmailEvent, EmailTrackingState, TrackingAddress } from "@/lib/inbound/types";
import type { ApplicationsMessages, EmailMessages } from "../../i18n";

// The reader's words for what an email did; English unless the dashboard passes its own.
export type EmailWords = {
  email: Pick<EmailMessages, "proposal" | "change">;
  statuses: ApplicationsMessages["statuses"];
  format: Format;
};

const ENGLISH: EmailWords = {
  email: EN_EMAIL,
  statuses: EN_APPLICATIONS.statuses,
  format: formatFor("en"),
};

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
export function proposalLine(event: EmailEvent, words: EmailWords = ENGLISH): string {
  const t = words.email.proposal;
  const proposal = event.proposal;
  if (!proposal) return t.nothing;
  const name = proposal.company || event.company || t.thisJob;
  const status = proposal.toStatus ? words.statuses[proposal.toStatus] : "";
  const when = interviewLine(event, words.format);
  const dated = event.eventAt !== null && proposal.toStatus === "interview";
  if (proposal.change === "created") return fmt(dated ? t.addOn : t.add, { name, status, when });
  if (proposal.change === "moved") return fmt(dated ? t.moveOn : t.move, { name, status, when });
  if (proposal.change === "dated") return fmt(t.date, { name, when });
  return status ? fmt(t.already, { name, status }) : fmt(t.onBoard, { name });
}

const DAY_TIME = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
} as const;

export function interviewLine(event: EmailEvent, format: Format = ENGLISH.format): string {
  if (event.eventText) return event.eventText;
  return event.eventAt === null ? "" : format.date(event.eventAt, DAY_TIME);
}

export function changeLine(event: EmailEvent, words: EmailWords = ENGLISH): string {
  const t = words.email.change;
  const status = event.toStatus ? words.statuses[event.toStatus] : "";
  if (event.undoneAt !== null) return t.undone;
  if (event.change === "created") return fmt(t.added, { status });
  if (event.change === "moved") return fmt(t.moved, { status });
  if (event.change === "dated") return t.dated;
  if (event.change === "pending") return t.pending;
  if (!event.applicationId) return t.nothing;
  if (event.kind === "applied") return t.onBoard;
  return status ? fmt(t.already, { status }) : t.none;
}

export const KIND_NAMES: Record<EmailEvent["kind"], string> = EN_EMAIL.kinds;

export function canUndo(event: EmailEvent): boolean {
  return (
    event.undoneAt === null &&
    event.change !== "none" &&
    event.change !== "pending" &&
    event.applicationId !== null
  );
}

export const TRUST_LINES: Record<NonNullable<EmailEvent["trust"]>, string> = EN_EMAIL.trust;

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
