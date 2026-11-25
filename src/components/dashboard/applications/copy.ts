import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { NO_REPLY_AFTER_DAYS } from "@/lib/applications/nudge";
import type { Application } from "@/lib/applications/schema";
import {
  interviewRate,
  MIN_FOR_RATE,
  type Tally,
  type VersionComparison,
  type VersionStats,
} from "@/lib/applications/stats";
import type { ApplicationsMessages } from "../i18n";

// The dashboard's words for what lib/applications/{view,nudge,stats} say in English for the recap and studio.

export function sentLine(
  application: Pick<Application, "resumeId" | "resumeTitle">,
  titles: ReadonlyMap<string, { title: string }>,
  { row }: ApplicationsMessages,
): string {
  if (!application.resumeId) return row.notInOtto;
  const live = titles.get(application.resumeId);
  if (live) return fmt(row.quoted, { title: live.title });
  return application.resumeTitle
    ? fmt(row.quotedDeleted, { title: application.resumeTitle })
    : row.deletedResume;
}

export function nudgeLine(
  stale: readonly Pick<Application, "company">[],
  { nudge }: ApplicationsMessages,
  format: Format,
): string {
  const names = [
    ...new Set(stale.map((application) => application.company.trim()).filter(Boolean)),
  ];
  const weeks = format.number(NO_REPLY_AFTER_DAYS / 7);
  if (stale.length === 1) return fmt(nudge.one, { name: names[0] ?? nudge.oneCompany, weeks });
  const [first = "", second = ""] = names;
  const rest = stale.length - Math.min(names.length, 2);
  const who =
    names.length === 0
      ? fmt(nudge.companies, { count: format.number(stale.length) })
      : rest > 0
        ? fmt(nudge.moreNames, {
            names: names.slice(0, 2).join(", "),
            count: format.number(rest),
          })
        : names.length === 1
          ? first
          : fmt(nudge.twoNames, { first, second });
  return fmt(nudge.many, { who, weeks });
}

export function countsLine(counts: Tally, t: ApplicationsMessages, format: Format): string {
  if (counts.applications === 0) return t.winRate.noneYet;
  return fmt(t.winRate.countsLine, {
    interviews: format.plural(t.count.interviews, counts.interviews),
    applications: format.plural(t.count.applications, counts.applications),
  });
}

export function rateHeadline(counts: Tally, t: ApplicationsMessages, format: Format): string {
  const line = countsLine(counts, t, format);
  if (counts.applications === 0) return `${line}.`;
  const rate = interviewRate(counts);
  if (rate.shown) return fmt(t.winRate.headlineRate, { line, percent: rate.percent });
  return fmt(t.winRate.headlineWait, {
    line,
    min: format.number(MIN_FOR_RATE),
    left: format.number(rate.needed),
  });
}

export function swingNote(counts: Tally, t: ApplicationsMessages, format: Format): string {
  const { winRate } = t;
  const total = counts.applications;
  if (total === 0) return winRate.ownOnly;
  if (total < MIN_FOR_RATE) return fmt(winRate.swingSmall, { min: format.number(MIN_FOR_RATE) });
  const points = 100 / total;
  const moves = points < 1 ? winRate.underPoint : format.plural(winRate.points, Math.round(points));
  const applications = format.plural(t.count.applications, total);
  return fmt(total < 100 ? winRate.swingSome : winRate.swingMany, { applications, moves });
}

export function versionTitle(version: VersionStats, { winRate }: ApplicationsMessages): string {
  return version.state === "none" ? winRate.notInOtto : version.title;
}

export function comparisonLine(
  { first, second, points }: VersionComparison,
  t: ApplicationsMessages,
  format: Format,
): string {
  const rateOf = (version: VersionStats) =>
    fmt(t.winRate.rateOf, {
      percent: version.rate.shown ? version.rate.percent : 0,
      applications: format.plural(t.count.applications, version.tally.applications),
    });
  const values = {
    first: versionTitle(first, t),
    second: versionTitle(second, t),
    firstRate: rateOf(first),
    secondRate: rateOf(second),
  };
  return fmt(points === 0 ? t.winRate.same : t.winRate.led, values);
}
