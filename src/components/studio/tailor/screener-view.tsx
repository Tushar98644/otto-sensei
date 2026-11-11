"use client";

import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { RequirementImportance } from "@/lib/ai/types";
import type { LineTarget, RequirementChoice } from "./apply";
import { RequirementRowItem } from "./requirement-row";
import type { Screener } from "./screener";
import type { Writing } from "./use-writing";

export const REQUIREMENTS_ID = "tailor-requirements";

const GROUPS: { importance: RequirementImportance; title: string }[] = [
  { importance: "must", title: "Must-haves" },
  { importance: "nice", title: "Nice-to-haves" },
];

export type ScreenerViewProps = {
  screener: Screener;
  choices: Record<string, RequirementChoice>;
  targets: LineTarget[];
  writing: Writing;
  onChoice: (requirementId: string, choice: RequirementChoice | null) => void;
  onJump: (bulletId: string) => void;
};

// Replaces the keyword cloud. Recruiter AI (HiredScore grades each qualification, Ashby marks each
// criterion met or not) reads a resume one requirement at a time, so this shows exactly that, and
// says plainly that it is the method, not any vendor's grade.
export function ScreenerView({
  screener,
  choices,
  targets,
  writing,
  onChoice,
  onJump,
}: ScreenerViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { rows, headline } = screener;
  const addedIds = new Set(
    Object.values(choices).flatMap((choice) => (choice.kind === "line" ? [choice.line.id] : [])),
  );

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Eyebrow>AI screener view</Eyebrow>
          <CardTitle as="h2">No clear requirements in this post</CardTitle>
          <CardDescription>
            It doesn&apos;t say what a candidate needs. A fuller post, with its requirements, works
            better.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card id={REQUIREMENTS_ID} className="scroll-mt-24">
      <CardHeader>
        <Eyebrow>AI screener view</Eyebrow>
        <CardTitle as="h2" aria-live="polite" className="tabular-nums">
          {headline}
        </CardTitle>
        <CardDescription className="max-w-prose">
          Tools such as HiredScore and Ashby check each requirement on its own. This is that check,
          done in the open. It isn&apos;t any tool&apos;s exact grade.
        </CardDescription>
      </CardHeader>
      {GROUPS.map(({ importance, title }) => {
        const group = rows.filter((row) => row.importance === importance);
        if (group.length === 0) return null;
        return (
          <section key={importance} aria-label={title} className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-ink">{title}</h3>
            <ul className="divide-y divide-border border-y border-border">
              {group.map((row) => (
                <RequirementRowItem
                  key={row.id}
                  row={row}
                  reason={screener.reasons[row.id]}
                  choice={choices[row.id]}
                  addedIds={addedIds}
                  open={openId === row.id}
                  targets={targets}
                  writing={writing}
                  onOpen={(open) => setOpenId(open ? row.id : null)}
                  onChoice={(choice) => onChoice(row.id, choice)}
                  onJump={onJump}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </Card>
  );
}
