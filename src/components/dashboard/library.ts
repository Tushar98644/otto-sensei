import { resumeTitle } from "@/lib/resume/ops";
import type { Resume, ResumeSource } from "@/lib/resume/schema";

export const LIBRARY_FILTERS = ["all", "import", "tailored", "sample", "scratch"] as const;
export type LibraryFilter = (typeof LIBRARY_FILTERS)[number];

export const FILTER_LABELS: Record<LibraryFilter, string> = {
  all: "All",
  import: "Uploaded",
  tailored: "Tailored",
  sample: "Samples",
  scratch: "From scratch",
};

export const SOURCE_TABS: Record<ResumeSource, string> = {
  import: "Uploaded",
  tailored: "Tailored",
  sample: "Sample",
  scratch: "From scratch",
};

export const LIBRARY_SORTS = ["edited", "name"] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

export const SORT_LABELS: Record<LibrarySort, string> = {
  edited: "Last edited",
  name: "Name",
};

export type LibraryQuery = { query: string; filter: LibraryFilter; sort: LibrarySort };

export function filterCounts(resumes: readonly Resume[]): Record<LibraryFilter, number> {
  const counts: Record<LibraryFilter, number> = { all: 0, import: 0, tailored: 0, sample: 0, scratch: 0 };
  for (const resume of resumes) {
    counts.all += 1;
    counts[resume.source] += 1;
  }
  return counts;
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function searchable(resume: Resume): string {
  return fold(
    [
      resume.title,
      resume.basics.name,
      resume.tailor?.jobTitle ?? "",
      resume.tailor?.company ?? "",
      ...resume.experience.map((job) => job.company),
    ].join(" \n "),
  );
}

export function matchesQuery(resume: Resume, query: string): boolean {
  const terms = fold(query).split(" ").filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = searchable(resume);
  return terms.every((term) => haystack.includes(term));
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

export function sortResumes(resumes: readonly Resume[], sort: LibrarySort): Resume[] {
  const indexed = resumes.map((resume, index) => ({ resume, index }));
  indexed.sort((a, b) => {
    const primary =
      sort === "name"
        ? collator.compare(resumeTitle(a.resume), resumeTitle(b.resume))
        : b.resume.updatedAt - a.resume.updatedAt;
    return primary || a.index - b.index;
  });
  return indexed.map(({ resume }) => resume);
}

export function libraryView(resumes: readonly Resume[], { query, filter, sort }: LibraryQuery): Resume[] {
  const shown = resumes.filter(
    (resume) => (filter === "all" || resume.source === filter) && matchesQuery(resume, query),
  );
  return sortResumes(shown, sort);
}

export function recentResumes(resumes: readonly Resume[], limit: number): Resume[] {
  return sortResumes(resumes, "edited").slice(0, limit);
}

export function tailoredCounts(resumes: readonly Resume[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const resume of resumes) {
    const baseId = resume.tailor?.baseResumeId;
    if (!baseId || baseId === resume.id) continue;
    counts.set(baseId, (counts.get(baseId) ?? 0) + 1);
  }
  return counts;
}

export function tailoredJob(resume: Resume): string | null {
  if (!resume.tailor) return null;
  const parts = [resume.tailor.jobTitle.trim(), resume.tailor.company.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
