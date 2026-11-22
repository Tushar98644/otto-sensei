import type { EmailKind, HiringSystem } from "../types";
import { classify, isAlert } from "./classify";
import { extractJob } from "./extract";
import { gmailConfirmation, type GmailRequest } from "./gmail";
import { systemOf } from "./systems";
import { parseSender } from "./text";
import { unwrap, type MailInput } from "./unwrap";
import { findWhen, type When } from "./when";

export type { MailInput } from "./unwrap";

export type ReadKind = EmailKind | "confirmation" | "test" | "noise";

export type Reading = {
  kind: ReadKind;
  system: HiringSystem | null;
  senderDomain: string;
  subject: string;
  company: string;
  role: string;
  jobUrl: string;
  when: When | null;
  gmail: GmailRequest | null;
  forwarded: "auto" | "manual" | null;
  sentAt: number;
};

const TEST = /\botto test\b/i;

function sentAtOf(date: string | null, now: number): number {
  const parsed = date ? Date.parse(date.replace(/\s+at\s+/i, " ")) : NaN;
  return Number.isFinite(parsed) && parsed <= now + 86_400_000 && parsed > now - 400 * 86_400_000
    ? parsed
    : now;
}

// Rules only: hiring systems send templated mail, so reading it costs nothing and sends it nowhere.
export function readEmail(
  mail: MailInput,
  { now, zone }: { now: number; zone: string | null },
): Reading {
  const outer = parseSender(mail.from);
  const gmail = gmailConfirmation(outer, mail.subject, mail.text);
  const open = unwrap(mail);
  const sender = parseSender(open.from);
  const base = {
    senderDomain: sender.domain,
    subject: open.subject,
    forwarded: open.forwarded,
    sentAt: sentAtOf(open.date, now),
  };
  const empty = { system: null, company: "", role: "", jobUrl: "", when: null };
  if (gmail) return { ...base, ...empty, kind: "confirmation", gmail };
  if (TEST.test(mail.subject) || TEST.test(open.subject))
    return { ...base, ...empty, kind: "test", gmail: null };
  const system = systemOf(sender, open.body);
  const kind = classify(open.subject, open.body);
  const listed = Boolean(mail.headers["list-unsubscribe"] || mail.headers["list-id"]);
  if (kind === "unknown" && isAlert(open.subject, open.body, listed)) {
    return { ...base, ...empty, system, kind: "noise", gmail: null };
  }
  const job = extractJob({ subject: open.subject, body: open.body, sender, system });
  // A test's date is a deadline, not a meeting, so only interviews get a day on the card.
  const when =
    kind === "interview" ? findWhen(open.subject, open.body, { sentAt: base.sentAt, zone }) : null;
  return { ...base, system, kind, ...job, when, gmail: null };
}
