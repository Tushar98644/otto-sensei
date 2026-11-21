import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";
import { E2E_DIST_DIR, E2E_PORT, serverEnv } from "./env";

// Playwright's webServer: next dev on E2E_PORT (3100) with its own output folder and a fresh PGlite database.

const root = fileURLToPath(new URL("..", import.meta.url));
const DB_PREFIX = "otto-e2e-pglite-";

// e2e runs one at a time (the e2e lock), so any database left here is from a run that was killed.
for (const name of readdirSync(tmpdir())) {
  if (name.startsWith(DB_PREFIX))
    rmSync(path.join(tmpdir(), name), { recursive: true, force: true });
}
const dbRoot = mkdtempSync(path.join(tmpdir(), DB_PREFIX));

const env = serverEnv(root, path.join(dbRoot, "db"));
const offline = pathToFileURL(path.join(root, "e2e/offline.ts")).href;
env.NODE_OPTIONS = [env.NODE_OPTIONS, `--import=${offline}`].filter(Boolean).join(" ");

const next = spawn(path.join(root, "node_modules/.bin/next"), ["dev", "--port", String(E2E_PORT)], {
  cwd: root,
  // next dev sets NODE_ENV itself; Next's types mark it required.
  env: env as NodeJS.ProcessEnv,
  stdio: ["ignore", "pipe", "pipe"],
});

// next dev repeats one font warning on every compile; everything else passes through.
const FONT_NOISE = /^⚠ \.\/$|Geist Pixel|Skipping generating a fallback font|^$/;

function relay(from: Readable, to: NodeJS.WriteStream) {
  createInterface({ input: from }).on("line", (line) => {
    if (!FONT_NOISE.test(stripVTControlCharacters(line).trim())) to.write(`${line}\n`);
  });
}
relay(next.stdout, process.stdout);
relay(next.stderr, process.stderr);

// next dev points next-env.d.ts at its own output folder; tsc and `bun dev` expect .next.
const nextEnvFile = path.join(root, "next-env.d.ts");
const ownTypes = `./${E2E_DIST_DIR}/`;
const keepNextEnv = setInterval(() => {
  if (!existsSync(nextEnvFile)) return;
  const content = readFileSync(nextEnvFile, "utf8");
  if (content.includes(ownTypes))
    writeFileSync(nextEnvFile, content.replaceAll(ownTypes, "./.next/"));
}, 300);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => next.kill(signal));
}

next.on("exit", (code, signal) => {
  clearInterval(keepNextEnv);
  rmSync(dbRoot, { recursive: true, force: true });
  process.exit(code ?? (signal ? 1 : 0));
});
