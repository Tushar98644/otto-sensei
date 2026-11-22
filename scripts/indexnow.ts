// After a production deploy: tells IndexNow engines which sitemap URLs changed since the last run.
// Usage: bun scripts/indexnow.ts --site https://www.ottosensei.com --state .indexnow/state.json [--dry-run]
// It never exits with an error: a failed ping waits for the next deploy, which sends the same URLs again.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  type IndexNowState,
  accepted,
  changedUrls,
  indexNowPayloads,
  keyFilePath,
  nextState,
  parseSitemap,
} from "../src/lib/seo/indexnow";

const SITEMAPS = ["/sitemap.xml", "/p/sitemap.xml"];
const TIMEOUT_MS = 20_000;

function flag(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

function readState(path: string): IndexNowState | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as IndexNowState;
  } catch {
    return null;
  }
}

async function get(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.text();
}

async function main(): Promise<void> {
  const site = (flag("site") ?? process.env.OTTO_APP_URL ?? "").replace(/\/+$/, "");
  const statePath = flag("state") ?? ".indexnow/state.json";
  const dryRun = process.argv.includes("--dry-run");
  if (!/^https:\/\//.test(site)) {
    console.log("IndexNow skipped: no https site address (--site or OTTO_APP_URL).");
    return;
  }

  const key = (await get(`${site}${keyFilePath()}`)).trim();
  if (key !== INDEXNOW_KEY) {
    console.log(`IndexNow skipped: ${keyFilePath()} on ${site} doesn't hold the key yet.`);
    return;
  }

  const entries = (await Promise.all(SITEMAPS.map((path) => get(`${site}${path}`)))).flatMap(
    parseSitemap,
  );
  const sent = readState(statePath);
  const urls = changedUrls(entries, sent);
  console.log(
    `${entries.length} URLs in the sitemaps, ${urls.length} to send${sent ? "" : " (first run: all of them)"}.`,
  );
  if (urls.length === 0) return;
  if (dryRun) {
    for (const url of urls) console.log(url);
    return;
  }

  for (const payload of indexNowPayloads(site, urls)) {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!accepted(response.status)) {
      console.log(`IndexNow refused ${payload.urlList.length} URLs: HTTP ${response.status}.`);
      return;
    }
    console.log(`IndexNow took ${payload.urlList.length} URLs: HTTP ${response.status}.`);
  }
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(nextState(entries)));
}

main().catch((error: unknown) => {
  console.log(`IndexNow skipped: ${error instanceof Error ? error.message : String(error)}`);
});
