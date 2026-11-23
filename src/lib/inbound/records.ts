import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { inboundEmails, inboundHandles, userSettings } from "@/db/schema";
import type { PlanId } from "@/config/plans";
import { readStatus } from "@/lib/applications/status";
import { DAY_MS } from "@/lib/time";
import { ADDRESS, hasAddress, type AddressRow } from "./address-columns";
import { addressOf, addressParts } from "./address";
import { boardCards, proposalFor } from "./board";
import { addressShape, emailTrackingAvailable } from "./config";
import { handlesOf, suggestFor } from "./handles";
import { canTrackFromEmail } from "./plan";
import {
  INBOUND_LIMITS,
  type EmailEvent,
  type EmailTrackingState,
  type Proposal,
  type TrackingAddress,
} from "./types";

// Gmail's confirm link stops working after a while, so an old one isn't offered.
const CONFIRM_SHOWN_MS = 30 * DAY_MS;

type EmailRow = typeof inboundEmails.$inferSelect;

function toAddress(row: AddressRow, handle: string, email: string, now: number): TrackingAddress {
  const confirm =
    row.confirmUrl && row.confirmAt !== null && now - row.confirmAt < CONFIRM_SHOWN_MS
      ? { code: row.confirmCode, url: row.confirmUrl, at: row.confirmAt, source: row.confirmSource }
      : null;
  return {
    email,
    handle,
    sources: row.sources,
    // The join only finds set-up addresses, so this is always a time.
    createdAt: row.createdAt ?? 0,
    confirm,
    confirmedAt: row.confirmedAt,
    testAt: row.testAt,
    lastEmailAt: row.lastEmailAt,
  };
}

export function toEmailEvent(row: EmailRow, proposal: Proposal | null = null): EmailEvent {
  return {
    id: row.id,
    receivedAt: row.receivedAt,
    sender: row.sender,
    subject: row.subject,
    kind: row.kind,
    system: row.system,
    company: row.company,
    role: row.role,
    eventAt: row.eventAt,
    eventText: row.eventText,
    trust: row.trust,
    applicationId: row.applicationId,
    change: row.change,
    fromStatus: readStatus(row.fromStatus),
    toStatus: readStatus(row.toStatus),
    undoneAt: row.undoneAt,
    proposal,
  };
}

export async function trackingState(
  user: { id: string; plan: PlanId; email: string },
  now = Date.now(),
): Promise<EmailTrackingState> {
  const allowed = canTrackFromEmail(user.plan);
  const shape = addressShape();
  const parts = shape ? addressParts(shape) : { before: "", after: "" };
  if (!emailTrackingAvailable() || !shape) {
    return { available: false, allowed, address: null, events: [], parts, suggestion: "" };
  }
  const db = await getDb();
  const [[current], events] = await Promise.all([
    db
      .select({ handle: inboundHandles.handle, address: ADDRESS })
      .from(inboundHandles)
      .innerJoin(userSettings, hasAddress(inboundHandles.userId))
      .where(and(eq(inboundHandles.userId, user.id), isNull(inboundHandles.retiredAt)))
      .limit(1),
    db
      .select()
      .from(inboundEmails)
      .where(and(eq(inboundEmails.userId, user.id), isNull(inboundEmails.dismissedAt)))
      .orderBy(desc(inboundEmails.receivedAt), desc(inboundEmails.id))
      .limit(INBOUND_LIMITS.listed),
  ]);
  const cards = events.some((row) => row.change === "pending") ? await boardCards(user.id) : [];
  return {
    available: true,
    allowed,
    address: current
      ? toAddress(current.address, current.handle, addressOf(current.handle, shape), now)
      : null,
    events: events.map((row) =>
      toEmailEvent(
        row,
        row.change === "pending"
          ? proposalFor(cards, {
              kind: row.kind,
              company: row.company,
              role: row.role,
              jobUrl: row.jobUrl,
              eventAt: row.eventAt,
              eventTime: row.eventTime,
              eventZone: row.eventZone,
            })
          : null,
      ),
    ),
    parts,
    suggestion: current || !allowed ? "" : await suggestFor(user.id, user.email, now),
  };
}

// For the data download: the handles, the confirmed Gmail addresses and what was read in each email.
export async function trackingExport(userId: string) {
  const db = await getDb();
  const shape = addressShape();
  const [handles, [address], emails] = await Promise.all([
    handlesOf(userId),
    db
      .select({ sources: ADDRESS.sources, createdAt: ADDRESS.createdAt })
      .from(userSettings)
      .where(hasAddress(userId))
      .limit(1),
    db
      .select({
        receivedAt: inboundEmails.receivedAt,
        sender: inboundEmails.sender,
        subject: inboundEmails.subject,
        kind: inboundEmails.kind,
        company: inboundEmails.company,
        role: inboundEmails.role,
        jobUrl: inboundEmails.jobUrl,
        interviewAt: inboundEmails.eventAt,
        interviewTime: inboundEmails.eventTime,
        interviewZone: inboundEmails.eventZone,
        interviewText: inboundEmails.eventText,
        trust: inboundEmails.trust,
        change: inboundEmails.change,
        fromStatus: inboundEmails.fromStatus,
        toStatus: inboundEmails.toStatus,
        undoneAt: inboundEmails.undoneAt,
      })
      .from(inboundEmails)
      .where(eq(inboundEmails.userId, userId))
      .orderBy(asc(inboundEmails.receivedAt)),
  ]);
  const tracking =
    address || handles.length > 0
      ? {
          addresses: handles.map((row) => ({
            ...row,
            address: shape ? addressOf(row.handle, shape) : row.handle,
          })),
          confirmedGmail: address?.sources ?? [],
        }
      : null;
  return { address: tracking, emails };
}

// Pressing Confirm (or copying Gmail's code) says the mailbox that asked is the person's own.
export async function confirmSource(userId: string, now = Date.now()): Promise<void> {
  const db = await getDb();
  await db
    .update(userSettings)
    .set({
      trackingConfirmedAt: now,
      trackingSources: sql`(select coalesce(array_agg(distinct s), '{}') from unnest(array_append(${ADDRESS.sources}, ${ADDRESS.confirmSource})) s where s is not null)`,
    })
    .where(
      and(hasAddress(userId), sql`cardinality(${ADDRESS.sources}) < ${INBOUND_LIMITS.sources}`),
    );
}

export async function forgetConfirmation(userId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(userSettings)
    .set({
      trackingConfirmCode: null,
      trackingConfirmUrl: null,
      trackingConfirmSource: null,
      trackingConfirmAt: null,
    })
    .where(hasAddress(userId));
}

export async function dismissEmail(userId: string, id: string, now = Date.now()): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .update(inboundEmails)
    .set({ dismissedAt: now })
    .where(and(eq(inboundEmails.userId, userId), eq(inboundEmails.id, id)))
    .returning({ id: inboundEmails.id });
  return rows.length > 0;
}
