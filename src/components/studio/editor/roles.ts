import { companyKey } from "@/lib/pdf/visible";
import { newExperience, type Experience } from "@/lib/resume/schema";

// Several roles at one company: consecutive jobs with the same company (case, accents and
// punctuation aside) show under one company heading. Nothing about it is stored; it follows the
// job list. The key is the PDF's own, so the editor groups exactly what the page groups.

type Job = Pick<Experience, "id" | "company">;

// One row of the experience list: a lone job, or two or more roles at one company.
export type RoleUnit = { ids: string[]; company: string };

export function groupRoles(jobs: readonly Job[]): RoleUnit[] {
  const units: RoleUnit[] = [];
  let previousKey = "";
  for (const job of jobs) {
    const key = companyKey(job.company);
    const last = units.at(-1);
    if (last && key !== "" && key === previousKey) last.ids.push(job.id);
    else units.push({ ids: [job.id], company: job.company.trim() });
    previousKey = key;
  }
  return units;
}

// Units as strings, so a store selector can compare them with useShallow: the list re-renders
// when jobs are added, moved or regrouped, not on every keystroke.
export function roleLayout(jobs: readonly Job[]): string[] {
  return groupRoles(jobs).map((unit) => JSON.stringify(unit.ids));
}

export function parseRoleLayout(layout: readonly string[]): string[][] {
  return layout.map((unit) => JSON.parse(unit) as string[]);
}

// Moves the lone job or company holding `id` past the unit next to it, so a job never lands
// between two roles of another company.
export function moveRoleUnit<T extends Job>(jobs: T[], id: string, delta: -1 | 1): T[] {
  const units = groupRoles(jobs);
  const from = units.findIndex((unit) => unit.ids.includes(id));
  const to = from + delta;
  const unit = units[from];
  const other = units[to];
  if (!unit || !other) return jobs;
  units[from] = other;
  units[to] = unit;
  const byId = new Map(jobs.map((job) => [job.id, job]));
  return units.flatMap((item) => item.ids.map((jobId) => byId.get(jobId)!));
}

// Another role at the same company, with the company filled in. It goes right after the
// company's last role (insertAfter), so it joins the group.
export function newRole(company: string): Experience {
  return { ...newExperience(), company };
}
