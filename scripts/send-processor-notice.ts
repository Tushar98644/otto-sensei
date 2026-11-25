// Emails each account once that Dodo Payments takes over payments from Paddle; dry run by default, --help lists the options.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { connectionTarget, DIRECT_URL_VARS, directDatabaseUrl } from "../src/db/connection";
import * as schema from "../src/db/schema";
import { appUrl } from "../src/lib/env";
import { emailSender, type EmailSender } from "../src/lib/notifications/email";
import {
  NOTICE_USAGE,
  noticeDay,
  parseNoticeArgs,
  processorNoticeCounts,
  publicBaseUrl,
  sendProcessorNotice,
} from "../src/lib/notifications/processor-notice";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function senderForApply(baseUrl: string): EmailSender {
  const sender = emailSender();
  if (!sender) fail("Email isn't set up: set RESEND_API_KEY and EMAIL_FROM.");
  if (!publicBaseUrl(baseUrl)) {
    fail(
      `The links would open ${baseUrl}. Set NEXT_PUBLIC_APP_URL to the public https site first.`,
    );
  }
  return sender;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(NOTICE_USAGE);
    return;
  }
  const now = Date.now();
  const parsed = parseNoticeArgs(argv, now);
  if (!parsed.ok) fail(`${parsed.error}\n\n${NOTICE_USAGE}`);
  const { apply, startsOn, limit } = parsed.args;
  const baseUrl = appUrl();
  const sender = apply ? senderForApply(baseUrl) : null;

  const rawUrl = directDatabaseUrl();
  if (!rawUrl)
    fail(`No database URL. Set one of: ${DIRECT_URL_VARS.join(", ")} (see docs/setup.md).`);
  const target = connectionTarget(rawUrl);
  const sql = postgres(target.url, { ssl: target.ssl, max: 1, prepare: false, onnotice: () => {} });
  try {
    const db = drizzle(sql, { schema });
    console.log(`Database: ${new URL(target.url).host}`);
    console.log(`Links open: ${baseUrl}${publicBaseUrl(baseUrl) ? "" : " (not the public site)"}`);
    if (!apply) console.log(`Email: ${emailSender() ? "set up" : "not set up"}`);
    if (startsOn !== null) console.log(`Date in the email: ${noticeDay(startsOn)}`);
    const counts = await processorNoticeCounts(db, { limit, now });
    const capFrom = limit === null ? "today's optional email allowance" : "--limit";
    console.log(
      `Accounts with an email: ${counts.accounts}. Already notified: ${counts.notified}. Still to notify: ${counts.pending}.`,
    );
    console.log(
      `A run now sends up to ${Math.min(counts.pending, counts.room)} (at most ${counts.room}, from ${capFrom}).`,
    );

    if (!apply || !sender || startsOn === null) {
      console.log(`Dry run: nothing sent, nothing changed.\n\n${NOTICE_USAGE}`);
      return;
    }
    if (counts.pending === 0) {
      console.log("Every account has the notice. Nothing to send.");
      return;
    }
    if (counts.room === 0) {
      console.log(
        "Nothing can go out now: today's optional email allowance is used. Run again tomorrow, or pass --limit N.",
      );
      return;
    }

    const run = await sendProcessorNotice(db, {
      startsOn,
      limit,
      now,
      sender,
      baseUrl,
    });
    console.log(
      `Sent: ${run.sent}. Failed: ${run.failed}. Released for a later run: ${run.released}.`,
    );
    if (run.stopped === "refused") {
      console.log(
        "Resend refused a batch, so the run stopped. Those accounts were released: fix the sender settings and run again.",
      );
    }
    if (run.stopped === "failed") {
      console.log(
        "A batch failed outright, so the run stopped. Its accounts stay logged, since the email may have gone out.",
      );
    }
    if (run.claimErrors > 0) {
      console.log(
        `${run.claimErrors} accounts hit a database error and weren't logged; a rerun tries them again.`,
      );
    }
    const after = await processorNoticeCounts(db, { limit, now });
    console.log(`Still to notify: ${after.pending}.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
