import { and, asc, eq } from "drizzle-orm";
import JSZip from "jszip";
import { BRAND } from "@/config/brand";
import { getDb } from "@/db/client";
import {
  activeDays,
  applications,
  applyAnswers,
  resumes,
  savedPosts,
  weeklyRecaps,
  writings,
} from "@/db/schema";
import { APPLICATION_LIMITS } from "@/lib/applications/schema";
import { careerLogJson, careerLogText } from "@/lib/career-log/export";
import { listEntries } from "@/lib/career-log/records";
import { STATUS_NAMES } from "@/lib/applications/status";
import { EXTENSION_LIMITS } from "@/lib/extension/types";
import { trackingExport } from "@/lib/inbound/records";
import { RESUME_LIMITS } from "@/config/plans";
import { WRITING_LIMITS, type WritingKind } from "@/lib/writings/schema";

const KIND_FOLDERS: Record<WritingKind, string> = {
  letter: "cover-letters",
  answer: "application-answers",
  outreach: "outreach-messages",
};

const day = (at: number) => new Date(at).toISOString().slice(0, 10);

// Both are kept about 10 weeks, so these caps are never reached.
const RECAP_EXPORT_LIMIT = 30;
const ACTIVE_DAYS_EXPORT_LIMIT = 200;

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
  const [resumeRows, writingRows, applicationRows, postRows, answerRows] = await Promise.all([
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
      .select({ answers: applyAnswers.answers, updatedAt: applyAnswers.updatedAt })
      .from(applyAnswers)
      .where(eq(applyAnswers.userId, userId))
      .limit(1),
  ]);
  const [recapRows, dayRows] = await Promise.all([
    db
      .select({
        week: weeklyRecaps.weekStart,
        builtAt: weeklyRecaps.builtAt,
        recap: weeklyRecaps.data,
      })
      .from(weeklyRecaps)
      .where(eq(weeklyRecaps.userId, userId))
      .orderBy(asc(weeklyRecaps.weekStart))
      .limit(RECAP_EXPORT_LIMIT),
    db
      .select({ day: activeDays.day })
      .from(activeDays)
      .where(eq(activeDays.userId, userId))
      .orderBy(asc(activeDays.day))
      .limit(ACTIVE_DAYS_EXPORT_LIMIT),
  ]);
  const answers = answerRows[0] ?? null;
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
  if (tracked) zip.file("email-tracking.json", JSON.stringify({ address, emails }, null, 2));
  if (logEntries.length > 0) {
    zip.file("career-log.txt", careerLogText(logEntries, day(now)));
    zip.file("career-log.json", careerLogJson(logEntries));
  }
  if (recapRows.length > 0) zip.file("weekly-recaps.json", JSON.stringify(recapRows, null, 2));
  if (dayRows.length > 0) {
    const days = dayRows.map((row) => row.day);
    zip.file("active-days.json", JSON.stringify(days, null, 2));
  }

  return new Uint8Array(await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" }));
}
