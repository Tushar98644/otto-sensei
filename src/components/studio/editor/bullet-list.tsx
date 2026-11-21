"use client";

import { Plus } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { hasEnded } from "@/lib/lint/bullets";
import type { BulletSection } from "@/lib/resume/ops";
import { newBullet, type Bullet } from "@/lib/resume/schema";
import { BulletRow } from "./bullet-row";
import { editBullets } from "./edits";
import { EntryChecks } from "./entry-checks";
import { useEntryLines } from "./entry-lines";
import { addLineButtonId, bulletInputId, editThenFocus } from "./focus";
import { BULLET_LIMITS } from "./limits";
import { ResultNote } from "./line-help";
import { editLines, useResumeValue } from "./use-editor";

export type BulletListProps = {
  resumeId: string;
  section: BulletSection;
  parentId: string;
  ownerHeadingId: string;
  bullets: Bullet[];
  title: string;
  addLabel?: string;
  actions?: ReactNode;
};

export function BulletList({
  resumeId,
  section,
  parentId,
  ownerHeadingId,
  bullets,
  title,
  addLabel = "Add a line",
  actions,
}: BulletListProps) {
  const titleId = useId();
  const max = BULLET_LIMITS[section];
  const full = bullets.length >= max;
  const lines = useEntryLines(resumeId, section, parentId);
  const ticks = section === "experience" || section === "projects";
  const ended = useResumeValue(
    resumeId,
    (resume) =>
      section === "experience" &&
      hasEnded(resume.experience.find((job) => job.id === parentId)?.endDate ?? ""),
    false,
  );

  function add() {
    const bullet = newBullet();
    editThenFocus(
      () =>
        editLines(resumeId, section, (resume) =>
          editBullets(resume, { section, parentId }, (list) => [...list, bullet]),
        ),
      bulletInputId(bullet.id),
    );
  }

  return (
    <div className="flex flex-col">
      <Eyebrow id={titleId}>{title}</Eyebrow>
      <div className="mt-2 empty:hidden">
        <ResultNote lines={lines} />
      </div>
      {bullets.length > 0 ? (
        <ul role="list" aria-labelledby={titleId} className="mt-1 flex flex-col gap-1">
          {bullets.map((bullet, index) => (
            <BulletRow
              key={bullet.id}
              resumeId={resumeId}
              section={section}
              parentId={parentId}
              ownerHeadingId={ownerHeadingId}
              bullet={bullet}
              index={index}
              count={bullets.length}
            />
          ))}
        </ul>
      ) : null}
      {/* The row, not each key, is pulled left, so a key that wraps lines up with the first. */}
      <div className="mt-2 -ml-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          id={addLineButtonId(parentId)}
          variant="ghost"
          size="sm"
          onClick={add}
          disabled={full}
          className="text-muted hover:text-ink max-sm:h-11"
        >
          <Plus />
          {addLabel}
        </Button>
        {actions}
        {full ? (
          <p className="pl-4 text-sm text-muted">{`That's the most lines this can hold (${max}).`}</p>
        ) : null}
      </div>
      {ticks ? (
        <div className="sr-only group-focus-within/entry:not-sr-only">
          <div className="pt-1 empty:hidden">
            <EntryChecks lines={lines} ownerHeadingId={ownerHeadingId} ended={ended} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
