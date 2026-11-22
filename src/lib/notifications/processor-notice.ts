import { createHash } from "node:crypto";
import { and, asc, count, eq, gt, inArray, sql } from "drizzle-orm";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import type { Db } from "@/db/client";
import { lockUser } from "@/db/locks";
import { emailLog, users } from "@/db/schema";
import { log } from "@/lib/log";
import { DAY_MS } from "@/lib/time";
import { optionalEmailRoom } from "./budget";
import { EMAIL_BATCH_MAX, type EmailMessage, type EmailSender } from "./email";
import { escapeHtml, FONT, FOREST, INK, MUTED, OTTO_HEAD_EMAIL_PATH, RULE } from "./follow-up";
import type { NoticeEmailKind } from "./types";

// The terms and privacy policy promise signed-in users an email before a change like this takes effect: a service notice, not marketing.

const KIND: NoticeEmailKind = "processor_notice";

const NOTICE = {
  // One notice per change, whatever date a rerun names, so nobody gets it twice.
  occasion: "paddle_to_dodo",
  // A date further out than this is more likely a typo than a plan.
  maxLeadMs: 366 * DAY_MS,
  maxLimit: 10_000,
} as const;

export const NOTICE_USAGE = `Usage: bun scripts/send-processor-notice.ts [--date YYYY-MM-DD] [--limit N] [--apply]

  (no --apply)   Dry run: counts the accounts the notice would go to. Sends nothing, changes nothing.
  --date         The day Dodo Payments starts taking live payments, named in the email (UTC). Required
                 with --apply, and it must be after today, so the notice arrives before the change.
  --limit N      Sends at most N this run. Without it, a run sends at most what is left of the day's
                 optional email allowance (OPTIONAL_EMAILS_PER_DAY, 25 by default), so sign-in codes
                 keep their room on Resend. Run it again on later days for the rest.
  --apply        Emails every account with an email address that hasn't had the notice, whatever its
                 email choices. Each one is logged before it is sent, so a rerun never emails anyone
                 twice.

Only counts are printed, never emails.`;

export type NoticeArgs = { apply: boolean; startsOn: number | null; limit: number | null };

export type NoticeArgsResult = { ok: true; args: NoticeArgs } | { ok: false; error: string };

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDay(value: string): number | null {
  const match = DAY_PATTERN.exec(value);
  if (!match) return null;
  const at = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(at).toISOString().slice(0, 10) === value ? at : null;
}

function startsOnError(startsOn: number, now: number): string | null {
  const today = now - (now % DAY_MS);
  if (startsOn <= today) {
    return "--date must be after today (UTC): the notice has to arrive before the change.";
  }
  if (startsOn - today > NOTICE.maxLeadMs) return "--date is more than a year away. Check it.";
  return null;
}

export function parseNoticeArgs(args: readonly string[], now: number): NoticeArgsResult {
  const fail = (error: string): NoticeArgsResult => ({ ok: false, error });
  let apply = false;
  let day: string | null = null;
  let limit: string | null = null;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index] ?? "";
    const equals = arg.startsWith("--") ? arg.indexOf("=") : -1;
    const name = equals === -1 ? arg : arg.slice(0, equals);
    if (name === "--apply" && equals === -1) {
      apply = true;
      continue;
    }
    if (name !== "--date" && name !== "--limit") return fail(`Unknown option: ${arg}`);
    const value = equals === -1 ? args[++index] : arg.slice(equals + 1);
    if (!value || value.startsWith("--")) return fail(`${name} needs a value.`);
    if (name === "--date") day = value;
    else limit = value;
  }

  let startsOn: number | null = null;
  if (day !== null) {
    startsOn = parseDay(day);
    if (startsOn === null) return fail("--date takes a day as YYYY-MM-DD, like 2026-12-01.");
    const error = startsOnError(startsOn, now);
    if (error) return fail(error);
  }
  if (apply && startsOn === null) {
    return fail(
      "--apply needs --date YYYY-MM-DD: the day Dodo Payments starts taking live payments.",
    );
  }

  let most: number | null = null;
  if (limit !== null) {
    most = /^\d+$/.test(limit) ? Number(limit) : Number.NaN;
    if (!Number.isSafeInteger(most) || most < 1 || most > NOTICE.maxLimit) {
      return fail(`--limit takes a whole number from 1 to ${NOTICE.maxLimit}.`);
    }
  }
  return { ok: true, args: { apply, startsOn, limit: most } };
}

export type ProcessorNoticeLinks = {
  terms: string;
  privacy: string;
  refunds: string;
  ottoHeadUrl: string;
};

export function processorNoticeLinks(baseUrl: string): ProcessorNoticeLinks {
  const at = (path: string) => new URL(path, baseUrl).toString();
  return {
    terms: at(ROUTES.terms),
    privacy: at(ROUTES.privacy),
    refunds: at(ROUTES.refunds),
    ottoHeadUrl: at(OTTO_HEAD_EMAIL_PATH),
  };
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

// Every link in the email must open the public site, never a dev server.
export function publicBaseUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    return url.protocol === "https:" && !LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function noticeDay(startsOn: number, withYear = true): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    ...(withYear ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  }).format(startsOn);
}

export type ProcessorNoticeInput = { to: string; startsOn: number; links: ProcessorNoticeLinks };

export function processorNoticeEmail(input: ProcessorNoticeInput): EmailMessage {
  const { links } = input;
  const subject = `Dodo Payments takes live payments for ${BRAND.name} from ${noticeDay(input.startsOn, false)}`;
  const paragraphs = [
    `A short notice about payments: Dodo Payments now handles checkout for ${BRAND.name} in place of Paddle, and takes live payments from ${noticeDay(input.startsOn)}.`,
    "Dodo Payments is our online reseller and merchant of record. It takes the payment when you buy a plan, and handles receipts, sales tax or VAT, refunds and billing support.",
    "When you start a checkout, we send Dodo Payments your account email, our random id for your account and the plan you pick, the same details Paddle used to get. Dodo Payments handles your payment details under its own privacy policy.",
    `There's nothing you need to do. Everything you've made in ${BRAND.name} stays as it is, and our prices don't change.`,
  ];
  const updated = "We've updated our terms, privacy policy and refund page to match:";
  const pages = [
    { label: "Terms", url: links.terms },
    { label: "Privacy policy", url: links.privacy },
    { label: "Refunds", url: links.refunds },
  ];
  const questions = `Questions? Email ${BRAND.supportEmail}.`;
  const signOff = `${BRAND.mascotName}, from ${BRAND.name}`;
  const footer = `You're getting this because you have a ${BRAND.name} account. It's a one-time notice about a change to our terms and privacy policy, so it comes even if other emails are off.`;

  const text = [
    ...paragraphs.flatMap((line) => [line, ""]),
    updated,
    ...pages.map((page) => `${page.label}: ${page.url}`),
    "",
    questions,
    "",
    signOff,
    "",
    "--",
    footer,
  ].join("\n");

  const paragraph = (line: string, bottom = 16) =>
    `<p style="margin:0 0 ${bottom}px">${escapeHtml(line)}</p>`;
  const link = (label: string, url: string) =>
    `<a href="${escapeHtml(url)}" style="color:${FOREST}">${escapeHtml(label)}</a>`;
  const html = `<div style="font-family:${FONT};font-size:16px;line-height:1.5;color:${INK};max-width:480px">
<img src="${escapeHtml(links.ottoHeadUrl)}" width="48" height="48" alt="Otto" style="display:block;margin:0 0 16px;border:0">
${paragraphs.map((line) => paragraph(line)).join("\n")}
${paragraph(updated, 8)}
<ul style="margin:0 0 16px;padding-left:20px">
${pages.map((page) => `<li>${link(page.label, page.url)}</li>`).join("\n")}
</ul>
<p style="margin:0 0 24px">Questions? Email ${link(BRAND.supportEmail, `mailto:${BRAND.supportEmail}`)}.</p>
${paragraph(signOff, 24)}
<p style="margin:0;padding-top:16px;border-top:1px solid ${RULE};color:${MUTED};font-size:13px">${escapeHtml(footer)}</p>
</div>`;

  return { to: input.to, subject, text, html, tags: [{ name: "kind", value: KIND }] };
}

const hasEmail = sql`${users.email} <> ''`;
const notified = sql`exists (select 1 from ${emailLog} where ${emailLog.userId} = ${users.id} and ${emailLog.kind} = ${KIND} and ${emailLog.occasion} = ${NOTICE.occasion})`;
const due = and(hasEmail, sql`not ${notified}`);

async function roomFor(db: Db, limit: number | null, now: number): Promise<number> {
  return limit ?? (await optionalEmailRoom(now, db));
}

export type NoticeCounts = { accounts: number; notified: number; pending: number; room: number };

export async function processorNoticeCounts(
  db: Db,
  { limit, now }: { limit: number | null; now: number },
): Promise<NoticeCounts> {
  const [[accounts], [pending]] = await Promise.all([
    db.select({ n: count() }).from(users).where(hasEmail),
    db.select({ n: count() }).from(users).where(due),
  ]);
  const total = accounts?.n ?? 0;
  const left = pending?.n ?? 0;
  return {
    accounts: total,
    notified: total - left,
    pending: left,
    room: await roomFor(db, limit, now),
  };
}

type Claimed = { userId: string; email: string };

async function claim(db: Db, userId: string, now: number): Promise<Claimed | null> {
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    // Read again under the lock: the account may be gone, or an overlapping run may have taken it.
    const [row] = await tx
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.id, userId), due))
      .limit(1);
    if (!row) return null;
    const logged = await tx
      .insert(emailLog)
      .values({ userId, kind: KIND, occasion: NOTICE.occasion, createdAt: now })
      .onConflictDoNothing()
      .returning({ userId: emailLog.userId });
    return logged.length === 0 ? null : { userId, email: row.email };
  });
}

// Resend took none of the batch, so a later run may send it.
async function release(db: Db, batch: readonly Claimed[], now: number): Promise<void> {
  await db.delete(emailLog).where(
    and(
      eq(emailLog.kind, KIND),
      eq(emailLog.occasion, NOTICE.occasion),
      eq(emailLog.createdAt, now),
      inArray(
        emailLog.userId,
        batch.map((item) => item.userId),
      ),
    ),
  );
}

// Same batch, same key: a retry inside Resend's 24-hour window can't send it twice.
function batchKey(batch: readonly Claimed[]): string {
  const ids = batch
    .map((item) => item.userId)
    .sort()
    .join(",");
  const digest = createHash("sha256").update(`${NOTICE.occasion}:${ids}`).digest("hex");
  return `processor-notice-${digest.slice(0, 40)}`;
}

export type NoticeRunInput = {
  startsOn: number;
  limit: number | null;
  now: number;
  sender: EmailSender;
  links: ProcessorNoticeLinks;
};

// refused: Resend took nothing and those accounts were released; failed: a batch failed outright and stays logged, as it may have gone out.
export type NoticeRun = {
  room: number;
  claimed: number;
  sent: number;
  failed: number;
  released: number;
  claimErrors: number;
  stopped: "refused" | "failed" | null;
};

export async function sendProcessorNotice(db: Db, input: NoticeRunInput): Promise<NoticeRun> {
  const room = await roomFor(db, input.limit, input.now);
  const run: NoticeRun = {
    room,
    claimed: 0,
    sent: 0,
    failed: 0,
    released: 0,
    claimErrors: 0,
    stopped: null,
  };
  let cursor: string | null = null;
  while (run.claimed < room && run.stopped === null) {
    const page = Math.min(EMAIL_BATCH_MAX, room - run.claimed);
    const rows: { userId: string }[] = await db
      .select({ userId: users.id })
      .from(users)
      .where(and(due, cursor === null ? undefined : gt(users.id, cursor)))
      .orderBy(asc(users.id))
      .limit(page);
    cursor = rows.at(-1)?.userId ?? cursor;

    const batch: Claimed[] = [];
    for (const { userId } of rows) {
      try {
        const claimed = await claim(db, userId, input.now);
        if (claimed) batch.push(claimed);
      } catch (error) {
        log.error("notice.processor.claim_failed", error);
        run.claimErrors += 1;
      }
    }
    run.claimed += batch.length;

    if (batch.length > 0) {
      const messages = batch.map((item) =>
        processorNoticeEmail({ to: item.email, startsOn: input.startsOn, links: input.links }),
      );
      try {
        const result = await input.sender.sendBatch(messages, batchKey(batch));
        if (result.refused) {
          await release(db, batch, input.now);
          run.released += batch.length;
          run.stopped = "refused";
        } else {
          run.sent += result.sent;
          run.failed += result.failed;
          if (result.sent === 0 && result.failed > 0) run.stopped = "failed";
        }
      } catch (error) {
        log.error("notice.processor.send_failed", error, { messages: batch.length });
        run.failed += batch.length;
        run.stopped = "failed";
      }
    }
    if (rows.length < page) break;
  }
  return run;
}
