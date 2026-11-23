import { z } from "zod";
import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { readJson } from "@/lib/http";
import { rebuildMatchIndex } from "@/lib/job-feed/match-index";
import {
  saveTitleVectors,
  TITLE_KEY_CHARS,
  TITLE_VECTOR_LIMITS,
  waitingTitles,
} from "@/lib/job-feed/title-vectors";
import { OCCUPATION_CODE } from "@/lib/job-feed/types";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// The daily jobs workflow embeds titles on its own runner (scripts/title-vectors.py): it asks here
// for the titles waiting, sends their vectors back, and the last call rebuilds the match index.
const MAX_ASKED = 5_000;
const BASE64_VECTOR = /^[A-Za-z0-9+/]{342}==$/;

const VectorsSchema = z.object({
  vectors: z
    .array(
      z.tuple([
        z.string().min(1).max(TITLE_KEY_CHARS),
        z.string().regex(BASE64_VECTOR),
        z.array(z.string().regex(OCCUPATION_CODE)).max(TITLE_VECTOR_LIMITS.occupations),
        z.array(z.number().min(-1).max(1)).max(TITLE_VECTOR_LIMITS.occupations),
      ]),
    )
    .max(1_000),
  rebuild: z.boolean().default(false),
});

function refused(job: string): Response {
  log.warn("cron.unauthorized", { job });
  return fail("unauthorized", "Not allowed.", 401, NO_STORE);
}

export async function GET(req: Request): Promise<Response> {
  if (!isAuthorizedCron(req)) return refused("title-vectors");
  const asked = Number(new URL(req.url).searchParams.get("limit") ?? MAX_ASKED);
  const limit = Number.isInteger(asked) && asked > 0 ? Math.min(asked, MAX_ASKED) : MAX_ASKED;
  try {
    const keys = await waitingTitles(await getDb(), limit);
    return ok({ keys }, { headers: NO_STORE });
  } catch (error) {
    log.error("cron.title_vectors.list_failed", error);
    return fail("server_error", "The job failed.", 500, NO_STORE);
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!isAuthorizedCron(req)) return refused("title-vectors");
  const body = await readJson(req, VectorsSchema);
  if (!body.ok) return fail("bad_request", body.message, 400, NO_STORE);
  try {
    const db = await getDb();
    const now = Date.now();
    const saved = await saveTitleVectors(db, body.data.vectors, now);
    const indexed = body.data.rebuild ? await rebuildMatchIndex(db, now) : null;
    log.info("cron.title_vectors.done", { saved, indexed: indexed ?? -1 });
    return ok({ saved, indexed }, { headers: NO_STORE });
  } catch (error) {
    log.error("cron.title_vectors.save_failed", error);
    return fail("server_error", "The job failed.", 500, NO_STORE);
  }
}
