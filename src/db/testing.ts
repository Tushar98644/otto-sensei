import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { inject } from "vitest";
import type { Db } from "./client";
import * as schema from "./schema";
import { buildDatabase } from "./test-template";

let pending: Promise<{ client: PGlite; db: Db }> | null = null;

async function open(): Promise<PGlite> {
  const template = inject("pgliteTemplate");
  if (!template) return buildDatabase();
  return new PGlite({ loadDataDir: new Blob([readFileSync(template)]) });
}

function instance() {
  pending ??= open().then((client) => {
    const db: Db = drizzle(client, { schema });
    return { client, db };
  });
  return pending;
}

export async function getDb(): Promise<Db> {
  return (await instance()).db;
}

export async function execSql(statement: string, params: unknown[] = []): Promise<void> {
  await (await instance()).client.query(statement, params);
}

export async function resetDb(): Promise<void> {
  await (
    await instance()
  ).client.exec(
    `truncate table public.applications, public.resume_tombstones, public.resumes, public.usage,
       public.rate_limits, public.billing_events, public.trial_history, public.users, public.jobs,
       public.job_boards, public.job_skills, public.match_skills, public.job_match,
       public.job_counts, public.company_visa, public.title_vectors,
       auth.users, dev_auth.login_codes,
       dev_auth.sessions cascade`,
  );
}

export { schema };
