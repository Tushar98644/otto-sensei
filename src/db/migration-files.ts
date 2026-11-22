import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// No app imports: scripts/migrate.ts runs this under plain bun.

export type MigrationFile = {
  version: string;
  name: string;
  file: string;
  sql: string;
  transaction: boolean;
};

const FILE_NAME = /^(\d{14})_([a-z0-9_]+)\.sql$/;
// A file starting with this line holds one statement that can't run in a transaction (CONCURRENTLY).
const NO_TRANSACTION = /^--\s*no-transaction\b/;

export const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

export function readMigrations(dir = MIGRATIONS_DIR): MigrationFile[] {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => {
      const match = FILE_NAME.exec(file);
      if (!match?.[1] || !match[2]) {
        throw new Error(`Bad migration file name "${file}": use <14-digit timestamp>_<name>.sql`);
      }
      const sql = readFileSync(path.join(dir, file), "utf8");
      return {
        version: match[1],
        name: match[2],
        file,
        sql,
        transaction: !NO_TRANSACTION.test(sql),
      };
    });
  // The runner records versions, so a second file with the same version would be skipped silently.
  const seen = new Map<string, string>();
  for (const migration of files) {
    const first = seen.get(migration.version);
    if (first) {
      throw new Error(
        `Migrations ${first} and ${migration.file} share version ${migration.version}: give one a later timestamp.`,
      );
    }
    seen.set(migration.version, migration.file);
  }
  return files;
}

export const MIGRATION_HISTORY_DDL = `
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text primary key);
  alter table supabase_migrations.schema_migrations add column if not exists statements text[];
  alter table supabase_migrations.schema_migrations add column if not exists name text;
`;
