import { createHash } from "node:crypto";
import { and, eq, gt, isNull, lt, lte, or } from "drizzle-orm";
import type { Feature } from "@/config/plans";
import { getDb } from "@/db/client";
import { meteredCalls } from "@/db/schema";
import { REQUEST_ID_HEADER, RESULT_TTL_MS, RESUME_HEADER } from "@/lib/api/request-id";

// Longer than a metered route's maxDuration, so a run this old with no result has died.
export const RUN_MS = 90_000;
const POLL_MS = 1_500;
// About 48 s of waiting, inside the 60 s a metered route may run.
const POLLS = 32;

const REQUEST_ID = /^[A-Za-z0-9_-]{16,100}$/;

export type RunClaim<R> =
  | { kind: "run"; key: string }
  | { kind: "done"; result: R; demo: boolean }
  | { kind: "busy" }
  | { kind: "missing" };

export type ClaimOptions = { resume?: boolean; pollMs?: number; polls?: number };

export function readRequestId(req: Request): string | null {
  const id = req.headers.get(REQUEST_ID_HEADER);
  return id && REQUEST_ID.test(id) ? id : null;
}

export function isResume(req: Request): boolean {
  return req.headers.get(RESUME_HEADER) === "1";
}

// The input is part of the key, so reusing an id for another request runs that request instead.
export function requestKey(feature: Feature, requestId: string, input: unknown): string {
  return createHash("sha256")
    .update(`${feature}\u0000${requestId}\u0000${JSON.stringify(input)}`)
    .digest("base64url");
}

// A result shares metered_calls with line-fix passes, under kind "result".
function ofRun(userId: string, key: string) {
  return and(
    eq(meteredCalls.userId, userId),
    eq(meteredCalls.kind, "result"),
    eq(meteredCalls.key, key),
  );
}

// Waits for a run already in progress under the same key, so a retry never pays twice; a resume never takes the slot.
export async function claimRun<R>(
  userId: string,
  key: string,
  now: number,
  { resume = false, pollMs = POLL_MS, polls = POLLS }: ClaimOptions = {},
): Promise<RunClaim<R>> {
  for (let attempt = 0; attempt <= polls; attempt++) {
    const at = now + attempt * pollMs;
    if (!resume && (await take(userId, key, at))) return { kind: "run", key };
    const row = await read(userId, key, at);
    if (row?.result != null) return { kind: "done", result: row.result as R, demo: row.demo };
    if (resume && (!row || (row.startedAt ?? 0) <= at - RUN_MS)) return { kind: "missing" };
    if (row && attempt < polls) await sleep(pollMs);
  }
  return { kind: "busy" };
}

export async function saveResult(
  userId: string,
  key: string,
  result: unknown,
  demo: boolean,
  now: number,
): Promise<void> {
  const db = await getDb();
  await db
    .update(meteredCalls)
    .set({ result, demo, expiresAt: now + RESULT_TTL_MS })
    .where(ofRun(userId, key));
  await db
    .delete(meteredCalls)
    .where(
      and(
        eq(meteredCalls.userId, userId),
        eq(meteredCalls.kind, "result"),
        lt(meteredCalls.expiresAt, now),
      ),
    );
}

export async function dropRun(userId: string, key: string): Promise<void> {
  const db = await getDb();
  await db.delete(meteredCalls).where(and(ofRun(userId, key), isNull(meteredCalls.result)));
}

async function take(userId: string, key: string, now: number): Promise<boolean> {
  const db = await getDb();
  const run = { result: null, demo: false, startedAt: now, expiresAt: now + RESULT_TTL_MS };
  const taken = await db
    .insert(meteredCalls)
    .values({ userId, kind: "result", key, ...run })
    .onConflictDoUpdate({
      target: [meteredCalls.userId, meteredCalls.kind, meteredCalls.key],
      set: run,
      setWhere: or(
        lte(meteredCalls.expiresAt, now),
        and(isNull(meteredCalls.result), lte(meteredCalls.startedAt, now - RUN_MS)),
      ),
    })
    .returning({ key: meteredCalls.key });
  return taken.length > 0;
}

async function read(userId: string, key: string, now: number) {
  const db = await getDb();
  const [row] = await db
    .select({
      result: meteredCalls.result,
      demo: meteredCalls.demo,
      startedAt: meteredCalls.startedAt,
    })
    .from(meteredCalls)
    .where(and(ofRun(userId, key), gt(meteredCalls.expiresAt, now)))
    .limit(1);
  return row ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
