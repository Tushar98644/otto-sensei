"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import type { TailorDraft } from "@/components/studio/tailor/session";
import { useWriting } from "@/components/studio/tailor/use-writing";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import { resumeTitle } from "@/lib/resume/ops";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { WritingKind } from "@/lib/writings/schema";
import { defaultResume } from "./entries";
import { rememberedPost, rememberPost } from "./post-memory";
import type { Written } from "./write-dialog";
import { unsavedEntry, writeBody, type WriteResult } from "./write-save";
import { readTargetPost, type TargetPost, type WriteTarget } from "./write-targets";

export type QuickRun = { value: string; kind: WritingKind; phase: "reading" | "writing" };

type Request = {
  id: number;
  target: WriteTarget;
  kind: WritingKind;
  question: string;
  resume: Resume;
  job: TailorDraft;
};

const NO_RESUME = emptyResume(0);
const NO_JOB: TailorDraft = { title: "", company: "", text: "" };
const UNKEPT: Record<WritingKind, string> = {
  letter: "Couldn't keep this letter",
  answer: "Couldn't keep this answer",
  outreach: "Couldn't keep this message",
};
const NEEDS_POST =
  "Otto writes from the job post. Paste it here once and he keeps it for this job.";
const LINK = /^(https?:\/\/|www\.)\S+$/i;

export function quickResume(
  target: Pick<WriteTarget, "resumeId">,
  resumes: readonly Resume[],
): Resume | null {
  const made = target.resumeId
    ? resumes.find((resume) => resume.id === target.resumeId)
    : undefined;
  return made ?? defaultResume(resumes);
}

function pastedPost(value: string): TargetPost | null {
  const text = value.trim();
  if (!text) return null;
  return LINK.test(text) ? { kind: "link", url: text } : { kind: "saved", text };
}

// One click writes for a job the app already knows: its post, the resume made for it, then straight to the result.
export function useQuickWrite(resumes: readonly Resume[], onWritten: (written: Written) => void) {
  const [run, setRun] = useState<QuickRun | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [asks, setAsks] = useState<Readonly<Record<string, string>>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const writing = useWriting(request?.resume ?? NO_RESUME, request?.job ?? NO_JOB);
  const busy = useRef(false);
  const started = useRef(0);
  const ids = useRef(0);

  function ask(value: string, note: string) {
    setAsks((current) => ({ ...current, [value]: note }));
  }

  function dismiss(value: string) {
    setAsks((current) => {
      if (!(value in current)) return current;
      const rest = { ...current };
      delete rest[value];
      return rest;
    });
  }

  function finish() {
    busy.current = false;
    setRun(null);
    setRequest(null);
  }

  const produce = useEffectEvent(async (next: Request) => {
    // Strict mode runs effects twice; the request runs once.
    if (started.current === next.id) return;
    started.current = next.id;
    const { target, kind, resume, question } = next;
    let result: WriteResult | null = null;
    if (kind === "letter") {
      const letter = await writing.letter(resume);
      result = letter && { kind: "letter", ...letter };
    } else if (kind === "answer") {
      const answer = await writing.answer(resume, question);
      result = answer && { kind: "answer", ...answer };
    } else {
      const draft = await writing.outreach(resume);
      result = draft && { kind: "outreach", draft };
    }
    if (!result) {
      setFailed(target.value);
      finish();
      return;
    }
    const body = writeBody(
      result,
      {
        title: target.title,
        company: target.company,
        url: target.url,
        jobId: target.jobId,
        applicationId: target.applicationId,
      },
      { id: resume.id, title: resumeTitle(resume) },
    );
    try {
      const { writing: saved } = await api.saveWriting(body);
      onWritten({ kind: "saved", writing: saved, show: true });
    } catch (error) {
      toast({ title: UNKEPT[kind], description: errorMessage(error), variant: "error" });
      onWritten({ kind: "unsaved", show: true, entry: unsavedEntry(body, Date.now()) });
    } finally {
      finish();
    }
  });

  // Runs once the request's job is in the render, so the writer sends this job and not the last one.
  useEffect(() => {
    if (!request) return;
    queueMicrotask(() => void produce(request));
  }, [request]);

  async function start(
    target: WriteTarget,
    kind: WritingKind,
    { question = "", post = "" }: { question?: string; post?: string } = {},
  ) {
    const resume = quickResume(target, resumes);
    if (!resume || busy.current) return;
    busy.current = true;
    setFailed(null);
    const kept = rememberedPost(target);
    const source: TargetPost | null =
      pastedPost(post) ??
      (target.post.kind === "saved"
        ? target.post
        : kept
          ? { kind: "saved", text: kept }
          : target.post.kind === "paste"
            ? null
            : target.post);
    if (!source) {
      busy.current = false;
      ask(target.value, NEEDS_POST);
      return;
    }
    let text = source.kind === "saved" ? source.text.trim() : "";
    if (source.kind !== "saved") {
      setRun({ value: target.value, kind, phase: "reading" });
      let failure: string | null = null;
      try {
        text = await readTargetPost(source);
      } catch (error) {
        failure = errorMessage(error);
      }
      if (!text) {
        busy.current = false;
        setRun(null);
        ask(
          target.value,
          failure ?? "That post is too short to write from. Paste the whole post here instead.",
        );
        return;
      }
    }
    rememberPost(target, text);
    dismiss(target.value);
    ids.current += 1;
    setRun({ value: target.value, kind, phase: "writing" });
    setRequest({
      id: ids.current,
      target,
      kind,
      question: question.trim(),
      resume,
      job: { title: target.title, company: target.company, text, link: target.url },
    });
  }

  return {
    run,
    asks,
    error: failed && writing.error ? { value: failed, message: writing.error.message } : null,
    start: (target: WriteTarget, kind: WritingKind, extra?: { question?: string; post?: string }) =>
      void start(target, kind, extra),
    ask,
    dismiss,
    dialogs: writing.dialogs,
  };
}

export type QuickWrite = ReturnType<typeof useQuickWrite>;
