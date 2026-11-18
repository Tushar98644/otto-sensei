"use client";

import { useMe } from "@/components/account/use-me";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Resume } from "@/lib/resume/schema";
import { AnswerBox } from "./answer-box";
import { LetterPanel } from "./letter-panel";
import { APPLY_KIT_ID } from "./letter-request";
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
  return (
    <Card id={APPLY_KIT_ID} className="scroll-mt-6">
      <CardHeader>
        <CardTitle as="h2">Apply to this job</CardTitle>
        <CardDescription>
          Written only from your resume and this post, in plain words. You copy it where it goes.
        </CardDescription>
      </CardHeader>
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
    </Card>
  );
}
