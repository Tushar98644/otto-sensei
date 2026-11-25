"use client";

import { CircleCheck, TriangleExclamationPoint } from "lucide-react";
import { useMessages } from "@/i18n/client";
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
  const t = useMessages("studioTailor").top;
  return (
    <li className="flex items-start gap-3 py-3">
      <Icon
        aria-hidden
        className={ok ? "mt-0.5 size-4 shrink-0 text-pass" : "mt-0.5 size-4 shrink-0 text-warn"}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm/6 font-medium text-ink">
          {label}
          <span className="sr-only">{ok ? t.looksRight : t.couldBeBetter}</span>
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
  const t = useMessages("studioTailor").top;
  const titleOff = title !== null && title.status !== "match";
  const summaryOff = summary.status !== "match";
  let meta: string = title ? t.bothFit : t.summaryFits;
  if (titleOff && summaryOff) meta = t.bothOff;
  else if (titleOff) meta = t.titleOff;
  else if (summaryOff) meta = t.summaryOff;
  return (
    <ResultSection id={TITLE_SECTION_ID} title={t.title} meta={meta}>
      <p className="text-sm text-muted">{t.note}</p>
      <ul className="divide-y divide-border border-y border-border">
        {title ? (
          <CheckLine ok={title.status === "match"} label={t.jobTitle} text={title.text} />
        ) : null}
        <CheckLine ok={summary.status === "match"} label={t.summary} text={summary.text} />
      </ul>
      {suggestion ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-ink">{t.suggested}</h3>
          <p className="text-sm text-muted">{t.suggestedNote}</p>
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
