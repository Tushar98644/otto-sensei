"use client";

import { Info, TriangleExclamationPoint } from "lucide-react";
import { memo, useMemo } from "react";
import { FixFirst, type FixFirstEntry } from "@/components/studio/fix-first";
import { openTarget, targetLabel } from "@/components/studio/review/open-target";
import { Button } from "@/components/ui/button";
import { reviewResume, type ReviewItem } from "@/lib/lint/review";
import type { Resume } from "@/lib/resume/schema";
import { resumeLintOf } from "./lint-cache";
import { useResumeValue } from "./use-editor";
import { useSettled } from "./use-settled";

const REVIEW_SETTLE_MS = 800;

export function FixSummary({ resumeId }: { resumeId: string }) {
  const resume = useResumeValue(resumeId, (current) => current, undefined);
  const settled = useSettled(resume, REVIEW_SETTLE_MS);
  return settled ? <SettledSummary resumeId={resumeId} resume={settled} /> : null;
}

// Memoized so typing re-renders only FixSummary until the resume settles.
const SettledSummary = memo(function SettledSummary({
  resumeId,
  resume,
}: {
  resumeId: string;
  resume: Resume;
}) {
  const review = useMemo(() => reviewResume(resume, resumeLintOf(resume)), [resume]);
  if (review.items.length === 0) return null;

  const items: FixFirstEntry[] = review.top.map((item) => ({
    key: item.id,
    title: item.title,
    reason: item.reason,
    action: item.target
      ? { label: targetLabel(item.target), onClick: () => openTarget(resumeId, item.target) }
      : undefined,
  }));
  const rest = review.items.filter((item) => !review.top.includes(item));

  return (
    <FixFirst
      items={items}
      description="Across your whole resume, most important first."
      footer={rest.length > 0 ? <MoreToCheck resumeId={resumeId} items={rest} /> : null}
    />
  );
});

function MoreToCheck({ resumeId, items }: { resumeId: string; items: readonly ReviewItem[] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-ink">Also worth a look</p>
      <ul className="flex flex-col">
        {items.map((item) => {
          const high = item.severity === "high";
          const Icon = high ? TriangleExclamationPoint : Info;
          return (
            <li key={item.id} className="flex min-h-9 items-center gap-2 text-sm">
              <Icon
                aria-hidden
                className={high ? "size-4 shrink-0 text-warn" : "size-4 shrink-0 text-subtle"}
              />
              <span className="min-w-0 flex-1 text-pretty text-muted">
                <span className="sr-only">{high ? "Needs work: " : "Tip: "}</span>
                {item.title}
              </span>
              {item.target ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openTarget(resumeId, item.target)}
                  className="-mr-3 shrink-0"
                >
                  {targetLabel(item.target)}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
