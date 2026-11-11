"use client";

import { ArrowRight, FilePlus, Lightbulb } from "lucide-react";
import { useEffect, useEffectEvent, useMemo, type ReactNode } from "react";
import { roomForResume } from "@/components/account/pro-tools";
import { OTTO } from "@/components/mascot/lines";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import type { Resume } from "@/lib/resume/schema";
import { resumeTitle } from "@/lib/resume/ops";
import { useStudioStore } from "@/lib/store/resume-store";
import { keepEdit, keepWriting } from "@/lib/writings/client";
import { pluralize } from "@/lib/utils";
import { DemoNote } from "../demo-note";
import {
  applyTailorChoices,
  lineTargets,
  reorderPlans,
  summarizeChoices,
  tailorMeta,
  type ChangeSummary,
  type RequirementChoice,
  type TailorChoices,
} from "./apply";
import { ApplyKit } from "./apply-kit";
import { saveLetterOnCopy } from "./copy-letter";
import { noteFreshCopy } from "./fresh-copy";
import { jumpToLine } from "./jump";
import { APPLY_KIT_ID, takeLetterRequest } from "./letter-request";
import { ReorderPreview } from "./reorder-preview";
import type { Screener } from "./screener";
import { ScreenerView } from "./screener-view";
import { MAX_SAVED_ANSWERS, queuedJobIdFor, type SavedResult, type SavedWriting } from "./session";
import { JobLines } from "./job-lines";
import { ResultsOverview } from "./results-overview";
import { TitleSummary } from "./title-summary";
import type { ResultPatch } from "./use-tailor";
import { useWriting } from "./use-writing";

export type TailorResultsProps = {
  source: Resume;
  // The result with everything the person added to it so far.
  saved: SavedResult;
  choices: TailorChoices;
  screener: Screener;
  onPatch: (patch: ResultPatch) => void;
  // Shown right before the apply kit (the eligibility check while the job form is folded away).
  beforeApply?: ReactNode;
};

type ResultCardProps = { title: string; description?: string; children?: ReactNode };

// The shell titles the step with an h1, so each result section is an h2.
function ResultCard({ title, description, children }: ResultCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children}
    </Card>
  );
}

function describeChanges({ lines, skills, reorderedJobs, summary }: ChangeSummary): string {
  const parts = [
    lines ? `adds ${pluralize(lines, "line")} you confirmed` : null,
    skills ? `adds ${pluralize(skills, "skill")}` : null,
    reorderedJobs ? `reorders lines in ${pluralize(reorderedJobs, "job")}` : null,
    summary ? "uses the new summary" : null,
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) {
    return "No changes picked. The copy keeps your lines as they are, labeled for this job.";
  }
  const sentence =
    parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "");
  return `The copy ${sentence}. Your original stays the same.`;
}

export function TailorResults({
  source,
  saved,
  choices,
  screener,
  onPatch,
  beforeApply,
}: TailorResultsProps) {
  const createTailoredCopy = useStudioStore((s) => s.createTailoredCopy);
  const setActive = useStudioStore((s) => s.setActive);
  const setStep = useStudioStore((s) => s.setStep);
  const copy = useStudioStore((s) => (saved.copyId ? s.resumes[saved.copyId] : undefined));
  const { result, job } = saved;
  const writing = useWriting(source, job);

  const plans = useMemo(() => reorderPlans(source, result), [source, result]);
  const targets = useMemo(() => lineTargets(source), [source]);
  // What the copy will hold: the letter and answers are written from this, added lines included.
  const preview = useMemo(
    () => applyTailorChoices(source, result, choices),
    [source, result, choices],
  );
  const changes = summarizeChoices(source, result, choices);
  const summary = result.summary.trim();
  const answers = saved.answers ?? [];
  const addedIds = new Set(
    Object.values(choices.requirements).flatMap((choice) =>
      choice.kind === "line" ? [choice.line.id] : [],
    ),
  );
  const jump = (bulletId: string) => jumpToLine(source.id, bulletId);

  const setChoices = (next: TailorChoices) => onPatch({ choices: next });
  function answerRequirement(id: string, choice: RequirementChoice | null) {
    const requirements = { ...choices.requirements };
    if (choice) requirements[id] = choice;
    else delete requirements[id];
    setChoices({ ...choices, requirements });
  }

  // Every letter and answer is also kept on the Cover letters page. Awaited so the saved id lands
  // with the text; a failed save leaves it on this page only, as before.
  function keep(kind: "letter" | "answer", text: SavedWriting, question = "") {
    return keepWriting({
      kind,
      resumeId: source.id,
      resumeTitle: resumeTitle(source),
      company: job.company,
      role: job.title,
      jobUrl: job.posting?.url ?? job.link ?? "",
      question,
      text: text.text,
      warnings: text.warnings,
      demo: text.demo,
    });
  }

  async function writeLetter() {
    const letter = await writing.letter(preview);
    if (!letter) return;
    const kept = await keep("letter", letter);
    onPatch({ letter: kept ? { ...letter, savedId: kept.id } : letter });
    saveLetterOnCopy(saved.copyId, letter.text);
  }

  // "Write the cover letter" on the copy's Download step lands here: the letter starts by itself,
  // in view, from the same post and choices the copy was made with.
  const writeRequestedLetter = useEffectEvent(() => {
    document.getElementById(APPLY_KIT_ID)?.scrollIntoView({ block: "start" });
    void writeLetter();
  });
  useEffect(() => {
    if (saved.copyId && !saved.letter && takeLetterRequest(saved.copyId)) writeRequestedLetter();
  }, [saved.copyId, saved.letter]);

  async function ask(question: string): Promise<boolean> {
    const answer = await writing.answer(preview, question);
    if (!answer) return false;
    const kept = await keep("answer", answer, answer.question);
    const fresh = kept ? { ...answer, savedId: kept.id } : answer;
    onPatch({ answers: [fresh, ...answers].slice(0, MAX_SAVED_ANSWERS) });
    return true;
  }

  async function create() {
    if (!(await roomForResume())) return;
    const meta = tailorMeta(
      result,
      { ...job, jobId: queuedJobIdFor(job.link) },
      saved.letter?.text,
    );
    const id = createTailoredCopy(source.id, meta, (fresh) =>
      applyTailorChoices(fresh, result, choices),
    );
    if (!id || !useStudioStore.getState().resumes[id]) {
      toast({
        title: "That resume is gone",
        description: "Pick another one and try again.",
        variant: "error",
      });
      return;
    }
    onPatch({ copyId: id });
    noteFreshCopy(id);
    toast({
      title: OTTO.tailor.done,
      description: screener.headline ? `${screener.headline}.` : undefined,
      variant: "success",
      durationMs: 6000,
    });
    setStep("download");
  }

  return (
    <section aria-label="Tailoring results" className="flex flex-col gap-6">
      {saved.demo ? <DemoNote /> : null}
      <ResultsOverview screener={screener} onJump={jump} />
      <ScreenerView
        screener={screener}
        choices={choices.requirements}
        targets={targets}
        writing={writing}
        onChoice={answerRequirement}
        onJump={jump}
      />

      <JobLines
        lines={screener.lines}
        unrelated={screener.unrelated}
        addedIds={addedIds}
        onJump={jump}
      />

      <TitleSummary
        title={screener.title}
        summary={screener.summary}
        suggestion={summary}
        current={source.summary}
        useSummary={choices.useSummary}
        onUseSummary={(useSummary) => setChoices({ ...choices, useSummary })}
      />

      {plans.length ? (
        <ResultCard
          title="Your best lines first"
          description="Lines that prove a must-have go to the top of their job, where screeners and recruiters look first."
        >
          <ReorderPreview
            plans={plans}
            reorder={choices.reorder}
            onToggle={(experienceId, on) =>
              setChoices({ ...choices, reorder: { ...choices.reorder, [experienceId]: on } })
            }
          />
        </ResultCard>
      ) : null}

      {result.notes.length ? (
        <ResultCard title="Tips for this job">
          <ul className="flex flex-col gap-3">
            {result.notes.map((note, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-ink">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </ResultCard>
      ) : null}

      {beforeApply}
      <ApplyKit
        letter={saved.letter}
        answers={answers}
        writing={writing}
        pdfResume={copy ?? preview}
        company={tailorMeta(result, job).company}
        onWriteLetter={() => void writeLetter()}
        onEditLetter={(text) => saved.letter && onPatch({ letter: { ...saved.letter, text } })}
        onSettleLetter={() => {
          saveLetterOnCopy(saved.copyId, saved.letter?.text ?? "");
          keepEdit(saved.letter?.savedId, saved.letter?.text ?? "");
        }}
        onAsk={ask}
        onEditAnswer={(id, text) =>
          onPatch({
            answers: answers.map((answer) => (answer.id === id ? { ...answer, text } : answer)),
          })
        }
        onSettleAnswer={(id) => {
          const answer = answers.find((item) => item.id === id);
          if (answer) keepEdit(answer.savedId, answer.text);
        }}
        // Off this job's list only: the saved copy stays on the Cover letters page.
        onRemoveAnswer={(id) => onPatch({ answers: answers.filter((answer) => answer.id !== id) })}
      />

      {/* The step's main action, kept in view while the results scroll past, like the Fix step's
          bar. Once a copy exists it opens that copy, so a second click doesn't make a twin. */}
      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex items-center gap-3 rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-ink/5 max-sm:flex-col max-sm:items-stretch max-sm:gap-1 sm:pl-4">
        <p className="min-w-0 flex-1 text-sm text-muted max-sm:px-2.5 max-sm:pt-1.5 max-sm:pb-1">
          {copy
            ? `Your copy for this job is ready: ${resumeTitle(copy)}.`
            : describeChanges(changes)}
        </p>
        {copy ? (
          <div className="flex items-center gap-1 max-sm:w-full">
            <Button variant="ghost" onClick={() => void create()} className="max-sm:flex-1">
              Make another
            </Button>
            <Button
              onClick={() => {
                setActive(copy.id);
                setStep("download");
              }}
              className="max-sm:flex-1"
            >
              Open tailored version
              <ArrowRight />
            </Button>
          </div>
        ) : (
          <Button onClick={() => void create()} className="max-sm:w-full">
            <FilePlus />
            Create tailored version
          </Button>
        )}
      </div>
      {writing.dialogs}
    </section>
  );
}
