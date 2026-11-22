import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { resumes } from "@/db/schema";
import { RESUME_LIMITS } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { readWorkProfile } from "@/lib/eligibility/records";
import { resumeTitle, suggestedFileName, visibleResume } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { parseDate } from "@/lib/sendcheck/dates";
import { readApplyAnswers } from "./answer-records";
import { withWorkProfile } from "./answers";
import type { FillContact, FillDate, FillJob, FillProfile, FillSchool } from "./types";
import { canonicalJobUrl } from "./urls";

const MAX_JOBS = 10;
const MAX_SCHOOLS = 5;
const DESCRIPTION_CHARS = 2_000;

export async function readResume(userId: string, id: string): Promise<Resume | null> {
  const db = await getDb();
  const [row] = await db
    .select({ data: resumes.data })
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.id, id)))
    .limit(1);
  const parsed = row ? ResumeSchema.safeParse(row.data) : null;
  return parsed?.success ? parsed.data : null;
}

// The newest copy tailored for this job link, so the form gets what was written for it.
async function tailoredFor(userId: string, url: string): Promise<string | null> {
  const want = canonicalJobUrl(url);
  if (!want) return null;
  const db = await getDb();
  const rows = await db
    .select({ id: resumes.id, jobUrl: sql<string | null>`${resumes.data}->'tailor'->>'jobUrl'` })
    .from(resumes)
    .where(
      and(
        eq(resumes.userId, userId),
        sql`coalesce(${resumes.data}->'tailor'->>'jobUrl', '') <> ''`,
      ),
    )
    .orderBy(desc(resumes.updatedAt), desc(resumes.id))
    .limit(RESUME_LIMITS.paid);
  return rows.find((row) => row.jobUrl && canonicalJobUrl(row.jobUrl) === want)?.id ?? null;
}

async function newestBase(userId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: resumes.id })
    .from(resumes)
    .where(
      and(
        eq(resumes.userId, userId),
        sql`coalesce(${resumes.data}->'tailor', 'null'::jsonb) = 'null'::jsonb`,
      ),
    )
    .orderBy(desc(resumes.updatedAt), desc(resumes.id))
    .limit(1);
  return row?.id ?? null;
}

export type ResumeChoice = { resume: Resume; tailored: boolean };

// The tailored copy for this job if there is one, else the resume picked in the badge, else the newest.
export async function resumeToSend(
  userId: string,
  picked: string | null,
  url: string | null,
): Promise<ResumeChoice | null> {
  const tailored = url ? await tailoredFor(userId, url) : null;
  if (tailored) {
    const resume = await readResume(userId, tailored);
    if (resume) return { resume, tailored: true };
  }
  const chosen = picked ? await readResume(userId, picked) : null;
  if (chosen) return { resume: chosen, tailored: chosen.tailor !== null };
  const newest = await newestBase(userId);
  const resume = newest ? await readResume(userId, newest) : null;
  return resume ? { resume, tailored: false } : null;
}

export function fillDate(raw: string): FillDate | null {
  const parsed = parseDate(raw);
  if (parsed === null || parsed === "present") return null;
  const year = Math.floor(parsed.earliest / 12);
  const whole = parsed.earliest % 12 === 0 && parsed.latest === parsed.earliest + 11;
  return { year, month: whole ? null : (parsed.earliest % 12) + 1 };
}

const isPresent = (raw: string) => raw.trim() === "" || parseDate(raw) === "present";

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function linkKind(
  url: string,
): keyof Pick<FillContact, "linkedin" | "github" | "twitter" | "website"> {
  const host = (() => {
    try {
      return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (host.endsWith("linkedin.com")) return "linkedin";
  if (host.endsWith("github.com")) return "github";
  if (host.endsWith("twitter.com") || host === "x.com" || host.endsWith(".x.com")) return "twitter";
  return "website";
}

const withScheme = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export function contactOf(resume: Resume, accountEmail: string, country: string): FillContact {
  const { basics } = resume;
  const links: Record<"linkedin" | "github" | "twitter" | "website", string[]> = {
    linkedin: [],
    github: [],
    twitter: [],
    website: [],
  };
  for (const link of basics.links) {
    const url = link.url.trim();
    if (url) links[linkKind(url)].push(withScheme(url));
  }
  return {
    ...splitName(basics.name),
    fullName: basics.name.trim(),
    email: basics.email.trim() || accountEmail,
    phone: basics.phone.trim(),
    location: basics.location.trim(),
    city: basics.location.split(",")[0]?.trim() ?? "",
    country,
    linkedin: links.linkedin[0] ?? "",
    github: links.github[0] ?? "",
    twitter: links.twitter[0] ?? "",
    // A portfolio is the person's own site; any second site is the "other website".
    portfolio: links.website[0] ?? "",
    website: links.website[1] ?? links.website[0] ?? "",
  };
}

function jobsOf(resume: Resume): FillJob[] {
  return resume.experience.slice(0, MAX_JOBS).map((job) => ({
    company: job.company.trim(),
    title: job.title.trim(),
    location: job.location.trim(),
    start: fillDate(job.startDate),
    end: isPresent(job.endDate) ? null : fillDate(job.endDate),
    current: isPresent(job.endDate),
    description: job.bullets
      .map((bullet) => bullet.text.trim())
      .filter(Boolean)
      .map((text) => `- ${text}`)
      .join("\n")
      .slice(0, DESCRIPTION_CHARS),
  }));
}

function schoolsOf(resume: Resume): FillSchool[] {
  return resume.education.slice(0, MAX_SCHOOLS).map((school) => ({
    school: school.school.trim(),
    degree: school.degree.trim(),
    field: school.field.trim(),
    start: fillDate(school.startDate),
    end: fillDate(school.endDate),
  }));
}

export async function readFillProfile(
  user: SessionUser,
  picked: string | null,
  url: string | null,
): Promise<FillProfile | null> {
  const [choice, work, saved] = await Promise.all([
    resumeToSend(user.id, picked, url),
    readWorkProfile(user.id),
    readApplyAnswers(user.id),
  ]);
  if (!choice) return null;
  // Hidden lines and sections stay out of forms, as they stay out of the PDF.
  const resume = visibleResume(choice.resume);
  const profile = work.updatedAt === null ? null : work.profile;
  const jobs = jobsOf(resume).filter((job) => job.company || job.title);
  const current = jobs.find((job) => job.current) ?? jobs[0] ?? null;
  return {
    resume: {
      id: choice.resume.id,
      title: resumeTitle(choice.resume),
      tailored: choice.tailored,
      fileName: suggestedFileName(choice.resume),
    },
    contact: contactOf(resume, user.email, profile?.country ?? ""),
    current: current ? { company: current.company, title: current.title } : null,
    work: jobs,
    education: schoolsOf(resume).filter((school) => school.school),
    answers: withWorkProfile(saved, profile),
    saved,
  };
}
