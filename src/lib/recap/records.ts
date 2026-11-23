import { and, desc, eq, max, sql, sum } from "drizzle-orm";
import { hasProTools } from "@/config/plans";
import { getDb, type Db, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import {
  applications,
  jobs,
  portfolios,
  resumes,
  savedJobs,
  savedPosts,
  shares,
  users,
  userSettings,
  writings,
  type StoredRecap,
} from "@/db/schema";
import { readHistory, readStage, readStatus } from "@/lib/applications/status";
import type { SessionUser } from "@/lib/auth/types";
import { readWorkProfile } from "@/lib/eligibility/records";
import { lookingForOf } from "@/lib/job-feed/looking-for";
import { readStoredCounts } from "@/lib/job-feed/match-index";
import { matchProfileOf } from "@/lib/job-feed/profile";
import { rankJobs } from "@/lib/job-feed/rank";
import { DEFAULT_FILTERS } from "@/lib/job-feed/types";
import { log } from "@/lib/log";
import { insertNotification } from "@/lib/notifications/records";
import { defaultResume } from "@/lib/notifications/weekly-jobs";
import { DAY_MS } from "@/lib/time";
import { buildRecap, usedOtto, type RankedWeek, type RecapFacts } from "./build";
import { readyBody, recapHighlights } from "./summary";
import {
  RECAP_EARLIER_WEEKS,
  recapCutoffDay,
  type Recap,
  type RecapIndex,
  type RecapListing,
  type RecapWeekId,
} from "./types";
import { addDays, knownTimeZone, lastFullWeek, weekRange } from "./week";

// Every query is filtered by user_id, so a guessed week never reads another account's recap.

const LIST_LIMIT = 500;

function recapHref(week: RecapWeekId): string {
  return `/dashboard?recap=${week}`;
}

async function loadFacts(
  db: Db,
  user: SessionUser,
  createdAt: number,
  timeZone: string,
  from: number,
  latest: { start: number },
  now: number,
): Promise<RecapFacts> {
  const fromDay = new Date(from).toISOString().slice(0, 10);
  const prepAt = sql<
    number | null
  >`case when jsonb_typeof(${applications.prep} -> 'createdAt') = 'number' then (${applications.prep} ->> 'createdAt')::bigint end`;
  const [apps, written, kept, saved, posts, days, shared, portfolio] = await Promise.all([
    db
      .select({
        id: applications.id,
        company: applications.company,
        role: applications.role,
        jobUrl: applications.jobUrl,
        jobId: applications.jobId,
        appliedAt: applications.appliedAt,
        status: applications.status,
        stageReached: applications.stageReached,
        statusHistory: applications.statusHistory,
        interviewAt: applications.interviewAt,
        followUpAt: applications.followUpAt,
        resumeId: applications.resumeId,
        prepAt,
      })
      .from(applications)
      .where(eq(applications.userId, user.id))
      .orderBy(desc(applications.appliedAt))
      .limit(LIST_LIMIT),
    db
      .select({
        kind: writings.kind,
        createdAt: writings.createdAt,
        applicationId: writings.applicationId,
      })
      .from(writings)
      .where(eq(writings.userId, user.id))
      .orderBy(desc(writings.createdAt))
      .limit(LIST_LIMIT),
    db
      .select({
        id: resumes.id,
        source: sql<string>`${resumes.data} ->> 'source'`,
        tailored: sql<boolean>`coalesce(jsonb_typeof(${resumes.data} -> 'tailor') = 'object', false)`,
        createdAt: resumes.createdAt,
      })
      .from(resumes)
      .where(eq(resumes.userId, user.id))
      .limit(LIST_LIMIT),
    db
      .select({
        savedAt: savedJobs.savedAt,
        jobId: savedJobs.jobId,
        company: jobs.company,
        title: jobs.title,
        url: jobs.url,
        closedAt: jobs.closedAt,
      })
      .from(savedJobs)
      .leftJoin(jobs, eq(jobs.id, savedJobs.jobId))
      .where(eq(savedJobs.userId, user.id))
      .orderBy(desc(savedJobs.savedAt))
      .limit(LIST_LIMIT),
    db
      .select({
        savedAt: savedPosts.savedAt,
        company: savedPosts.company,
        title: savedPosts.title,
        url: savedPosts.url,
      })
      .from(savedPosts)
      .where(eq(savedPosts.userId, user.id))
      .orderBy(desc(savedPosts.savedAt))
      .limit(LIST_LIMIT),
    db
      .select({ days: userSettings.activeDays })
      .from(userSettings)
      .where(eq(userSettings.userId, user.id))
      .limit(1),
    db
      .select({ views: sum(shares.views).mapWith(Number), lastViewedAt: max(shares.lastViewedAt) })
      .from(shares)
      .where(eq(shares.userId, user.id)),
    db
      .select({ views: portfolios.views, published: portfolios.published })
      .from(portfolios)
      .where(eq(portfolios.userId, user.id))
      .limit(1),
  ]);
  const sharedRow = shared[0];
  return {
    now,
    timeZone,
    pro: hasProTools(user.plan),
    createdAt,
    applications: apps.map((row) => ({
      ...row,
      status: readStatus(row.status) ?? "applied",
      stageReached: readStage(row.stageReached),
      statusHistory: readHistory(row.statusHistory),
      prepAt: row.prepAt === null ? null : Number(row.prepAt),
    })),
    writings: written,
    resumes: kept.map((row) => ({
      id: row.id,
      source: row.source === "sample" || row.source === "tailored" ? row.source : "import",
      tailored: row.tailored,
      createdAt: row.createdAt,
    })),
    saved: [
      ...saved.map((row) => ({
        savedAt: row.savedAt,
        jobId: row.jobId,
        company: row.company ?? "",
        title: row.title ?? "",
        url: row.url ?? "",
        open: row.company !== null && row.closedAt === null,
      })),
      ...posts.map((row) => ({ ...row, jobId: null, open: true })),
    ],
    activeDays: (days[0]?.days ?? []).filter((day) => day >= fromDay),
    totals: {
      shareViews: sharedRow?.views ?? 0,
      portfolioViews: portfolio[0]?.views ?? 0,
    },
    shareOpened:
      sharedRow?.lastViewedAt !== null &&
      sharedRow?.lastViewedAt !== undefined &&
      Number(sharedRow.lastViewedAt) >= latest.start,
    portfolioLive: portfolio[0]?.published ?? false,
  };
}

// The Jobs tab's own ranking, limited to openings posted that week; a failure only drops the jobs slide.
async function rankWeek(
  db: Db,
  user: SessionUser,
  end: number,
  now: number,
): Promise<RankedWeek | null> {
  try {
    const resume = await defaultResume(db, user.id);
    if (!resume) return null;
    const profile = matchProfileOf(resume, Math.floor(now / DAY_MS) * DAY_MS);
    const work = await readWorkProfile(user.id);
    const free = !hasProTools(user.plan);
    const lookingFor = lookingForOf(profile, work.profile, work.lookingFor);
    const ranked = await rankJobs(db, {
      userId: user.id,
      view: "matches",
      profile,
      filters: { ...DEFAULT_FILTERS, remote: lookingFor.remote, postedWithin: 7 },
      page: 1,
      workProfile: free ? null : work.profile,
      lookingFor,
      deviceTimeZone: "",
      now: end,
      free,
      cache: false,
      counts: await readStoredCounts(db),
    });
    const best = ranked.jobs.find(
      (job) => !job.closed && !job.match.blocked && /^https?:\/\//.test(job.url),
    );
    return {
      matches: ranked.matching,
      best: best ? { title: best.title, company: best.company, url: best.url } : null,
    };
  } catch (error) {
    log.warn("recap.rank_failed", {}, error);
    return null;
  }
}

type RecapWeeks = Record<RecapWeekId, StoredRecap>;

async function weeksOf(db: Db | Tx, userId: string): Promise<RecapWeeks> {
  const [row] = await db
    .select({ recaps: userSettings.recaps })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row?.recaps ?? {};
}

async function readIndex(db: Db, userId: string, week: RecapWeekId): Promise<RecapIndex> {
  const oldest = addDays(week, -7 * RECAP_EARLIER_WEEKS);
  const weeks = await weeksOf(db, userId);
  const kept = Object.keys(weeks)
    .filter((key) => key >= oldest && key <= week)
    .sort()
    .reverse()
    .slice(0, RECAP_EARLIER_WEEKS + 1);
  const earlier: RecapListing[] = kept
    .filter((key) => key < week)
    .map((key) => {
      const data = weeks[key]!.data;
      return { week: key, headline: data.quiet ? null : (recapHighlights(data)[0] ?? null) };
    });
  const latest = weeks[week];
  return {
    current: latest ? { recap: latest.data, seen: latest.seenAt !== null } : null,
    earlier,
  };
}

export async function readRecap(userId: string, week: RecapWeekId): Promise<Recap | null> {
  const db = await getDb();
  const [row] = await db
    .select({ data: sql<Recap | null>`${userSettings.recaps} -> ${week} -> 'data'` })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row?.data ?? null;
}

// Builds the week that ended last, once, and the earlier weeks Otto can still count.
export async function ensureRecap(
  user: SessionUser,
  timeZoneAsked: string | undefined,
  now = Date.now(),
): Promise<RecapIndex> {
  const db = await getDb();
  const timeZone = knownTimeZone(timeZoneAsked);
  const week = lastFullWeek(now, timeZone);
  const stored = await weeksOf(db, user.id);
  if (stored[week]) return readIndex(db, user.id, week);

  const [account] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const range = weekRange(week, timeZone);
  if (!account || account.createdAt >= range.end) return readIndex(db, user.id, week);
  const oldestWeek = addDays(week, -7 * RECAP_EARLIER_WEEKS);
  const from = weekRange(addDays(oldestWeek, -7), timeZone).start;
  const facts = await loadFacts(db, user, account.createdAt, timeZone, from, range, now);
  if (!usedOtto(facts)) return readIndex(db, user.id, week);

  const before = stored[addDays(week, -7)];
  // A count taken after this week was over can't say what happened during it.
  const previous =
    before && before.builtAt < range.end && before.data.totals
      ? { totals: before.data.totals, builtAt: before.builtAt }
      : null;
  const ranked = await rankWeek(db, user, range.end, now);
  const recap = buildRecap(facts, week, { previous, ranked });
  const earlier: Recap[] = [];
  for (let back = 1; back <= RECAP_EARLIER_WEEKS; back += 1) {
    const day = addDays(week, -7 * back);
    if (account.createdAt >= weekRange(day, timeZone).end) break;
    const past = buildRecap(facts, day, null);
    if (!past.quiet) earlier.push(past);
  }

  await db.transaction(async (tx) => {
    if (!(await lockUser(tx, user.id))) return;
    // Read again under the lock: another tab may have built it meanwhile, and a week already there is kept as it is.
    const weeks = await weeksOf(tx, user.id);
    const made = !weeks[week];
    const next: RecapWeeks = { [week]: { data: recap, builtAt: now, seenAt: null } };
    for (const past of earlier) next[past.week] = { data: past, builtAt: now, seenAt: now };
    const cutoff = recapCutoffDay(now);
    const kept = Object.fromEntries(
      Object.entries({ ...next, ...weeks }).filter(([key]) => key >= cutoff),
    );
    await tx
      .insert(userSettings)
      .values({ userId: user.id, recaps: kept, updatedAt: now })
      .onConflictDoUpdate({ target: userSettings.userId, set: { recaps: kept } });
    if (made) {
      await insertNotification(
        tx,
        {
          userId: user.id,
          kind: "weekly_recap",
          title: "Your week with Otto is ready",
          body: readyBody(recap),
          link: recapHref(week),
        },
        now,
      );
    }
  });
  return readIndex(db, user.id, week);
}

// True the first time; opening it again, or from another tab, changes nothing.
export async function markRecapSeen(
  userId: string,
  week: RecapWeekId,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .update(userSettings)
    .set({
      recaps: sql`jsonb_set(${userSettings.recaps}, array[${week}::text, 'seenAt'], to_jsonb(${now}::bigint))`,
    })
    .where(
      and(
        eq(userSettings.userId, userId),
        sql`${userSettings.recaps} ? ${week}`,
        sql`${userSettings.recaps} -> ${week} ->> 'seenAt' is null`,
      ),
    )
    .returning({ userId: userSettings.userId });
  return rows.length > 0;
}

// Accounts that stopped coming back: their days and weeks past the recap's reach go here, in batches.
export async function trimOldRecaps(now: number, limit: number): Promise<number> {
  const db = await getDb();
  const cutoff = recapCutoffDay(now);
  const stale = db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(
      sql`(${userSettings.activeDays}[1] < ${cutoff}::date or exists (select 1 from jsonb_object_keys(${userSettings.recaps}) as week where week < ${cutoff}))`,
    )
    .limit(limit);
  const trimmed = await db
    .update(userSettings)
    .set({
      activeDays: sql`array(select d from unnest(${userSettings.activeDays}) as d where d >= ${cutoff}::date order by d)`,
      recaps: sql`(select jsonb_object_agg(week, value) from jsonb_each(${userSettings.recaps}) as w(week, value) where week >= ${cutoff})`,
    })
    .where(sql`${userSettings.userId} in ${stale}`)
    .returning({ userId: userSettings.userId });
  return trimmed.length;
}
