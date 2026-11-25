import { workdayBoard } from "./parsers/workday";
import type { JobSourceId } from "./types";

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

// A board's own careers page, where its hiring software lists every opening; none for a feed.
export function careersUrl(source: JobSourceId, token: string): string | null {
  if (source === "workday") {
    try {
      const board = workdayBoard(token);
      return `https://${board.host}/${board.site}`;
    } catch {
      return null;
    }
  }
  if (!SLUG.test(token)) return null;
  const slug = encodeURIComponent(token);
  switch (source) {
    case "greenhouse":
      return `https://job-boards.greenhouse.io/${slug}`;
    case "lever":
      return `https://jobs.lever.co/${slug}`;
    case "ashby":
      return `https://jobs.ashbyhq.com/${slug}`;
    case "workable":
      return `https://apply.workable.com/${slug}/`;
    case "recruitee":
      return `https://${slug}.recruitee.com/`;
    case "personio":
      return `https://${slug}.jobs.personio.de/`;
    case "gem":
      return `https://jobs.gem.com/${slug}`;
    case "pinpoint":
      return `https://${slug}.pinpointhq.com/`;
    default:
      return null;
  }
}
