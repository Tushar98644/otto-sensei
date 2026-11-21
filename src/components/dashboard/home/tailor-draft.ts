import type { SavedResult, TailorDraft } from "@/components/studio/tailor/session";
import type { Resume } from "@/lib/resume/schema";
import type { TailorTarget } from "./next-steps";

// The tailor step works from the open resume's original, so the draft belongs to that one.
export function tailorSource(resumes: readonly Resume[], activeId: string | null): Resume | null {
  const active = activeId ? resumes.find((resume) => resume.id === activeId) : undefined;
  if (!active) return null;
  const baseId = active.tailor?.baseResumeId;
  return (baseId ? resumes.find((resume) => resume.id === baseId) : undefined) ?? active;
}

const companyOf = (job: TailorDraft) => job.company.trim() || job.posting?.company.trim() || "";

export function unfinishedTailor({
  source,
  draft,
  last,
}: {
  source: Resume | null;
  draft: TailorDraft;
  last: SavedResult | null;
}): TailorTarget | null {
  if (!source) return null;
  const post = draft.text.trim();
  if (last && last.sourceId === source.id && (post === "" || last.job.text.trim() === post)) {
    if (last.copyId) return null;
    const company = companyOf(last.job) || last.result.job.company.trim();
    return { resumeId: source.id, company, ran: true };
  }
  if (post === "") return null;
  return { resumeId: source.id, company: companyOf(draft), ran: false };
}
