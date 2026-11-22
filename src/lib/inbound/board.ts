import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import { APPLICATION_LIMITS } from "@/lib/applications/schema";
import { readStatus } from "@/lib/applications/status";
import { matchCard, planChange, type Card, type EmailWhen } from "./match";
import type { EmailKind, Proposal } from "./types";

export async function boardCards(userId: string): Promise<Card[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: applications.id,
      company: applications.company,
      role: applications.role,
      jobUrl: applications.jobUrl,
      status: applications.status,
      appliedAt: applications.appliedAt,
      interviewAt: applications.interviewAt,
      interviewTime: applications.interviewTime,
      interviewZone: applications.interviewZone,
    })
    .from(applications)
    .where(eq(applications.userId, userId))
    .limit(APPLICATION_LIMITS.perUser);
  return rows.map((row) => ({ ...row, status: readStatus(row.status) ?? "applied" }));
}

export type EmailFacts = {
  kind: EmailKind;
  company: string;
  role: string;
  jobUrl: string;
  eventAt: number | null;
  eventTime: number | null;
  eventZone: string | null;
};

export function emailWhen(facts: EmailFacts): EmailWhen | null {
  return facts.eventAt === null
    ? null
    : { at: facts.eventAt, time: facts.eventTime, zone: facts.eventZone };
}

// What an email would do to the board as it stands now.
export function proposalFor(cards: readonly Card[], facts: EmailFacts): Proposal {
  const card = matchCard(cards, facts)?.card ?? null;
  const plan = planChange(facts.kind, card, emailWhen(facts));
  const toStatus =
    plan.change === "created" || plan.change === "moved" ? plan.status : (card?.status ?? null);
  return {
    change: plan.change,
    applicationId: card?.id ?? null,
    company: card?.company || facts.company,
    fromStatus: card?.status ?? null,
    toStatus,
  };
}
