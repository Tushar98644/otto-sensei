import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("../scripts/migrations-check.sh", import.meta.url));
const dir = mkdtempSync(path.join(tmpdir(), "otto-migrations-"));
const repo = path.join(dir, "repo");
const log = path.join(dir, "squawk.log");
const commits: string[] = [];

const env = {
  ...process.env,
  PATH: `${path.join(dir, "bin")}:${process.env.PATH ?? ""}`,
  SQUAWK_LOG: log,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

function git(...args: string[]): string {
  const run = spawnSync("git", args, { cwd: repo, env, encoding: "utf8" });
  if (run.status !== 0) throw new Error(run.stderr);
  return run.stdout.trim();
}

function commit(files: Record<string, string>) {
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(repo, name)), { recursive: true });
    writeFileSync(path.join(repo, name), text);
  }
  git("add", "-A");
  git("commit", "-q", "-m", `commit ${commits.length + 1}`);
  commits.push(git("rev-parse", "HEAD"));
}

function check(base: string, failing = "") {
  const run = spawnSync("bash", [path.join(repo, "scripts/migrations-check.sh"), base], {
    env: { ...env, SQUAWK_FAIL: failing },
    encoding: "utf8",
  });
  const linted = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [];
  return { status: run.status, stdout: run.stdout, linted };
}

const squawk = (args: string) => `squawk-cli@2.72.0 ${args}`;

beforeAll(() => {
  mkdirSync(path.join(dir, "bin"));
  // Stands in for squawk: records its arguments and fails the file named in SQUAWK_FAIL.
  writeFileSync(
    path.join(dir, "bin", "bunx"),
    '#!/bin/sh\necho "$*" >> "$SQUAWK_LOG"\nif [ -n "$SQUAWK_FAIL" ]; then case "$*" in *"$SQUAWK_FAIL"*) exit 1 ;; esac; fi\n',
  );
  chmodSync(path.join(dir, "bin", "bunx"), 0o755);
  mkdirSync(path.join(repo, "scripts"), { recursive: true });
  git("init", "-q");
  copyFileSync(SCRIPT, path.join(repo, "scripts/migrations-check.sh"));
  commit({ "supabase/migrations/001_old.sql": "create table old (id int);\n" });
  commit({
    "supabase/migrations/001_old.sql": "create table old (id bigint);\n",
    "supabase/migrations/002_table.sql": "create table things (id int);\n",
    "supabase/migrations/003_index.sql":
      "-- no-transaction\ncreate index concurrently things_id_idx on things (id);\n",
    "supabase/seed.sql": "insert into things values (1);\n",
  });
  commit({ "supabase/migrations/004_drop.sql": "alter table things drop column id;\n" });
});

beforeEach(() => rmSync(log, { force: true }));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("migrations check", () => {
  it("lints each migration added since the base, a -- no-transaction file outside a transaction", () => {
    const run = check(commits[0]!);
    expect(run.linted).toEqual([
      squawk("supabase/migrations/002_table.sql"),
      squawk("--no-assume-in-transaction supabase/migrations/003_index.sql"),
      squawk("supabase/migrations/004_drop.sql"),
    ]);
    expect(run.status).toBe(0);
  });

  it("fails when one file fails, after linting the rest", () => {
    const run = check(commits[0]!, "002_table");
    expect(run.linted).toHaveLength(3);
    expect(run.status).toBe(1);
  });

  it("falls back to the last commit when the base is missing or unknown", () => {
    for (const base of ["", "0000000000000000000000000000000000000000"]) {
      rmSync(log, { force: true });
      expect(check(base).linted).toEqual([squawk("supabase/migrations/004_drop.sql")]);
    }
  });

  it("says so when nothing new was added", () => {
    const run = check(commits[2]!);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("No new migrations.");
    expect(run.linted).toEqual([]);
  });
});
