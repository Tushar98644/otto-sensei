import { fail, ok } from "@/lib/api/respond";
import { withApiLocale } from "@/lib/api/localize";
import { searchCities } from "@/lib/geo/cities";
import type { CitySearchResponse } from "@/lib/job-feed/types";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const MAX_QUERY_CHARS = 60;
const RESULTS = 8;
// Same answer for everyone from fixed data, like the occupation search.
const CACHE = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

export const GET = withApiLocale(async function GET(req: Request): Promise<Response> {
  const query = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (query.length > MAX_QUERY_CHARS)
    return fail("bad_request", `Type at most ${MAX_QUERY_CHARS} characters.`, 400);
  try {
    const response: Omit<CitySearchResponse, "ok"> = {
      cities: searchCities(query, RESULTS).map((city) => ({
        id: city.id,
        name: city.name,
        country: city.country,
        admin: city.admin,
      })),
    };
    return ok(response, { headers: { "Cache-Control": CACHE } });
  } catch (error) {
    log.error("jobs.city_search_failed", error);
    return fail("server_error", "Search didn't work. Please try again.", 500);
  }
});
