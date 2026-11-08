import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

export function resumeLabel(resume: Resume): string {
  return resumeTitle(resume);
}

// "Tailored · Acme" for tailored copies, null for everything else.
export function tailoredLabel(resume: Resume): string | null {
  if (!resume.tailor) return null;
  const company = resume.tailor.company.trim();
  return company ? `Tailored · ${company}` : "Tailored";
}
