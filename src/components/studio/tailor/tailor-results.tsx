"use client";

import { FilePlus, Lightbulb } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { OTTO } from "@/components/mascot/lines";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { COVER_LETTER_CHARS, type Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
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
import { noteFreshCopy } from "./fresh-copy";
import { jumpToLine } from "./jump";
import { ReorderPreview } from "./reorder-preview";
import type { Screener } from "./screener";
import { ScreenerView } from "./screener-view";
import { MAX_SAVED_ANSWERS, type SavedResult } from "./session";
import { SummaryChoice } from "./summary-choice";
import type { ResultPatch } from "./use-tailor";
import { useWriting } from "./use-writing";

export type TailorResultsProps = {
  source: Resume;
  // The result with everything the person added to it so far.
  saved: SavedResult;
  choices: TailorChoices;
  screener: Screener;
  onPatch: (patch: ResultPatch) => void;
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

// Keeps the latest letter on the tailored copy made from this result, if there is one. Skipped
// when nothing changed, so an unchanged letter never bumps the copy's "edited" time.
function saveLetterOnCopy(copyId: string | undefined, text: string) {
  if (!copyId) return;
  const store = useStudioStore.getState();
  const tailor = store.resumes[copyId]?.tailor;
  const letter = text.trim().slice(0, COVER_LETTER_CHARS);
  if (!tailor || (tailor.coverLetter ?? "") === letter) return;
  store.updateResume(copyId, (resume) => {
    if (!resume.tailor) return resume;
    const meta = { ...resume.tailor };
    delete meta.coverLetter;
    return { ...resume, tailor: letter ? { ...meta, coverLetter: letter } : meta };
  });
}

export function TailorResults({ source, saved, choices, screener, onPatch }: TailorResultsProps) {
  const createTailoredCopy = useStudioStore((s) => s.createTailoredCopy);
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

  const setChoices = (next: TailorChoices) => onPatch({ choices: next });
  function answerRequirement(id: string, choice: RequirementChoice | null) {
    const requirements = { ...choices.requirements };
    if (choice) requirements[id] = choice;
    else delete requirements[id];
    setChoices({ ...choices, requirements });
  }

  async function writeLetter() {
    const letter = await writing.letter(preview);
    if (!letter) return;
    onPatch({ letter });
    saveLetterOnCopy(saved.copyId, letter.text);
  }

  async function ask(question: string): Promise<boolean> {
    const answer = await writing.answer(preview, question);
    if (!answer) return false;
    onPatch({ answers: [answer, ...answers].slice(0, MAX_SAVED_ANSWERS) });
    return true;
  }

  function create() {
    const id = createTailoredCopy(source.id, tailorMeta(result, job, saved.letter?.text), (fresh) =>
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
      <ScreenerView
        screener={screener}
        choices={choices.requirements}
        targets={targets}
        writing={writing}
        onChoice={answerRequirement}
        onJump={(bulletId) => jumpToLine(source.id, bulletId)}
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

      {summary ? (
        <ResultCard
          title="Suggested summary"
          description="Written only from what's already in your resume."
        >
          <SummaryChoice
            suggestion={summary}
            current={source.summary}
            checked={choices.useSummary}
            onChange={(useSummary) => setChoices({ ...choices, useSummary })}
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

      <ApplyKit
        letter={saved.letter}
        answers={answers}
        writing={writing}
        pdfResume={copy ?? preview}
        company={tailorMeta(result, job).company}
        onWriteLetter={() => void writeLetter()}
        onEditLetter={(text) => saved.letter && onPatch({ letter: { ...saved.letter, text } })}
        onSettleLetter={() => saveLetterOnCopy(saved.copyId, saved.letter?.text ?? "")}
        onAsk={ask}
        onEditAnswer={(id, text) =>
          onPatch({
            answers: answers.map((answer) => (answer.id === id ? { ...answer, text } : answer)),
          })
        }
        onRemoveAnswer={(id) => onPatch({ answers: answers.filter((answer) => answer.id !== id) })}
      />

      <Card className="sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">{describeChanges(changes)}</p>
        <Button size="lg" onClick={create} className="w-full sm:w-auto">
          <FilePlus />
          Create tailored version
        </Button>
      </Card>
      {writing.dialogs}
    </section>
  );
}
