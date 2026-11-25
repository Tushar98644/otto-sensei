import type { Format } from "@/i18n/intl";
import type { PortfolioMessages } from "./i18n";

export function liveLine(words: PortfolioMessages, format: Format, views: number): string {
  return views > 0 ? format.plural(words.otto.live, views) : words.otto.liveNoViews;
}

export function resumeLinkLine(
  words: PortfolioMessages,
  link: { href: string | null; shared: boolean },
): string {
  if (link.href) return words.resumeLink.linked;
  if (link.shared) return words.resumeLink.hidden;
  return words.resumeLink.share;
}

export function viewsLabel(words: PortfolioMessages, format: Format, views: number): string {
  if (views <= 0) return words.views.none;
  return format.plural(words.views.count, views);
}

export function saveLabel(words: PortfolioMessages, saving: boolean, live: boolean): string {
  if (saving) return words.saving;
  return live ? words.savedLive : words.saved;
}

export function portfolioFacts(
  words: PortfolioMessages,
  format: Format,
  counts: { projects: number; jobs: number; skills: number },
): string {
  return [
    counts.projects > 0 ? format.plural(words.facts.projects, counts.projects) : "",
    counts.jobs > 0 ? format.plural(words.facts.jobs, counts.jobs) : "",
    counts.skills > 0 ? format.plural(words.facts.skills, counts.skills) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
