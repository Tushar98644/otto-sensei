"use client";

import { useMe } from "@/components/account/use-me";
import type { Resume } from "@/lib/resume/schema";
import { pluralize } from "@/lib/utils";
import { AnswerBox } from "./answer-box";
import { LetterPanel } from "./letter-panel";
import { APPLY_KIT_ID } from "./letter-request";
import { ResultSection } from "./result-section";
import { writingAllowance } from "./writing-allowance";
import type { SavedAnswer, SavedWriting } from "./session";
import type { Writing } from "./use-writing";

export type ApplyKitProps = {
  letter: SavedWriting | undefined;
  answers: SavedAnswer[];
  writing: Writing;
  pdfResume: Resume;
  company: string;
  onWriteLetter: () => void;
  onEditLetter: (text: string) => void;
  onSettleLetter: () => void;
  onAsk: (question: string) => Promise<boolean>;
  onEditAnswer: (id: string, text: string) => void;
  onSettleAnswer?: (id: string) => void;
  onRemoveAnswer: (id: string) => void;
};

export function ApplyKit(props: ApplyKitProps) {
  const { user, me, loading } = useMe();
  const allowance = loading
    ? null
    : writingAllowance(user?.plan, me?.usage?.letter, me?.period, me?.billing.trial !== false);
  const written = [
    props.letter ? "Cover letter written" : null,
    props.answers.length > 0 ? pluralize(props.answers.length, "answer") : null,
  ].filter((part): part is string => part !== null);
  return (
    <ResultSection
      id={APPLY_KIT_ID}
      title="Apply to this job"
      meta={
        written.length > 0 ? written.join(" · ") : "A cover letter and answers to form questions"
      }
    >
      <p className="text-sm text-muted">
        Written only from your resume and this post, in plain words. You copy it where it goes.
      </p>
      <LetterPanel
        letter={props.letter}
        writing={props.writing}
        pdfResume={props.pdfResume}
        company={props.company}
        onWrite={props.onWriteLetter}
        onEdit={props.onEditLetter}
        onSettle={props.onSettleLetter}
      />
      <div className="border-t border-border pt-6">
        <AnswerBox
          answers={props.answers}
          writing={props.writing}
          onAsk={props.onAsk}
          onEdit={props.onEditAnswer}
          onSettle={props.onSettleAnswer}
          onRemove={props.onRemoveAnswer}
        />
      </div>
      {allowance ? <p className="text-sm text-subtle">{allowance}</p> : null}
    </ResultSection>
  );
}
