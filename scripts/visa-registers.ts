// Refreshes company_visa from the UK Register of Licensed Sponsors and the USCIS H-1B Employer
// Data Hub (JOB-SOURCES.md, "Visa registers"), for the names in src/lib/job-feed/visa-matches.ts,
// then rebuilds job_match so cards show it at once. The jobs cron does the same once a month.
//
//   bun scripts/visa-registers.ts                     the local .pglite/ database
//   OTTO_PGLITE_DIR=<folder> bun scripts/visa-registers.ts
//   DATABASE_URL=<url> bun scripts/visa-registers.ts  a real database (production: run with care)
import { getDb } from "@/db/client";
import { rebuildMatchIndex } from "@/lib/job-feed/match-index";
import { refreshVisaRegisters } from "@/lib/job-feed/visa-registers";

async function main() {
  const db = process.env.DATABASE_URL
    ? await getDb()
    : await (await import("@/db/local")).openLocalDb();
  const now = Date.now();
  console.log(await refreshVisaRegisters(db, now));
  console.log({ indexed: await rebuildMatchIndex(db, now) });
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
