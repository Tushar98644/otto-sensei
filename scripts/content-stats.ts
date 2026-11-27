// Read-only counts from the job listings for data-driven social posts: totals only, never a job's own text.
import postgres from "postgres";

const FAMILIES = ["other", "engineering", "data", "design", "product", "marketing", "sales", "support", "operations", "people", "finance", "legal"];
const FRESH_DAYS = 90;
const STATS = ["entry-years"] as const;

const url = process.env.DATABASE_URL?.trim();
const stat = (process.env.STAT ?? process.argv[2] ?? "").trim();
if (!url) {
  console.error("Set DATABASE_URL.");
  process.exit(1);
}
if (!STATS.includes(stat as (typeof STATS)[number])) {
  console.error(`STAT must be one of ${STATS.join(", ")}`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

// One live opening per job: fresh in the last 90 days, not a copy (flag 16), not a standing "general application" (flag 2).
const open = (tx: postgres.TransactionSql) => tx`
  (flags & 16) = 0 and (flags & 2) = 0
  and least(posted, seen) >= (extract(epoch from now()) / 60)::int - ${FRESH_DAYS * 24 * 60}`;

async function entryYears(tx: postgres.TransactionSql) {
  const [totals] = await tx`
    select count(*)::int as open,
      count(*) filter (where level = 1)::int as junior,
      count(*) filter (where level = 0)::int as intern,
      count(*) filter (where level = 1 and min_years = 0)::int as junior_none,
      count(*) filter (where level = 1 and min_years = 1)::int as junior_1,
      count(*) filter (where level = 1 and min_years = 2)::int as junior_2,
      count(*) filter (where level = 1 and min_years between 3 and 4)::int as junior_3_4,
      count(*) filter (where level = 1 and min_years >= 5)::int as junior_5_plus,
      count(*) filter (where level = 1 and (flags & 1) <> 0)::int as junior_remote,
      count(*) filter (where level = 0 and min_years >= 1)::int as intern_any_years,
      count(*) filter (where level = 2)::int as mid,
      count(*) filter (where level = 2 and min_years >= 3)::int as mid_3_plus,
      count(*) filter (where level = 1 and title_text ~* '\\massociate\\M')::int as junior_associate,
      count(*) filter (where level = 1 and title_text ~* '\\massociate\\M' and min_years >= 2)::int as junior_associate_2_plus
    from public.listings where ${open(tx)}`;
  const families = await tx`
    select family, count(*)::int as junior,
      count(*) filter (where min_years >= 2)::int as two_plus,
      count(*) filter (where min_years >= 3)::int as three_plus,
      -- "Associate" can be a mid-level title (an associate marketing manager), so it's counted apart too.
      count(*) filter (where title_text !~* '\\massociate\\M')::int as junior_core,
      count(*) filter (where title_text !~* '\\massociate\\M' and min_years >= 2)::int as core_two_plus,
      count(*) filter (where title_text !~* '\\massociate\\M' and min_years = 0)::int as core_none
    from public.listings where ${open(tx)} and level = 1
    group by family order by count(*) desc`;
  const sources = await tx`
    select b.source, count(*)::int as open
    from public.listings l join public.job_boards b on b.id = l.board
    where ${open(tx)} group by b.source order by count(*) desc`;
  const [clock] = await tx<{ at: string }[]>`select to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI "UTC"') as at`;
  return {
    stat,
    at: clock?.at,
    window_days: FRESH_DAYS,
    definitions: {
      junior: "title says junior, jr, entry level, graduate, new grad, associate, apprentice, trainee, I or level 1",
      years: "the smallest 'N years of experience' in the post's text; 0 when it names none",
    },
    totals,
    families: families.map((f) => ({ ...f, family: FAMILIES[f.family as number] ?? `family ${f.family}` })),
    sources,
  };
}

try {
  const result = await sql.begin("read only", (tx) => entryYears(tx));
  console.log(`CONTENT_STATS ${JSON.stringify(result)}`);
} finally {
  await sql.end();
}
