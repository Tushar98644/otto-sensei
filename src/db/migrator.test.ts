import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { afterEach, describe, expect, it } from "vitest";
import { readMigrations, type MigrationFile } from "./migration-files";
import { MIGRATE_LIMITS, migrate } from "./migrator";

const cleanup: (() => unknown)[] = [];

afterEach(async () => {
  for (const step of cleanup.splice(0).reverse()) await step();
});

// The deploy's own client, postgres.js, talking to an in-memory PGlite through a bare protocol relay.
function relay(db: PGlite): net.Server {
  return net.createServer((socket) => {
    let buffer: Buffer = Buffer.alloc(0);
    let started = false;
    let queue = Promise.resolve();
    socket.on("error", () => {});
    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const messages: Buffer[] = [];
      for (;;) {
        // Only the startup message comes without a type byte.
        const head = started ? 1 : 0;
        if (buffer.length < head + 4) break;
        const size = head + buffer.readInt32BE(head);
        if (buffer.length < size) break;
        const message = buffer.subarray(0, size);
        buffer = buffer.subarray(size);
        if (started && message[0] === 0x58) {
          socket.end();
          return;
        }
        started = true;
        messages.push(message);
      }
      if (messages.length === 0) return;
      const payload = new Uint8Array(Buffer.concat(messages));
      queue = queue
        .then(async () => {
          const reply = await db.execProtocolRaw(payload);
          if (!socket.destroyed) socket.write(reply);
        })
        .catch(() => {
          socket.destroy();
        });
    });
  });
}

async function database(debug?: (query: string) => void): Promise<postgres.Sql> {
  const db = new PGlite();
  const server = relay(db);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as net.AddressInfo;
  const sql = postgres({
    host: "127.0.0.1",
    port,
    user: "postgres",
    database: "postgres",
    max: 1,
    max_lifetime: 0,
    prepare: false,
    onnotice: () => {},
    ...(debug ? { debug: (_connection: number, query: string) => debug(query) } : {}),
  });
  cleanup.push(async () => {
    await sql.end({ timeout: 1 });
    server.close();
    await db.close();
  });
  return sql;
}

function migrations(files: Record<string, string>): MigrationFile[] {
  const dir = mkdtempSync(path.join(tmpdir(), "otto-migrations-"));
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(dir, name), text);
  return readMigrations(dir);
}

const quiet = { log: () => {}, sleep: async () => {} };

const busyUntil = (tries: number) =>
  `do $$ begin if nextval('public.tries') < ${tries} then raise exception 'busy' using errcode = '55P03'; end if; end $$;`;

describe("migrate", () => {
  it("applies each pending file once, in order, under a lock timeout and a statement timeout", async () => {
    const sql = await database();
    const files = migrations({
      "20260101000000_first.sql":
        "create table public.seen (lock_wait text, per_statement text);\n" +
        "insert into public.seen values (current_setting('lock_timeout'), current_setting('statement_timeout'));",
      "20260102000000_second.sql": "alter table public.seen add column note text;",
    });
    expect(await migrate(sql, files, { ...quiet, statusOnly: true })).toBe(0);
    const lines: string[] = [];
    expect(await migrate(sql, files, { ...quiet, log: (line) => lines.push(line) })).toBe(2);
    expect(lines).toEqual([
      "pending  20260101000000_first.sql",
      "pending  20260102000000_second.sql",
      "done     20260101000000_first.sql",
      "done     20260102000000_second.sql",
      "Applied 2 migrations.",
    ]);
    expect([...(await sql`select lock_wait, per_statement from public.seen`)]).toEqual([
      { lock_wait: "5s", per_statement: "2min" },
    ]);
    expect([
      ...(await sql`select version, name from supabase_migrations.schema_migrations order by version`),
    ]).toEqual([
      { version: "20260101000000", name: "first" },
      { version: "20260102000000", name: "second" },
    ]);
    expect(await migrate(sql, files, quiet)).toBe(0);
  });

  it("takes the runner's lock before the timeouts, so a second deploy waits for the first", async () => {
    const queries: string[] = [];
    const sql = await database((query) => queries.push(query.trim()));
    const files = migrations({
      "20260101000000_first.sql": "create table public.first (id int);",
      "20260102000000_second.sql":
        "-- no-transaction\ncreate index concurrently on public.first (id);",
    });
    expect(await migrate(sql, files, quiet)).toBe(2);
    const begins = queries.flatMap((query, i) => (query === "begin" ? [i] : []));
    expect(begins).toHaveLength(3);
    for (const i of begins) {
      expect(queries[i + 1]).toBe("select pg_advisory_xact_lock($1)");
      expect(queries[i + 2]).toBe(
        "set local lock_timeout = '5s'; set local statement_timeout = '2min'",
      );
    }
  });

  it("skips a file another run applied while this one waited for the lock", async () => {
    const sql = await database();
    const files = migrations({
      "20260101000000_first.sql":
        "insert into supabase_migrations.schema_migrations (version, name) values ('20260102000000', 'second');",
      "20260102000000_second.sql": "select 1 / 0;",
    });
    const lines: string[] = [];
    expect(await migrate(sql, files, { ...quiet, log: (line) => lines.push(line) })).toBe(1);
    expect(lines).toContain("skipped  20260102000000_second.sql: another run applied it");
  });

  it("tries a file again while a lock it needs is taken, then fails the deploy", async () => {
    const sql = await database();
    const files = migrations({
      "20260101000000_tries.sql": "create sequence public.tries;",
      "20260102000000_busy.sql": `${busyUntil(3)}\ncreate table public.after_busy (id int);`,
    });
    const waits: number[] = [];
    const sleep = async (ms: number) => {
      waits.push(ms);
    };
    expect(await migrate(sql, files, { log: () => {}, sleep })).toBe(2);
    expect(waits).toEqual([MIGRATE_LIMITS.retryMs, 2 * MIGRATE_LIMITS.retryMs]);
    expect([...(await sql`select to_regclass('public.after_busy') is not null as made`)]).toEqual([
      { made: true },
    ]);

    waits.length = 0;
    const stuck = migrations({ "20260103000000_stuck.sql": busyUntil(1_000) });
    await expect(migrate(sql, [...files, ...stuck], { log: () => {}, sleep })).rejects.toThrow(
      `20260103000000_stuck.sql: a lock it needs was still taken after ${MIGRATE_LIMITS.tries} tries`,
    );
    expect(waits).toHaveLength(MIGRATE_LIMITS.tries - 1);
    expect([
      ...(await sql`select count(*)::int as n from supabase_migrations.schema_migrations`),
    ]).toEqual([{ n: 2 }]);
  });

  it("runs a -- no-transaction file on its own, so CONCURRENTLY works, then frees the session", async () => {
    const sql = await database();
    const files = migrations({
      "20260101000000_things.sql": "create table public.things (id int primary key, name text);",
      "20260102000000_things_name.sql":
        "-- no-transaction\ncreate index concurrently if not exists things_name_idx on public.things (name);\n",
    });
    expect(files.map((file) => file.transaction)).toEqual([true, false]);
    expect(await migrate(sql, files, quiet)).toBe(2);
    expect([
      ...(await sql`select indisvalid from pg_index where indexrelid = 'public.things_name_idx'::regclass`),
    ]).toEqual([{ indisvalid: true }]);
    expect([
      ...(await sql`select current_setting('statement_timeout') as timeout,
        (select count(*)::int from pg_locks where locktype = 'advisory') as locks`),
    ]).toEqual([{ timeout: "0", locks: 0 }]);
  });

  it("won't record a CONCURRENTLY build that left an unusable index", async () => {
    const sql = await database();
    const files = migrations({
      "20260101000000_things.sql":
        "create table public.things (id int primary key, name text);\n" +
        "create index things_name_idx on public.things (name);\n" +
        "update pg_index set indisvalid = false where indexrelid = 'public.things_name_idx'::regclass;",
      "20260102000000_things_name.sql":
        "-- no-transaction\ncreate index concurrently if not exists things_name_idx on public.things (name);",
    });
    await expect(migrate(sql, files, quiet)).rejects.toThrow(
      "left an unusable index (things_name_idx)",
    );
    expect([...(await sql`select version from supabase_migrations.schema_migrations`)]).toEqual([
      { version: "20260101000000" },
    ]);
  });

  it("keeps a -- no-transaction file to one statement and off the transaction pooler", async () => {
    const sql = await database();
    const table = migrations({
      "20260101000000_things.sql": "create table public.things (id int);",
    });
    const index = migrations({
      "20260102000000_things_id.sql":
        "-- no-transaction\ncreate index concurrently things_id_idx on public.things (id);",
    });
    await expect(
      migrate(sql, [...table, ...index], { ...quiet, transactionPooler: true }),
    ).rejects.toThrow("needs a session connection");
    expect([
      ...(await sql`select count(*)::int as n from supabase_migrations.schema_migrations`),
    ]).toEqual([{ n: 0 }]);
    expect(await migrate(sql, table, { ...quiet, transactionPooler: true })).toBe(1);

    const two = migrations({
      "20260103000000_two.sql":
        "-- no-transaction\ncreate index concurrently a_idx on public.things (id);\n" +
        "create index concurrently b_idx on public.things (id);",
    });
    await expect(migrate(sql, [...table, ...two], quiet)).rejects.toThrow(
      "cannot run inside a transaction block",
    );
  });
});
