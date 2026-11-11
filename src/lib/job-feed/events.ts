import type { z } from "zod";
import type { Db } from "@/db/client";
import { matchEvents } from "@/db/schema";
import type { MatchedJob } from "./types";
import type { MatchActionSchema } from "./validation";

// Ids, list places, labels and a hash only: never resume text, titles, skills or contact details.

export type ImpressionContext = {
  userId: string;
  requestId: string;
  variant: string;
  resumeHash: string;
  now: number;
};

export async function logImpressions(
  db: Db,
  context: ImpressionContext,
  jobs: readonly MatchedJob[],
): Promise<void> {
  if (jobs.length === 0) return;
  await db.insert(matchEvents).values(
    jobs.map((job) => ({
      id: crypto.randomUUID(),
      userId: context.userId,
      requestId: context.requestId,
      kind: "impression" as const,
      jobId: job.id,
      position: job.position,
      label: job.match.label,
      variant: context.variant,
      resumeHash: context.resumeHash,
      createdAt: context.now,
    })),
  );
}

export async function logAction(
  db: Db,
  userId: string,
  action: z.output<typeof MatchActionSchema>,
  now: number,
): Promise<void> {
  await db.insert(matchEvents).values({
    id: crypto.randomUUID(),
    userId,
    requestId: action.requestId,
    kind: action.kind,
    jobId: action.jobId,
    position: action.position,
    label: action.label,
    variant: action.variant,
    resumeHash: action.resumeHash,
    reason: action.reason,
    answer: action.answer,
    createdAt: now,
  });
}
