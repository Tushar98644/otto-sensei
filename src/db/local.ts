import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { log } from "@/lib/log";
import type { Db } from "./client";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { MIGRATION_HISTORY_DDL, readMigrations } from "./migration-files";
import * as schema from "./schema";

// Development only: a real Postgres in .pglite/ (git-ignored), so `bun dev` needs no database
// server. Delete the folder to start over.

// Lets a script use another folder: only one process may open one, and `bun dev` may hold .pglite/.
const DATA_DIR = process.env.OTTO_PGLITE_DIR?.trim() || path.join(process.cwd(), ".pglite");

// Here Supabase isn't creating the auth user before our users row, so the row brings its own.
const AUTH_USER_SHIM_TRIGGER = `
  create or replace function auth.ensure_shim_user() returns trigger language plpgsql as $$
  begin
    insert into auth.users (id, email) values (new.id, new.email) on conflict (id) do nothing;
    return new;
  end $$;
  drop trigger if exists ensure_shim_user on public.users;
  create trigger ensure_shim_user before insert on public.users
    for each row execute function auth.ensure_shim_user();
`;

// Next can load this module more than once in one dev process (route handlers and pages are
// separate bundles, and HMR re-runs it), but only one PGlite may own the folder.
const cache = globalThis as typeof globalThis & { ottoLocalDb?: Promise<Db> };

export function openLocalDb(): Promise<Db> {
  cache.ottoLocalDb ??= open().catch((error: unknown) => {
    cache.ottoLocalDb = undefined;
    throw error;
  });
  return cache.ottoLocalDb;
}

async function open(): Promise<Db> {
  const client = new PGlite(DATA_DIR);
  await client.exec(LOCAL_ONLY_DDL);
  await client.exec(MIGRATION_HISTORY_DDL);
  const applied = await client.query<{ version: string }>(
    "select version from supabase_migrations.schema_migrations",
  );
  const done = new Set(applied.rows.map((row) => row.version));
  for (const migration of readMigrations()) {
    if (done.has(migration.version)) continue;
    await client.transaction(async (tx) => {
      await tx.exec(migration.sql);
      await tx.query(
        "insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)",
        [migration.version, migration.name, [migration.sql]],
      );
    });
    log.info("db.local_migrated", { file: migration.file });
  }
  // After the migrations: the trigger needs public.users.
  await client.exec(AUTH_USER_SHIM_TRIGGER);
  log.info("db.local_ready", { dir: process.env.OTTO_PGLITE_DIR?.trim() ? DATA_DIR : ".pglite" });
  return drizzle(client, { schema });
}
