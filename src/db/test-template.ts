import { PGlite } from "@electric-sql/pglite";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";

// Applying every migration to a fresh PGlite takes seconds alone, and several times that on a busy machine.
export const MIGRATIONS_TIMEOUT_MS = 120_000;

export async function buildDatabase(): Promise<PGlite> {
  const client = new PGlite();
  await client.exec(LOCAL_ONLY_DDL);
  for (const migration of readMigrations()) await client.exec(migration.sql);
  return client;
}
