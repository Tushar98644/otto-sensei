"use client";

import { Lightbulb } from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useRef, type ReactNode } from "react";
import { roomForResume } from "@/components/account/pro-tools";
import { toast } from "@/components/ui/toast";
import type { Resume } from "@/lib/resume/schema";
import { resumeTitle } from "@/lib/resume/ops";
import { useStudioStore } from "@/lib/store/resume-store";
import { keepEdit, keepWriting } from "@/lib/writings/client";
import { useFormat, useMessages } from "@/i18n/client";
import { countText } from "../count";
import { DemoNote } from "../demo-note";
import {
  applyTailorChoices,
  lineTargets,
  reorderPlans,
  summarizeChoices,
  tailorMeta,
  type RequirementChoice,
  type TailorChoices,
} from "./apply";
import { ApplyKit } from "./apply-kit";
import { CopyBar, CopyCard } from "./copy-card";
import { saveLetterOnCopy } from "./copy-letter";
import { noteFreshCopy } from "./fresh-copy";
import { jumpToLine } from "./jump";
import { APPLY_KIT_ID, takeLetterRequest } from "./letter-request";
import { ReorderPreview } from "./reorder-preview";
import { ResultSection } from "./result-section";
import { revealSection } from "./reveal";
import type { Screener } from "./screener";
import { ScreenerView } from "./screener-view";
import { MAX_SAVED_ANSWERS, queuedJobIdFor, type SavedResult, type SavedWriting } from "./session";
import { JobLines } from "./job-lines";
import { ResultsOverview } from "./results-overview";
import { TitleSummary } from "./title-summary";
import { useInView } from "./use-in-view";
import type { ResultPatch } from "./use-tailor";
import { useWriting } from "./use-writing";

export type TailorResultsProps = {
  source: Resume;
  saved: SavedResult;
  choices: TailorChoices;
  screener: Screener;
  onPatch: (patch: ResultPatch) => void;
  beforeApply?: ReactNode;
};

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
  const studio = useMessages("studio");
  const t = useMessages("studioTailor");
  const format = useFormat();
  const cardRef = useRef<HTMLDivElement>(null);
  const cardInView = useInView(cardRef);

  const plans = useMemo(() => reorderPlans(source, result), [source, result]);
  const targets = useMemo(() => lineTargets(source), [source]);
  const preview = useMemo(
    () => applyTailorChoices(source, result, choices),
    [source, result, choices],
  );
  const changes = summarizeChoices(source, result, choices);
  const reordered = changes.reorderedJobs;
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

  const writeRequestedLetter = useEffectEvent(() => {
    revealSection(APPLY_KIT_ID);
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
      toast({ title: t.results.gone, description: t.results.goneNote, variant: "error" });
      return;
    }
    onPatch({ copyId: id });
    noteFreshCopy(id);
    toast({
      title: t.otto.done,
      description: screener.headline ? `${screener.headline}.` : undefined,
      variant: "success",
      durationMs: 6000,
    });
    setStep("download");
  }

  const actions = {
    changes,
    copy,
    onCreate: () => void create(),
    onOpen: () => {
      if (!copy) return;
      setActive(copy.id);
      setStep("download");
    },
  };

  return (
    <section aria-label={t.results.label} className="flex flex-col gap-6">
      {saved.demo ? <DemoNote text={studio.demoNote} /> : null}
      <CopyCard ref={cardRef} {...actions} />
      <ResultsOverview screener={screener} onJump={jump} />
      <div className="flex flex-col gap-3">
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
          <ResultSection
            title={t.results.bestFirst}
            meta={countText(format, t.results.movedIn, plans.length, { moved: reordered })}
          >
            <p className="text-sm text-muted">{t.results.bestFirstNote}</p>
            <ReorderPreview
              plans={plans}
              reorder={choices.reorder}
              onToggle={(experienceId, on) =>
                setChoices({ ...choices, reorder: { ...choices.reorder, [experienceId]: on } })
              }
            />
          </ResultSection>
        ) : null}

        {result.notes.length ? (
          <ResultSection
            title={t.results.tips}
            meta={countText(format, t.results.tipCount, result.notes.length)}
          >
            <ul className="flex flex-col gap-3">
              {result.notes.map((note, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-ink">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </ResultSection>
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
          onRemoveAnswer={(id) =>
            onPatch({ answers: answers.filter((answer) => answer.id !== id) })
          }
        />
      </div>
      {cardInView ? null : <CopyBar {...actions} />}
      {writing.dialogs}
    </section>
  );
}
