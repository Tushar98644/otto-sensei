// Frees plans left by test payments; a dry run without --apply, --help lists the modes.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { connectionTarget, DIRECT_URL_VARS, directDatabaseUrl } from "../src/db/connection";
import * as schema from "../src/db/schema";
import { parseResetArgs, resetBilling, RESET_USAGE } from "../src/lib/billing/billing-reset";

const MODE_LABEL = {
  paddle: "Mode: Paddle sandbox leftovers (accounts holding ids in Paddle's format).",
  "go-live": "Mode: go-live (every account with billing state, Dodo test-mode ids included).",
};

async function main() {
  const parsed = parseResetArgs(process.argv.slice(2));
  if (parsed.action === "help") {
    console.log(RESET_USAGE);
    return;
  }
  if (parsed.action === "error") {
    console.error(`${parsed.message}\n\n${RESET_USAGE}`);
    process.exit(1);
  }
  const { mode, apply } = parsed;
  const rawUrl = directDatabaseUrl();
  if (!rawUrl) {
    console.error(`No database URL. Set one of: ${DIRECT_URL_VARS.join(", ")} (see SETUP.md).`);
    process.exit(1);
  }
  const target = connectionTarget(rawUrl);
  const sql = postgres(target.url, { ssl: target.ssl, max: 1, prepare: false, onnotice: () => {} });
  try {
    console.log(`Database: ${new URL(target.url).host}`);
    console.log(MODE_LABEL[mode]);
    const counts = await resetBilling(drizzle(sql, { schema }), { mode, apply });
    console.log(
      [
        `Users to reset: ${counts.users} (${counts.paidUsers} on a paid plan).`,
        `Their trial reminders to delete: ${counts.trialReminders}.`,
        `Trial replacements to delete: ${counts.trialReplacements}. Trial history rows to delete: ${counts.trialHistory}.`,
        `Trial usage rows to set back to zero, invite extras kept: ${counts.trialUsage}.`,
      ].join("\n"),
    );
    if (!apply) {
      console.log(`Dry run: nothing changed.\n\n${RESET_USAGE}`);
      return;
    }
    console.log(
      "Done: those users are on Free with no billing ids, those rows are gone and trial usage is back to zero.",
    );
    if (mode === "go-live") {
      console.log("Switch DODO_ENVIRONMENT to live now, and never run --go-live --apply again.");
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
