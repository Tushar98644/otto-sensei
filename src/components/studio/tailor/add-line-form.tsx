"use client";

import { useState } from "react";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { VoiceTextarea } from "@/components/ui/voice-field";
import type { TailorRequirement } from "@/lib/ai/types";
import { newId } from "@/lib/resume/schema";
import type { AddedLine, LineTarget } from "./apply";
import { hasBlank, missingName, tidyLine, verbNote } from "./screener";
import type { Writing } from "./use-writing";

const ANSWER_CHARS = 500;
const LINE_CHARS = 1_000;

export type AddLineFormProps = {
  requirement: TailorRequirement;
  targets: LineTarget[];
  writing: Writing;
  onAdd: (line: AddedLine) => void;
  onCancel: () => void;
};

function placeholderFor(t: Messages["studioTailor"]["addLine"], requirement: TailorRequirement) {
  const [name] = requirement.terms;
  return name ? fmt(t.placeholderWith, { name }) : t.placeholder;
}

export function AddLineForm({ requirement, targets, writing, onAdd, onCancel }: AddLineFormProps) {
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [what, setWhat] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);
  const target = targets.find((item) => item.id === targetId) ?? null;
  const writingLine = writing.busy === "line";
  const failed = writing.error?.task === "line" ? writing.error.message : null;
  const t = useMessages("studioTailor").addLine;

  if (!target) return <p className="text-sm text-muted">{t.noTarget}</p>;

  async function write() {
    if (!target) return;
    if (!what.trim()) {
      setProblem(t.whatFirst);
      return;
    }
    setProblem(null);
    setAsked(true);
    const line = await writing.line(requirement, target, what).finally(() => setAsked(false));
    if (line !== null) setDraft(tidyLine(line));
  }

  function takeMine() {
    if (!what.trim()) {
      setProblem(t.whatFirst);
      return;
    }
    setProblem(null);
    setDraft(what.trim());
  }

  const nameNote = draft === null ? null : missingName(t, requirement, draft);
  const claimNote = draft === null ? null : verbNote(t, what, draft);
  const blank = draft !== null && hasBlank(draft);

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-surface-muted p-4">
      <Field label={t.where}>
        <Select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
          {targets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t.what} hint={t.whatHint} error={problem}>
        <VoiceTextarea
          autoResize
          maxLength={ANSWER_CHARS}
          value={what}
          onChange={(event) => setWhat(event.target.value)}
          onDictate={setWhat}
          placeholder={placeholderFor(t, requirement)}
          className="bg-surface"
        />
      </Field>
      {draft === null ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void write()} loading={writingLine}>
              {t.write}
            </Button>
            <Button size="sm" variant="ghost" onClick={takeMine} disabled={writingLine}>
              {t.useMine}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={writingLine}>
              {t.cancel}
            </Button>
          </div>
          <p className="text-xs text-subtle">{t.usesFix}</p>
          {asked && writingLine ? <OttoWorking task="line" size="sm" /> : null}
          {failed ? (
            <Alert variant="error" className="mt-1">
              {failed}
            </Alert>
          ) : null}
        </div>
      ) : (
        <>
          <Field label={t.newLine} hint={fmt(t.newLineHint, { place: target.label })}>
            <VoiceTextarea
              autoResize
              maxLength={LINE_CHARS}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onDictate={setDraft}
              className="bg-surface"
            />
          </Field>
          {blank || nameNote || claimNote ? (
            <Alert variant="warn">
              {[blank ? t.brackets : null, nameNote, claimNote].filter(Boolean).join(" ")}
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!draft.trim() || blank}
              onClick={() => onAdd({ id: newId(), parentId: target.id, text: draft.trim() })}
            >
              {t.add}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              {t.back}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
