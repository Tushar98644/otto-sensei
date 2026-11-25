"use client";

import { ChevronDown, Info, ListChecks, TriangleExclamationPoint } from "lucide-react";
import { memo, useId, useMemo, useState } from "react";
import { openTarget, targetLabel } from "@/components/studio/review/open-target";
import { Button } from "@/components/ui/button";
import { useFormat, useMessages } from "@/i18n/client";
import { reviewResume, type ReviewItem } from "@/lib/lint/review";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { countText } from "../count";
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
  const [open, setOpen] = useState(false);
  const listId = useId();
  const t = useMessages("studioEditor").review;
  const format = useFormat();
  const review = useMemo(() => reviewResume(resume, resumeLintOf(resume)), [resume]);
  if (review.items.length === 0) return null;
  const items = [...review.top, ...review.items.filter((item) => !review.top.includes(item))];

  return (
    <div className="flex flex-col pl-12">
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="-ml-3 self-start text-muted hover:text-ink max-sm:h-11"
      >
        <ListChecks />
        {countText(format, t.worthALook, items.length)}
        <span aria-hidden className="text-subtle">
          ·
        </span>
        {open ? t.hide : t.show}
        <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
      </Button>
      <ul
        id={listId}
        hidden={!open}
        className="mt-2 flex flex-col divide-y divide-border rounded-2xl bg-surface px-4"
      >
        {open
          ? items.map((item) => <ReviewRow key={item.id} resumeId={resumeId} item={item} />)
          : null}
      </ul>
    </div>
  );
});

function ReviewRow({ resumeId, item }: { resumeId: string; item: ReviewItem }) {
  const high = item.severity === "high";
  const Icon = high ? TriangleExclamationPoint : Info;
  const studio = useMessages("studio");
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex min-w-0 flex-1 gap-2.5">
        <Icon
          aria-hidden
          className={cn("mt-1 size-4 shrink-0", high ? "text-warn" : "text-subtle")}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm/6 font-medium text-pretty text-ink">
            <span className="sr-only">{high ? studio.words.needsWork : studio.words.tip} </span>
            {item.title}
          </p>
          <p className="text-sm/6 text-pretty text-muted">{item.reason}</p>
        </div>
      </div>
      {item.target ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openTarget(resumeId, item.target)}
          className="shrink-0 self-start max-sm:ml-3"
        >
          {targetLabel(studio.targets, item.target)}
        </Button>
      ) : null}
    </li>
  );
}
