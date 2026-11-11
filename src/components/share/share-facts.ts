import { formatRelativeTime } from "@/components/studio/relative-time";
import type { SharedLink } from "@/lib/share/types";

const COUNT = new Intl.NumberFormat("en-US");

export function viewFacts(
  link: Pick<SharedLink, "views" | "lastViewedAt" | "createdAt">,
  now: number,
): string {
  const parts = [
    link.views === 0
      ? "No views yet"
      : `${COUNT.format(link.views)} ${link.views === 1 ? "view" : "views"}`,
  ];
  if (link.lastViewedAt !== null && link.views > 0) {
    parts.push(`Last opened ${formatRelativeTime(link.lastViewedAt, now)}`);
  }
  parts.push(`Shared ${formatRelativeTime(link.createdAt, now)}`);
  return parts.join(" · ");
}

export function isBehind(
  link: Pick<SharedLink, "versionAt">,
  resume: { updatedAt: number },
): boolean {
  return link.versionAt !== resume.updatedAt;
}
