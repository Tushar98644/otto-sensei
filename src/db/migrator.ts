import type postgres from "postgres";
import { MIGRATION_HISTORY_DDL, type MigrationFile } from "./migration-files";

// No app imports: scripts/migrate.ts runs this under plain bun.

const LOCK_ID = 727_001;
const LOCK_NOT_AVAILABLE = "55P03";

export const MIGRATE_LIMITS = {
  // Waiting longer for a table lock gives up and retries, so the app's queries never queue long behind it.
  lockTimeout: "5s",
  // Per statement; a file that needs longer starts with its own `set local statement_timeout`.
  statementTimeout: "2min",
  // CONCURRENTLY never blocks the app's reads or writes, so it may run longer.
  concurrentTimeout: "15min",
  tries: 6,
  retryMs: 5_000,
} as const;

export type MigrateOptions = {
  statusOnly?: boolean;
  transactionPooler?: boolean;
  log?: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
};

async function recorded(sql: postgres.ISql, version: string): Promise<boolean> {
  const rows =
    await sql`select 1 from supabase_migrations.schema_migrations where version = ${version}`;
  return rows.length > 0;
}

async function record(sql: postgres.ISql, migration: MigrationFile): Promise<void> {
  await sql`insert into supabase_migrations.schema_migrations (version, name, statements)
    values (${migration.version}, ${migration.name}, ${sql.array([migration.sql])})`;
}

// First in every transaction and before the timeouts: two runs never overlap, even through a pooler, and the second just waits.
function locked(
  sql: postgres.Sql,
  work: (tx: postgres.TransactionSql) => Promise<boolean>,
): Promise<boolean> {
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${LOCK_ID})`;
    await tx.unsafe(
      `set local lock_timeout = '${MIGRATE_LIMITS.lockTimeout}'; set local statement_timeout = '${MIGRATE_LIMITS.statementTimeout}'`,
    );
    return work(tx);
  });
}

function inTransaction(sql: postgres.Sql, migration: MigrationFile): Promise<boolean> {
  return locked(sql, async (tx) => {
    if (await recorded(tx, migration.version)) return false;
    // Without parameters this goes over the simple query protocol, which takes many statements.
    await tx.unsafe(migration.sql);
    await record(tx, migration);
    return true;
  });
}

// Sent alone, the file's one statement runs outside any transaction, as CONCURRENTLY needs.
async function outsideTransaction(sql: postgres.Sql, migration: MigrationFile): Promise<boolean> {
  // A session lock outlives this transaction, so it also covers the statement.
  await locked(sql, async (tx) => {
    await tx`select pg_advisory_lock(${LOCK_ID})`;
    return true;
  });
  try {
    if (await recorded(sql, migration.version)) return false;
    await sql.unsafe(`set statement_timeout = '${MIGRATE_LIMITS.concurrentTimeout}'`);
    await sql.unsafe(migration.sql);
    // A failed CONCURRENTLY build leaves an invalid index behind, which "if not exists" then keeps.
    const invalid = await sql<{ name: string }[]>`
      select c.relname as name from pg_index i join pg_class c on c.oid = i.indexrelid
      where not i.indisvalid and c.relnamespace = 'public'::regnamespace`;
    if (invalid.length > 0) {
      const names = invalid.map((row) => row.name).join(", ");
      throw new Error(
        `${migration.file} left an unusable index (${names}). Drop it with "drop index concurrently public.<name>;" in the Supabase SQL editor, then deploy again.`,
      );
    }
    await record(sql, migration);
    return true;
  } finally {
    await sql.unsafe(`reset statement_timeout; select pg_advisory_unlock(${LOCK_ID})`);
  }
}

async function retrying(
  file: string,
  run: () => Promise<boolean>,
  log: (line: string) => void,
  sleep: (ms: number) => Promise<void>,
): Promise<boolean> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if ((error as { code?: unknown } | null)?.code !== LOCK_NOT_AVAILABLE) throw error;
      if (attempt >= MIGRATE_LIMITS.tries) {
        throw new Error(
          `${file}: a lock it needs was still taken after ${attempt} tries. Deploy again later.`,
          {
            cause: error,
          },
        );
      }
      const wait = attempt * MIGRATE_LIMITS.retryMs;
      log(`busy     ${file}: a lock it needs is taken, trying again in ${wait / 1_000}s`);
      await sleep(wait);
    }
  }
}

export async function migrate(
  sql: postgres.Sql,
  migrations: readonly MigrationFile[],
  options: MigrateOptions = {},
): Promise<number> {
  const log = options.log ?? console.log;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const retry = (file: string, run: () => Promise<boolean>) => retrying(file, run, log, sleep);

  await retry("schema_migrations", () =>
    locked(sql, async (tx) => {
      await tx.unsafe(MIGRATION_HISTORY_DDL);
      return true;
    }),
  );
  const rows = await sql<
    { version: string }[]
  >`select version from supabase_migrations.schema_migrations`;
  const applied = new Set(rows.map((row) => row.version));
  const pending = migrations.filter((migration) => !applied.has(migration.version));
  for (const migration of migrations) {
    log(`${applied.has(migration.version) ? "applied" : "pending"}  ${migration.file}`);
  }
  if (options.statusOnly || pending.length === 0) {
    log(pending.length === 0 ? "Up to date." : `${pending.length} pending.`);
    return 0;
  }
  const alone = pending.find((migration) => !migration.transaction);
  if (alone && options.transactionPooler) {
    throw new Error(
      `${alone.file} runs outside a transaction, so it needs a session connection (port 5432), not the transaction pooler. Set DIRECT_DATABASE_URL or POSTGRES_URL_NON_POOLING.`,
    );
  }

  let done = 0;
  for (const migration of pending) {
    const ran = await retry(migration.file, () =>
      migration.transaction ? inTransaction(sql, migration) : outsideTransaction(sql, migration),
    );
    log(ran ? `done     ${migration.file}` : `skipped  ${migration.file}: another run applied it`);
    if (ran) done += 1;
  }
  log(`Applied ${done} migration${done === 1 ? "" : "s"}.`);
  return done;
}
