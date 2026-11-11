"use client";

import { useMemo, useState } from "react";
import { roomForResume } from "@/components/account/pro-tools";
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

const renameDialog = lazyComponent(() => import("./rename-dialog").then((m) => m.RenameDialog));

export type ResumeGridProps = {
  resumes: readonly Resume[];
  // Every resume, so tailored copies can name the resume they came from and count toward it.
  all: readonly Resume[];
  actions: StudioActions;
  onShowBase?: (id: string) => void;
  // See ResumeCard's `cheer`.
  cheer?: boolean;
  className?: string;
};

// Delete moves a resume to Recently deleted at once, with Undo.
export function ResumeGrid({
  resumes,
  all,
  actions,
  onShowBase,
  cheer,
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
    if (!(await roomForResume())) return;
    const id = duplicateResume(resume.id);
    const copy = id ? useStudioStore.getState().resumes[id] : undefined;
    if (copy) toast({ title: "Copy made", description: resumeTitle(copy), variant: "success" });
  }

  return (
    <>
      {/* grid-cols-1 rather than an implicit column: a long tailored title ("Senior Product
          Marketing Manager at Northwind") would otherwise widen a phone's page past the screen. */}
      <ul
        className={cn("grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3", className)}
      >
        {resumes.map((resume) => {
          const baseId = resume.tailor?.baseResumeId;
          const base = baseId && baseId !== resume.id ? (byId.get(baseId) ?? null) : null;
          return (
            <li key={resume.id} id={cardId(resume.id)} className="scroll-mt-24">
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
