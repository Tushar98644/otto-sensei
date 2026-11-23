import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "./testing";

// Every table, how account deletion reaches it, and where the data export puts it (or why it doesn't). A new table fails here until it is added.
type Owner = "account" | "global";
type Table = {
  owner: Owner;
  // How each foreign key to users acts when that account is deleted.
  onDelete?: ("cascade" | "set null")[];
  export: { file: string } | { not: string };
};

const account = (file: string): Table => ({
  owner: "account",
  onDelete: ["cascade"],
  export: { file },
});
const accountNotExported = (not: string): Table => ({
  owner: "account",
  onDelete: ["cascade"],
  export: { not },
});
const global = (not: string): Table => ({ owner: "global", export: { not } });

const TABLES: Record<string, Table> = {
  users: {
    owner: "account",
    export: { not: "the account itself: its email and plan are on the Account page" },
  },
  // referred_by goes null when the inviter's account is deleted, which ends that invite.
  user_settings: { ...account("settings.json"), onDelete: ["cascade", "set null"] },
  metered_calls: accountNotExported(
    "minutes-long replays of a paid result and passes for a fix's answers",
  ),
  billing_log: accountNotExported(
    "billing bookkeeping: handled webhook ids, email hashes of past trials, replaced trials",
  ),
  usage: accountNotExported("allowance counts, shown on the Account page"),
  rate_limits: global("abuse counters by device, address or email, kept two days"),
  resumes: account("resumes/"),
  applications: account("applications.json"),
  notifications: accountNotExported("bell notes made from exported applications and settings"),
  shares: account("share-links.json"),
  feedback: account("feedback.json"),
  jobs: global("public job posts"),
  job_boards: global("public job boards"),
  job_skills: global("skill weights from public posts"),
  match_skills: global("ids for the skills in public posts"),
  job_match: global("a ranking copy of public posts"),
  job_counts: global("counts of public posts"),
  title_vectors: global("meaning vectors of public job titles"),
  match_cache: accountNotExported("a day's cache of ranked public posts"),
  company_visa: global("public visa registers"),
  match_events: accountNotExported("which posts were shown and opened, to measure ranking"),
  saved_jobs: account("saved-jobs.json"),
  portfolios: account("portfolio.json"),
  portfolio_redirects: accountNotExported("old portfolio addresses, kept 90 days"),
  writings: account("cover-letters"),
  extension_tokens: accountNotExported("hashes of extension sign-ins"),
  saved_posts: account("saved-posts.json"),
  inbound_handles: {
    owner: "account",
    onDelete: ["set null"],
    export: { file: "email-tracking.json" },
  },
  inbound_emails: account("email-tracking.json"),
  career_log_entries: account("career-log.json"),
  // Copied into user_settings, metered_calls and billing_log; 20261123100900 drops them once the release that reads those is live.
  active_days: accountNotExported("copied into user_settings"),
  weekly_recaps: accountNotExported("copied into user_settings"),
  referral_codes: accountNotExported("copied into user_settings"),
  referrals: accountNotExported("copied into user_settings"),
  calendar_feeds: accountNotExported("copied into user_settings"),
  inbound_addresses: accountNotExported("copied into user_settings"),
  trial_reminders: accountNotExported("copied into user_settings"),
  email_log: accountNotExported("copied into user_settings"),
  resume_tombstones: accountNotExported("copied into user_settings"),
  metered_results: accountNotExported("copied into metered_calls"),
  usage_passes: accountNotExported("copied into metered_calls"),
  trial_replacements: accountNotExported("copied into billing_log"),
  billing_events: global("copied into billing_log"),
  trial_history: global("copied into billing_log"),
};

const ON_DELETE = { c: "cascade", n: "set null" } as const;

async function rows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
  const result = (await (await getDb()).execute(query)) as unknown as { rows: T[] };
  return result.rows;
}

describe("every table", () => {
  it("is listed here with how deletion and the export handle it", async () => {
    const tables = await rows<{ name: string }>(
      sql`select relname as name from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1`,
    );
    expect(tables.map((row) => row.name)).toEqual(Object.keys(TABLES).sort());
  });

  it("has row level security on and a primary key", async () => {
    const tables = await rows<{ name: string; rls: boolean; pk: boolean }>(
      sql`select c.relname as name, c.relrowsecurity as rls,
            exists (select 1 from pg_constraint k where k.conrelid = c.oid and k.contype = 'p') as pk
          from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'`,
    );
    expect(tables.filter((row) => !row.rls || !row.pk)).toEqual([]);
  });

  it("goes with the account through its foreign key to users, unless it holds no account's data", async () => {
    const keys = await rows<{ name: string; action: keyof typeof ON_DELETE }>(
      sql`select c.relname as name, k.confdeltype as action from pg_constraint k
          join pg_class c on c.oid = k.conrelid
          where k.contype = 'f' and k.confrelid = 'public.users'::regclass`,
    );
    const userColumns = await rows<{ name: string }>(
      sql`select distinct table_name as name from information_schema.columns
          where table_schema = 'public' and column_name = 'user_id'`,
    );
    for (const [name, table] of Object.entries(TABLES)) {
      const actions = keys.filter((key) => key.name === name).map((key) => ON_DELETE[key.action]);
      if (name === "users") continue;
      if (table.owner === "global") {
        expect({ name, actions }).toEqual({ name, actions: [] });
        expect(userColumns.map((row) => row.name)).not.toContain(name);
      } else {
        expect({ name, actions: [...new Set(actions)].sort() }).toEqual({
          name,
          actions: table.onDelete,
        });
      }
    }
    const root = await rows<{ action: string }>(
      sql`select confdeltype as action from pg_constraint
          where conrelid = 'public.users'::regclass and confrelid = 'auth.users'::regclass`,
    );
    expect(root).toEqual([{ action: "c" }]);
  });

  it("is in the data export, or says why not", () => {
    const source = readFileSync(path.join(process.cwd(), "src/lib/account/data-export.ts"), "utf8");
    for (const [name, table] of Object.entries(TABLES)) {
      if ("file" in table.export)
        expect({ name, found: source.includes(table.export.file) }).toEqual({ name, found: true });
      else expect({ name, why: table.export.not.length > 10 }).toEqual({ name, why: true });
    }
  });
});
