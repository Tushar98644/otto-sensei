import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { devAuthActive } from "@/lib/auth/dev-mode";
import { appPoolOptions, connectionTarget, pooledDatabaseUrl } from "./connection";
import * as schema from "./schema";

// Server-only. Tests swap this module for ./testing (in-memory PGlite, see vitest.setup.ts), so
// code takes the driver-neutral Db type, never the postgres.js one.

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = PgTransaction<PgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

let db: Db | null = null;

/**
 * The database for this process. Production: Supabase through DATABASE_URL (or POSTGRES_URL).
 * Development: the local .pglite/ folder whenever dev sign-in is on or no URL is set, so `bun dev`
 * never writes test accounts into a real database. Tables come from supabase/migrations
 * (scripts/migrate.ts in production, automatically for the local folder).
 */
export async function getDb(): Promise<Db> {
  if (db) return db;
  const url = pooledDatabaseUrl();
  // process.env.NODE_ENV is replaced at build time, so production bundles drop this branch and
  // never contain PGlite.
  if (process.env.NODE_ENV === "development" && (devAuthActive() || !url)) {
    const { openLocalDb } = await import("./local");
    return openLocalDb();
  }
  if (!url) throw new Error("Database is not configured: set DATABASE_URL (or POSTGRES_URL)");
  const target = connectionTarget(url);
  // Connecting is lazy in postgres.js: this touches no network until the first query.
  db = drizzle(postgres(target.url, appPoolOptions(target)), { schema });
  return db;
}

export { schema };
