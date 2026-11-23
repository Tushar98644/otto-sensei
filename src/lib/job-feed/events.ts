import type { z } from "zod";
import type { Db } from "@/db/client";
import { matchEvents } from "@/db/schema";
import type { MatchedJob, MatchLabel } from "./types";
import type { MatchActionSchema } from "./validation";

export type ImpressionContext = {
  userId: string;
  requestId: string;
  variant: string;
  resumeHash: string;
  now: number;
};

export type ShownJob = {
  jobId: string;
  position: number;
  label: MatchLabel | null;
  features: number[] | null;
};

export function shownJobs(jobs: readonly MatchedJob[]): ShownJob[] {
  return jobs.map((job) => ({
    jobId: job.id,
    position: job.position,
    label: job.match.label,
    features: job.features ?? null,
  }));
}

// Each part 0 to 1 kept as one byte, so an impression's features cost five bytes.
export function featureBytes(features: readonly number[] | null): Buffer | null {
  if (!features || features.length === 0) return null;
  return Buffer.from(features.map((part) => Math.round(Math.max(0, Math.min(1, part)) * 255)));
}

export async function logImpressions(
  db: Db,
  context: ImpressionContext,
  jobs: readonly ShownJob[],
): Promise<void> {
  if (jobs.length === 0) return;
  await db.insert(matchEvents).values(
    jobs.map((job) => ({
      id: crypto.randomUUID(),
      userId: context.userId,
      requestId: context.requestId,
      kind: "impression" as const,
      jobId: job.jobId,
      position: job.position,
      label: job.label,
      features: featureBytes(job.features),
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
