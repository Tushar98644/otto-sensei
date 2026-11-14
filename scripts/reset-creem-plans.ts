// Frees users whose plan came from a Creem test subscription. Dry run by default: bun scripts/reset-creem-plans.ts [--apply]
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { connectionTarget, DIRECT_URL_VARS, directDatabaseUrl } from "../src/db/connection";
import * as schema from "../src/db/schema";
import { resetCreemPlans } from "../src/lib/billing/creem-reset";

async function main() {
  const apply = process.argv.includes("--apply");
  const rawUrl = directDatabaseUrl();
  if (!rawUrl) {
    console.error(`No database URL. Set one of: ${DIRECT_URL_VARS.join(", ")} (see SETUP.md).`);
    process.exit(1);
  }
  const target = connectionTarget(rawUrl);
  const sql = postgres(target.url, { ssl: target.ssl, max: 1, prepare: false, onnotice: () => {} });
  try {
    console.log(`Database: ${new URL(target.url).host}`);
    const counts = await resetCreemPlans(drizzle(sql, { schema }), { apply });
    console.log(
      `Users with Creem billing: ${counts.users} (${counts.paidUsers} on a paid plan). Creem trial replacements: ${counts.trialReplacements}.`,
    );
    console.log(
      apply
        ? "Done: those users are on Free with no billing ids, and the trial replacements are gone."
        : "Dry run: nothing changed. Run again with --apply to reset them.",
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
