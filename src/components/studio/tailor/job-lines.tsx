"use client";

import { ArrowUpRight, TriangleExclamationPoint } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobLine } from "@/lib/tailor/reasons";
import { pluralize } from "@/lib/utils";

export const JOB_LINES_ID = "tailor-lines";
// Enough to cover the must-haves on most posts; the rest one tap away.
const SHOWN = 4;

export type JobLinesProps = {
  lines: readonly JobLine[];
  unrelated: number;
  addedIds: ReadonlySet<string>;
  onJump: (bulletId: string) => void;
};

export function JobLines({ lines, unrelated, addedIds, onJump }: JobLinesProps) {
  const [all, setAll] = useState(false);
  if (lines.length === 0) return null;
  const shown = all ? lines : lines.slice(0, SHOWN);
  const weak = lines.filter((line) => line.problem).length;
  return (
    <Card id={JOB_LINES_ID} className="scroll-mt-24">
      <CardHeader>
        <CardTitle as="h2">Your lines for this job</CardTitle>
        <CardDescription>
          {pluralize(lines.length, "line")} {lines.length === 1 ? "shows" : "show"} what this post
          asks for
          {weak > 0 ? `, and ${weak} of them could say it better.` : "."}
          {unrelated > 0
            ? ` ${pluralize(unrelated, "other line")} ${unrelated === 1 ? "shows" : "show"} nothing it asks for; ${unrelated === 1 ? "it" : "they"} can stay, lower down.`
            : ""}
        </CardDescription>
      </CardHeader>
      <ul className="divide-y divide-border border-y border-border">
        {shown.map((line) => (
          <li key={line.bulletId} className="flex flex-col gap-2 py-4">
            <div className="flex flex-wrap gap-1.5">
              {line.proves.map((proof) => (
                // Not a Badge: requirement names run long and must wrap on phones.
                <span
                  key={proof.id}
                  className="rounded-lg bg-surface-muted px-2 py-0.5 text-xs/5 font-medium text-muted"
                >
                  {proof.text}
                  <span className="font-normal text-subtle">
                    {proof.importance === "must" ? " · must-have" : " · nice-to-have"}
                  </span>
                </span>
              ))}
            </div>
            <q className="text-sm/6 text-ink">{line.text}</q>
            <p className="text-xs/5 text-subtle">
              {addedIds.has(line.bulletId) ? "Your new line, for the tailored copy" : line.place}
            </p>
            <p className="flex items-start gap-2 text-sm/6 text-pretty text-muted">
              {line.problem ? (
                <TriangleExclamationPoint aria-hidden className="mt-1 size-4 shrink-0 text-warn" />
              ) : null}
              <span>
                {line.problem ? <span className="sr-only">Could be better: </span> : null}
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
                Show line
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
          {all ? "Show fewer" : `Show all ${lines.length} lines`}
        </Button>
      ) : null}
    </Card>
  );
}
