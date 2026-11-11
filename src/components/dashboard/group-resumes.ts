import type { Resume } from "@/lib/resume/schema";

export type ResumeGroup = {
  resume: Resume;
  tailored: Resume[];
};

export function groupResumes(resumes: readonly Resume[]): ResumeGroup[] {
  const ids = new Set(resumes.map((resume) => resume.id));
  const copies = new Map<string, Resume[]>();
  for (const resume of resumes) {
    const baseId = resume.tailor?.baseResumeId;
    if (!baseId || baseId === resume.id || !ids.has(baseId)) continue;
    const list = copies.get(baseId) ?? [];
    list.push(resume);
    copies.set(baseId, list);
  }
  const nested = new Set([...copies.values()].flat().map((resume) => resume.id));
  return resumes
    .filter((resume) => !nested.has(resume.id))
    .map((resume) => ({ resume, tailored: copies.get(resume.id) ?? [] }));
}
