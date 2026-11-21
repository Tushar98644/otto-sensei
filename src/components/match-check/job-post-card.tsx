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
import { isJobLink, isPostText, type JobMode } from "./inputs";
import type { HiringSystemLink } from "./job-link";
import type { JobLinkReader } from "./use-job-link";

const QUIET_LINK = "min-h-11 self-start text-sm text-muted hover:text-ink";

const pasted = (event: ClipboardEvent) => event.clipboardData.getData("text").trim();

// A new tab, so the resume and post pasted here are still here after reading the guide.
function SystemLine({ system }: { system: HiringSystemLink }) {
  return (
    <p className="text-sm/6 text-muted">
      This job uses {system.name}.{" "}
      <a
        href={system.href}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-0.5 rounded-sm font-medium text-ink underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-ink"
      >
        Read the {system.name} guide
        <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );
}

type LinkPanelProps = {
  reader: JobLinkReader;
  linkRef: RefObject<HTMLInputElement | null>;
  error: string | null;
  onShowText: () => void;
};

function LinkPanel({ reader, linkRef, error, onShowText }: LinkPanelProps) {
  const { read, reading } = reader;
  const posting = read?.ok && !reading ? read.posting : null;
  const meta = posting ? [posting.company, posting.location].filter(Boolean).join(" · ") : "";
  // A post error means nothing while a typed link waits to be read.
  const unread = reader.link.trim() !== "" && !read;
  const shownError = reading ? null : (reader.error ?? (unread ? null : error));
  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Job link"
        hideLabel
        error={shownError}
        hint={
          shownError
            ? null
            : "Paste the link and Otto reads it at once. Works with most job sites, but not LinkedIn or Indeed."
        }
      >
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
          ? "Otto is reading the job post."
          : posting
            ? `Read the job: ${posting.title || "untitled"}.`
            : (shownError ?? "")}
      </p>
      {reading ? (
        <p className="flex items-center gap-2 text-sm text-ink">
          <Spinner />
          Otto is reading the job post…
        </p>
      ) : null}
      {posting && read?.ok ? (
        <div className="flex flex-col rounded-xl bg-surface-muted px-4 py-3">
          <Eyebrow>From the link</Eyebrow>
          <p className="mt-2 text-sm/6 font-semibold break-words text-ink">
            {posting.title || "Untitled job"}
          </p>
          {meta ? <p className="text-sm/6 text-muted">{meta}</p> : null}
          {read.system ? <SystemLine system={read.system} /> : null}
          <Button variant="link" onClick={onShowText} className={QUIET_LINK}>
            See the text Otto read
          </Button>
        </div>
      ) : null}
      {read && !read.ok && !reading ? (
        <div className="flex flex-col">
          {read.system ? <SystemLine system={read.system} /> : null}
          <Button variant="link" onClick={onShowText} className={QUIET_LINK}>
            Paste the job text instead
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
}: JobPostCardProps) {
  return (
    <Card>
      <Tabs
        value={mode}
        onValueChange={(value) => onModeChange(value === "link" ? "link" : "paste")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sans text-base/6 font-semibold text-ink">The job post</h2>
          <TabList aria-label="How to add the job post">
            <Tab value="paste">
              <ClipboardPaste aria-hidden />
              Paste text
            </Tab>
            <Tab value="link" onFocus={reader.prepare} onPointerEnter={reader.prepare}>
              <Link2 aria-hidden />
              Paste a link
            </Tab>
          </TabList>
        </div>
        <TabPanel value="paste" tabIndex={-1}>
          <Field label="Job post text" hideLabel error={error} hint={hint}>
            <Textarea
              ref={textRef}
              value={text}
              rows={6}
              spellCheck={false}
              placeholder="Paste the job post here, or its link"
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
          <LinkPanel reader={reader} linkRef={linkRef} error={error} onShowText={onShowText} />
        </TabPanel>
      </Tabs>
    </Card>
  );
}
