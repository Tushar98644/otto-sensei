"use client";

import { ArrowUpRight, TriangleExclamationPoint } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { JobLine } from "@/lib/tailor/reasons";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { countText } from "../count";
import { ResultSection } from "./result-section";

const JOB_LINES_ID = "tailor-lines";
const SHOWN = 4;

export type JobLinesProps = {
  lines: readonly JobLine[];
  unrelated: number;
  addedIds: ReadonlySet<string>;
  onJump: (bulletId: string) => void;
};

export function JobLines({ lines, unrelated, addedIds, onJump }: JobLinesProps) {
  const [all, setAll] = useState(false);
  const t = useMessages("studioTailor").lines;
  const format = useFormat();
  if (lines.length === 0) return null;
  const shown = all ? lines : lines.slice(0, SHOWN);
  const weak = lines.filter((line) => line.problem).length;
  const shows = countText(format, t.shows, lines.length);
  const meta = weak > 0 ? `${shows} · ${fmt(t.weak, { count: weak })}` : shows;
  return (
    <ResultSection id={JOB_LINES_ID} title={t.title} meta={meta}>
      {unrelated > 0 ? (
        <p className="text-sm text-muted">{countText(format, t.unrelated, unrelated)}</p>
      ) : null}
      <ul className="divide-y divide-border border-y border-border">
        {shown.map((line) => (
          <li key={line.bulletId} className="flex flex-col gap-2 py-4">
            <div className="flex flex-wrap gap-1.5">
              {line.proves.map((proof) => (
                <span
                  key={proof.id}
                  className="rounded-lg bg-surface-muted px-2 py-0.5 text-xs/5 font-medium text-muted"
                >
                  {proof.text}
                  <span className="font-normal text-subtle">
                    {` · ${proof.importance === "must" ? t.must : t.nice}`}
                  </span>
                </span>
              ))}
            </div>
            <q className="text-sm/6 text-ink">{line.text}</q>
            <p className="text-xs/5 text-subtle">
              {addedIds.has(line.bulletId) ? t.newLine : line.place}
            </p>
            <p className="flex items-start gap-2 text-sm/6 text-pretty text-muted">
              {line.problem ? (
                <TriangleExclamationPoint aria-hidden className="mt-1 size-4 shrink-0 text-warn" />
              ) : null}
              <span>
                {line.problem ? <span className="sr-only">{t.couldBeBetter} </span> : null}
                {line.note}
              </span>
            </p>
            {addedIds.has(line.bulletId) ? null : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onJump(line.bulletId)}
                className="-ml-3 self-start text-muted"
              >
                {t.showLine}
                <ArrowUpRight />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {lines.length > SHOWN ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAll((open) => !open)}
          aria-expanded={all}
          className="self-start"
        >
          {all ? t.fewer : fmt(t.all, { count: lines.length })}
        </Button>
      ) : null}
    </ResultSection>
  );
}
