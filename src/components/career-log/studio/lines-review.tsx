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
import { cn } from "@/lib/utils";

export type LinesReviewProps = { handoff: LinesHandoff; onClose: () => void };

type Item = { line: LogLine; accepted: boolean; facts: Record<string, string> };

const plural = (n: number) => `${n} ${n === 1 ? "line" : "lines"}`;

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
  const jobs = resume ? jobChoices(resume) : [];
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
      toast({ title: "Those lines are already on this job" });
      return;
    }
    const label = `Added ${plural(added)} from your career log`;
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
            title: "You've changed it since",
            description: "Use Undo at the top of the editor.",
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
      title="From your career log"
      description="Accept the lines that are true. Nothing goes on your resume until you do."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Not now
          </Button>
          <Button onClick={add} disabled={!job || accepted.length === 0}>
            <Check aria-hidden />
            {accepted.length > 0 ? `Add ${plural(accepted.length)}` : "Add lines"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <OttoNote
          live={false}
          size="sm"
          meta={`${plural(items.length)} from your notes`}
          message="Every line comes from what you wrote. Where a number would help and you didn't give one, I left a blank for you."
        />
        {jobs.length > 1 ? (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <label htmlFor={jobPick} className="text-sm font-medium text-ink">
              Add them to
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
            Adding to <span className="font-medium text-ink">{job.label}</span>
          </p>
        ) : (
          <p className="text-sm/6 text-muted">Add the job to this resume first, then try again.</p>
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
          From your {monthsLabel(item.line.months)} notes: “{item.line.quote}”
        </p>
      ) : null}
      {blanks.length > 0 ? (
        <div className="flex flex-col gap-2">
          {blanks.map((blank, index) => (
            <div key={blank} className="flex flex-col gap-1">
              <label htmlFor={`${id}-${index}`} className="text-sm font-medium text-ink">
                Otto needs a fact: {blankName(blank)}
              </label>
              <Input
                id={`${id}-${index}`}
                value={item.facts[blank] ?? ""}
                maxLength={60}
                placeholder="Only if you know it"
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
          {on ? "Accepted" : "Accept"}
        </Button>
        {on ? <span className="text-sm text-subtle">Press again to leave it out.</span> : null}
        {!canAccept ? (
          <span className="text-sm text-subtle">
            Fill in the blank to accept it, or leave it out.
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
