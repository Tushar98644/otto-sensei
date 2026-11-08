"use client";

import { Plus } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { BulletSection } from "@/lib/resume/ops";
import { newBullet, type Bullet } from "@/lib/resume/schema";
import { BulletRow } from "./bullet-row";
import { editBullets } from "./edits";
import { addLineButtonId, bulletInputId, editThenFocus } from "./focus";
import { BULLET_LIMITS } from "./limits";
import { editLines } from "./use-editor";

export type BulletListProps = {
  resumeId: string;
  section: BulletSection;
  parentId: string;
  ownerHeadingId: string;
  bullets: Bullet[];
  // Names the list, e.g. "What you did".
  title: string;
  addLabel?: string;
  // More buttons beside "Add a line", e.g. "Add another role at Northwind".
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
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          id={addLineButtonId(parentId)}
          variant="ghost"
          size="sm"
          onClick={add}
          disabled={full}
          className="-ml-4 text-muted hover:text-ink max-sm:h-11"
        >
          <Plus />
          {addLabel}
        </Button>
        {actions}
        {full ? (
          <p className="text-sm text-muted">{`That's the most lines this can hold (${max}).`}</p>
        ) : null}
      </div>
    </div>
  );
}
