// Frees plans left by test payments; dry run by default, --help lists the modes.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { connectionTarget, DIRECT_URL_VARS, directDatabaseUrl } from "../src/db/connection";
import * as schema from "../src/db/schema";
import { parseResetArgs, resetCreemPlans, RESET_USAGE } from "../src/lib/billing/creem-reset";

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(RESET_USAGE);
    return;
  }
  const { apply, goLive, unknown } = parseResetArgs(args);
  if (unknown.length > 0) {
    console.error(`Unknown option: ${unknown.join(" ")}\n\n${RESET_USAGE}`);
    process.exit(1);
  }
  const rawUrl = directDatabaseUrl();
  if (!rawUrl) {
    console.error(`No database URL. Set one of: ${DIRECT_URL_VARS.join(", ")} (see SETUP.md).`);
    process.exit(1);
  }
  const target = connectionTarget(rawUrl);
  const sql = postgres(target.url, { ssl: target.ssl, max: 1, prepare: false, onnotice: () => {} });
  try {
    console.log(`Database: ${new URL(target.url).host}`);
    console.log(
      goLive
        ? "Mode: go-live (every account with billing state, Paddle sandbox ids included)."
        : "Mode: Creem leftovers (accounts whose billing ids aren't Paddle's).",
    );
    const counts = await resetCreemPlans(drizzle(sql, { schema }), { apply, goLive });
    console.log(
      `Users to reset: ${counts.users} (${counts.paidUsers} on a paid plan). Trial replacements to delete: ${counts.trialReplacements}.`,
    );
    console.log(
      apply
        ? "Done: those users are on Free with no billing ids, and those trial replacements are gone."
        : `Dry run: nothing changed.\n\n${RESET_USAGE}`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
