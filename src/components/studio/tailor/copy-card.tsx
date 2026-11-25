"use client";

import { ArrowRight, Check, FilePlus } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { changeLines, describeChanges, type ChangeSummary } from "./apply";

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
  const tailor = useMessages("studioTailor");
  const t = tailor.copy;
  const format = useFormat();
  if (copy) {
    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle as="h2">{t.ready}</CardTitle>
          <CardDescription>{fmt(t.readyNote, { title: resumeTitle(copy) })}</CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button size="lg" onClick={onOpen} className="w-full sm:w-auto">
            {t.open}
            <ArrowRight />
          </Button>
          <Button variant="ghost" onClick={onCreate} className="w-full sm:w-auto">
            {t.another}
          </Button>
        </div>
      </Card>
    );
  }

  const lines = changeLines(tailor.changes, format, changes);
  return (
    <Card ref={ref}>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription>{lines.length > 0 ? t.picked : tailor.changes.none}</CardDescription>
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
        {t.create}
      </Button>
    </Card>
  );
}

// Shown while the card above is out of view, so the action stays one press away.
export function CopyBar({ changes, copy, onCreate, onOpen }: CopyActionsProps) {
  const tailor = useMessages("studioTailor");
  const t = tailor.copy;
  const format = useFormat();
  return (
    <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex items-center gap-3 rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-ink/5 motion-safe:animate-fade-in max-sm:flex-col max-sm:items-stretch max-sm:gap-1 sm:pl-4">
      <p className="min-w-0 flex-1 text-sm text-muted max-sm:px-2.5 max-sm:pt-1.5 max-sm:pb-1">
        {copy
          ? fmt(t.barReady, { title: resumeTitle(copy) })
          : describeChanges(tailor.changes, format, changes)}
      </p>
      {copy ? (
        <Button onClick={onOpen} className="max-sm:w-full">
          {t.open}
          <ArrowRight />
        </Button>
      ) : (
        <Button onClick={onCreate} className="max-sm:w-full">
          <FilePlus />
          {t.create}
        </Button>
      )}
    </div>
  );
}
