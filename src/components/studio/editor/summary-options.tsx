"use client";

import { TriangleExclamationPoint } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/ui/voice-field";
import type { SummaryOption, SummaryOptionKind } from "@/lib/api/types";
import { DemoNote } from "../demo-note";
import { fixAllowanceText, hasPlaceholders, splitPlaceholders } from "./fix-text";
import { CHAR_LIMITS } from "./limits";
import { sameText, type Ready, type SummaryFlow } from "./use-summary-help";

const KIND_LABELS: Record<SummaryOptionKind, string> = {
  achievements: "Leads with results",
  role: "Leads with your role",
  tightened: "Tighter version",
};

export function ReadyOptions({
  flow,
  state,
  baseId,
}: {
  flow: SummaryFlow;
  state: Ready;
  baseId: string;
}) {
  const unchanged =
    state.mode === "improve" && sameText(state.options[0]?.text ?? "", state.original);
  const allowance = fixAllowanceText(state.usage.fix, flow.plan, flow.period, flow.trial);
  return (
    <>
      {unchanged ? null : (
        <ul role="list" className="flex flex-col divide-y divide-border">
          {state.options.map((option, index) => (
            <OptionRow
              key={option.kind}
              option={option}
              id={`${baseId}-option-${index}`}
              draft={state.editing?.index === index ? state.editing.draft : null}
              onEdit={(draft) => flow.setEditing(draft === null ? null : { index, draft })}
              onUse={flow.apply}
            />
          ))}
        </ul>
      )}
      {state.demo ? <DemoNote /> : null}
      {allowance ? <p className="text-sm text-muted">{allowance}</p> : null}
    </>
  );
}

type OptionRowProps = {
  option: SummaryOption;
  id: string;
  draft: string | null;
  onEdit: (draft: string | null) => void;
  onUse: (text: string) => void;
};

function OptionRow({ option, id, draft, onEdit, onUse }: OptionRowProps) {
  const blanks = hasPlaceholders(option.text);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const editing = draft !== null;

  useEffect(() => {
    if (editing) draftRef.current?.focus();
  }, [editing]);

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <Eyebrow>{KIND_LABELS[option.kind]}</Eyebrow>
      {draft === null ? (
        <p className="text-base/7 text-pretty text-ink">
          {splitPlaceholders(option.text).map((part, index) =>
            part.placeholder ? (
              <mark key={index} className="rounded-sm bg-warn-soft px-1 font-medium text-warn-ink">
                {part.text}
              </mark>
            ) : (
              part.text
            ),
          )}
        </p>
      ) : (
        <>
          <Label htmlFor={`${id}-draft`} className="sr-only">
            Your version
          </Label>
          <VoiceTextarea
            ref={draftRef}
            id={`${id}-draft`}
            autoResize
            value={draft}
            maxLength={CHAR_LIMITS.summary}
            onChange={(event) => onEdit(event.target.value)}
            onDictate={onEdit}
            className="min-h-28"
          />
        </>
      )}
      {option.warnings.length > 0 ? (
        <ul role="list" className="flex flex-col gap-1.5">
          {option.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2 text-sm text-ink">
              <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {blanks && draft === null ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          Words in [brackets] are blanks for your real facts. Edit it to fill them in.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {draft === null ? (
          <Button variant="secondary" size="sm" onClick={() => onEdit(option.text)}>
            Edit first
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => onEdit(null)}>
            Cancel edit
          </Button>
        )}
        <Button
          size="sm"
          disabled={draft === null ? blanks : !draft.trim()}
          aria-describedby={blanks && draft === null ? `${id}-hint` : undefined}
          onClick={() => onUse(draft ?? option.text)}
        >
          Use this
        </Button>
      </div>
    </li>
  );
}
