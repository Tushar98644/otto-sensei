import { prepHref } from "@/components/dashboard/applications/view";
import { ROUTES } from "@/components/site/routes";
import type { ApplicationStatus, StatusEvent } from "@/lib/applications/status";
import { applicationHref } from "@/lib/applications/thread";
import {
  findingOf,
  notEnoughLine,
  waitingLine,
  whatsWorking,
  type ResumeKind,
  type WorkingApplication,
} from "@/lib/applications/working";
import type { ResumeSource } from "@/lib/resume/schema";
import { DAY_MS } from "@/lib/time";
import type { WritingKind } from "@/lib/writings/schema";
import {
  RECAP_MOVES,
  RECAP_STEPS,
  RECAP_VERSION,
  type Recap,
  type RecapAttention,
  type RecapCounts,
  type RecapJobs,
  type RecapMomentum,
  type RecapMove,
  type RecapStep,
  type RecapTotals,
  type RecapViews,
  type RecapWeekId,
  type RecapWorking,
} from "./types";
import { addDays, dayIn, startOfDay, weekRange, type WeekRange } from "./week";

// Pure: turns what the person did in Otto into one week's recap.

export type RecapApplication = WorkingApplication & {
  company: string;
  role: string;
  jobUrl: string;
  jobId: string | null;
  statusHistory: StatusEvent[];
  interviewAt: number | null;
  followUpAt: number | null;
  prepAt: number | null;
};

export type RecapWriting = { kind: WritingKind; createdAt: number; applicationId: string | null };
export type RecapResume = {
  id: string;
  source: ResumeSource;
  tailored: boolean;
  createdAt: number;
};
export type RecapSaved = {
  savedAt: number;
  company: string;
  title: string;
  url: string;
  jobId: string | null;
  open: boolean;
};
export type RankedWeek = {
  matches: number;
  best: { title: string; company: string; url: string } | null;
};

export type RecapFacts = {
  now: number;
  timeZone: string;
  pro: boolean;
  createdAt: number;
  applications: readonly RecapApplication[];
  writings: readonly RecapWriting[];
  resumes: readonly RecapResume[];
  saved: readonly RecapSaved[];
  activeDays: readonly RecapWeekId[];
  totals: RecapTotals;
  // Any share link opened during the week.
  shareOpened: boolean;
  portfolioLive: boolean;
};

// Only for the newest week: what can't be counted again for a week long past.
export type LatestExtras = {
  previous: { totals: RecapTotals; builtAt: number } | null;
  ranked: RankedWeek | null;
};

const within = (at: number | null, range: WeekRange) =>
  at !== null && at >= range.start && at < range.end;

export function usedOtto(facts: RecapFacts): boolean {
  return (
    facts.resumes.some((resume) => resume.source !== "sample") ||
    facts.applications.length > 0 ||
    facts.writings.length > 0 ||
    facts.saved.length > 0 ||
    facts.activeDays.length > 0
  );
}

function counts(facts: RecapFacts, range: WeekRange): RecapCounts {
  return {
    applications: facts.applications.filter((item) => within(item.appliedAt, range)).length,
    tailored: facts.resumes.filter((item) => item.tailored && within(item.createdAt, range)).length,
    letters: facts.writings.filter(
      (item) => item.kind === "letter" && within(item.createdAt, range),
    ).length,
  };
}

const FORWARD = new Set<ApplicationStatus>(["interview", "offer"]);
const REPLIED = new Set<ApplicationStatus>(["interview", "offer", "rejected"]);

function standingBefore(application: RecapApplication, range: WeekRange): ApplicationStatus {
  const before = application.statusHistory.filter((event) => event.at < range.start).at(-1);
  return before?.status ?? "applied";
}

function momentum(facts: RecapFacts, range: WeekRange): RecapMomentum {
  const result: RecapMomentum = { replies: 0, interviews: 0, offers: 0, moves: [] };
  const moves: (RecapMove & { at: number; rank: number })[] = [];
  for (const application of facts.applications) {
    const events = application.statusHistory.filter((event) => within(event.at, range));
    if (events.length === 0) continue;
    if (events.some((event) => REPLIED.has(event.status))) result.replies += 1;
    if (events.some((event) => event.status === "interview")) result.interviews += 1;
    if (events.some((event) => event.status === "offer")) result.offers += 1;
    const path: ApplicationStatus[] = [standingBefore(application, range)];
    for (const event of events) {
      if (FORWARD.has(event.status) && path.at(-1) !== event.status) path.push(event.status);
    }
    if (path.length < 2) continue;
    const last = path.at(-1);
    moves.push({
      company: application.company,
      role: application.role,
      path,
      at: events.at(-1)?.at ?? 0,
      rank: last === "offer" ? 2 : 1,
    });
  }
  result.moves = moves
    .sort((a, b) => b.rank - a.rank || b.at - a.at)
    .slice(0, RECAP_MOVES)
    .map(({ company, role, path }) => ({ company, role, path }));
  return result;
}

function activeDaysIn(facts: RecapFacts, week: RecapWeekId, range: WeekRange): RecapWeekId[] {
  const last = addDays(week, 6);
  const days = new Set(facts.activeDays.filter((day) => day >= week && day <= last));
  const mark = (at: number | null) => {
    if (within(at, range)) days.add(dayIn(at as number, facts.timeZone));
  };
  for (const item of facts.applications) {
    mark(item.appliedAt);
    mark(item.prepAt);
    for (const event of item.statusHistory) mark(event.at);
  }
  for (const item of facts.writings) mark(item.createdAt);
  for (const item of facts.resumes) if (item.source !== "sample") mark(item.createdAt);
  for (const item of facts.saved) mark(item.savedAt);
  return [...days].sort();
}

function resumeKinds(resumes: readonly RecapResume[]): Map<string, ResumeKind> {
  const kinds = new Map<string, ResumeKind>();
  for (const resume of resumes) {
    if (resume.source === "sample") continue;
    kinds.set(resume.id, resume.tailored ? "tailored" : "general");
  }
  return kinds;
}

function working(facts: RecapFacts, end: number): RecapWorking | null {
  const applications = facts.applications.filter((item) => item.appliedAt < end);
  if (applications.length === 0) return null;
  const lettered = facts.pro
    ? new Set(
        facts.writings.flatMap((item) =>
          item.kind === "letter" && item.applicationId ? [item.applicationId] : [],
        ),
      )
    : null;
  const result = whatsWorking({
    applications,
    kinds: resumeKinds(facts.resumes),
    lettered,
    now: Math.min(end, facts.now),
  });
  const ready = result.resume.ready ? result.resume : result.letter?.ready ? result.letter : null;
  if (ready) return { kind: "finding", ...findingOf(ready) };
  if (result.counted === 0) {
    const waiting = waitingLine(result.waiting);
    return waiting ? { kind: "line", text: waiting } : null;
  }
  // A count of nothing on both sides says nothing worth a page.
  const { with: tailored, without: general } = result.resume;
  if (tailored.counted + general.counted === 0) return null;
  return { kind: "line", text: notEnoughLine(result.resume) };
}

function viewsSince(total: number, before: number | null, since: number | null): RecapViews | null {
  if (before === null) return total > 0 ? { views: total, since: null } : null;
  const gained = Math.max(0, total - before);
  return gained > 0 ? { views: gained, since } : null;
}

function attention(facts: RecapFacts, extras: LatestExtras): RecapAttention {
  const previous = extras.previous;
  const share = previous
    ? viewsSince(facts.totals.shareViews, previous.totals.shareViews, previous.builtAt)
    : facts.shareOpened
      ? viewsSince(facts.totals.shareViews, null, null)
      : null;
  const portfolio = previous
    ? viewsSince(facts.totals.portfolioViews, previous.totals.portfolioViews, previous.builtAt)
    : facts.portfolioLive
      ? viewsSince(facts.totals.portfolioViews, null, null)
      : null;
  return { share, portfolio };
}

function sameJob(application: RecapApplication, saved: RecapSaved): boolean {
  return (
    (saved.jobId !== null && application.jobId === saved.jobId) ||
    (saved.url !== "" && application.jobUrl === saved.url)
  );
}

// Dated things first: an interview, then a follow-up, then a job worth tailoring for.
function nextSteps(facts: RecapFacts, ranked: RankedWeek | null): RecapStep[] {
  const steps: RecapStep[] = [];
  const today = startOfDay(dayIn(facts.now, facts.timeZone), facts.timeZone);
  const interview = facts.applications
    .filter(
      (item) =>
        item.status === "interview" &&
        item.interviewAt !== null &&
        item.interviewAt >= today &&
        item.interviewAt < today + 8 * DAY_MS,
    )
    .sort((a, b) => (a.interviewAt ?? 0) - (b.interviewAt ?? 0))[0];
  if (interview) {
    steps.push({
      kind: "prep",
      company: interview.company,
      at: interview.interviewAt ?? 0,
      href:
        interview.prepAt === null ? `${prepHref(interview.id)}?start=1` : prepHref(interview.id),
    });
  }
  const followUp = facts.applications
    .filter(
      (item) =>
        item.status === "applied" &&
        item.followUpAt !== null &&
        item.followUpAt < facts.now + 7 * DAY_MS,
    )
    .sort((a, b) => (a.followUpAt ?? 0) - (b.followUpAt ?? 0))[0];
  if (followUp) {
    steps.push({
      kind: "follow_up",
      company: followUp.company,
      href: applicationHref(followUp.id),
    });
  }
  const waiting = [...facts.saved]
    .filter(
      (saved) => saved.open && saved.url && !facts.applications.some((a) => sameJob(a, saved)),
    )
    .sort((a, b) => b.savedAt - a.savedAt)[0];
  const target = waiting ?? (facts.pro ? ranked?.best : null) ?? null;
  if (target && target.company) {
    steps.push({
      kind: "tailor",
      company: target.company,
      title: target.title,
      href: `${ROUTES.studio}?job=${encodeURIComponent(target.url)}`,
    });
  }
  if (steps.length === 0) {
    const own = facts.resumes.some((resume) => resume.source !== "sample");
    if (!own) steps.push({ kind: "upload", href: ROUTES.studio });
    else if (facts.pro) steps.push({ kind: "jobs", href: ROUTES.dashboardJobs });
    else steps.push({ kind: "log", href: ROUTES.dashboardResumes });
  }
  return steps.slice(0, RECAP_STEPS);
}

function jobsOf(facts: RecapFacts, range: WeekRange, ranked: RankedWeek | null): RecapJobs | null {
  const saved = facts.saved.filter((item) => within(item.savedAt, range)).length;
  const matches = ranked?.matches ?? null;
  const best =
    facts.pro && ranked?.best ? { title: ranked.best.title, company: ranked.best.company } : null;
  if (!matches && !saved && !best) return null;
  return { matches, best, saved };
}

export function buildRecap(
  facts: RecapFacts,
  week: RecapWeekId,
  extras: LatestExtras | null,
): Recap {
  const range = weekRange(week, facts.timeZone);
  const lastRange = weekRange(addDays(week, -7), facts.timeZone);
  const mine = counts(facts, range);
  const effort = {
    ...mine,
    messages: facts.writings.filter(
      (item) => item.kind !== "letter" && within(item.createdAt, range),
    ).length,
    preps: facts.applications.filter((item) => within(item.prepAt, range)).length,
    last: facts.createdAt < lastRange.end ? counts(facts, lastRange) : null,
  };
  const moved = momentum(facts, range);
  const activeDays = activeDaysIn(facts, week, range);
  const jobs = jobsOf(facts, range, extras?.ranked ?? null);
  const quiet =
    mine.applications + mine.tailored + mine.letters + effort.messages + effort.preps === 0 &&
    moved.replies + moved.moves.length === 0 &&
    (jobs?.saved ?? 0) === 0 &&
    activeDays.length === 0;
  return {
    version: RECAP_VERSION,
    week,
    pro: facts.pro,
    quiet,
    effort,
    momentum: moved,
    attention: extras ? attention(facts, extras) : { share: null, portfolio: null },
    working: extras ? working(facts, range.end) : null,
    jobs,
    activeDays,
    next: extras ? nextSteps(facts, extras.ranked) : [],
    totals: facts.totals,
    builtAt: facts.now,
  };
}
