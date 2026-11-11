import { companyKey } from "@/lib/pdf/visible";
import { newExperience, type Experience } from "@/lib/resume/schema";

// Consecutive jobs at one company (case, accents and punctuation aside) group under one heading.
// Nothing is stored; the key is the PDF's own, so the editor groups exactly what the page groups.

type Job = Pick<Experience, "id" | "company">;

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

// Strings, so useShallow can compare them: the list re-renders on regrouping, not keystrokes.
export function roleLayout(jobs: readonly Job[]): string[] {
  return groupRoles(jobs).map((unit) => JSON.stringify(unit.ids));
}

export function parseRoleLayout(layout: readonly string[]): string[][] {
  return layout.map((unit) => JSON.parse(unit) as string[]);
}

// Moves whole units, so a job never lands between two roles of another company.
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

// Goes right after the company's last role (insertAfter), so it joins the group.
export function newRole(company: string): Experience {
  return { ...newExperience(), company };
}
