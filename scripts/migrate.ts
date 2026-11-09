// Applies pending SQL files from supabase/migrations, oldest first, each in its own transaction,
// and records them in supabase_migrations.schema_migrations (the Supabase CLI's own history
// table, so `supabase db push` would agree on what has run).
//
//   bun scripts/migrate.ts            apply what's pending
//   bun scripts/migrate.ts --status   list applied and pending files, change nothing
//   bun scripts/migrate.ts --deploy   the Vercel build step (vercel.json): production builds
//                                     migrate, any other build or one without a database skips
//
// Bun loads .env.local, so after `vercel env pull .env.local` it uses DIRECT_DATABASE_URL, else
// POSTGRES_URL_NON_POOLING (Vercel Marketplace), else the pooled URL.

import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { connectionTarget, DIRECT_URL_VARS, directDatabaseUrl } from "../src/db/connection";
import { MIGRATION_HISTORY_DDL, readMigrations } from "../src/db/migration-files";

const MIGRATIONS_DIR = fileURLToPath(new URL("../supabase/migrations", import.meta.url));
// Any constant works; it only has to be the same for every copy of this script.
const LOCK_ID = 727_001;

function hostOf(url: string): string {
  return new URL(url).host;
}

async function main() {
  const statusOnly = process.argv.includes("--status");
  const onDeploy = process.argv.includes("--deploy");
  // Previews must never change the production database, even if they are given its URL later.
  const vercelEnv = process.env.VERCEL_ENV;
  if (onDeploy && vercelEnv && vercelEnv !== "production") {
    console.log(`Migrations skipped: this is a ${vercelEnv} build.`);
    return;
  }
  const rawUrl = directDatabaseUrl();
  if (!rawUrl) {
    if (onDeploy) {
      console.log("Migrations skipped: no database URL on this build.");
      return;
    }
    console.error(`No database URL. Set one of: ${DIRECT_URL_VARS.join(", ")} (see SETUP.md).`);
    process.exit(1);
  }
  const target = connectionTarget(rawUrl);
  // One connection, so the advisory lock and every migration share a session.
  const sql = postgres(target.url, { ssl: target.ssl, max: 1, prepare: false, onnotice: () => {} });
  console.log(`Database: ${hostOf(target.url)}`);

  try {
    await sql`select pg_advisory_lock(${LOCK_ID})`;
    await sql.unsafe(MIGRATION_HISTORY_DDL);

    const rows = await sql<
      { version: string }[]
    >`select version from supabase_migrations.schema_migrations`;
    const applied = new Set(rows.map((row) => row.version));
    const all = readMigrations(MIGRATIONS_DIR);
    const pending = all.filter((migration) => !applied.has(migration.version));

    for (const migration of all) {
      console.log(`${applied.has(migration.version) ? "applied" : "pending"}  ${migration.file}`);
    }
    if (statusOnly || pending.length === 0) {
      console.log(pending.length === 0 ? "Up to date." : `${pending.length} pending.`);
      return;
    }

    for (const migration of pending) {
      await sql.begin(async (tx) => {
        // Without parameters this goes over the simple query protocol, which takes many statements.
        await tx.unsafe(migration.sql);
        await tx`insert into supabase_migrations.schema_migrations (version, name, statements)
          values (${migration.version}, ${migration.name}, ${tx.array([migration.sql])})`;
      });
      console.log(`done     ${migration.file}`);
    }
    console.log(`Applied ${pending.length} migration${pending.length === 1 ? "" : "s"}.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
