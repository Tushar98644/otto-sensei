"use client";

import { CircleCheck, TriangleExclamationPoint } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TITLE_SECTION_ID } from "@/lib/tailor/reasons";
import type { SummaryCheck, TitleCheck } from "@/lib/tailor/title-checks";
import { SummaryChoice } from "./summary-choice";

export type TitleSummaryProps = {
  title: TitleCheck | null;
  summary: SummaryCheck;
  suggestion: string;
  current: string;
  useSummary: boolean;
  onUseSummary: (use: boolean) => void;
};

function CheckLine({ ok, label, text }: { ok: boolean; label: string; text: string }) {
  const Icon = ok ? CircleCheck : TriangleExclamationPoint;
  return (
    <li className="flex items-start gap-3 py-3">
      <Icon
        aria-hidden
        className={ok ? "mt-0.5 size-4 shrink-0 text-pass" : "mt-0.5 size-4 shrink-0 text-warn"}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm/6 font-medium text-ink">
          {label}
          <span className="sr-only">{ok ? ": looks right" : ": could be better"}</span>
        </p>
        <p className="text-sm/6 text-pretty text-muted">{text}</p>
      </div>
    </li>
  );
}

// Recruiters read the top first (Ladders' eye-tracking), so title and summary get their own check.
export function TitleSummary({
  title,
  summary,
  suggestion,
  current,
  useSummary,
  onUseSummary,
}: TitleSummaryProps) {
  return (
    <Card id={TITLE_SECTION_ID} className="scroll-mt-24">
      <CardHeader>
        <CardTitle as="h2">The top of your resume</CardTitle>
        <CardDescription>A recruiter reads your title and summary before any line.</CardDescription>
      </CardHeader>
      <ul className="divide-y divide-border border-y border-border">
        {title ? (
          <CheckLine ok={title.status === "match"} label="Job title" text={title.text} />
        ) : null}
        <CheckLine ok={summary.status === "match"} label="Summary" text={summary.text} />
      </ul>
      {suggestion ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-ink">Suggested summary</h3>
          <p className="text-sm text-muted">
            Written only from what&apos;s already in your resume.
          </p>
          <SummaryChoice
            suggestion={suggestion}
            current={current}
            checked={useSummary}
            onChange={onUseSummary}
          />
        </div>
      ) : null}
    </Card>
  );
}
