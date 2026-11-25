import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, describe, expect, it } from "vitest";
import { listingId, publicJobId } from "@/lib/job-feed/codes";
import { rebuildMatchIndex } from "@/lib/job-feed/match-index";
import { listingRows, listSavedJobs } from "@/lib/job-feed/records";
import { titleId } from "@/lib/job-feed/title-vectors";
import type { Db } from "./client";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";
import * as schema from "./schema";
import { MIGRATIONS_TIMEOUT_MS } from "./test-template";

const VERSION = "20261124120000";
const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.now();
const RULES = "This role is open to candidates based in the United Kingdom only.";

describe("compact jobs migration", { timeout: MIGRATIONS_TIMEOUT_MS }, () => {
  const client = new PGlite();
  afterAll(() => client.close());

  it("copies open jobs into listings and titles, and keeps every saved job and application", async () => {
    await client.exec(LOCAL_ONLY_DDL);
    const migrations = readMigrations();
    for (const migration of migrations.filter((m) => m.version < VERSION))
      await client.exec(migration.sql);

    const user = crypto.randomUUID();
    await client.query("insert into auth.users (id, email) values ($1, 'ada@example.com')", [user]);
    await client.query(
      "insert into public.users (id, email, created_at, updated_at) values ($1, 'ada@example.com', 1, 1)",
      [user],
    );
    await client.exec(`
      insert into public.job_boards (source, token, company) values
        ('greenhouse', 'acme', 'Acme'), ('workday', 'acme.wd1/Careers', 'Acme'),
        ('himalayas', 'feed', '');
      insert into public.skills (skill, sid, updated_at) values ('Go', 1, 1), ('PostgreSQL', 2, 1);`);

    const hash = createHash("sha256").update("content").digest("base64url").slice(0, 32);
    const job = async (fields: {
      source?: string;
      board?: string;
      externalId: string;
      title: string;
      url: string;
      group?: string;
      company?: string;
      closed?: boolean;
      description?: string;
      keywords?: string[];
    }) => {
      const id = crypto.randomUUID();
      await client.query(
        `insert into public.jobs (id, source, external_id, board, company, title, location, remote,
           posted_at, url, description, rules_text, keywords, search, dedupe_key, group_key,
           content_hash, first_seen_at, last_seen_at, closed_at, close_reason, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, 'London, UK', false, $7, $8, $9, $10, $11, ''::tsvector,
           md5($3)::char(16), $12, $13, $7, $7, $14, $15, $7, $7)`,
        [
          id,
          fields.source ?? "greenhouse",
          fields.externalId,
          fields.board ?? "acme",
          fields.company ?? "Acme",
          fields.title,
          NOW - DAY,
          fields.url,
          fields.description ?? "",
          RULES,
          fields.keywords ?? ["Go", "PostgreSQL"],
          fields.group ?? createHash("md5").update(fields.externalId).digest("hex").slice(0, 16),
          hash,
          fields.closed ? NOW : null,
          fields.closed ? "gone" : null,
        ],
      );
      return id;
    };
    const lead = await job({
      externalId: "1",
      title: "Backend Engineer",
      url: "https://job-boards.greenhouse.io/acme/jobs/1",
      group: "aaaaaaaaaaaaaaaa",
    });
    await job({
      externalId: "2",
      title: "Backend Engineer",
      url: "https://job-boards.greenhouse.io/acme/jobs/2",
      group: "aaaaaaaaaaaaaaaa",
    });
    const odd = await job({
      externalId: "3",
      title: "Data Engineer",
      url: "https://acme.example/careers/3",
    });
    const closed = await job({
      externalId: "4",
      title: "Product Designer",
      url: "https://job-boards.greenhouse.io/acme/jobs/4",
      closed: true,
    });
    const workday = await job({
      source: "workday",
      board: "acme.wd1/Careers",
      externalId: "acme/Careers/job/London/Engineer_R1",
      title: "Engineer",
      url: "https://acme.wd1.myworkdayjobs.com/Careers/job/London/Engineer_R1",
    });
    await job({
      source: "himalayas",
      board: "",
      externalId: "https://himalayas.app/companies/globex/jobs/writer",
      title: "Writer",
      company: "Globex",
      url: "https://himalayas.app/companies/globex/jobs/writer?utm_source=api",
      description: "Write the docs.",
      keywords: ["Rust"],
    });
    await client.query(
      `insert into public.job_match (id, grp, company, family, occ, occ_minor, occ_major, zone, level,
         sids, places, remote, posted_at, seen_at, tkey)
       values ($1, 'aaaaaaaaaaaaaaaa', 'Acme', 'engineering', '15-1252.00', '15-1', '15', 4, 2,
         '{1,2}', '{GB}', false, $2, $2, 'backend engineer')`,
      [lead, NOW - DAY],
    );
    await client.query(
      `insert into public.title_vectors (key, vec, occs, sims, seen_at, embedded_at)
       values ('backend engineer', $1, '{15-1252.00}', '{0.91}', $2, $2)`,
      [new Uint8Array(256).fill(3), NOW],
    );
    await client.query(
      "insert into public.saved_jobs (user_id, job_id, saved_at) values ($1, $2, 1), ($1, $3, 2)",
      [user, lead, closed],
    );
    const application = crypto.randomUUID();
    await client.query(
      `insert into public.applications (id, user_id, company, role, job_url, job_id, applied_at,
         status_changed_at, created_at, updated_at)
       values ($1, $2, 'Acme', 'Product Designer', '', $3, 1, 1, 1, 1)`,
      [application, user, closed],
    );
    const message = crypto.randomUUID();
    await client.query(
      `insert into public.writings (id, user_id, kind, company, role, body, job_id, created_at, updated_at)
       values ($1, $2, 'outreach', 'Acme', 'Data Engineer', 'Hi', $3, 1, 1)`,
      [message, user, odd],
    );

    const target = migrations.find((m) => m.version === VERSION);
    expect(target).toBeDefined();
    await client.exec(target!.sql);

    const boards = new Map(
      (
        await client.query<{ token: string; id: number; url_template: string }>(
          "select token, id, url_template from public.job_boards",
        )
      ).rows.map((row) => [row.token, row]),
    );
    const acme = boards.get("acme")!.id;
    expect(boards.get("acme")!.url_template).toBe(
      "https://job-boards.greenhouse.io/acme/jobs/{id}",
    );
    expect(boards.get("acme.wd1/Careers")!.url_template).toBe(
      "https://acme.wd1.myworkdayjobs.com/Careers{id}",
    );

    // The ids SQL gave are the ids the app computes.
    const rows = (
      await client.query<{
        id: string;
        ext: string;
        title: string;
        title_text: string;
        url: string;
        flags: number;
        facts: string;
        skills: number[];
        post: string;
        company: string;
      }>(
        "select id::text, ext, title::text, title_text, url, flags, facts, skills, post, company from public.listings order by ext",
      )
    ).rows;
    expect(rows.map((row) => row.ext)).toEqual([
      "/job/London/Engineer_R1",
      "1",
      "2",
      "3",
      "https://himalayas.app/companies/globex/jobs/writer",
    ]);
    const byExt = new Map(rows.map((row) => [row.ext, row]));
    expect(Number(byExt.get("1")!.id)).toBe(listingId(acme, "1"));
    expect(Number(byExt.get("1")!.title)).toBe(titleId("backend engineer"));
    expect(byExt.get("1")).toMatchObject({ url: "", title_text: "", skills: [1, 2] });
    expect(byExt.get("1")!.flags & 4).toBe(4);
    expect(byExt.get("1")!.flags & 32).toBe(32);
    expect(byExt.get("2")!.flags & 16).toBe(16);
    expect(byExt.get("3")!.url).toBe("https://acme.example/careers/3");
    expect(byExt.get("/job/London/Engineer_R1")!.url).toBe("");
    const writer = byExt.get("https://himalayas.app/companies/globex/jobs/writer")!;
    expect(writer).toMatchObject({ post: "Write the docs.", company: "Globex", url: "" });
    expect(writer.skills).toHaveLength(1);
    expect(byExt.get("1")!.facts).toBe(`\u0001${RULES}`);
    const [vector] = (
      await client.query<{ text: string; len: number; occ: number; sim: number }>(
        "select text, octet_length(code) as len, occ, sim from public.titles where id = $1",
        [titleId("backend engineer")],
      )
    ).rows;
    expect(vector).toEqual({ text: "Backend Engineer", len: 256, occ: 150_125_200, sim: 9100 });

    // Saved jobs, applications and messages point at the new ids and keep what their job said.
    const leadId = publicJobId(listingId(acme, "1"));
    const closedId = publicJobId(listingId(acme, "4"));
    const saved = (
      await client.query<{ job_id: string; job: { title: string; url: string } }>(
        "select job_id, job from public.saved_jobs order by saved_at",
      )
    ).rows;
    expect(saved.map((row) => row.job_id)).toEqual([leadId, closedId]);
    expect(saved[1]!.job).toMatchObject({
      title: "Product Designer",
      url: "https://job-boards.greenhouse.io/acme/jobs/4",
      keywords: ["Go", "PostgreSQL"],
    });
    const [applied] = (
      await client.query<{ job_id: string; job: { title: string } }>(
        "select job_id, job from public.applications where id = $1",
        [application],
      )
    ).rows;
    expect(applied).toMatchObject({ job_id: closedId, job: { title: "Product Designer" } });
    const [written] = (
      await client.query<{ job_id: string }>("select job_id from public.writings where id = $1", [
        message,
      ])
    ).rows;
    expect(written!.job_id).toBe(publicJobId(listingId(acme, "3")));

    // The old app, still live for a moment, saves by an old id: the trigger moves it to the new one.
    await client.query(
      "insert into public.saved_jobs (user_id, job_id, saved_at) values ($1, $2, 3)",
      [user, workday],
    );
    const [late] = (
      await client.query<{ job_id: string; job: { title: string } | null }>(
        "select job_id, job from public.saved_jobs where saved_at = 3",
      )
    ).rows;
    expect(late).toEqual({
      job_id: publicJobId(listingId(boards.get("acme.wd1/Careers")!.id, "/job/London/Engineer_R1")),
      job: expect.objectContaining({ title: "Engineer" }),
    });

    // The new app runs on every later migration too.
    for (const migration of migrations.filter((m) => m.version > VERSION))
      await client.exec(migration.sql);
    // The new app's first rebuild reads the old rules text into compact facts, and pages read it all.
    const db = drizzle(client, { schema }) as unknown as Db;
    const legacy = async () =>
      (
        await client.query<{ n: number }>(
          "select count(*)::int as n from public.listings where left(facts, 1) = chr(1)",
        )
      ).rows[0]!.n;
    // With no time for finishing, the rebuild still builds the index and leaves the rows for the next.
    expect(await rebuildMatchIndex(db, NOW, { finishMs: 0 })).toBeGreaterThan(0);
    expect(await legacy()).toBe(5);
    expect(await rebuildMatchIndex(db, NOW)).toBeGreaterThan(0);
    const facts = (
      await client.query<{ n: number }>(
        "select count(*)::int as n from public.listings where left(facts, 1) = chr(1)",
      )
    ).rows[0]!.n;
    expect(facts).toBe(0);
    const [read] = await listingRows(db, [listingId(acme, "1")]);
    expect(read).toMatchObject({
      title: "Backend Engineer",
      url: "https://job-boards.greenhouse.io/acme/jobs/1",
      places: "GB",
      keywords: ["Go", "PostgreSQL"],
    });
    const list = await listSavedJobs(db, user);
    expect(list.map((item) => [item.title, item.closed])).toEqual([
      ["Engineer", false],
      ["Product Designer", true],
      ["Backend Engineer", false],
    ]);
  });
});
