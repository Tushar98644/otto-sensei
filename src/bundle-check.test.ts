import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const ROUTES = fileURLToPath(new URL("../scripts/bundle-routes.jq", import.meta.url));
const CHECK = fileURLToPath(new URL("../scripts/bundle-check.jq", import.meta.url));
const BUDGET = [..."-n -r --argjson slack 10 --argjson total_slack 50 -f".split(" "), CHECK];
const hasJq = spawnSync("jq", ["--version"]).status === 0;
const dir = mkdtempSync(path.join(tmpdir(), "otto-bundle-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const chunk = (name: string) => `[client-fs]/_next/static/chunks/${name}`;
const group = (kind: string, outputs: string[]) => ({ type: "group", route: "/a", kind, outputs });
const part = (filename: string, source_path: string, kb: number) => ({
  type: "part",
  route: "/a",
  filename,
  source_path,
  compressed_size: kb * 1024,
});

const EXPORT = [
  { type: "meta", schema_version: 1 },
  group("bootstrap", [chunk("main.js"), chunk("main.css")]),
  group("render_dependent", [chunk("page.js"), chunk("main.js")]),
  group("async", [chunk("lazy.js")]),
  part(chunk("main.js"), "[project]/x.js", 10),
  part(chunk("main.js"), "[project]/x.js", 10),
  part(chunk("page.js"), "[project]/y.js", 5),
  part(chunk("lazy.js"), "[project]/z.js", 20),
  part("[output]/.next/server/chunks/x.js", "[project]/x.js", 99),
];

function jq(args: string[], input = "") {
  return spawnSync("jq", args, { input, encoding: "utf8" });
}

function slurp(name: string, value: unknown): string[] {
  const file = path.join(dir, `${name}.json`);
  writeFileSync(file, JSON.stringify(value));
  return ["--slurpfile", name, file];
}

function check(base: unknown, current: unknown) {
  return jq([...BUDGET, ...slurp("base", base), ...slurp("current", current)]);
}

describe.skipIf(!hasJq)("bundle budget", () => {
  it("sums each route's first-load and total client JS once per module", () => {
    const run = jq(["-n", "-f", ROUTES], EXPORT.map((line) => JSON.stringify(line)).join("\n"));
    expect(run.status).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual([{ route: "/a", initial_kb: 15, total_kb: 35 }]);
  });

  it("refuses an export in a format it doesn't know", () => {
    const run = jq(["-n", "-f", ROUTES], JSON.stringify({ type: "meta", schema_version: 2 }));
    expect(run.status).not.toBe(0);
  });

  it("passes growth within the slack and fails past it or for a route with no baseline", () => {
    const base = [{ route: "/a", initial_kb: 15, total_kb: 35 }];
    expect(check(base, [{ route: "/a", initial_kb: 25, total_kb: 85 }]).status).toBe(0);
    const grown = check(base, [{ route: "/a", initial_kb: 26, total_kb: 35 }]);
    expect(grown.status).toBe(1);
    expect(grown.stdout).toContain("Over budget or new: /a.");
    const added = check(base, [...base, { route: "/b", initial_kb: 1, total_kb: 1 }]);
    expect(added.status).toBe(1);
    expect(added.stdout).toContain("Over budget or new: /b.");
  });
});
