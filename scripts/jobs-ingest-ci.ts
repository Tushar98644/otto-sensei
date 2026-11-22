// Uses POSTGRES_URL (pooler): GitHub's IPv4-only runners can't reach the IPv6-only direct host.
import { readFileSync } from "node:fs";

type Builder = {
  onLoad: (options: { filter: RegExp }, load: () => { contents: string; loader: "js" }) => void;
};
type BunRuntime = { plugin: (plugin: { name: string; setup: (build: Builder) => void }) => void };

const bun = (globalThis as { Bun?: BunRuntime }).Bun;
if (!bun) {
  console.error("Run this with Bun: bun scripts/jobs-ingest-ci.ts");
  process.exit(1);
}

// Bun can't make the pinned connection; swap the transport before anything imports it.
bun.plugin({
  name: "ci-job-transport",
  setup(build) {
    build.onLoad({ filter: /\/src\/lib\/jobs\/transport\.ts$/ }, () => ({
      contents: readFileSync(new URL("./dev-transport.mjs", import.meta.url), "utf8"),
      loader: "js",
    }));
  },
});

const { getDb } = await import("@/db/client");
const { runJobsIngest } = await import("@/lib/job-feed/ingest");
const { jobStats } = await import("@/lib/job-feed/records");

function flag(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function dropSiteCache(): Promise<void> {
  const base = process.env.OTTO_APP_URL?.trim().replace(/\/+$/, "");
  const secret = process.env.CRON_SECRET?.trim();
  if (!base || !secret) {
    console.log(
      "OTTO_APP_URL or CRON_SECRET not set: the site's cached /jobs pages refresh within a day.",
    );
    return;
  }
  const res = await fetch(`${base}/api/cron/jobs-cache`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(30_000),
  });
  console.log(res.ok ? "Site cache cleared." : `Site cache not cleared: HTTP ${res.status}.`);
}

async function main() {
  if (!process.env.POSTGRES_URL?.trim() && !process.env.DATABASE_URL?.trim()) {
    console.error(
      "Set POSTGRES_URL (Supabase's pooled connection string) to the production database.",
    );
    process.exit(1);
  }
  const minutes = Number(flag("--minutes") ?? 45);
  // A first read of the Workday sites waits on their own hosts, so it may take more at once.
  const workers = Number(flag("--workers") ?? 4);
  if (!(minutes > 0) || !Number.isInteger(workers) || workers < 1) {
    console.error("--minutes takes a number, e.g. --minutes 20; --workers a whole number, e.g. 8");
    process.exit(1);
  }

  const db = await getDb();
  const started = Date.now();
  const outcome = await runJobsIngest(
    { now: started, deadline: started + minutes * 60_000 },
    { db, workers },
  );
  const { openJobs } = await jobStats(db);
  const { stats } = outcome;
  console.log(
    `Done in ${Math.round((Date.now() - started) / 1000)}s: ${stats.boards} boards and ${stats.feeds} feeds read, ` +
      `${stats.boardsFailed} boards failed, ${stats.added} added, ${openJobs} open jobs. ` +
      (outcome.complete
        ? "Every board was read."
        : "Stopped at the time limit; the next run continues."),
  );
  await dropSiteCache().catch((error: unknown) =>
    console.log(`Site cache not cleared: ${String(error)}`),
  );
  if (outcome.failed.length > 0) {
    console.log(`::warning::Steps that failed this run: ${outcome.failed.join(", ")}`);
  }
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
