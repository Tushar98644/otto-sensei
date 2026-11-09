// Fills the local development database (.pglite/) with a small sample of real jobs, so the Jobs tab
// and /jobs have something to show without waiting for the daily cron. Reads the same public APIs
// the cron does, at the same polite pace.
//
//   bun scripts/jobs-ingest.ts              10 company boards, plus the Himalayas and Remote OK feeds
//   bun scripts/jobs-ingest.ts --limit 30   30 boards
//   bun scripts/jobs-ingest.ts --no-feeds   company boards only
//   bun scripts/jobs-ingest.ts --minutes 25 give up after 25 minutes instead of 10
//
// Stop `bun dev` first: only one process may open the .pglite folder. Running it again the same day
// reads only boards it hasn't read in 20 hours. OTTO_PGLITE_DIR=<folder> writes to another folder
// instead (the match test set uses its own), and then the dev server can keep running.
import { readFileSync } from "node:fs";

type Builder = {
  onLoad: (options: { filter: RegExp }, load: () => { contents: string; loader: "js" }) => void;
};
type BunRuntime = { plugin: (plugin: { name: string; setup: (build: Builder) => void }) => void };

// Typed by hand: the project doesn't install Bun's type package for one script.
const bun = (globalThis as { Bun?: BunRuntime }).Bun;
if (!bun) {
  console.error("Run this with Bun: bun scripts/jobs-ingest.ts");
  process.exit(1);
}

// Bun's node:https can't make the pinned connection the app makes under Node (see
// scripts/dev-transport.mjs), so the job reader's transport is swapped before anything loads it.
bun.plugin({
  name: "dev-job-transport",
  setup(build) {
    build.onLoad({ filter: /\/src\/lib\/jobs\/transport\.ts$/ }, () => ({
      contents: readFileSync(new URL("./dev-transport.mjs", import.meta.url), "utf8"),
      loader: "js",
    }));
  },
});

const { openLocalDb } = await import("@/db/local");
const { runJobsIngest } = await import("@/lib/job-feed/ingest");
const { jobStats } = await import("@/lib/job-feed/records");

function flag(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function devServerRunning(): Promise<boolean> {
  try {
    await fetch("http://localhost:3000/api/health", { signal: AbortSignal.timeout(1_000) });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const limit = Number(flag("--limit") ?? 10);
  const minutes = Number(flag("--minutes") ?? 10);
  if (!Number.isInteger(limit) || limit < 0 || !(minutes > 0)) {
    console.error(
      "--limit takes a whole number of boards (--limit 30), --minutes a number (--minutes 25)",
    );
    process.exit(1);
  }
  const ownFolder = Boolean(process.env.OTTO_PGLITE_DIR?.trim());
  if (!ownFolder && !process.argv.includes("--force") && (await devServerRunning())) {
    console.error(
      "The dev server on port 3000 has the local database open. Stop it, run this again, then start it.",
    );
    process.exit(1);
  }

  const db = await openLocalDb();
  const started = Date.now();
  console.log(
    `Reading ${limit} company boards${process.argv.includes("--no-feeds") ? "" : " and 2 feeds"}…`,
  );
  const outcome = await runJobsIngest(
    { now: started, deadline: started + minutes * 60_000 },
    { db, maxBoards: limit, feeds: !process.argv.includes("--no-feeds"), himalayasPages: 2 },
  );
  const { openJobs } = await jobStats(db);
  const { stats } = outcome;
  console.log(
    `Done in ${Math.round((Date.now() - started) / 1000)}s: ${stats.boards} boards and ${stats.feeds} feeds read, ` +
      `${stats.boardsFailed} boards failed, ${stats.added} jobs added, ${stats.duplicates} duplicates skipped.`,
  );
  if (outcome.failed.length > 0) console.log(`Feeds that failed: ${outcome.failed.join(", ")}`);
  console.log(
    ownFolder
      ? `${openJobs} open jobs in ${process.env.OTTO_PGLITE_DIR}.`
      : `${openJobs} open jobs in .pglite/. Start \`bun dev\` and open /dashboard/jobs or /jobs.`,
  );
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
