"use client";

import { ArrowRight, Check, FilePlus } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { changeLines, describeChanges, NO_CHANGES, type ChangeSummary } from "./apply";

export type CopyActionsProps = {
  changes: ChangeSummary;
  copy: Resume | undefined;
  onCreate: () => void;
  onOpen: () => void;
};

export function CopyCard({
  changes,
  copy,
  onCreate,
  onOpen,
  ref,
}: CopyActionsProps & { ref?: Ref<HTMLDivElement> }) {
  if (copy) {
    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle as="h2">Your tailored copy is ready</CardTitle>
          <CardDescription>{resumeTitle(copy)}. Your original stays the same.</CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button size="lg" onClick={onOpen} className="w-full sm:w-auto">
            Open tailored version
            <ArrowRight />
          </Button>
          <Button variant="ghost" onClick={onCreate} className="w-full sm:w-auto">
            Make another
          </Button>
        </div>
      </Card>
    );
  }

  const lines = changeLines(changes);
  return (
    <Card ref={ref}>
      <CardHeader>
        <CardTitle as="h2">Your tailored copy</CardTitle>
        <CardDescription>
          {lines.length > 0
            ? "Picked for this job. Change any of it below. Your original stays the same."
            : NO_CHANGES}
        </CardDescription>
      </CardHeader>
      {lines.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {lines.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm/6 text-ink">
              <Check aria-hidden className="mt-1 size-4 shrink-0 text-muted" />
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      <Button size="lg" onClick={onCreate} className="w-full sm:w-auto sm:self-start">
        <FilePlus />
        Create tailored version
      </Button>
    </Card>
  );
}

// Shown while the card above is out of view, so the action stays one press away.
export function CopyBar({ changes, copy, onCreate, onOpen }: CopyActionsProps) {
  return (
    <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex items-center gap-3 rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-ink/5 motion-safe:animate-fade-in max-sm:flex-col max-sm:items-stretch max-sm:gap-1 sm:pl-4">
      <p className="min-w-0 flex-1 text-sm text-muted max-sm:px-2.5 max-sm:pt-1.5 max-sm:pb-1">
        {copy ? `Your copy for this job is ready: ${resumeTitle(copy)}.` : describeChanges(changes)}
      </p>
      {copy ? (
        <Button onClick={onOpen} className="max-sm:w-full">
          Open tailored version
          <ArrowRight />
        </Button>
      ) : (
        <Button onClick={onCreate} className="max-sm:w-full">
          <FilePlus />
          Create tailored version
        </Button>
      )}
    </div>
  );
}
