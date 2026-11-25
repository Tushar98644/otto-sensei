import type { ReadJob } from "@/components/studio/tailor/session";
import matchCheckEn from "@/i18n/messages/en/match-check";
import { api, isApiError } from "@/lib/api/client";
import { hiringSystemOf } from "@/lib/ats/detect";
import { HIRING_SYSTEMS } from "@/lib/ats/systems";
import type { MatchCheckMessages } from "@/lib/match-check/copy";
import { atsPath } from "@/lib/seo-pages/paths";

export type HiringSystemLink = { name: string; href: string };

export type LinkRead =
  | { ok: true; link: string; posting: ReadJob; text: string; system: HiringSystemLink | null }
  | { ok: false; link: string; message: string; system: HiringSystemLink | null };

const MAX_LINK_CHARS = 2048;

export function linkProblem(link: string, t: MatchCheckMessages = matchCheckEn): string | null {
  const problems = t.link.problems;
  if (!link) return problems.empty;
  if (/\s/.test(link)) return problems.notLink;
  if (link.length > MAX_LINK_CHARS) return problems.tooLong;
  return null;
}

export function hiringSystemLink(
  posting: Pick<ReadJob, "source" | "url"> | null,
  link: string,
): HiringSystemLink | null {
  const id = hiringSystemOf(posting, link);
  return id ? { name: HIRING_SYSTEMS[id].name, href: atsPath(id) } : null;
}

// These come from the reader itself and already say what to do next.
const OWN_MESSAGES = new Set(["bad_request", "parse_failed", "rate_limited"]);

// The reader works signed out and is rate-limited per device.
export async function readJobLink(
  link: string,
  t: MatchCheckMessages = matchCheckEn,
): Promise<LinkRead> {
  try {
    const { text, ...posting } = (await api.readJob({ url: link })).posting;
    return { ok: true, link, posting, text, system: hiringSystemLink(posting, link) };
  } catch (error) {
    let message: string = t.link.problems.failed;
    if (isApiError(error, "network_error")) message = t.link.problems.offline;
    else if (isApiError(error) && OWN_MESSAGES.has(error.code)) message = error.message;
    return { ok: false, link, message, system: hiringSystemLink(null, link) };
  }
}
