import type { ReadJob } from "@/components/studio/tailor/session";
import { api, isApiError } from "@/lib/api/client";
import { hiringSystemOf } from "@/lib/ats/detect";
import { HIRING_SYSTEMS } from "@/lib/ats/systems";
import { atsPath } from "@/lib/seo-pages/paths";

export type HiringSystemLink = { name: string; href: string };

export type LinkRead =
  | { ok: true; link: string; posting: ReadJob; text: string; system: HiringSystemLink | null }
  | { ok: false; link: string; message: string; system: HiringSystemLink | null };

const MAX_LINK_CHARS = 2048;
const OFFLINE = "You seem to be offline. Check your connection, or paste the job text instead.";
const GENERIC = "Otto couldn't read that link just now. Paste the job text instead.";

export function linkProblem(link: string): string | null {
  if (!link) return "Paste the link to the job post first.";
  if (/\s/.test(link))
    return "That doesn't look like a link. Copy it from your browser's address bar.";
  if (link.length > MAX_LINK_CHARS) {
    return "That link is too long. Copy the address of the job post itself.";
  }
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
export async function readJobLink(link: string): Promise<LinkRead> {
  try {
    const { text, ...posting } = (await api.readJob({ url: link })).posting;
    return { ok: true, link, posting, text, system: hiringSystemLink(posting, link) };
  } catch (error) {
    let message = GENERIC;
    if (isApiError(error, "network_error")) message = OFFLINE;
    else if (isApiError(error) && OWN_MESSAGES.has(error.code)) message = error.message;
    return { ok: false, link, message, system: hiringSystemLink(null, link) };
  }
}
