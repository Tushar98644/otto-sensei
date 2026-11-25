"use client";

import {
  ArrowLeft,
  Copy,
  Download,
  Ellipsis,
  ExternalLink,
  FileText,
  Mail,
  PanelsTopLeft,
  RotateCcw,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useEffectEvent, useId, useState, type ReactNode } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { WritingStyleHint } from "@/components/settings/writing-style-hint";
import { DemoNote } from "@/components/studio/demo-note";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { CompanyMark } from "@/components/ui/company-mark";
import { copyText } from "@/components/ui/copy-text";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { liveWarnings, needsFirstName, warningIn } from "@/lib/ai/warning-text";
import { wordCount } from "@/lib/ai/writing-guards";
import type { Application } from "@/lib/applications/schema";
import { applicationHref } from "@/lib/applications/thread";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { textLimit, WRITING_LIMITS } from "@/lib/writings/schema";
import { StatusIcon } from "../applications/status-menu";
import { outreachChange, type OutreachField, type OutreachFields } from "../jobs/outreach-saved";
import { OutreachSend } from "../jobs/outreach-send";
import { fieldsOfEntry, KIND_NAMES, type LetterEntry } from "./entries";
import { languageOf } from "@/lib/i18n/detect";
import { longDay, Paper, PaperBody, PaperHead, PaperLine } from "./letter-paper";
import { asEmail, emailSubject } from "./ready";
import { useWriteActions } from "./quick-actions";
import type { QuickRun } from "./use-quick-write";
import { PostBox } from "./write-boxes";

// The most a free LinkedIn account allows in an invite note; the outreach writer keeps to it.
const NOTE_CHARS = 200;

type SaveState = "idle" | "saving" | "saved" | "failed";

const LONG_DAY = { month: "long", day: "numeric", year: "numeric" } as const;

export type ReaderAgain = {
  run: QuickRun | null;
  blocked: boolean;
  ask: string | null;
  error: string | null;
};

export type LetterReaderProps = {
  entry: LetterEntry;
  resume: Resume;
  source: string;
  application: Application | null;
  rendering: "pdf" | "word" | null;
  canOpenInStudio: boolean;
  again: ReaderAgain;
  // Just written: Otto hands it over once.
  fresh: boolean;
  onBack: () => void;
  onSave: (entry: LetterEntry, text: string) => Promise<boolean>;
  onSaveOutreach: (entry: LetterEntry, fields: OutreachFields) => Promise<boolean>;
  onPdf: (text: string) => void;
  onWord: (text: string) => void;
  onOpenInStudio: () => void;
  onDelete: () => void;
  onWriteAgain: (post?: string) => void;
  onDismissAgain: () => void;
};

function contactLine(resume: Resume): string {
  const { email, phone, location } = resume.basics;
  return [email, phone, location]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("  ·  ");
}

function RailButton({
  icon: Icon,
  label,
  onClick,
  variant = "secondary",
  loading,
  disabled,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={variant}
        loading={loading}
        disabled={disabled}
        onClick={onClick}
        className={cn("w-full", variant === "ghost" ? "justify-start px-3" : "justify-center")}
      >
        <Icon aria-hidden />
        {label}
      </Button>
      {hint ? <p className="px-1 text-xs/5 text-pretty text-subtle">{hint}</p> : null}
    </div>
  );
}

export function LetterReader({
  entry,
  resume,
  source,
  application,
  rendering,
  canOpenInStudio,
  again,
  fresh,
  onBack,
  onSave,
  onSaveOutreach,
  onPdf,
  onWord,
  onOpenInStudio,
  onDelete,
  onWriteAgain,
  onDismissAgain,
}: LetterReaderProps) {
  const t = useMessages("letters");
  const warn = useMessages("otto").warnings;
  const { reader } = t;
  const { statuses } = useMessages("applications");
  const format = useFormat();
  const writeActions = useWriteActions();
  const saveLines: Record<SaveState, string> = {
    idle: "",
    saving: reader.saving,
    saved: reader.saved,
    failed: reader.failed,
  };
  const titleId = useId();
  const [text, setText] = useState(entry.text);
  const [fields, setFields] = useState(() => fieldsOfEntry(entry));
  const [save, setSave] = useState<SaveState>("idle");
  const kind = entry.kind;
  const outreach = kind === "outreach";
  const letter = kind === "letter";
  const kept = entry.writingId !== null || entry.copyId !== null;
  const body = outreach ? fields.email : text;
  const name = resume.basics.name.trim();
  const subject = outreach ? fields.subject : emailSubject(entry.role, name);
  const checks = liveWarnings(
    entry.warnings,
    outreach ? [fields.subject, fields.email, fields.note].join("\n") : text,
    outreach ? ["[first name]"] : [],
  ).map((item) => warningIn(item, warn));
  const firstName = outreach && needsFirstName(fields.subject, fields.email, fields.note);
  const title = entry.company || entry.role || t.kinds[kind];
  const role = entry.company ? entry.role : "";
  const mine = again.run;

  async function settle() {
    if (outreach) {
      if (!outreachChange(fields, fieldsOfEntry(entry))) return;
      setSave("saving");
      setSave((await onSaveOutreach(entry, fields)) ? "saved" : "failed");
      return;
    }
    if (!text.trim() || text.trim() === entry.text.trim()) return;
    setSave("saving");
    setSave((await onSave(entry, text)) ? "saved" : "failed");
  }

  // Leaving the reader keeps an edit that never lost focus.
  const settleOnLeave = useEffectEvent(() => void settle());
  useEffect(() => () => settleOnLeave(), []);

  function edit(field: OutreachField, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setSave("idle");
  }

  const copyMain = () =>
    outreach
      ? void copyText(asEmail(fields.subject, fields.email), "email")
      : void copyText(text, KIND_NAMES[kind].copy);
  const copySecond = () =>
    outreach ? void copyText(fields.note, "note") : void copyText(asEmail(subject, text), "email");

  const menu: MenuEntry[] = [
    ...(letter
      ? [
          { label: reader.download, icon: Download, onSelect: () => onPdf(text) },
          { label: reader.downloadWord, icon: FileText, onSelect: () => onWord(text) },
        ]
      : []),
    {
      label: reader.again,
      icon: RotateCcw,
      disabled: again.blocked || mine !== null,
      onSelect: () => onWriteAgain(),
    },
    ...(canOpenInStudio
      ? [{ label: reader.openStudio, icon: PanelsTopLeft, onSelect: onOpenInStudio }]
      : []),
    "separator",
    { label: reader.delete, icon: Trash2, tone: "danger", onSelect: onDelete },
  ];

  const status = (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-subtle">
      {outreach ? (
        <span className={cn("tabular-nums", fields.note.length > NOTE_CHARS && "text-fail-ink")}>
          {fmt(reader.note, {
            count: format.number(fields.note.length),
            max: format.number(NOTE_CHARS),
          })}
        </span>
      ) : (
        <span className="tabular-nums">{format.plural(reader.words, wordCount(text))}</span>
      )}
      <span role="status" className={save === "failed" ? "text-fail-ink" : undefined}>
        {saveLines[save]}
      </span>
    </div>
  );

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-6 motion-safe:animate-fade-in sm:gap-8"
    >
      <div>
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted transition-colors hover:bg-ink/6 hover:text-ink pointer-coarse:h-11"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {reader.all}
        </button>
      </div>

      <header className="flex items-start gap-4">
        <CompanyMark name={entry.company} size="lg" className="mt-1 max-sm:hidden" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-xs/5 font-medium tracking-widest text-subtle uppercase">
            <span>{t.kinds[kind]}</span>
            <span aria-hidden>·</span>
            <span>{format.date(entry.createdAt, LONG_DAY)}</span>
          </p>
          <h1
            id={titleId}
            className="mt-1 font-display text-4xl/10 font-normal tracking-tight text-pretty text-ink sm:text-5xl/13"
          >
            {title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-base/7 text-muted">
            {role ? <span className="text-pretty">{role}</span> : null}
            {source ? (
              <span className="text-sm text-subtle">{fmt(t.reader.from, { source })}</span>
            ) : null}
            {application ? (
              <Link
                href={applicationHref(application.id)}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface px-2.5 text-xs font-medium text-muted shadow-control ring-1 ring-ink/6 transition-colors hover:text-ink"
              >
                <StatusIcon status={application.status} className="size-3.5" />
                {statuses[application.status]}
                <span className="sr-only">{reader.openApplication}</span>
              </Link>
            ) : null}
            {entry.jobUrl ? (
              <a
                href={entry.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 items-center gap-1 text-sm font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
              >
                {reader.post}
                <ExternalLink aria-hidden className="size-3.5" />
                <span className="sr-only">{reader.newTab}</span>
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16.5rem] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Phones: the main keys sit above the page, the rest in the menu. */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button className="flex-1" disabled={!body.trim()} onClick={copyMain}>
              <Copy aria-hidden />
              {outreach ? reader.copyEmail : reader.copy}
            </Button>
            {kind === "answer" ? null : (
              <Button
                variant="secondary"
                className="flex-1"
                disabled={!body.trim()}
                onClick={copySecond}
              >
                <Mail aria-hidden />
                {outreach ? reader.copyNote : reader.copyAsEmail}
              </Button>
            )}
            <Menu
              label={fmt(reader.moreFor, { title })}
              align="end"
              triggerLabel={reader.moreActions}
              triggerClassName={buttonClasses({ variant: "secondary", size: "icon" })}
              trigger={<Ellipsis aria-hidden />}
              items={menu}
            />
          </div>

          {fresh && !mine ? (
            <OttoNote
              size="sm"
              message={
                outreach
                  ? reader.outreachDone
                  : fmt(reader.writtenFrom, { source: source || reader.yourResume })
              }
            />
          ) : null}
          {mine ? (
            <div className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-ink/4">
              <OttoWorking task={mine.phase === "reading" ? "job" : mine.kind} size="sm" />
            </div>
          ) : again.ask !== null ? (
            <PostBox
              note={again.ask}
              action={writeActions[kind]}
              onWrite={(post) => onWriteAgain(post)}
              onCancel={onDismissAgain}
              className="bg-surface shadow-card ring-1 ring-ink/4"
            />
          ) : null}
          {again.error ? <Alert variant="error">{again.error}</Alert> : null}
          {kept ? null : (
            <Alert variant="warn" title={reader.unsaved}>
              {reader.unsavedBody}
            </Alert>
          )}
          {firstName || checks.length ? (
            <Alert variant="warn" title={reader.check}>
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {firstName ? <li>{reader.swapName}</li> : null}
                {checks.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {entry.demo ? <DemoNote className="px-1" /> : null}

          <Paper>
            {outreach ? (
              <div className="flex flex-col gap-5">
                <PaperLine
                  label={reader.subject}
                  value={fields.subject}
                  maxLength={WRITING_LIMITS.subject}
                  onChange={(value) => edit("subject", value)}
                  onSettle={() => void settle()}
                />
                <span aria-hidden className="block h-px bg-border" />
                <PaperBody
                  label={reader.email}
                  value={fields.email}
                  maxLength={WRITING_LIMITS.outreachChars}
                  onChange={(value) => edit("email", value)}
                  onSettle={() => void settle()}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-7">
                {letter ? (
                  <PaperHead
                    name={name}
                    contact={contactLine(resume)}
                    day={longDay(entry.createdAt, languageOf(body))}
                  />
                ) : entry.question ? (
                  <div className="flex flex-col gap-2 border-l-2 border-otter/40 pl-4">
                    <p className="text-xs/4 font-medium tracking-widest text-subtle uppercase">
                      {reader.question}
                    </p>
                    <p className="font-display text-xl/8 text-pretty text-ink italic">
                      {entry.question}
                    </p>
                  </div>
                ) : null}
                <PaperBody
                  label={t.kinds[letter ? "letter" : "answer"]}
                  value={text}
                  maxLength={textLimit(kind)}
                  onChange={(value) => {
                    setText(value);
                    setSave("idle");
                  }}
                  onSettle={() => void settle()}
                />
              </div>
            )}
          </Paper>

          {outreach ? (
            <section className="flex flex-col gap-3 rounded-2xl bg-surface p-5 shadow-card ring-1 ring-ink/4 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-sans text-base/6 font-semibold text-ink">{reader.linkedin}</h2>
                <span
                  className={cn(
                    "text-xs text-subtle tabular-nums",
                    fields.note.length > NOTE_CHARS && "font-medium text-fail-ink",
                  )}
                >
                  {fmt(reader.noteCount, {
                    count: format.number(fields.note.length),
                    max: format.number(NOTE_CHARS),
                  })}
                </span>
              </div>
              <p className="text-sm/6 text-muted">{reader.fits}</p>
              <div className="rounded-xl bg-surface-muted p-4">
                <PaperBody
                  label={reader.linkedin}
                  value={fields.note}
                  maxLength={WRITING_LIMITS.noteChars}
                  onChange={(value) => edit("note", value)}
                  onSettle={() => void settle()}
                  className="text-base/7 sm:text-base/7"
                />
              </div>
              <OutreachSend
                company={entry.company}
                title={entry.role}
                postText=""
                message={fields}
              />
            </section>
          ) : null}
        </div>

        <aside
          aria-label={reader.actions}
          className="flex flex-col gap-4 max-lg:hidden lg:sticky lg:top-6"
        >
          <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3 shadow-card ring-1 ring-ink/4">
            <RailButton
              icon={Copy}
              variant="primary"
              label={
                outreach ? reader.copyEmail : t.copyKind[kind === "answer" ? "answer" : "letter"]
              }
              disabled={!body.trim()}
              onClick={copyMain}
              hint={outreach ? reader.withSubject : undefined}
            />
            {kind === "answer" ? null : (
              <RailButton
                icon={Mail}
                label={outreach ? reader.copyLinkedin : reader.copyAsEmail}
                disabled={!body.trim()}
                onClick={copySecond}
                hint={outreach ? undefined : fmt(reader.subjectLine, { subject })}
              />
            )}
            {letter ? (
              <div className="mt-1 grid grid-cols-2 gap-2 border-t border-border pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={rendering === "pdf"}
                  disabled={!text.trim()}
                  onClick={() => onPdf(text)}
                >
                  <Download aria-hidden />
                  PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={rendering === "word"}
                  disabled={!text.trim()}
                  onClick={() => onWord(text)}
                >
                  <FileText aria-hidden />
                  Word
                </Button>
              </div>
            ) : null}
            <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
              <RailButton
                icon={RotateCcw}
                variant="ghost"
                label={reader.again}
                disabled={again.blocked || mine !== null}
                onClick={() => onWriteAgain()}
                hint={reader.againHint}
              />
              {canOpenInStudio ? (
                <RailButton
                  icon={PanelsTopLeft}
                  variant="ghost"
                  label={reader.openStudio}
                  onClick={onOpenInStudio}
                />
              ) : null}
              <Button
                variant="ghost"
                onClick={onDelete}
                className="w-full justify-start px-3 text-fail-ink hover:bg-fail-soft"
              >
                <Trash2 aria-hidden />
                {reader.delete}
              </Button>
            </div>
          </div>
          <div className="px-1">
            <WritingStyleHint />
          </div>
          {status}
        </aside>
      </div>

      <div className="flex flex-col gap-4 lg:hidden">
        {status}
        <WritingStyleHint />
      </div>
    </article>
  );
}
