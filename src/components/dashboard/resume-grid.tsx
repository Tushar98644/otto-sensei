"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { roomForCopyOf } from "@/components/account/pro-tools";
import { useNow } from "@/components/studio/use-now";
import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import { toast } from "@/components/ui/toast";
import { trashWithUndo } from "@/components/ui/trash-with-undo";
import { isTitleTaken, resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";
import { tailoredCounts } from "./library";
import { ResumeCard, cardId } from "./resume-card";
import type { StudioActions } from "./use-studio-actions";

// Cards arrive one after another on first paint; past the first row they come together.
function enter(index: number): CSSProperties {
  return { animationDelay: `${Math.min(index, 3) * 60}ms` };
}

const renameDialog = lazyComponent(() => import("./rename-dialog").then((m) => m.RenameDialog));

export type ResumeGridProps = {
  resumes: readonly Resume[];
  all: readonly Resume[];
  actions: StudioActions;
  onShowBase?: (id: string) => void;
  cheer?: boolean;
  end?: ReactNode;
  className?: string;
};

export function ResumeGrid({
  resumes,
  all,
  actions,
  onShowBase,
  cheer,
  end,
  className,
}: ResumeGridProps) {
  const now = useNow();
  const renameResume = useStudioStore((s) => s.renameResume);
  const duplicateResume = useStudioStore((s) => s.duplicateResume);
  const [renaming, setRenaming] = useState<Resume | null>(null);
  const renameWanted = useOpenedOnce(renaming !== null);
  const byId = useMemo(() => new Map(all.map((resume) => [resume.id, resume])), [all]);
  const copies = useMemo(() => tailoredCounts(all), [all]);

  async function duplicate(resume: Resume) {
    if (!(await roomForCopyOf(resume))) return;
    const id = duplicateResume(resume.id);
    const copy = id ? useStudioStore.getState().resumes[id] : undefined;
    if (copy) toast({ title: "Copy made", description: resumeTitle(copy), variant: "success" });
  }

  return (
    <>
      {/* Explicit grid-cols-1: an implicit column lets a long title widen a phone's page. */}
      <ul
        className={cn("grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3", className)}
      >
        {resumes.map((resume, index) => {
          const baseId = resume.tailor?.baseResumeId;
          const base = baseId && baseId !== resume.id ? (byId.get(baseId) ?? null) : null;
          return (
            <li
              key={resume.id}
              id={cardId(resume.id)}
              className="scroll-mt-24 motion-safe:animate-fade-in"
              style={enter(index)}
            >
              <ResumeCard
                resume={resume}
                base={base}
                copies={copies.get(resume.id) ?? 0}
                now={now}
                actions={actions}
                onRename={setRenaming}
                onDuplicate={(target) => void duplicate(target)}
                onDelete={(target) => trashWithUndo(target.id)}
                onShowBase={onShowBase}
                cheer={cheer}
              />
            </li>
          );
        })}
        {/* A single column on phones leaves no row to fill. */}
        {end ? (
          <li
            className="hidden flex-col motion-safe:animate-fade-in sm:flex"
            style={enter(resumes.length)}
          >
            {end}
          </li>
        ) : null}
      </ul>

      <Lazy
        loader={renameDialog}
        wanted={renameWanted}
        props={{
          resume: renaming,
          onClose: () => setRenaming(null),
          isTaken: (title: string) => (renaming ? isTitleTaken(title, all, renaming.id) : false),
          onRename: (resume: Resume, title: string) => {
            renameResume(resume.id, title);
            setRenaming(null);
          },
        }}
      />
    </>
  );
}
