import { fail, ok } from "@/lib/api/respond";
import { searchOccupations } from "@/lib/job-feed/occupations";
import type { OccupationSearchResponse } from "@/lib/job-feed/types";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const MAX_QUERY_CHARS = 60;
const RESULTS = 8;

// GET /api/jobs/occupations?q=nurse: occupations whose names start with the words typed, for the
// "Looking for" card's search ("RN", "HGV driver" and "solicitor" all find theirs). The lookup
// lives on the server; the answer depends on the words alone, so browsers and the CDN keep it.
export async function GET(req: Request): Promise<Response> {
  const query = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (query.length > MAX_QUERY_CHARS)
    return fail("bad_request", `Type at most ${MAX_QUERY_CHARS} characters.`, 400);
  try {
    const response: Omit<OccupationSearchResponse, "ok"> = {
      occupations: query ? searchOccupations(query, RESULTS) : [],
    };
    return ok(response, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch (error) {
    log.error("jobs.occupation_search_failed", error);
    return fail("server_error", "Search didn't work. Please try again.", 500);
  }
}
