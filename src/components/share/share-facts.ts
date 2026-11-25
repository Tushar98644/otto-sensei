import { relativeTime } from "@/components/dashboard/i18n";
import { fmt } from "@/i18n/format";
import { formatFor, type Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import type { SharedLink } from "@/lib/share/types";

export type ShareFactsCopy = Messages["share"]["facts"];

// The share dialog and link list (studio, dashboard) have no share messages yet, so they read these.
const englishCopy: ShareFactsCopy = {
  none: "No views yet",
  views: { one: "{count} view", other: "{count} views" },
  lastOpened: "Last opened {when}",
  shared: "Shared {when}",
  justNow: "just now",
};

export function viewFacts(
  link: Pick<SharedLink, "views" | "lastViewedAt" | "createdAt">,
  now: number,
  copy: ShareFactsCopy = englishCopy,
  format: Format = formatFor("en"),
): string {
  const ago = (at: number) => relativeTime(format, copy.justNow, at, now);
  const parts = [link.views === 0 ? copy.none : format.plural(copy.views, link.views)];
  if (link.lastViewedAt !== null && link.views > 0) {
    parts.push(fmt(copy.lastOpened, { when: ago(link.lastViewedAt) }));
  }
  parts.push(fmt(copy.shared, { when: ago(link.createdAt) }));
  return parts.join(" · ");
}

export function isBehind(
  link: Pick<SharedLink, "versionAt">,
  resume: { updatedAt: number },
): boolean {
  return link.versionAt !== resume.updatedAt;
}
