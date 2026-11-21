"use client";

import { CircleCheck, TriangleExclamationPoint } from "lucide-react";
import { TITLE_SECTION_ID } from "@/lib/tailor/reasons";
import type { SummaryCheck, TitleCheck } from "@/lib/tailor/title-checks";
import { ResultSection } from "./result-section";
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

export function TitleSummary({
  title,
  summary,
  suggestion,
  current,
  useSummary,
  onUseSummary,
}: TitleSummaryProps) {
  const off = [
    title && title.status !== "match" ? "title" : null,
    summary.status !== "match" ? "summary" : null,
  ].filter((part): part is string => part !== null);
  let meta = `Your ${off.join(" and ")} could fit this job better`;
  if (off.length === 0) {
    meta = title ? "Your title and summary fit this job" : "Your summary fits this job";
  }
  return (
    <ResultSection id={TITLE_SECTION_ID} title="The top of your resume" meta={meta}>
      <p className="text-sm text-muted">
        A recruiter reads your title and summary before any line.
      </p>
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
    </ResultSection>
  );
}
