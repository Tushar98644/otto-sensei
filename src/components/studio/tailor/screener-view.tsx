"use client";

import { useState } from "react";
import { useMessages } from "@/i18n/client";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { RequirementImportance } from "@/lib/ai/types";
import type { LineTarget, RequirementChoice } from "./apply";
import { RequirementRowItem } from "./requirement-row";
import { ResultSection } from "./result-section";
import type { Screener } from "./screener";
import type { Writing } from "./use-writing";

const REQUIREMENTS_ID = "tailor-requirements";

const GROUPS: readonly RequirementImportance[] = ["must", "nice"];

export type ScreenerViewProps = {
  screener: Screener;
  choices: Record<string, RequirementChoice>;
  targets: LineTarget[];
  writing: Writing;
  onChoice: (requirementId: string, choice: RequirementChoice | null) => void;
  onJump: (bulletId: string) => void;
};

export function ScreenerView({
  screener,
  choices,
  targets,
  writing,
  onChoice,
  onJump,
}: ScreenerViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const t = useMessages("studioTailor").screener;
  const { rows, headline } = screener;
  const addedIds = new Set(
    Object.values(choices).flatMap((choice) => (choice.kind === "line" ? [choice.line.id] : [])),
  );

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <CardTitle as="h2">{t.none}</CardTitle>
          <CardDescription>{t.noneNote}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <ResultSection
      id={REQUIREMENTS_ID}
      title={t.title}
      meta={
        <span aria-live="polite" className="tabular-nums">
          {headline}
        </span>
      }
    >
      <p className="max-w-prose text-sm text-muted">{t.note}</p>
      {GROUPS.map((importance) => {
        const title = t.groups[importance];
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
    </ResultSection>
  );
}
