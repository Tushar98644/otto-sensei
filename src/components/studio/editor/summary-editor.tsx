"use client";

import { memo, useEffect, useId, useRef } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { OttoMark } from "@/components/site/otto-mark";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { VoiceTextarea } from "@/components/ui/voice-field";
import { SUMMARY_IMPROVE_CHARS } from "@/config/plans";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { listBullets } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { SUMMARY_INPUT_ID } from "./focus";
import { CHAR_LIMITS } from "./limits";
import { ReadyOptions } from "./summary-options";
import { editSection, useResumeValue } from "./use-editor";
import { sameText, useSummaryHelp, type Help } from "./use-summary-help";

type SummaryCopy = Messages["studioEditor"]["summary"];

function wordsIn(text: string): number {
  return text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}

function hasFacts(resume: Resume): boolean {
  return (
    listBullets(resume).some((bullet) => bullet.text.trim() !== "") ||
    resume.experience.some((job) => job.title.trim() !== "") ||
    resume.basics.headline.trim() !== ""
  );
}

function ottoLine(t: SummaryCopy, help: Help): string {
  switch (help.status) {
    case "idle":
    case "loading":
      return help.status === "loading" && help.mode === "improve" ? t.otto.tightening : t.otto.reading;
    case "failed":
      return help.message;
    case "ready": {
      const [first] = help.options;
      if (!first) return t.otto.needMore;
      if (help.mode === "improve") {
        return sameText(first.text, help.original) ? t.otto.alreadyGood : t.otto.tightened;
      }
      return help.options.length > 1 ? t.otto.twoTakes : t.otto.oneTake;
    }
  }
}

function ottoMeta(t: SummaryCopy, help: Help): string | undefined {
  if (help.status !== "ready" || help.options.length === 0) return undefined;
  if (help.mode === "write") return help.options.length > 1 ? t.twoTakes : t.oneTake;
  const after = help.options[0]?.text ?? "";
  return fmt(t.wordsChange, { before: wordsIn(help.original), after: wordsIn(after) });
}

export const SummaryEditor = memo(function SummaryEditor({ resumeId }: { resumeId: string }) {
  const summary = useResumeValue(resumeId, (resume) => resume.summary, "");
  const canWrite = useResumeValue(resumeId, hasFacts, false);
  const id = useId();
  const inputId = SUMMARY_INPUT_ID;
  const hintId = `${id}-hint`;
  const countId = `${id}-count`;
  const panelRef = useRef<HTMLElement>(null);
  const flow = useSummaryHelp(resumeId, () => document.getElementById(inputId)?.focus());
  const { help } = flow;
  const working = help.status === "loading";
  const canImprove = summary.trim().length >= SUMMARY_IMPROVE_CHARS.min;
  const t = useMessages("studioEditor").summary;
  const format = useFormat();

  function setSummary(text: string) {
    editSection(resumeId, "summary", (resume) => ({ ...resume, summary: text }));
  }

  const settled = help.status === "ready" || help.status === "failed";
  useEffect(() => {
    if (settled) panelRef.current?.focus();
  }, [settled]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId} className="sr-only">
        {t.label}
      </Label>
      <VoiceTextarea
        id={inputId}
        autoResize
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        onDictate={setSummary}
        maxLength={CHAR_LIMITS.summary}
        aria-describedby={`${hintId} ${countId}`}
        placeholder={t.placeholder}
        className="min-h-28"
      />
      <div className="flex items-start justify-between gap-4 text-sm text-muted">
        <p id={hintId}>{t.hint}</p>
        <p id={countId} className="shrink-0 tabular-nums">
          {format.number(summary.length)} / {format.number(CHAR_LIMITS.summary)}
          <span className="sr-only"> {t.characters}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 max-sm:h-11"
          disabled={!canWrite || working}
          loading={working && help.mode === "write"}
          onClick={() => void flow.ask("write")}
        >
          <OttoMark tone="line" small className="size-5 text-ink" />
          {t.write}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="max-sm:h-11"
          disabled={!canImprove || working}
          loading={working && help.mode === "improve"}
          onClick={() => void flow.ask("improve")}
        >
          {t.improve}
        </Button>
        {canWrite ? null : <p className="text-sm text-muted">{t.needFacts}</p>}
      </div>
      {help.status === "idle" ? null : (
        <section
          ref={panelRef}
          tabIndex={-1}
          aria-labelledby={`${id}-help`}
          aria-busy={working || undefined}
          className="flex flex-col gap-4 rounded-2xl bg-surface-muted p-4 outline-none"
        >
          <h3 id={`${id}-help`} className="sr-only">
            {t.help}
          </h3>
          <OttoNote size="sm" meta={ottoMeta(t, help)} message={ottoLine(t, help)} />
          {working ? <OttoWorking task="summary" size="sm" /> : null}
          {help.status === "ready" ? <ReadyOptions flow={flow} state={help} baseId={id} /> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={flow.close}>
              {help.status === "ready" && help.options.length > 0 ? t.keep : t.close}
            </Button>
            {help.status === "failed" ? (
              <Button variant="secondary" size="sm" onClick={() => void flow.ask(help.mode)}>
                {t.tryAgain}
              </Button>
            ) : null}
          </div>
        </section>
      )}
      {flow.dialogs}
    </div>
  );
});
