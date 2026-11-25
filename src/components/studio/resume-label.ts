import { fmt } from "@/i18n/format";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

export function resumeLabel(resume: Resume): string {
  return resumeTitle(resume);
}

const TAILORED = { tailored: "Tailored", tailoredAt: "Tailored · {company}" };

// The studio passes its own words; other pages read English.
export function tailoredLabel(resume: Resume, words: typeof TAILORED = TAILORED): string | null {
  if (!resume.tailor) return null;
  const company = resume.tailor.company.trim();
  return company ? fmt(words.tailoredAt, { company }) : words.tailored;
}
