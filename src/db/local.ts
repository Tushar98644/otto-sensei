import path from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { log } from "@/lib/log";
import type { Db } from "./client";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { MIGRATION_HISTORY_DDL, readMigrations } from "./migration-files";
import * as schema from "./schema";

const DATA_DIR = process.env.OTTO_PGLITE_DIR?.trim() || path.join(process.cwd(), ".pglite");

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

// Next may load this module twice (separate bundles, HMR), but only one PGlite may own the folder.
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
    const apply = async (db: PGlite | Transaction) => {
      await db.exec(migration.sql);
      await db.query(
        "insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)",
        [migration.version, migration.name, [migration.sql]],
      );
    };
    await (migration.transaction ? client.transaction(apply) : apply(client));
    log.info("db.local_migrated", { file: migration.file });
  }
  await client.exec(AUTH_USER_SHIM_TRIGGER);
  log.info("db.local_ready", { dir: process.env.OTTO_PGLITE_DIR?.trim() ? DATA_DIR : ".pglite" });
  return drizzle(client, { schema });
}
