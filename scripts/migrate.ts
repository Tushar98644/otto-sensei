import { fileURLToPath } from "node:url";
import postgres from "postgres";
import {
  connectionTarget,
  DIRECT_URL_VARS,
  directDatabaseUrl,
  isTransactionPooler,
} from "../src/db/connection";
import { readMigrations } from "../src/db/migration-files";
import { migrate } from "../src/db/migrator";

const MIGRATIONS_DIR = fileURLToPath(new URL("../supabase/migrations", import.meta.url));

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
    console.error(
      `No database URL. Set one of: ${DIRECT_URL_VARS.join(", ")} (see docs/setup.md).`,
    );
    process.exit(1);
  }
  const target = connectionTarget(rawUrl);
  // One connection, never recycled, so a file run outside a transaction keeps its session lock.
  const sql = postgres(target.url, {
    ssl: target.ssl,
    max: 1,
    max_lifetime: 0,
    prepare: false,
    onnotice: () => {},
  });
  console.log(`Database: ${hostOf(target.url)}`);
  const transactionPooler = isTransactionPooler(target.url);
  if (transactionPooler) {
    console.warn(
      "This is the transaction pooler (port 6543). Files marked -- no-transaction need DIRECT_DATABASE_URL or POSTGRES_URL_NON_POOLING (port 5432).",
    );
  }

  try {
    await migrate(sql, readMigrations(MIGRATIONS_DIR), { statusOnly, transactionPooler });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
