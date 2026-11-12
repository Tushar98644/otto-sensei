import { fail } from "@/lib/api/respond";

export const PAGE_BLOCKED =
  "This page has content we can't publish. Remove sexual or explicit content and try again.";

export function pageBlocked(): Response {
  return fail("content_blocked", PAGE_BLOCKED, 422);
}

export function pageChanged(): Response {
  return fail("bad_request", "Your page changed while it was saving. Try again.", 409);
}
