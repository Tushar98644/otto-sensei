import { createHash } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { resumes } from "@/db/schema";
import { TEXT_LIMITS } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { readWorkProfile } from "@/lib/eligibility/records";
import { placeFromProfile } from "@/lib/job-feed/looking-for";
import { resumeTitle, resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { extensionAccess } from "./plan";
import { savedPostRefs, savedPostsVersion } from "./posts";
import type { ExtensionProfile, ExtensionResume } from "./types";

// The badge's resume switcher; tailored copies belong to one job, so they're left out.
export const PROFILE_RESUMES = 10;

// Only what the match reads: contacts and links never leave the account.
export function matchText(resume: Resume): string {
  const basics = { ...resume.basics, name: "", email: "", phone: "", location: "", links: [] };
  return resumeToText({ ...resume, basics }).slice(0, TEXT_LIMITS.resumeChars);
}

type ResumeMeta = { id: string; updatedAt: number };

async function baseResumes(userId: string): Promise<ResumeMeta[]> {
  const db = await getDb();
  return db
    .select({ id: resumes.id, updatedAt: resumes.updatedAt })
    .from(resumes)
    .where(
      and(
        eq(resumes.userId, userId),
        sql`coalesce(${resumes.data}->'tailor', 'null'::jsonb) = 'null'::jsonb`,
      ),
    )
    .orderBy(desc(resumes.updatedAt), desc(resumes.id))
    .limit(PROFILE_RESUMES);
}

async function resumeData(userId: string, ids: string[]): Promise<ExtensionResume[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select({ data: resumes.data })
    .from(resumes)
    .where(and(eq(resumes.userId, userId), inArray(resumes.id, ids)));
  const out: ExtensionResume[] = [];
  for (const row of rows) {
    const parsed = ResumeSchema.safeParse(row.data);
    if (!parsed.success) continue;
    const resume = parsed.data;
    out.push({
      id: resume.id,
      title: resumeTitle(resume),
      updatedAt: resume.updatedAt,
      text: matchText(resume),
    });
  }
  const order = new Map(ids.map((id, index) => [id, index]));
  return out.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export type ProfileRead =
  { unchanged: true; version: string } | { unchanged: false; profile: ExtensionProfile };

// The version covers everything the badge shows, so an unchanged answer reads no resume text.
export async function readExtensionProfile(
  user: SessionUser,
  known: string | null,
): Promise<ProfileRead> {
  const [metas, work, posts] = await Promise.all([
    baseResumes(user.id),
    readWorkProfile(user.id),
    savedPostsVersion(user.id),
  ]);
  const version = createHash("sha256")
    .update(
      JSON.stringify([
        user.plan,
        user.trialEndsAt ?? null,
        metas.map((meta) => [meta.id, meta.updatedAt]),
        work.updatedAt,
        work.lookingFor.place,
        work.lookingFor.remote,
        posts,
      ]),
    )
    .digest("base64url")
    .slice(0, 22);
  if (known === version) return { unchanged: true, version };
  const profile = work.updatedAt === null ? null : work.profile;
  const [list, saved] = await Promise.all([
    resumeData(
      user.id,
      metas.map((meta) => meta.id),
    ),
    savedPostRefs(user.id),
  ]);
  return {
    unchanged: false,
    profile: {
      version,
      email: user.email,
      plan: user.plan,
      access: extensionAccess(user.plan),
      resumes: list,
      workProfile: profile,
      lookingFor: {
        place: work.lookingFor.place ?? placeFromProfile(profile),
        remote: work.lookingFor.remote,
      },
      saved,
    },
  };
}
