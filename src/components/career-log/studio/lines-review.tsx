"use client";

import { Check } from "lucide-react";
import { useId, useState } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { bulletInputId } from "@/components/studio/editor/focus";
import { flashLine } from "@/components/studio/editor/line-flash";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { dropLines, type LinesHandoff } from "@/lib/career-log/handoff";
import { monthsLabel } from "@/lib/career-log/month";
import {
  addLines,
  blankName,
  blanksIn,
  fillBlanks,
  jobChoices,
} from "@/lib/career-log/resume-lines";
import type { LogLine } from "@/lib/career-log/types";
import { useStudioStore } from "@/lib/store/resume-store";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { rich } from "@/i18n/rich";
import { cn } from "@/lib/utils";

export type LinesReviewProps = { handoff: LinesHandoff; onClose: () => void };

type Item = { line: LogLine; accepted: boolean; facts: Record<string, string> };

// The first new line, brought into view and marked the way a fixed line is.
function showLine(bulletId: string) {
  window.requestAnimationFrame(() => {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(bulletInputId(bulletId))
      ?.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
    flashLine(bulletId);
  });
}

function ready(item: Item): boolean {
  return blanksIn(item.line.text).every((blank) => item.facts[blank]?.trim());
}

// Nothing goes on the resume until the person accepts it; a line with a blank needs its fact first.
export function LinesReview({ handoff, onClose }: LinesReviewProps) {
  const resume = useStudioStore((state) => state.resumes[handoff.resumeId]);
  const t = useMessages("careerLogLines");
  const format = useFormat();
  const jobs = resume ? jobChoices(resume, t.jobNumber) : [];
  const jobPick = useId();
  const [jobId, setJobId] = useState(handoff.experienceId);
  const job = jobs.find((item) => item.id === jobId) ?? jobs[0] ?? null;
  const [items, setItems] = useState<Item[]>(() =>
    handoff.lines.map((line) => ({ line, accepted: false, facts: {} })),
  );
  const accepted = items.filter((item) => item.accepted && ready(item));

  function update(id: string, change: (item: Item) => Item) {
    setItems((current) => current.map((item) => (item.line.id === id ? change(item) : item)));
  }

  function close() {
    dropLines();
    onClose();
  }

  function add() {
    if (!resume || !job || accepted.length === 0) return;
    const texts = accepted.map((item) => fillBlanks(item.line.text, item.facts));
    const store = useStudioStore.getState();
    const { added } = addLines(resume, job.id, texts);
    if (added === 0) {
      toast({ title: t.alreadyOn });
      return;
    }
    const label = format.plural(t.added, added);
    store.updateResume(resume.id, (current) => addLines(current, job.id, texts).resume, { label });
    const after = useStudioStore.getState().resumes[resume.id];
    const first = after?.experience.find((entry) => entry.id === job.id)?.bullets[0];
    close();
    if (first) showLine(first.id);
    undoToast({
      title: label,
      description: job.label,
      onUndo: () => {
        const now = useStudioStore.getState();
        if (now.resumes[resume.id] !== after) {
          toast({
            title: t.changed,
            description: t.useUndo,
          });
          return;
        }
        now.undo(resume.id);
      },
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => (open ? undefined : close())}
      title={t.title}
      description={t.description}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {t.notNow}
          </Button>
          <Button onClick={add} disabled={!job || accepted.length === 0}>
            <Check aria-hidden />
            {accepted.length > 0 ? format.plural(t.addCount, accepted.length) : t.addLines}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <OttoNote
          live={false}
          size="sm"
          meta={format.plural(t.fromNotes, items.length)}
          message={t.note}
        />
        {jobs.length > 1 ? (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <label htmlFor={jobPick} className="text-sm font-medium text-ink">
              {t.addTo}
            </label>
            <Select
              id={jobPick}
              value={job?.id ?? ""}
              onChange={(event) => setJobId(event.target.value)}
              className="sm:w-72"
            >
              {jobs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
        ) : job ? (
          <p className="text-sm/6 text-muted">
            {rich(
              t.addingTo,
              { b: (chunk) => <span className="font-medium text-ink">{chunk}</span> },
              { job: job.label },
            )}
          </p>
        ) : (
          <p className="text-sm/6 text-muted">{t.noJob}</p>
        )}
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <LineRow
              key={item.line.id}
              item={item}
              onToggle={() =>
                update(item.line.id, (current) => ({ ...current, accepted: !current.accepted }))
              }
              onFact={(blank, value) =>
                update(item.line.id, (current) => ({
                  ...current,
                  facts: { ...current.facts, [blank]: value },
                }))
              }
            />
          ))}
        </ul>
      </div>
    </Dialog>
  );
}

function LineRow({
  item,
  onToggle,
  onFact,
}: {
  item: Item;
  onToggle: () => void;
  onFact: (blank: string, value: string) => void;
}) {
  const id = useId();
  const t = useMessages("careerLogLines");
  const format = useFormat();
  const blanks = blanksIn(item.line.text);
  const canAccept = ready(item);
  const on = item.accepted && canAccept;
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-2xl p-4 transition-colors",
        on ? "bg-pass-soft ring-1 ring-pass/30" : "bg-surface-muted",
      )}
    >
      <p className="text-base/7 text-pretty text-ink">
        <LineText text={item.line.text} facts={item.facts} />
      </p>
      {item.line.quote && item.line.quote.toLowerCase() !== item.line.text.toLowerCase() ? (
        <p className="text-sm/6 text-pretty text-muted">
          {fmt(t.fromMonths, {
            months: monthsLabel(item.line.months, format),
            quote: item.line.quote,
          })}
        </p>
      ) : null}
      {blanks.length > 0 ? (
        <div className="flex flex-col gap-2">
          {blanks.map((blank, index) => (
            <div key={blank} className="flex flex-col gap-1">
              <label htmlFor={`${id}-${index}`} className="text-sm font-medium text-ink">
                {fmt(t.needsFact, { blank: blankName(blank) })}
              </label>
              <Input
                id={`${id}-${index}`}
                value={item.facts[blank] ?? ""}
                maxLength={60}
                placeholder={t.onlyIfKnown}
                onChange={(event) => onFact(blank, event.target.value)}
              />
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={on ? "ghost" : "secondary"}
          size="sm"
          aria-pressed={on}
          disabled={!canAccept}
          onClick={onToggle}
          className={cn(on && "text-pass-ink")}
        >
          <Check aria-hidden className={cn(on && "text-pass")} />
          {on ? t.accepted : t.accept}
        </Button>
        {on ? <span className="text-sm text-subtle">{t.pressAgain}</span> : null}
        {!canAccept ? (
          <span className="text-sm text-subtle">
            {t.fillBlank}
          </span>
        ) : null}
      </div>
    </li>
  );
}

// A fact the person gave shows in the highlighter; a blank still waiting shows as a dashed gap.
function LineText({ text, facts }: { text: string; facts: Readonly<Record<string, string>> }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, index) => {
    if (!/^\[[^\]]+\]$/.test(part)) return part;
    const fact = facts[part]?.trim();
    return fact ? (
      <mark key={index} className="highlighter text-ink">
        {fact}
      </mark>
    ) : (
      <span
        key={index}
        className="rounded-md border border-dashed border-border-strong px-1.5 text-muted"
      >
        {blankName(part)}
      </span>
    );
  });
}
