import { and, asc, eq, getTableColumns } from "drizzle-orm";
import JSZip from "jszip";
import { BRAND } from "@/config/brand";
import { getDb } from "@/db/client";
import {
  applications,
  feedback,
  jobs,
  portfolios,
  resumes,
  savedJobs,
  savedPosts,
  shares,
  userSettings,
  writings,
} from "@/db/schema";
import { APPLICATION_LIMITS } from "@/lib/applications/schema";
import { careerLogJson, careerLogText } from "@/lib/career-log/export";
import { listEntries } from "@/lib/career-log/records";
import { STATUS_NAMES } from "@/lib/applications/status";
import { EXTENSION_LIMITS } from "@/lib/extension/types";
import { SAVED_JOBS_LIMIT } from "@/lib/job-feed/types";
import { trackingExport } from "@/lib/inbound/records";
import { recapCutoffDay } from "@/lib/recap/types";
import { RESUME_LIMITS } from "@/config/plans";
import { WRITING_LIMITS, type WritingKind } from "@/lib/writings/schema";

const KIND_FOLDERS: Record<WritingKind, string> = {
  letter: "cover-letters",
  answer: "application-answers",
  outreach: "outreach-messages",
};

const day = (at: number) => new Date(at).toISOString().slice(0, 10);

// Far more than anyone makes; the caps only bound the download.
const SHARE_EXPORT_LIMIT = 1_000;
const FEEDBACK_EXPORT_LIMIT = 1_000;

// Every setting, as stored. The answers, days active and recaps have their own files; link secrets, device cookies and another account's id stay out.
const NOT_SETTINGS = [
  "userId",
  "applyAnswers",
  "applyAnswersAt",
  "activeDays",
  "recaps",
  "deletedResumes",
  "calendarFeedId",
  "calendarTokenHash",
  "referralDeviceIds",
  "referralDeviceId",
  "referredBy",
  "trackingConfirmCode",
  "trackingConfirmUrl",
] as const;
const SETTINGS_COLUMNS = Object.fromEntries(
  Object.entries(getTableColumns(userSettings)).filter(
    ([key]) => !(NOT_SETTINGS as readonly string[]).includes(key),
  ),
) as Omit<(typeof userSettings)["_"]["columns"], (typeof NOT_SETTINGS)[number]>;

function slug(text: string, fallback: string): string {
  const cleaned = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || fallback;
}

// A name used twice gets a number, so no file in the ZIP replaces another.
function uniqueNamer() {
  const used = new Map<string, number>();
  return (name: string, extension: string) => {
    const count = (used.get(name) ?? 0) + 1;
    used.set(name, count);
    return `${count === 1 ? name : `${name}-${count}`}.${extension}`;
  };
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  // A leading = + - @ would run as a formula when the file opens in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function buildDataExport(
  userId: string,
  now = Date.now(),
): Promise<Uint8Array<ArrayBuffer>> {
  const db = await getDb();
  const tracking = trackingExport(userId);
  const [resumeRows, writingRows, applicationRows, postRows, settingsRows] = await Promise.all([
    db
      .select({ id: resumes.id, data: resumes.data, updatedAt: resumes.updatedAt })
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(asc(resumes.createdAt))
      .limit(RESUME_LIMITS.paid),
    db
      .select({
        kind: writings.kind,
        company: writings.company,
        role: writings.role,
        jobUrl: writings.jobUrl,
        question: writings.question,
        subject: writings.subject,
        body: writings.body,
        createdAt: writings.createdAt,
      })
      .from(writings)
      .where(and(eq(writings.userId, userId), eq(writings.demo, false)))
      .orderBy(asc(writings.createdAt))
      .limit(WRITING_LIMITS.perUser),
    db
      .select({
        company: applications.company,
        role: applications.role,
        jobUrl: applications.jobUrl,
        status: applications.status,
        appliedAt: applications.appliedAt,
        interviewAt: applications.interviewAt,
        interviewTime: applications.interviewTime,
        interviewZone: applications.interviewZone,
        followUpAt: applications.followUpAt,
        resumeTitle: applications.resumeTitle,
        notes: applications.notes,
        statusHistory: applications.statusHistory,
        prep: applications.prep,
      })
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(asc(applications.appliedAt))
      .limit(APPLICATION_LIMITS.perUser),
    db
      .select({
        title: savedPosts.title,
        company: savedPosts.company,
        location: savedPosts.location,
        url: savedPosts.url,
        savedAt: savedPosts.savedAt,
        post: savedPosts.post,
      })
      .from(savedPosts)
      .where(eq(savedPosts.userId, userId))
      .orderBy(asc(savedPosts.savedAt))
      .limit(EXTENSION_LIMITS.savedPosts),
    db
      .select({
        answers: userSettings.applyAnswers,
        updatedAt: userSettings.applyAnswersAt,
        days: userSettings.activeDays,
        recaps: userSettings.recaps,
        settings: SETTINGS_COLUMNS,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1),
  ]);
  const [portfolioRows, shareRows, savedJobRows, feedbackRows] = await Promise.all([
    db
      .select({
        address: portfolios.slug,
        template: portfolios.template,
        published: portfolios.published,
        publishedAt: portfolios.publishedAt,
        resumeId: portfolios.resumeId,
        sync: portfolios.sync,
        showEmail: portfolios.showEmail,
        showPhone: portfolios.showPhone,
        hiddenSections: portfolios.hiddenSections,
        allowIndexing: portfolios.allowIndexing,
        content: portfolios.content,
        views: portfolios.views,
        createdAt: portfolios.createdAt,
        updatedAt: portfolios.updatedAt,
      })
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1),
    db
      .select({
        address: shares.slug,
        resumeId: shares.resumeId,
        showContact: shares.showContact,
        allowIndexing: shares.allowIndexing,
        views: shares.views,
        lastViewedAt: shares.lastViewedAt,
        createdAt: shares.createdAt,
        revokedAt: shares.revokedAt,
      })
      .from(shares)
      .where(eq(shares.userId, userId))
      .orderBy(asc(shares.createdAt))
      .limit(SHARE_EXPORT_LIMIT),
    db
      .select({
        title: jobs.title,
        company: jobs.company,
        location: jobs.location,
        url: jobs.url,
        savedAt: savedJobs.savedAt,
      })
      .from(savedJobs)
      .innerJoin(jobs, eq(jobs.id, savedJobs.jobId))
      .where(eq(savedJobs.userId, userId))
      .orderBy(asc(savedJobs.savedAt))
      .limit(SAVED_JOBS_LIMIT),
    db
      .select({
        kind: feedback.kind,
        message: feedback.message,
        pagePath: feedback.pagePath,
        createdAt: feedback.createdAt,
      })
      .from(feedback)
      .where(eq(feedback.userId, userId))
      .orderBy(asc(feedback.createdAt))
      .limit(FEEDBACK_EXPORT_LIMIT),
  ]);
  const settingsRow = settingsRows[0] ?? null;
  const cutoff = recapCutoffDay(now);
  const recapRows = Object.entries(settingsRow?.recaps ?? {})
    .filter(([week]) => week >= cutoff)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, stored]) => ({ week, builtAt: stored.builtAt, recap: stored.data }));
  const dayRows = (settingsRow?.days ?? []).filter((active) => active >= cutoff);
  const answers =
    settingsRow?.answers == null
      ? null
      : { answers: settingsRow.answers, updatedAt: settingsRow.updatedAt };
  const settings = settingsRow?.settings ?? null;
  const portfolio = portfolioRows[0] ?? null;
  const { address, emails } = await tracking;
  const tracked = address !== null || emails.length > 0;
  const logEntries = await listEntries(userId);

  const zip = new JSZip();
  zip.file(
    "README.txt",
    [
      `Your ${BRAND.name} data, downloaded on ${day(now)}.`,
      "",
      `resumes/: ${resumeRows.length} resumes saved to your account, as JSON.`,
      `cover-letters/, application-answers/, outreach-messages/: ${writingRows.length} pieces of writing, as text.`,
      `applications.csv and applications.json: ${applicationRows.length} tracked applications.`,
      ...(postRows.length > 0
        ? [
            `saved-posts.json: ${postRows.length} jobs saved from Otto for Chrome, with their posts.`,
          ]
        : []),
      ...(answers
        ? ["apply-answers.json: the answers Otto for Chrome puts into application forms."]
        : []),
      ...(settings
        ? [
            "settings.json: your settings (where you can work, Looking for, reminders, writing style, career log check-ins), as Otto stores them.",
          ]
        : []),
      ...(portfolio ? ["portfolio.json: your portfolio page's settings and content."] : []),
      ...(shareRows.length > 0
        ? [`share-links.json: ${shareRows.length} share links to your resumes, with their views.`]
        : []),
      ...(savedJobRows.length > 0
        ? [`saved-jobs.json: ${savedJobRows.length} jobs saved from the Jobs tab.`]
        : []),
      ...(feedbackRows.length > 0
        ? [`feedback.json: ${feedbackRows.length} feedback notes you sent.`]
        : []),
      ...(tracked
        ? [
            `email-tracking.json: your tracking addresses, the Gmail addresses you confirmed, and ${emails.length} job emails Otto read (what it read, never the email).`,
          ]
        : []),
      ...(logEntries.length > 0
        ? [
            `career-log.txt and career-log.json: your career log, ${logEntries.length} ${logEntries.length === 1 ? "month" : "months"}.`,
          ]
        : []),
      ...(recapRows.length > 0
        ? [
            `weekly-recaps.json: ${recapRows.length} ${recapRows.length === 1 ? "week" : "weeks"} of Your week with Otto, as Otto counted them.`,
          ]
        : []),
      ...(dayRows.length > 0
        ? ["active-days.json: the days your account opened the app in the past 10 weeks."]
        : []),
      "",
      "Resumes kept only in this browser and not backed up yet aren't included.",
      "",
    ].join("\n"),
  );

  const resumeName = uniqueNamer();
  for (const row of resumeRows) {
    const title = typeof row.data.title === "string" ? row.data.title : "";
    zip.file(
      `resumes/${resumeName(slug(title, "resume"), "json")}`,
      JSON.stringify(row.data, null, 2),
    );
  }

  const writingName = uniqueNamer();
  for (const row of writingRows) {
    const about = [row.role, row.company].filter(Boolean).join(" at ");
    const lines = [
      about ? `For: ${about}` : null,
      row.jobUrl ? `Job post: ${row.jobUrl}` : null,
      row.question ? `Question: ${row.question}` : null,
      row.subject ? `Subject: ${row.subject}` : null,
      `Written: ${day(row.createdAt)}`,
      "",
      row.body,
      "",
    ].filter((line): line is string => line !== null);
    const name = `${day(row.createdAt)}-${slug(row.company || row.role, row.kind)}`;
    zip.file(`${KIND_FOLDERS[row.kind]}/${writingName(name, "txt")}`, lines.join("\n"));
  }

  const header = [
    "Company",
    "Role",
    "Status",
    "Applied",
    "Interview",
    "Follow up",
    "Resume",
    "Job post",
    "Notes",
  ];
  const csv = [
    header.join(","),
    ...applicationRows.map((row) =>
      [
        row.company,
        row.role,
        STATUS_NAMES[row.status],
        day(row.appliedAt),
        row.interviewAt === null ? null : day(row.interviewAt),
        row.followUpAt === null ? null : day(row.followUpAt),
        row.resumeTitle,
        row.jobUrl,
        row.notes,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  zip.file("applications.csv", `${csv.join("\r\n")}\r\n`);
  zip.file("applications.json", JSON.stringify(applicationRows, null, 2));
  if (postRows.length > 0) zip.file("saved-posts.json", JSON.stringify(postRows, null, 2));
  if (answers) zip.file("apply-answers.json", JSON.stringify(answers, null, 2));
  if (settings) zip.file("settings.json", JSON.stringify(settings, null, 2));
  if (portfolio) zip.file("portfolio.json", JSON.stringify(portfolio, null, 2));
  if (shareRows.length > 0) zip.file("share-links.json", JSON.stringify(shareRows, null, 2));
  if (savedJobRows.length > 0) zip.file("saved-jobs.json", JSON.stringify(savedJobRows, null, 2));
  if (feedbackRows.length > 0) zip.file("feedback.json", JSON.stringify(feedbackRows, null, 2));
  if (tracked) zip.file("email-tracking.json", JSON.stringify({ address, emails }, null, 2));
  if (logEntries.length > 0) {
    zip.file("career-log.txt", careerLogText(logEntries, day(now)));
    zip.file("career-log.json", careerLogJson(logEntries));
  }
  if (recapRows.length > 0) zip.file("weekly-recaps.json", JSON.stringify(recapRows, null, 2));
  if (dayRows.length > 0) zip.file("active-days.json", JSON.stringify(dayRows, null, 2));

  return new Uint8Array(await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" }));
}
