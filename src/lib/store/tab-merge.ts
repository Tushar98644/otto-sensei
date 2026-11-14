import type { RecruiterReport } from "@/lib/checks/types";
import type { Resume } from "@/lib/resume/schema";
import { capVersions, freshTrash, type ResumeVersion, type TrashedResume } from "./history";
import type { PersistedStudio, Removals, SavedStudio } from "./persisted";

// Record by record: something missing from another tab's save is gone only if it's listed as removed.

export type TabMerge = {
  state: PersistedStudio;
  // Resumes whose copy here was replaced or removed, so their undo history goes too.
  replaced: ReadonlySet<string>;
  // This tab holds something the save lacks, so the merge should be saved back.
  extra: boolean;
};

const has = (record: object, key: string) => Object.hasOwn(record, key);

function sameRecord<T>(a: Record<string, T>, b: Record<string, T>): boolean {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((key) => has(b, key) && a[key] === b[key])
  );
}

function sameList<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

function mergeResumes(
  mine: Record<string, Resume>,
  base: Record<string, Resume> | undefined,
  theirs: Record<string, Resume>,
  removed: Removals,
) {
  const out: Record<string, Resume> = {};
  const replaced = new Set<string>();
  let extra = false;
  for (const [id, m] of Object.entries(mine)) {
    const t = has(theirs, id) ? theirs[id] : undefined;
    if (t) {
      if (t.updatedAt > m.updatedAt) {
        out[id] = t;
        replaced.add(id);
      } else {
        out[id] = m;
        if (m.updatedAt > t.updatedAt) extra = true;
      }
    } else if (m.updatedAt <= (removed[`r:${id}`] ?? -Infinity)) {
      replaced.add(id);
    } else {
      // Edited here after another tab removed it, or that tab never had it.
      out[id] = m;
      extra = true;
    }
  }
  for (const [id, t] of Object.entries(theirs)) {
    if (has(mine, id)) continue;
    if (base && has(base, id)) extra = true;
    else out[id] = t;
  }
  return { resumes: sameRecord(out, mine) ? mine : out, replaced, extra };
}

function mergeVersions(
  mine: Record<string, ResumeVersion[]>,
  base: Record<string, ResumeVersion[]> | undefined,
  theirs: Record<string, ResumeVersion[]> | undefined,
  removed: Removals,
  resumes: Record<string, Resume>,
) {
  const out: Record<string, ResumeVersion[]> = {};
  let extra = false;
  for (const id of new Set([...Object.keys(mine), ...Object.keys(theirs ?? {})])) {
    if (!has(resumes, id)) continue;
    const m = (has(mine, id) ? mine[id] : undefined) ?? [];
    // A save too big for storage left the versions out; that says nothing about them.
    if (!theirs) {
      if (m.length > 0) out[id] = m;
      continue;
    }
    const t = (has(theirs, id) ? theirs[id] : undefined) ?? [];
    const theirIds = new Set(t.map((v) => v.id));
    const mineIds = new Set(m.map((v) => v.id));
    const baseIds = new Set(
      ((base && has(base, id) ? base[id] : undefined) ?? []).map((v) => v.id),
    );
    const list: ResumeVersion[] = [];
    for (const v of m) {
      if (theirIds.has(v.id)) list.push(v);
      else if (removed[`v:${id}/${v.id}`] === undefined) {
        list.push(v);
        extra = true;
      }
    }
    for (const v of t) {
      if (mineIds.has(v.id)) continue;
      if (baseIds.has(v.id)) extra = true;
      else list.push(v);
    }
    const merged = capVersions(list.sort((a, b) => b.savedAt - a.savedAt));
    if (merged.length > 0) out[id] = sameList(merged, m) ? m : merged;
  }
  return { versions: sameRecord(out, mine) ? mine : out, extra };
}

function mergeTrash(
  mine: TrashedResume[],
  base: TrashedResume[] | undefined,
  theirs: TrashedResume[] | undefined,
  removed: Removals,
  now: number,
) {
  if (!theirs) return { trash: mine, extra: false };
  const theirsById = new Map(theirs.map((entry) => [entry.resume.id, entry]));
  const mineIds = new Set(mine.map((entry) => entry.resume.id));
  const baseIds = new Set((base ?? []).map((entry) => entry.resume.id));
  const list: TrashedResume[] = [];
  let extra = false;
  for (const entry of mine) {
    const t = theirsById.get(entry.resume.id);
    if (t) {
      list.push(t.deletedAt > entry.deletedAt ? t : entry);
      if (entry.deletedAt > t.deletedAt) extra = true;
    } else if (entry.deletedAt > (removed[`t:${entry.resume.id}`] ?? -Infinity)) {
      list.push(entry);
      extra = true;
    }
  }
  for (const entry of theirs) {
    if (mineIds.has(entry.resume.id)) continue;
    if (baseIds.has(entry.resume.id)) extra = true;
    else list.push(entry);
  }
  const merged = freshTrash(list, now);
  return { trash: sameList(merged, mine) ? mine : merged, extra };
}

// Reports only go with their resume, so the newer check of each one is kept.
function mergeReports(
  mine: Record<string, RecruiterReport>,
  theirs: Record<string, RecruiterReport>,
  resumes: Record<string, Resume>,
) {
  const out: Record<string, RecruiterReport> = {};
  let extra = false;
  for (const id of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
    if (!has(resumes, id)) continue;
    const m = has(mine, id) ? mine[id] : undefined;
    const t = has(theirs, id) ? theirs[id] : undefined;
    if (m && t) {
      out[id] = (t.checkedAt ?? 0) > (m.checkedAt ?? 0) ? t : m;
      if ((m.checkedAt ?? 0) > (t.checkedAt ?? 0)) extra = true;
    } else if (m) {
      out[id] = m;
      extra = true;
    } else if (t) {
      out[id] = t;
    }
  }
  return { reports: sameRecord(out, mine) ? mine : out, extra };
}

// Resumes only the other tab has go where they sit in its list.
function mergeOrder(mine: string[], theirs: string[], resumes: Record<string, Resume>): string[] {
  const out = mine.filter((id) => has(resumes, id));
  const placed = new Set(out);
  let next: string | undefined;
  for (let i = theirs.length - 1; i >= 0; i--) {
    const id = theirs[i];
    if (id === undefined || (!placed.has(id) && !has(resumes, id))) continue;
    if (!placed.has(id)) {
      out.splice(next === undefined ? out.length : out.indexOf(next), 0, id);
      placed.add(id);
    }
    next = id;
  }
  for (const id of Object.keys(resumes)) if (!placed.has(id)) out.push(id);
  return sameList(out, mine) ? mine : out;
}

function emptyStudio(): PersistedStudio {
  return {
    resumes: {},
    order: [],
    activeId: null,
    reports: {},
    exportReports: {},
    step: "upload",
    versions: {},
    trash: [],
  };
}

// The open resume and step stay this tab's own.
export function mergeSaves(
  mine: PersistedStudio,
  base: SavedStudio | null,
  theirs: SavedStudio | null,
  removed: Removals,
  now: number,
): TabMerge {
  // Only deleting the account removes the save, so this tab lets go of everything too.
  if (!theirs) {
    return { state: emptyStudio(), replaced: new Set(Object.keys(mine.resumes)), extra: false };
  }
  const merged = mergeResumes(mine.resumes, base?.resumes, theirs.resumes, removed);
  const { resumes } = merged;
  const versions = mergeVersions(mine.versions, base?.versions, theirs.versions, removed, resumes);
  const trash = mergeTrash(mine.trash, base?.trash, theirs.trash, removed, now);
  const reports = mergeReports(mine.reports, theirs.reports, resumes);
  const exportReports = mergeReports(mine.exportReports, theirs.exportReports, resumes);
  const order = mergeOrder(mine.order, theirs.order, resumes);
  const activeId =
    mine.activeId !== null && has(resumes, mine.activeId) ? mine.activeId : (order[0] ?? null);
  return {
    state: {
      resumes,
      order,
      activeId,
      reports: reports.reports,
      exportReports: exportReports.reports,
      step: activeId ? mine.step : "upload",
      versions: versions.versions,
      trash: trash.trash,
    },
    replaced: merged.replaced,
    extra: merged.extra || versions.extra || trash.extra || reports.extra || exportReports.extra,
  };
}

export function sameStudio(a: PersistedStudio, b: PersistedStudio): boolean {
  return (
    a.resumes === b.resumes &&
    a.order === b.order &&
    a.activeId === b.activeId &&
    a.reports === b.reports &&
    a.exportReports === b.exportReports &&
    a.step === b.step &&
    a.versions === b.versions &&
    a.trash === b.trash
  );
}
