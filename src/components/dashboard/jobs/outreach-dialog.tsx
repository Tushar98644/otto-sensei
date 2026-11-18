"use client";

import { ArrowUpRight, Copy, RotateCcw, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMe } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { DemoNote } from "@/components/studio/demo-note";
import { copyText } from "@/components/studio/tailor/letter-panel";
import { writingAllowance } from "@/components/studio/tailor/screener";
import { useWriting, type OutreachDraft } from "@/components/studio/tailor/use-writing";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TEXT_LIMITS } from "@/config/plans";
import { api } from "@/lib/api/client";
import type { MatchedJob } from "@/lib/job-feed/types";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

// Kept in step with the server: OutreachRequestSchema's shortest post and writeOutreach's note limit.
const MIN_POST_CHARS = 80;
const NOTE_CHARS = 200;

const TITLE = "Write an outreach message";

export type OutreachDialogProps = {
  job: MatchedJob | null;
  resume: Resume | null;
  onClose: () => void;
};

// Messages live here, not in the flow, so a closed dialog keeps what was paid for, even one still being written.
export function OutreachDialog({ job, resume, onClose }: OutreachDialogProps) {
  const [drafts, setDrafts] = useState<ReadonlyMap<string, OutreachDraft>>(new Map());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  if (!job || !resume) return <Dialog open={false} onOpenChange={onClose} title={TITLE} />;
  const key = `${job.id}:${resume.id}`;
  return (
    <OutreachFlow
      key={key}
      job={job}
      resume={resume}
      onClose={onClose}
      message={drafts.get(key) ?? null}
      pending={pending.has(key)}
      onMessage={(draft) => setDrafts((current) => new Map(current).set(key, draft))}
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

type FlowProps = {
  job: MatchedJob;
  resume: Resume;
  onClose: () => void;
  message: OutreachDraft | null;
  pending: boolean;
  onMessage: (draft: OutreachDraft) => void;
  onPending: (busy: boolean) => void;
};

function OutreachFlow({ job, resume, onClose, message, pending, onMessage, onPending }: FlowProps) {
  const { user, me, loading } = useMe();
  const [post, setPost] = useState<Post>({ status: "loading", text: "" });
  const [postError, setPostError] = useState<string | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const postRef = useRef<HTMLTextAreaElement>(null);
  const writing = useWriting(resume, {
    title: job.title,
    company: job.company,
    text: post.text,
    link: job.url,
  });

  useEffect(() => {
    let live = true;
    api
      .jobPost(job.id)
      .then((read) => {
        if (!live) return;
        const text = read.text.trim();
        setPost({ status: text.length >= MIN_POST_CHARS ? "ready" : "paste", text });
      })
      .catch(() => {
        if (live) setPost({ status: "paste", text: "" });
      });
    return () => {
      live = false;
    };
  }, [job.id]);

  const busy = writing.busy === "outreach" || pending;
  const failed = writing.error?.task === "outreach" ? writing.error.message : null;
  // A failed write may be the post's fault, so the post Otto read becomes editable.
  const showPost = post.status === "paste" || (post.status === "ready" && failed !== null);
  const allowance = loading
    ? null
    : writingAllowance(user?.plan, me?.usage?.letter, me?.period, me?.billing.trial !== false);

  async function write() {
    if (busy || post.status === "loading") return;
    if (post.text.trim().length < MIN_POST_CHARS) {
      setPostError(
        post.text.trim()
          ? "That's too short to be the whole post. Paste all of it."
          : "Paste the job post first.",
      );
      postRef.current?.focus();
      return;
    }
    const first = message === null;
    onPending(true);
    try {
      const result = await writing.outreach(resume);
      if (!result) return;
      onMessage(result);
      // Focus would otherwise fall to the page behind the dialog when the button it was on goes away.
      if (first) requestAnimationFrame(() => subjectRef.current?.focus());
    } finally {
      onPending(false);
    }
  }

  const edit = (field: "subject" | "email" | "note", value: string) => {
    if (message) onMessage({ ...message, [field]: value });
  };

  const status = (
    <>
      {busy ? <OttoWorking task="outreach" size="sm" /> : null}
      {failed ? <Alert variant="error">{failed}</Alert> : null}
    </>
  );
  const noteOver = message ? message.note.length > NOTE_CHARS : false;

  return (
    <>
      <Dialog
        open
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
        size="lg"
        title={TITLE}
        illustration={
          <OttoNote
            size="sm"
            live={false}
            message="I'll write a short email and a LinkedIn note from your resume and this job, nothing made up."
          />
        }
      >
        <div className="flex flex-col gap-6">
          <p className="text-sm/6 text-pretty text-muted">
            For <span className="font-medium text-ink">{job.title}</span> at{" "}
            <span className="font-medium text-ink">{job.company}</span>, from{" "}
            <span className="font-medium text-ink">{resumeTitle(resume)}</span>. Send it to the
            hiring manager, someone on the team, or a founder at a small company. You&apos;ll
            usually find them on the company&apos;s team page or on LinkedIn.
          </p>

          {post.status === "loading" && !message ? <OttoWorking task="job" size="sm" /> : null}
          {showPost && !message ? (
            <div className="flex flex-col gap-2">
              <Field
                label="The job post"
                hint={
                  post.status === "paste"
                    ? "Otto couldn't read this post. Open the job and paste its description here."
                    : "This is the post Otto read. Trim it to the job description, then try again."
                }
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
              <a
                href={job.url}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 self-start text-sm font-medium text-ink underline decoration-border-strong underline-offset-4"
              >
                Open the job
                <ArrowUpRight className="size-4" aria-hidden />
                <span className="sr-only">(opens {job.company}&apos;s posting in a new tab)</span>
              </a>
            </div>
          ) : null}

          {message ? null : (
            <div className="flex flex-col items-start gap-2">
              <Button
                data-autofocus
                loading={busy}
                aria-disabled={post.status === "loading" || undefined}
                onClick={() => void write()}
              >
                <Send aria-hidden />
                Write my message
              </Button>
              {allowance ? <p className="text-sm text-pretty text-muted">{allowance}</p> : null}
            </div>
          )}

          {message ? null : status}

          {message ? (
            <>
              {message.demo ? <DemoNote /> : null}
              <Alert variant="warn" title="Check before you send it">
                <ul className="flex list-disc flex-col gap-1 pl-4">
                  <li>Swap [first name] for the name of the person you&apos;re writing to.</li>
                  {message.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </Alert>

              <div className="flex flex-col gap-2">
                <Field label="Email subject">
                  <Input
                    ref={subjectRef}
                    value={message.subject}
                    onChange={(event) => edit("subject", event.target.value)}
                  />
                </Field>
                <Field label="Email">
                  <Textarea
                    autoResize
                    value={message.email}
                    onChange={(event) => edit("email", event.target.value)}
                    className="max-h-[50vh] text-base/7 sm:text-sm/6"
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void copyText(message.subject, "subject")}
                  >
                    <Copy aria-hidden />
                    Copy subject
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void copyText(message.email, "email")}
                  >
                    <Copy aria-hidden />
                    Copy email
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Field
                  label="LinkedIn note"
                  hint={`${message.note.length} of ${NOTE_CHARS} characters, the most a free LinkedIn account allows.`}
                  error={
                    noteOver
                      ? `${message.note.length} characters. Trim it to ${NOTE_CHARS} so it fits a free LinkedIn invite.`
                      : null
                  }
                >
                  <Textarea
                    autoResize
                    value={message.note}
                    onChange={(event) => edit("note", event.target.value)}
                    className="text-base/7 sm:text-sm/6"
                  />
                </Field>
                <Button
                  size="sm"
                  variant="secondary"
                  className="self-start"
                  onClick={() => void copyText(message.note, "note")}
                >
                  <Copy aria-hidden />
                  Copy note
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  loading={busy || post.status === "loading"}
                  onClick={() => void write()}
                >
                  <RotateCcw aria-hidden />
                  Write a new one
                </Button>
                {status}
              </div>
            </>
          ) : null}
        </div>
      </Dialog>
      {/* Outside the dialog: a native <dialog> inside another passes its close events up. */}
      {writing.dialogs}
    </>
  );
}
