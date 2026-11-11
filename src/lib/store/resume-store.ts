"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { RecruiterReport } from "@/lib/checks/types";
import {
  cleanTitle,
  cloneResume,
  copyTitle,
  isTitleTaken,
  resumeTitle,
  touch,
  uniqueTitle,
} from "@/lib/resume/ops";
import type { Resume, TailorMeta } from "@/lib/resume/schema";
import {
  addVersion,
  adoptState,
  cleanVersionName,
  EMPTY_HISTORY,
  freshTrash,
  isSaved,
  newVersion,
  recordEdit,
  redoMove,
  undoMove,
  type EditOptions,
  type HistoryMove,
  type ResumeHistory,
  type ResumeVersion,
  type TrashedResume,
} from "./history";
import {
  migrateStudio,
  quotaSafe,
  sanitizeArchive,
  STUDIO_STORAGE_KEY,
  STUDIO_STORE_VERSION,
} from "./persisted";

// The browser copy stays the source of truth while editing; signed-in users also get a cloud
// backup.

export const STUDIO_STEPS = ["upload", "review", "fix", "tailor", "download"] as const;
export type StudioStep = (typeof STUDIO_STEPS)[number];

export const STEP_LABELS: Record<StudioStep, string> = {
  upload: "Upload",
  review: "Recruiter view",
  fix: "Fix lines",
  tailor: "Tailor",
  download: "Download",
};

export type TailorCopyMeta = Omit<TailorMeta, "baseResumeId" | "createdAt">;

export type { EditOptions, ResumeVersion, TrashedResume };
export { EDIT_LABELS } from "./history";

type StudioState = {
  resumes: Record<string, Resume>;
  // Newest first. Editing doesn't reorder, so the switcher doesn't jump while typing.
  order: string[];
  activeId: string | null;
  // Of the originally uploaded file. Absent for scratch and sample resumes.
  reports: Record<string, RecruiterReport>;
  // Of the PDF we exported, for the "before vs after" comparison.
  exportReports: Record<string, RecruiterReport>;
  step: StudioStep;
  versions: Record<string, ResumeVersion[]>;
  // Persisted in this browser for 30 days, never synced.
  trash: TrashedResume[];
  // Memory only.
  history: Record<string, ResumeHistory>;

  addResume: (resume: Resume, report?: RecruiterReport) => void;
  // Plain edits within 800 ms merge into one step; a `label` makes a separate named step (AI
  // edits).
  updateResume: (id: string, updater: (resume: Resume) => Resume, options?: EditOptions) => void;
  // Keeps nothing: for deletions from another device and signing out. People use trashResume().
  removeResume: (id: string) => void;
  // False (and no change) for a blank name or an unknown id.
  renameResume: (id: string, title: string) => boolean;
  // The open resume stays open: copying from the library is filing, not switching.
  duplicateResume: (id: string) => string | null;
  setActive: (id: string) => void;
  setStep: (step: StudioStep) => void;
  setExportReport: (id: string, report: RecruiterReport) => void;
  createTailoredCopy: (
    baseId: string,
    meta: TailorCopyMeta,
    apply: (copy: Resume) => Resume,
  ) => string | null;
  // Takes newer cloud copies and drops resumes the account deleted. Returns local resumes the cloud
  // is missing or has older, for the caller to upload.
  mergeFromCloud: (cloud: Resume[], deletedIds?: readonly string[]) => Resume[];
  clearAll: () => void;

  undo: (id: string) => boolean;
  redo: (id: string) => boolean;

  saveVersion: (id: string, name: string) => ResumeVersion | null;
  // The replaced state is kept as an automatic version first, so restoring never loses work.
  restoreVersion: (id: string, versionId: string) => boolean;
  deleteVersion: (id: string, versionId: string) => void;
  // Undo for deleteVersion. False when the resume is gone or the version is already there.
  putVersionBack: (id: string, version: ResumeVersion) => boolean;

  // Removing it is what makes sync delete the cloud copy.
  trashResume: (id: string) => boolean;
  // A copy under a new id (the account won't take a deleted id again), at the top of the list.
  restoreFromTrash: (trashedId: string) => string | null;
  deleteFromTrash: (trashedId: string) => void;
  emptyTrash: () => void;
};

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const initialData = {
  resumes: {} as Record<string, Resume>,
  order: [] as string[],
  activeId: null as string | null,
  reports: {} as Record<string, RecruiterReport>,
  exportReports: {} as Record<string, RecruiterReport>,
  step: "upload" as StudioStep,
  versions: {} as Record<string, ResumeVersion[]>,
  trash: [] as TrashedResume[],
  history: {} as Record<string, ResumeHistory>,
};

type StudioData = typeof initialData;
type PersistedStudio = Omit<StudioData, "history">;

function omitKeys<T>(record: Record<string, T>, ids: ReadonlySet<string>): Record<string, T> {
  if (![...ids].some((id) => Object.hasOwn(record, id))) return record;
  const next = { ...record };
  for (const id of ids) delete next[id];
  return next;
}

// When the active one goes, the newest remaining takes its place, or the studio returns to upload.
function withoutResumes(s: StudioData, ids: ReadonlySet<string>): StudioData {
  const order = s.order.filter((id) => !ids.has(id));
  const activeId = s.activeId !== null && ids.has(s.activeId) ? (order[0] ?? null) : s.activeId;
  return {
    resumes: omitKeys(s.resumes, ids),
    reports: omitKeys(s.reports, ids),
    exportReports: omitKeys(s.exportReports, ids),
    versions: omitKeys(s.versions, ids),
    history: omitKeys(s.history, ids),
    trash: s.trash,
    order,
    activeId,
    step: activeId ? s.step : "upload",
  };
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => {
      // A fresh edit time, so sync uploads it like any other change.
      function applyMove(id: string, move: (h: ResumeHistory, r: Resume) => HistoryMove | null) {
        const s = get();
        const current = s.resumes[id];
        if (!current) return false;
        const moved = move(s.history[id] ?? EMPTY_HISTORY, current);
        if (!moved) return false;
        const others = Object.values(s.resumes);
        set({
          resumes: { ...s.resumes, [id]: adoptState(moved.resume, current, others, Date.now()) },
          history: { ...s.history, [id]: moved.history },
        });
        return true;
      }

      return {
        ...initialData,

        addResume: (resume, report) =>
          set((s) => {
            const current = resumeTitle(resume);
            const title = uniqueTitle(current, Object.values(s.resumes), resume.id);
            const named = title === current ? resume : { ...resume, title };
            return {
              resumes: { ...s.resumes, [named.id]: named },
              order: [named.id, ...s.order.filter((id) => id !== named.id)],
              activeId: named.id,
              reports: report ? { ...s.reports, [named.id]: report } : s.reports,
            };
          }),

        updateResume: (id, updater, options) =>
          set((s) => {
            const current = s.resumes[id];
            if (!current) return s;
            const next = updater(current);
            const now = Date.now();
            return {
              resumes: { ...s.resumes, [id]: touch(next, now) },
              // An updater that changed nothing isn't a step anyone could undo.
              history:
                next === current
                  ? s.history
                  : {
                      ...s.history,
                      [id]: recordEdit(s.history[id] ?? EMPTY_HISTORY, current, options, now),
                    },
            };
          }),

        removeResume: (id) => set((s) => withoutResumes(s, new Set([id]))),

        renameResume: (id, title) => {
          const next = cleanTitle(title);
          const current = get().resumes[id];
          if (!next || !current) return false;
          // The rename dialog checks first and explains; this keeps the rule for every caller.
          if (isTitleTaken(next, Object.values(get().resumes), id)) return false;
          // An unchanged name isn't an edit: no new "edited" time, no upload.
          if (next !== current.title) {
            get().updateResume(id, (r) => ({ ...r, title: next }), { label: "Renamed the resume" });
          }
          return true;
        },

        duplicateResume: (id) => {
          const base = get().resumes[id];
          if (!base) return null;
          const copy = cloneResume(base, {
            title: uniqueTitle(copyTitle(base), Object.values(get().resumes)),
          });
          set((s) => {
            const report = s.reports[id];
            return {
              resumes: { ...s.resumes, [copy.id]: copy },
              order: [copy.id, ...s.order],
              reports: report ? { ...s.reports, [copy.id]: report } : s.reports,
            };
          });
          return copy.id;
        },

        setActive: (id) => set((s) => (s.resumes[id] ? { activeId: id } : s)),

        setStep: (step) => set({ step }),

        setExportReport: (id, report) =>
          set((s) => ({ exportReports: { ...s.exportReports, [id]: report } })),

        createTailoredCopy: (baseId, meta, apply) => {
          const base = get().resumes[baseId];
          if (!base) return null;
          const now = Date.now();
          const title = [meta.jobTitle || "Tailored", meta.company].filter(Boolean).join(" at ");
          const copy = apply(
            cloneResume(
              base,
              {
                source: "tailored",
                title,
                tailor: { ...meta, baseResumeId: baseId, createdAt: now },
              },
              now,
            ),
          );
          get().addResume(copy);
          return copy.id;
        },

        mergeFromCloud: (cloud, deletedIds = []) => {
          const deleted = new Set(deletedIds);
          const local = get().resumes;
          const live = cloud.filter((r) => !deleted.has(r.id));
          const cloudById = new Map(live.map((r) => [r.id, r]));
          const incoming = live.filter((r) => !local[r.id] || r.updatedAt > local[r.id]!.updatedAt);
          const gone = new Set(Object.keys(local).filter((id) => deleted.has(id)));
          // One update, so subscribers (cloud sync) see the whole merge as a single change.
          if (incoming.length || gone.size) {
            set((s) => {
              const kept: StudioData = gone.size ? withoutResumes(s, gone) : s;
              const activeId = kept.activeId ?? incoming[0]?.id ?? null;
              return {
                resumes: {
                  ...kept.resumes,
                  ...Object.fromEntries(incoming.map((r) => [r.id, r])),
                },
                reports: kept.reports,
                exportReports: kept.exportReports,
                versions: kept.versions,
                // A copy replaced by a newer one from another device starts a fresh history:
                // undoing past it would quietly bring back what was changed there.
                history: omitKeys(kept.history, new Set(incoming.map((r) => r.id))),
                order: [
                  ...kept.order,
                  ...incoming.map((r) => r.id).filter((id) => !kept.order.includes(id)),
                ],
                activeId,
                step: activeId ? s.step : "upload",
              };
            });
          }
          return Object.values(local).filter((r) => {
            if (deleted.has(r.id)) return false;
            const remote = cloudById.get(r.id);
            return !remote || r.updatedAt > remote.updatedAt;
          });
        },

        clearAll: () => set({ ...initialData }),

        undo: (id) => applyMove(id, undoMove),

        redo: (id) => applyMove(id, redoMove),

        saveVersion: (id, name) => {
          const resume = get().resumes[id];
          const clean = cleanVersionName(name);
          if (!resume || !clean) return null;
          const version = newVersion(resume, clean, Date.now());
          set((s) => ({
            versions: { ...s.versions, [id]: addVersion(s.versions[id] ?? [], version) },
          }));
          return version;
        },

        restoreVersion: (id, versionId) => {
          const s = get();
          const current = s.resumes[id];
          const saved = s.versions[id] ?? [];
          const version = saved.find((v) => v.id === versionId);
          if (!current || !version) return false;
          const now = Date.now();
          const kept = isSaved(current, saved)
            ? saved
            : addVersion(
                saved,
                newVersion(current, `Before restoring “${version.name}”`, now, true),
              );
          const restored = adoptState(version.resume, current, Object.values(s.resumes), now);
          set({
            resumes: { ...s.resumes, [id]: restored },
            versions: { ...s.versions, [id]: kept },
            history: {
              ...s.history,
              [id]: recordEdit(
                s.history[id] ?? EMPTY_HISTORY,
                current,
                { label: `Restored “${version.name}”` },
                now,
              ),
            },
          });
          return true;
        },

        deleteVersion: (id, versionId) =>
          set((s) => {
            const list = s.versions[id];
            if (!list?.some((v) => v.id === versionId)) return s;
            const rest = list.filter((v) => v.id !== versionId);
            return {
              versions: rest.length
                ? { ...s.versions, [id]: rest }
                : omitKeys(s.versions, new Set([id])),
            };
          }),

        putVersionBack: (id, version) => {
          const s = get();
          const list = s.versions[id] ?? [];
          if (!s.resumes[id] || list.some((v) => v.id === version.id)) return false;
          const next = [...list, version].sort((a, b) => b.savedAt - a.savedAt);
          set({ versions: { ...s.versions, [id]: next } });
          return true;
        },

        trashResume: (id) => {
          const s = get();
          const resume = s.resumes[id];
          if (!resume) return false;
          const now = Date.now();
          const report = s.reports[id];
          const versions = s.versions[id];
          const entry: TrashedResume = {
            resume,
            deletedAt: now,
            ...(report ? { report } : {}),
            ...(versions?.length ? { versions } : {}),
          };
          // One update that removes exactly this resume, so sync sends it as one deletion.
          set({
            ...withoutResumes(s, new Set([id])),
            trash: freshTrash([entry, ...s.trash.filter((t) => t.resume.id !== id)], now),
          });
          return true;
        },

        restoreFromTrash: (trashedId) => {
          const s = get();
          const entry = s.trash.find((t) => t.resume.id === trashedId);
          if (!entry) return null;
          const copy = cloneResume(entry.resume, {
            title: uniqueTitle(resumeTitle(entry.resume), Object.values(s.resumes)),
          });
          const versions = entry.versions?.map((v) => ({
            ...v,
            resume: { ...v.resume, id: copy.id },
          }));
          set({
            resumes: { ...s.resumes, [copy.id]: copy },
            order: [copy.id, ...s.order],
            // Filing, like duplicating: the open resume stays open unless nothing is.
            activeId: s.activeId ?? copy.id,
            reports: entry.report ? { ...s.reports, [copy.id]: entry.report } : s.reports,
            versions: versions?.length ? { ...s.versions, [copy.id]: versions } : s.versions,
            trash: s.trash.filter((t) => t !== entry),
          });
          return copy.id;
        },

        deleteFromTrash: (trashedId) =>
          set((s) => ({ trash: s.trash.filter((t) => t.resume.id !== trashedId) })),

        emptyTrash: () => set((s) => (s.trash.length ? { trash: [] } : s)),
      };
    },
    {
      name: STUDIO_STORAGE_KEY,
      version: STUDIO_STORE_VERSION,
      migrate: (persisted, fromVersion) => migrateStudio(persisted, fromVersion) as PersistedStudio,
      // Shallow, like zustand's default, plus a cleanup: trash past its 30 days goes on load.
      merge: (persisted, current) =>
        persisted && typeof persisted === "object"
          ? {
              ...current,
              ...(persisted as Partial<PersistedStudio>),
              ...sanitizeArchive(persisted, Date.now()),
            }
          : current,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : quotaSafe(window.localStorage),
      ),
      // Rehydrated explicitly in useStudioHydrated() so server and first client render match.
      skipHydration: true,
      partialize: (s): PersistedStudio => ({
        resumes: s.resumes,
        order: s.order,
        activeId: s.activeId,
        reports: s.reports,
        exportReports: s.exportReports,
        step: s.step,
        versions: s.versions,
        trash: s.trash,
      }),
    },
  ),
);

const subscribeHydration = (onChange: () => void) =>
  useStudioStore.persist.onFinishHydration(onChange);

// Before this the store holds defaults, not the user's data.
export function useStudioHydrated(): boolean {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => useStudioStore.persist.hasHydrated(),
    () => false,
  );
  useEffect(() => {
    if (!useStudioStore.persist.hasHydrated()) void useStudioStore.persist.rehydrate();
  }, []);
  return hydrated;
}

export function useActiveResume(): Resume | null {
  return useStudioStore((s) => (s.activeId ? (s.resumes[s.activeId] ?? null) : null));
}

export function useActiveReport(): RecruiterReport | null {
  return useStudioStore((s) => (s.activeId ? (s.reports[s.activeId] ?? null) : null));
}

export function useResumeList(): Resume[] {
  return useStudioStore(
    useShallow((s) => s.order.map((id) => s.resumes[id]).filter((r): r is Resume => Boolean(r))),
  );
}

export type HistoryStatus = {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | undefined;
  redoLabel: string | undefined;
};

export function useHistoryStatus(id: string | null): HistoryStatus {
  return useStudioStore(
    useShallow((s) => {
      const history = id ? s.history[id] : undefined;
      const undo = history?.past.at(-1);
      const redo = history?.future.at(-1);
      return {
        canUndo: Boolean(undo),
        canRedo: Boolean(redo),
        undoLabel: undo?.label,
        redoLabel: redo?.label,
      };
    }),
  );
}

const NO_VERSIONS: readonly ResumeVersion[] = [];

export function useVersions(id: string | null): readonly ResumeVersion[] {
  return useStudioStore((s) => (id ? (s.versions[id] ?? NO_VERSIONS) : NO_VERSIONS));
}

export function useTrash(): readonly TrashedResume[] {
  return useStudioStore((s) => s.trash);
}
