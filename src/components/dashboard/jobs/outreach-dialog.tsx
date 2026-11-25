"use client";

import { ArrowUpRight, RotateCcw, Send, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMe } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { WritingStyleHint } from "@/components/settings/writing-style-hint";
import { useOtto } from "@/components/mascot/use-otto";
import { useWriting } from "@/components/studio/tailor/use-writing";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TEXT_LIMITS } from "@/config/plans";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { rich } from "@/i18n/rich";
import { api } from "@/lib/api/client";
import { resumeTitle } from "@/lib/resume/ops";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { Writing } from "@/lib/writings/schema";
import { titleOnlyPost } from "../applications/prep/prep-start";
import { useStudioActions } from "../use-studio-actions";
import { OutreachFields, OutreachSaveStatus } from "./outreach-fields";
import { outreachKey, outreachLookup, type OutreachJob } from "./outreach-saved";
import { OutreachSend } from "./outreach-send";
import { useOutreachKeeper, type Kept, type OutreachActions } from "./use-outreach-keeper";

// Kept in step with the server: OutreachRequestSchema's shortest post.
const MIN_POST_CHARS = 80;

const bold = (chunk: string) => <span className="font-medium text-ink">{chunk}</span>;

export type OutreachDialogProps = {
  job: OutreachJob | null;
  resume: Resume | null;
  onClose: () => void;
  onSaved?: (writing: Writing) => void;
};

export function OutreachDialog({ job, resume, onClose, onSaved }: OutreachDialogProps) {
  const { outreach } = useMessages("jobs");
  const { kept, actions } = useOutreachKeeper(onSaved);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  if (!job) {
    return <Dialog open={false} onOpenChange={onClose} title={outreach.kinds.first.title} />;
  }
  const key = outreachKey(job);
  const unsaved = [...kept.values()].some(
    (item) => item.save === "saving" || item.save === "failed",
  );
  return (
    <OutreachFlow
      key={key}
      jobKey={key}
      job={job}
      resume={resume}
      onClose={onClose}
      kept={kept.get(key) ?? null}
      actions={actions}
      pending={pending.has(key)}
      keepPage={pending.size > 0 || unsaved}
      onPending={(busy) =>
        setPending((current) => {
          const next = new Set(current);
          if (busy) next.add(key);
          else next.delete(key);
          return next;
        })
      }
    />
  );
}

type Post = { status: "loading" | "ready" | "paste"; text: string };

function firstPost(job: OutreachJob, kept: Kept | null): Post {
  const known = (kept?.post || job.post || "").trim();
  if (known.length >= MIN_POST_CHARS) return { status: "ready", text: known };
  if (job.id || job.url.trim()) return { status: "loading", text: "" };
  return { status: "paste", text: known };
}

// An opening from the Jobs tab is read from our copy; a tracked application's link the way a pasted link is.
async function readPost(id: string | null, url: string): Promise<string> {
  if (id) return (await api.jobPost(id)).text.trim();
  return (await api.readJob({ url })).posting.text.trim();
}

type FlowProps = {
  jobKey: string;
  job: OutreachJob;
  // Null when this browser has no resume: a kept message still opens, but a new one can't be written.
  resume: Resume | null;
  onClose: () => void;
  kept: Kept | null;
  actions: OutreachActions;
  pending: boolean;
  // True while a write runs or a message isn't saved yet, which leaving the page would drop.
  keepPage: boolean;
  onPending: (busy: boolean) => void;
};

function OutreachFlow({
  jobKey,
  job,
  resume,
  onClose,
  kept,
  actions,
  pending,
  keepPage,
  onPending,
}: FlowProps) {
  const { outreach: t, card } = useMessages("jobs");
  const format = useFormat();
  const { user, me, loading } = useMe();
  const otto = useOtto();
  const studio = useStudioActions();
  const message = kept?.draft ?? null;
  const [post, setPost] = useState<Post>(() => firstPost(job, kept));
  // A message reopened from this page keeps the post it came from, so its addresses show at once.
  const [mustRead] = useState(() => firstPost(job, kept).status === "loading");
  const [lookup] = useState(() => (kept ? null : outreachLookup(job)));
  const [checking, setChecking] = useState(lookup !== null);
  const [askPost, setAskPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const postRef = useRef<HTMLTextAreaElement>(null);
  const [to, setTo] = useState("");
  // useWriting reads its own resume only for line fixes, which this dialog doesn't make.
  const [blank] = useState(() => emptyResume());
  // A thank-you needs no post: with none to read, Otto goes on from the job title, saying so.
  const titlePost = job.thankYou ? titleOnlyPost({ role: job.title, company: job.company }) : null;
  const fromTitle =
    titlePost !== null && post.status === "paste" && post.text.trim().length < MIN_POST_CHARS;
  const writingText = fromTitle ? titlePost : post.text;
  const writing = useWriting(resume ?? blank, {
    title: job.title,
    company: job.company,
    text: writingText,
    link: job.url,
  });
  const jobId = job.id;
  const jobUrl = job.url;
  const usable = resume !== null || message !== null;

  useEffect(() => {
    if (!mustRead || !usable) return;
    let live = true;
    readPost(jobId, jobUrl)
      .then((text) => {
        const ready = text.length >= MIN_POST_CHARS;
        if (ready) actions.readPost(jobKey, text);
        if (live) setPost({ status: ready ? "ready" : "paste", text });
      })
      .catch(() => {
        if (live) setPost({ status: "paste", text: "" });
      });
    return () => {
      live = false;
    };
  }, [actions, jobId, jobKey, jobUrl, mustRead, usable]);

  useEffect(() => {
    if (!lookup) return;
    let live = true;
    api
      .outreachWriting(lookup)
      .then(({ writing: found }) => {
        if (!found) return;
        actions.found(jobKey, found);
        // The button focus started on goes away when the kept message replaces it.
        requestAnimationFrame(() => {
          if (live && document.activeElement === document.body) subjectRef.current?.focus();
        });
      })
      // A failed look leaves the dialog empty, ready to write one.
      .catch(() => undefined)
      .finally(() => {
        if (live) setChecking(false);
      });
    return () => {
      live = false;
    };
  }, [actions, jobKey, lookup]);

  const busy = writing.busy === "outreach" || pending;
  const failed = writing.error?.task === "outreach" ? writing.error.message : null;
  // A failed write may be the post's fault, so the post Otto read becomes editable.
  const showPost =
    post.status !== "loading" &&
    (message
      ? askPost || failed !== null
      : (post.status === "paste" && !fromTitle) || askPost || failed !== null);
  const reading = post.status === "loading" && usable;
  const waiting = reading || checking;
  const noResume = !resume && !message && !checking;
  const allowance = loading
    ? null
    : otto.writing(user?.plan, me?.usage?.letter, me?.period, me?.billing.trial !== false);
  const source = kept?.resumeTitle || (resume ? resumeTitle(resume) : "");
  const role = job.title.trim() || t.thisRole;
  const company = job.company.trim();
  const words = job.thankYou ? t.kinds.thankYou : job.followUp ? t.kinds.followUp : t.kinds.first;
  const forLine = company
    ? source
      ? t.forRoleAtFrom
      : t.forRoleAt
    : source
      ? t.forRoleFrom
      : t.forRole;

  async function write() {
    if (!resume || busy || waiting) return;
    if (writingText.trim().length < MIN_POST_CHARS) {
      setAskPost(true);
      setPostError(post.text.trim() ? t.tooShort : t.pasteFirst);
      requestAnimationFrame(() => postRef.current?.focus());
      return;
    }
    const first = message === null;
    const sent = writingText;
    onPending(true);
    try {
      const result = await writing.outreach(
        resume,
        job.followUp,
        job.thankYou ? { to: to.trim() } : undefined,
      );
      if (!result) return;
      actions.written(
        jobKey,
        { job, resume: { id: resume.id, title: resumeTitle(resume) } },
        result,
        sent,
      );
      setAskPost(false);
      // Focus would otherwise fall to the page behind the dialog when the button it was on goes away.
      if (first) requestAnimationFrame(() => subjectRef.current?.focus());
    } finally {
      onPending(false);
    }
  }

  const status = (
    <>
      {busy ? <OttoWorking task="outreach" size="sm" /> : null}
      {failed ? <Alert variant="error">{failed}</Alert> : null}
    </>
  );

  const postField = showPost ? (
    <div className="flex flex-col gap-2">
      <Field
        label={t.post}
        hint={post.status === "paste" ? t.postCantRead : t.postTrim}
        error={postError}
      >
        <Textarea
          ref={postRef}
          rows={6}
          maxLength={TEXT_LIMITS.jobPostChars}
          value={post.text}
          onChange={(event) => {
            setPost({ status: "paste", text: event.target.value });
            setPostError(null);
          }}
        />
      </Field>
      {job.url.trim() ? (
        <a
          href={job.url}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 self-start text-sm font-medium text-ink underline decoration-border-strong underline-offset-4"
        >
          {t.openTheJob}
          <ArrowUpRight className="size-4" aria-hidden />
          <span className="sr-only">
            {company ? fmt(card.opensPosting, { company }) : t.opensThePosting}
          </span>
        </a>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <Dialog
        open
        onOpenChange={(next) => {
          if (next) return;
          actions.flush(jobKey);
          onClose();
        }}
        size="lg"
        title={message ? words.written : words.title}
        illustration={
          <OttoNote size="sm" live={false} message={noResume ? t.noResume : words.otto} />
        }
      >
        {noResume ? (
          <Button variant="secondary" className="self-start" onClick={studio.upload}>
            <Upload aria-hidden />
            {t.upload}
          </Button>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm/6 text-pretty text-muted">
                {rich(forLine, { b: bold }, { role, company, source })}{" "}
                {job.thankYou
                  ? t.sendThankYou
                  : job.followUp
                    ? format.plural(t.sendFollowUp, job.followUp.days)
                    : t.sendFirst}
              </p>
              <WritingStyleHint linked={!(keepPage || busy)} />
            </div>

            {waiting && !message ? (
              reading ? (
                <OttoWorking task="job" size="sm" />
              ) : (
                <OttoWorking task="job" size="sm" message={t.checking} />
              )
            ) : null}
            {message || !resume ? null : postField}

            {job.thankYou && !message && resume ? (
              <Field
                label={t.whoMet}
                optional
                hint={company ? fmt(t.whoMetHintAt, { company }) : t.whoMetHint}
              >
                <Input
                  data-autofocus
                  value={to}
                  maxLength={80}
                  autoComplete="off"
                  onChange={(event) => setTo(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void write();
                  }}
                />
              </Field>
            ) : null}

            {message || !resume ? null : (
              <div className="flex flex-col items-start gap-2">
                <Button
                  data-autofocus={job.thankYou ? undefined : true}
                  loading={busy}
                  aria-disabled={waiting || undefined}
                  onClick={() => void write()}
                >
                  <Send aria-hidden />
                  {words.write}
                </Button>
                {allowance ? <p className="text-sm text-pretty text-muted">{allowance}</p> : null}
              </div>
            )}

            {message ? null : status}

            {kept && message ? (
              <>
                <OutreachFields
                  message={message}
                  subjectRef={subjectRef}
                  onEdit={(field, value) => actions.edit(jobKey, field, value)}
                  onSettle={() => actions.flush(jobKey)}
                />
                <OutreachSaveStatus
                  save={kept.save}
                  error={kept.error}
                  onRetry={() => actions.retry(jobKey)}
                />

                <OutreachSend
                  company={job.company}
                  title={job.title}
                  postText={kept.post || (post.status === "ready" ? post.text : "")}
                  message={message}
                />

                <div className="flex flex-col gap-3">
                  {resume ? (
                    <>
                      {postField}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start"
                        loading={busy || post.status === "loading"}
                        onClick={() => void write()}
                      >
                        <RotateCcw aria-hidden />
                        {t.writeNew}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start"
                      onClick={studio.upload}
                    >
                      <Upload aria-hidden />
                      {t.uploadToWrite}
                    </Button>
                  )}
                  {status}
                </div>
              </>
            ) : null}
          </div>
        )}
      </Dialog>
      {/* Outside the dialog: a native <dialog> inside another passes its close events up. */}
      {writing.dialogs}
    </>
  );
}
