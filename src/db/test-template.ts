import { PGlite } from "@electric-sql/pglite";
import { LOCAL_ONLY_DDL } from "./local-schema";
import { readMigrations } from "./migration-files";

export async function buildDatabase(): Promise<PGlite> {
  const client = new PGlite();
  await client.exec(LOCAL_ONLY_DDL);
  for (const migration of readMigrations()) await client.exec(migration.sql);
  return client;
}
