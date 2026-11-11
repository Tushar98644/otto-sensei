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
