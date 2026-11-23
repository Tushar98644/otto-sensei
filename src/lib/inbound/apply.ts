import { createHash, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { createApplication, updateApplication } from "@/app/api/applications/records";
import { getDb } from "@/db/client";
import { applications, inboundEmails, userSettings, type CardBefore } from "@/db/schema";
import { trackStatusChanges } from "@/lib/analytics/retention";
import { captureServerEvent } from "@/lib/analytics/server";
import { APPLICATION_LIMITS } from "@/lib/applications/schema";
import { readStage, readStatus, type ApplicationStatus } from "@/lib/applications/status";
import { CreateApplicationSchema, UpdateApplicationSchema } from "@/lib/applications/validation";
import { minutesIntoDay, zoneOrUtc } from "@/lib/calendar/zones";
import { log } from "@/lib/log";
import { hasAddress } from "./address-columns";
import { boardCards, emailWhen, type EmailFacts } from "./board";
import type { Recipient } from "./handles";
import { matchCard, planChange } from "./match";
import { readEmail } from "./parse";
import { canTrackFromEmail } from "./plan";
import { forwardedByStranger, trustOf } from "./trust";
import { INBOUND_LIMITS, type EmailChange, type EmailTrust } from "./types";
import type { InboundEmail } from "./validation";

export type ReceiveResult =
  "confirmation" | "test" | "ignored" | "paused" | "duplicate" | "unread" | EmailChange;

const GOOGLE_SIGNED = /(?:^|\.)google\.com$/;

function messageKey(mail: InboundEmail): string {
  const id = mail.messageId?.trim().toLowerCase();
  const basis = id
    ? `mid:${id}`
    : `h:${mail.from}|${mail.subject}|${mail.date ?? ""}|${mail.text.slice(0, 500)}`;
  return createHash("sha256").update(basis).digest("base64url");
}

async function userZone(userId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ timeZone: userSettings.timeZone })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row?.timeZone || null;
}

async function snapshot(userId: string, id: string): Promise<CardBefore | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      status: applications.status,
      stageReached: applications.stageReached,
      statusChangedAt: applications.statusChangedAt,
      statusHistory: applications.statusHistory,
      followUpAt: applications.followUpAt,
      interviewAt: applications.interviewAt,
      interviewTime: applications.interviewTime,
      interviewZone: applications.interviewZone,
    })
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.id, id)))
    .limit(1);
  if (!row) return null;
  return {
    status: readStatus(row.status) ?? "applied",
    stageReached: readStage(row.stageReached),
    statusChangedAt: row.statusChangedAt,
    statusHistory: row.statusHistory,
    followUpAt: row.followUpAt,
    interviewAt: row.interviewAt,
    interviewTime: row.interviewTime,
    interviewZone: row.interviewZone,
  };
}

type Applied = {
  change: EmailChange;
  applicationId: string | null;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  before: CardBefore | null;
  changedAt: number | null;
};

const NOTHING: Applied = {
  change: "none",
  applicationId: null,
  fromStatus: null,
  toStatus: null,
  before: null,
  changedAt: null,
};

// The same records and checks as the board's own Add and Move, so an email can't store what a person couldn't.
async function applyToBoard(
  userId: string,
  facts: EmailFacts & { sentAt: number },
  now: number,
): Promise<Applied> {
  if (facts.kind === "unknown") return NOTHING;
  const card = matchCard(await boardCards(userId), facts)?.card ?? null;
  const plan = planChange(facts.kind, card, emailWhen(facts));
  if (plan.change === "none") {
    const status = card?.status ?? null;
    return { ...NOTHING, applicationId: card?.id ?? null, fromStatus: status, toStatus: status };
  }
  if (plan.change === "created") {
    const input = CreateApplicationSchema.safeParse({
      company: facts.company,
      role: facts.role,
      jobUrl: facts.jobUrl,
      appliedAt: Math.min(facts.sentAt, now),
      status: plan.status,
      ...plan.interview,
    });
    if (!input.success) return NOTHING;
    const created = await createApplication(userId, input.data, now, APPLICATION_LIMITS.perUser);
    if (created.status !== "created") return NOTHING;
    const { application } = created;
    captureServerEvent(userId, "application_logged", { status: application.status });
    return {
      change: "created",
      applicationId: application.id,
      fromStatus: null,
      toStatus: application.status,
      before: null,
      changedAt: application.updatedAt,
    };
  }
  if (!card) return NOTHING;
  const patch = UpdateApplicationSchema.safeParse(
    plan.change === "moved" ? { status: plan.status, ...plan.interview } : plan.interview,
  );
  if (!patch.success) return NOTHING;
  const before = await snapshot(userId, card.id);
  const updated = before ? await updateApplication(userId, card.id, patch.data, now) : null;
  if (!before || !updated) return NOTHING;
  // Counted like a move made on the board.
  if (updated.moved) trackStatusChanges(userId, [updated.moved]);
  const { application } = updated;
  return {
    change: plan.change,
    applicationId: application.id,
    fromStatus: before.status,
    toStatus: application.status,
    before,
    changedAt: application.updatedAt,
  };
}

const cap = (value: string, max: number) => value.slice(0, max);

export async function receiveEmail(
  recipient: Recipient,
  mail: InboundEmail,
  now = Date.now(),
): Promise<ReceiveResult> {
  const { userId } = recipient;
  const zone = await userZone(userId);
  const reading = readEmail(mail, { now, zone });
  const db = await getDb();
  const own = hasAddress(userId);
  if (reading.kind === "confirmation") {
    // Only Google's own signed message: a lookalike can't put its mailbox up for confirming.
    if (!reading.gmail || !mail.auth.dkim.some((domain) => GOOGLE_SIGNED.test(domain))) {
      return "ignored";
    }
    await db
      .update(userSettings)
      .set({
        trackingConfirmCode: reading.gmail.code
          ? cap(reading.gmail.code, INBOUND_LIMITS.confirmCode)
          : null,
        trackingConfirmUrl: cap(reading.gmail.url, INBOUND_LIMITS.confirmUrl),
        trackingConfirmSource: reading.gmail.source
          ? cap(reading.gmail.source, INBOUND_LIMITS.source)
          : null,
        trackingConfirmAt: now,
        trackingConfirmedAt: null,
      })
      .where(own);
    return "confirmation";
  }
  if (reading.kind === "test") {
    await db.update(userSettings).set({ trackingTestAt: now }).where(own);
    return "test";
  }
  if (reading.kind === "noise") return "ignored";
  if (!canTrackFromEmail(recipient.plan)) return "paused";

  const cards = await boardCards(userId);
  const trustInput = {
    ...mail,
    sources: recipient.sources,
    accountEmail: recipient.email,
    companies: [reading.company, ...cards.map((card) => card.company)].filter(Boolean),
  };
  const trust: EmailTrust | null = trustOf(trustInput);
  // Another mailbox's forwarded mail isn't the person's to see, and strangers' unreadable mail isn't kept.
  if (!trust && forwardedByStranger(trustInput)) return "ignored";

  // No company and no card to put it on: it's listed as unread instead of guessed at.
  const placeable = reading.kind !== "unknown" && (reading.company !== "" || reading.jobUrl !== "");
  if (!placeable && !trust) return "ignored";
  // A trusted forward means Gmail's forwarding works, whatever the person pressed in Otto.
  if (trust === "source" && recipient.confirmedAt === null) {
    await db
      .update(userSettings)
      .set({ trackingConfirmedAt: now })
      .where(and(own, isNull(userSettings.trackingConfirmedAt)));
  }
  const kind = placeable ? reading.kind : "unknown";
  const when = kind === "interview" ? reading.when : null;
  // The zone the email's day and time read in; one it doesn't name reads in the account's.
  const eventZone = when ? (when.zone ?? zoneOrUtc(zone)) : null;
  const facts: EmailFacts & { sentAt: number } = {
    kind,
    company: cap(reading.company, INBOUND_LIMITS.company),
    role: cap(reading.role, INBOUND_LIMITS.role),
    jobUrl: reading.jobUrl,
    eventAt: when?.at ?? null,
    eventTime: when?.hasTime && eventZone ? minutesIntoDay(when.at, eventZone) : null,
    eventZone,
    sentAt: reading.sentAt,
  };
  const id = randomUUID();
  const [claimed] = await db
    .insert(inboundEmails)
    .values({
      id,
      userId,
      messageKey: messageKey(mail),
      sender: cap(reading.senderDomain, INBOUND_LIMITS.sender),
      subject: cap(reading.subject.replace(/\s+/g, " ").trim(), INBOUND_LIMITS.subject),
      kind,
      system: reading.system,
      company: facts.company,
      role: facts.role,
      jobUrl: facts.jobUrl,
      sentAt: facts.sentAt,
      eventAt: facts.eventAt,
      eventTime: facts.eventTime,
      eventZone: facts.eventZone,
      eventText:
        kind === "interview" ? cap(reading.when?.text ?? "", INBOUND_LIMITS.eventText) : "",
      trust,
      change: trust || kind === "unknown" ? "none" : "pending",
      receivedAt: now,
    })
    .onConflictDoNothing({ target: [inboundEmails.userId, inboundEmails.messageKey] })
    .returning({ id: inboundEmails.id });
  if (!claimed) return "duplicate";
  await db.update(userSettings).set({ trackingLastEmailAt: now }).where(own);
  if (kind === "unknown") return "unread";
  if (!trust) return "pending";
  try {
    const applied = await applyToBoard(userId, facts, now);
    await db
      .update(inboundEmails)
      .set(applied)
      .where(and(eq(inboundEmails.userId, userId), eq(inboundEmails.id, id)));
    return applied.change;
  } catch (error) {
    // Let the Worker's retry find the email unclaimed.
    await db
      .delete(inboundEmails)
      .where(and(eq(inboundEmails.userId, userId), eq(inboundEmails.id, id)));
    throw error;
  }
}

export type ApplyResult = "applied" | "not_found" | "nothing";

// Apply from Check this: the person read it and said yes, so it's planned against the board as it is now.
export async function applyEmail(
  userId: string,
  id: string,
  now = Date.now(),
): Promise<ApplyResult> {
  const db = await getDb();
  const own = and(eq(inboundEmails.userId, userId), eq(inboundEmails.id, id));
  const [event] = await db.select().from(inboundEmails).where(own).limit(1);
  if (!event) return "not_found";
  if (event.change !== "pending" || event.dismissedAt !== null) return "nothing";
  const applied = await applyToBoard(
    userId,
    {
      kind: event.kind,
      company: event.company,
      role: event.role,
      jobUrl: event.jobUrl,
      eventAt: event.eventAt,
      eventTime: event.eventTime,
      eventZone: event.eventZone,
      sentAt: event.sentAt ?? event.receivedAt,
    },
    now,
  );
  await db
    .update(inboundEmails)
    .set({ ...applied, trust: "you" })
    .where(and(own, eq(inboundEmails.change, "pending")));
  return "applied";
}

export type UndoResult = "undone" | "not_found" | "changed" | "nothing";

// Only while the card is as the email left it: a change made since is never thrown away.
export async function undoEmail(userId: string, id: string, now = Date.now()): Promise<UndoResult> {
  const db = await getDb();
  const [event] = await db
    .select()
    .from(inboundEmails)
    .where(and(eq(inboundEmails.userId, userId), eq(inboundEmails.id, id)))
    .limit(1);
  if (!event) return "not_found";
  if (
    event.undoneAt !== null ||
    event.change === "none" ||
    event.change === "pending" ||
    !event.applicationId ||
    event.changedAt === null
  ) {
    return "nothing";
  }
  const card = and(
    eq(applications.userId, userId),
    eq(applications.id, event.applicationId),
    eq(applications.updatedAt, event.changedAt),
  );
  const done =
    event.change === "created"
      ? await db.delete(applications).where(card).returning({ id: applications.id })
      : event.before
        ? await db
            .update(applications)
            .set({
              status: event.before.status,
              stageReached: event.before.stageReached,
              statusChangedAt: event.before.statusChangedAt,
              statusHistory: event.before.statusHistory,
              followUpAt: event.before.followUpAt,
              interviewAt: event.before.interviewAt,
              ...(event.before.interviewTime === undefined
                ? {}
                : {
                    interviewTime: event.before.interviewTime,
                    interviewZone: event.before.interviewZone ?? null,
                  }),
              updatedAt: now,
            })
            .where(card)
            .returning({ id: applications.id })
        : [];
  if (done.length === 0) {
    log.info("inbound.undo_changed", { change: event.change });
    return "changed";
  }
  await db
    .update(inboundEmails)
    .set({ undoneAt: now })
    .where(and(eq(inboundEmails.userId, userId), eq(inboundEmails.id, id)));
  return "undone";
}
