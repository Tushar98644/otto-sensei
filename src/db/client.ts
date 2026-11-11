import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { devAuthActive } from "@/lib/auth/dev-mode";
import { appPoolOptions, connectionTarget, pooledDatabaseUrl } from "./connection";
import * as schema from "./schema";

// Tests swap this module for ./testing (PGlite), so code takes the driver-neutral Db type.

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = PgTransaction<PgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

let db: Db | null = null;

/**
 * Supabase via DATABASE_URL (or POSTGRES_URL) in production. In development, the local .pglite/
 * folder when dev sign-in is on or no URL is set, so test accounts never reach a real database.
 */
export async function getDb(): Promise<Db> {
  if (db) return db;
  const url = pooledDatabaseUrl();
  // NODE_ENV is inlined at build time, so production bundles drop this branch and PGlite with it.
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
