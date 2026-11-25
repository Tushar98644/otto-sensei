"use client";

import { ChevronRight, Info, TriangleExclamationPoint } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { ResumeReview, ReviewItem } from "@/lib/lint/review";
import { cn } from "@/lib/utils";
import { openTarget, targetLabel } from "./open-target";

export const reviewItemDomId = (id: string) => `review-item-${id}`;

export type WordsChecksProps = {
  resumeId: string;
  review: ResumeReview;
  hideHeading?: boolean;
};

export function WordsChecks({ resumeId, review, hideHeading = false }: WordsChecksProps) {
  const headingId = useId();
  const t = useMessages("studio").words;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2
          id={headingId}
          className={hideHeading ? "sr-only" : "font-sans text-lg font-semibold text-ink"}
        >
          {t.title}
        </h2>
        <p className="text-sm text-muted">{t.description}</p>
      </div>
      {review.items.length === 0 ? (
        <p className="rounded-2xl bg-surface p-4">
          <StatusPill status="pass">{t.allGood}</StatusPill>
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {review.items.map((item) => (
            <WordsItem key={item.id} item={item} resumeId={resumeId} />
          ))}
        </ul>
      )}
    </section>
  );
}

function WordsItem({ item, resumeId }: { item: ReviewItem; resumeId: string }) {
  const high = item.severity === "high";
  const Icon = high ? TriangleExclamationPoint : Info;
  const studio = useMessages("studio");
  const t = studio.words;
  return (
    <li>
      <details
        id={reviewItemDomId(item.id)}
        className="group/item scroll-mt-24 rounded-2xl bg-surface"
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 rounded-2xl px-4 py-3 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
          <Icon
            aria-hidden
            className={cn("mt-0.5 size-4 shrink-0", high ? "text-warn" : "text-subtle")}
          />
          <span className="min-w-0 flex-1 text-sm/6 font-medium text-ink">
            <span className="sr-only">{high ? t.needsWork : t.tip} </span>
            {item.title}
          </span>
          <ChevronRight
            aria-hidden
            className="mt-1 size-4 shrink-0 text-muted transition-transform group-open/item:rotate-90"
          />
        </summary>
        <div className="flex flex-col gap-3 px-4 pb-4 pl-11">
          <p className="text-sm/6 text-pretty text-muted">{item.reason}</p>
          {item.lines.length > 0 ? (
            <ul className="divide-y divide-border border-y border-border">
              {item.lines.map((line, index) => (
                <li key={index} className="flex flex-col gap-1 py-3">
                  <q className="line-clamp-3 text-sm/6 text-ink">{line.text}</q>
                  <p className="text-xs/5 text-subtle">{line.place}</p>
                  <p className="text-sm/6 text-pretty text-muted">{line.message}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openTarget(resumeId, line.target)}
                    className="-ml-3 self-start"
                  >
                    {targetLabel(studio.targets, line.target)}
                  </Button>
                </li>
              ))}
            </ul>
          ) : item.target ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openTarget(resumeId, item.target)}
              className="self-start"
            >
              {targetLabel(studio.targets, item.target)}
            </Button>
          ) : null}
          {item.more > 0 ? (
            <p className="text-sm text-subtle">{fmt(t.more, { count: item.more })}</p>
          ) : null}
        </div>
      </details>
    </li>
  );
}
