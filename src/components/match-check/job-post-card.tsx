"use client";

import { ArrowUpRight, ClipboardPaste, Link2 } from "lucide-react";
import type { ClipboardEvent, ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { fmt } from "@/i18n/format";
import matchCheckEn from "@/i18n/messages/en/match-check";
import type { MatchCheckMessages } from "@/lib/match-check/copy";
import { isJobLink, isPostText, type JobMode } from "./inputs";
import type { HiringSystemLink } from "./job-link";
import type { JobLinkReader } from "./use-job-link";

const QUIET_LINK = "min-h-11 self-start text-sm text-muted hover:text-ink";

const pasted = (event: ClipboardEvent) => event.clipboardData.getData("text").trim();

type LinkWords = MatchCheckMessages["link"];

// A new tab, so the resume and post pasted here are still here after reading the guide.
function SystemLine({ system, t }: { system: HiringSystemLink; t: LinkWords }) {
  return (
    <p className="text-sm/6 text-muted">
      {fmt(t.system, { name: system.name })}{" "}
      <a
        href={system.href}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-0.5 rounded-sm font-medium text-ink underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-ink"
      >
        {fmt(t.guide, { name: system.name })}
        <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
        <span className="sr-only"> {t.newTab}</span>
      </a>
    </p>
  );
}

type LinkPanelProps = {
  reader: JobLinkReader;
  linkRef: RefObject<HTMLInputElement | null>;
  error: string | null;
  onShowText: () => void;
  t: LinkWords;
};

function LinkPanel({ reader, linkRef, error, onShowText, t }: LinkPanelProps) {
  const { read, reading } = reader;
  const posting = read?.ok && !reading ? read.posting : null;
  const meta = posting ? [posting.company, posting.location].filter(Boolean).join(" · ") : "";
  // A post error means nothing while a typed link waits to be read.
  const unread = reader.link.trim() !== "" && !read;
  const shownError = reading ? null : (reader.error ?? (unread ? null : error));
  return (
    <div className="flex flex-col gap-3">
      <Field label={t.label} hideLabel error={shownError} hint={shownError ? null : t.hint}>
        <Input
          ref={linkRef}
          type="url"
          inputMode="url"
          value={reader.link}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="https://"
          enterKeyHint="go"
          onFocus={reader.prepare}
          onChange={(event) => reader.edit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            void reader.readLink();
          }}
          onPaste={(event) => {
            const text = pasted(event);
            const whole = event.currentTarget.value.trim() === "" || isJobLink(text);
            if (!text || !(whole || isPostText(text))) return;
            event.preventDefault();
            reader.edit(text);
            void reader.readLink(text);
          }}
        />
      </Field>
      <p aria-live="polite" className="sr-only">
        {reading
          ? t.readingStatus
          : posting
            ? fmt(t.readStatus, { title: posting.title || t.untitledStatus })
            : (shownError ?? "")}
      </p>
      {reading ? (
        <p className="flex items-center gap-2 text-sm text-ink">
          <Spinner />
          {t.reading}
        </p>
      ) : null}
      {posting && read?.ok ? (
        <div className="flex flex-col rounded-xl bg-surface-muted px-4 py-3">
          <Eyebrow>{t.from}</Eyebrow>
          <p className="mt-2 text-sm/6 font-semibold break-words text-ink">
            {posting.title || t.untitled}
          </p>
          {meta ? <p className="text-sm/6 text-muted">{meta}</p> : null}
          {read.system ? <SystemLine system={read.system} t={t} /> : null}
          <Button variant="link" onClick={onShowText} className={QUIET_LINK}>
            {t.seeText}
          </Button>
        </div>
      ) : null}
      {read && !read.ok && !reading ? (
        <div className="flex flex-col">
          {read.system ? <SystemLine system={read.system} t={t} /> : null}
          <Button variant="link" onClick={onShowText} className={QUIET_LINK}>
            {t.pasteInstead}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export type JobPostCardProps = {
  mode: JobMode;
  onModeChange: (mode: JobMode) => void;
  text: string;
  onTextChange: (text: string) => void;
  error: string | null;
  hint: ReactNode;
  textRef: RefObject<HTMLTextAreaElement | null>;
  linkRef: RefObject<HTMLInputElement | null>;
  reader: JobLinkReader;
  onFocus: () => void;
  onShowText: () => void;
  onPasteLink: (link: string) => void;
  t?: MatchCheckMessages;
};

export function JobPostCard({
  mode,
  onModeChange,
  text,
  onTextChange,
  error,
  hint,
  textRef,
  linkRef,
  reader,
  onFocus,
  onShowText,
  onPasteLink,
  t = matchCheckEn,
}: JobPostCardProps) {
  return (
    <Card>
      <Tabs
        value={mode}
        onValueChange={(value) => onModeChange(value === "link" ? "link" : "paste")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-base/6 font-semibold text-ink">{t.post.title}</h2>
          <TabList aria-label={t.post.tabs}>
            <Tab value="paste">
              <ClipboardPaste aria-hidden />
              {t.pasteText}
            </Tab>
            <Tab value="link" onFocus={reader.prepare} onPointerEnter={reader.prepare}>
              <Link2 aria-hidden />
              {t.post.link}
            </Tab>
          </TabList>
        </div>
        <TabPanel value="paste" tabIndex={-1}>
          <Field label={t.post.label} hideLabel error={error} hint={hint}>
            <Textarea
              ref={textRef}
              value={text}
              rows={6}
              spellCheck={false}
              placeholder={t.post.placeholder}
              className="min-h-40 sm:min-h-72"
              onFocus={onFocus}
              onChange={(event) => onTextChange(event.target.value)}
              onPaste={(event) => {
                const link = pasted(event);
                if (event.currentTarget.value.trim() !== "" || !isJobLink(link)) return;
                event.preventDefault();
                onPasteLink(link);
              }}
            />
          </Field>
        </TabPanel>
        <TabPanel value="link" tabIndex={-1}>
          <LinkPanel
            reader={reader}
            linkRef={linkRef}
            error={error}
            onShowText={onShowText}
            t={t.link}
          />
        </TabPanel>
      </Tabs>
    </Card>
  );
}
