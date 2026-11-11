import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// No app imports: scripts/migrate.ts runs this under plain bun.

export type MigrationFile = { version: string; name: string; file: string; sql: string };

const FILE_NAME = /^(\d{14})_([a-z0-9_]+)\.sql$/;

export const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

export function readMigrations(dir = MIGRATIONS_DIR): MigrationFile[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => {
      const match = FILE_NAME.exec(file);
      if (!match?.[1] || !match[2]) {
        throw new Error(`Bad migration file name "${file}": use <14-digit timestamp>_<name>.sql`);
      }
      return { version: match[1], name: match[2], file, sql: readFileSync(path.join(dir, file), "utf8") };
    });
}

export const MIGRATION_HISTORY_DDL = `
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text primary key);
  alter table supabase_migrations.schema_migrations add column if not exists statements text[];
  alter table supabase_migrations.schema_migrations add column if not exists name text;
`;
