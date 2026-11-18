"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { useMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import type { UsagePeriod } from "@/config/plans";
import { budgetReachedText } from "@/lib/ai-budget-copy";
import { api, isApiError, isBudgetReached } from "@/lib/api/client";
import type { Resume } from "@/lib/resume/schema";
import {
  clearQueuedJob,
  loadResult,
  sameRun,
  type QueuedJob,
  type ReadJob,
  type SavedResult,
  type TailorDraft,
} from "./session";
import { forgetTailorTask, startTailorTask, tailorTaskFor, type TailorTask } from "./tailor-task";

export const MIN_POST_CHARS = 80;
const MAX_LINK_CHARS = 2048;

export type ResultPatch = Partial<Pick<SavedResult, "choices" | "letter" | "answers" | "copyId">>;

export type TailorRun = {
  last: SavedResult | null;
  loading: boolean;
  error: string | null;
  start: (job: TailorDraft) => Promise<void>;
  update: (id: string, patch: ResultPatch) => void;
  clear: () => void;
  signIn: () => Promise<boolean>;
  dialogs: ReactNode;
};

function errorMessage(
  error: unknown,
  tailorLimit: number | undefined,
  period: UsagePeriod | null | undefined,
): string {
  if (isApiError(error, "network_error")) return OTTO.errors.offline;
  if (isApiError(error, "rate_limited")) return OTTO.errors.rateLimited;
  if (isApiError(error, "ai_unavailable")) return OTTO.errors.aiUnavailable;
  if (isBudgetReached(error)) return budgetReachedText(period);
  if (isApiError(error, "limit_reached")) return OTTO.limit.reached("tailor", tailorLimit, period);
  if (isApiError(error, "unauthorized"))
    return "You've been signed out. Sign in again to keep going.";
  if (isApiError(error, "ai_refused"))
    return "I can't work with that post. Try pasting just the job description.";
  if (isApiError(error, "bad_request")) {
    return "That post didn't go through. Check it's the full job post, then try again.";
  }
  return OTTO.errors.generic;
}

export function useTailorRun(source: Resume): TailorRun {
  const gate = useAccountGate();
  const { me } = useMe();
  // A run started before this workspace mounted (the step was left and opened again) is adopted.
  const [task, setTask] = useState(() => tailorTaskFor(source.id));
  const [last, setLast] = useState<SavedResult | null>(() => task?.done ?? loadResult(source.id));
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  function report(caught: unknown) {
    if (!gate.handleApiError(caught, "tailor"))
      setError(errorMessage(caught, me?.usage?.tailor.limit, me?.period));
  }

  const settle = useEffectEvent(
    (settled: TailorTask, saved: SavedResult | null, caught: unknown) => {
      forgetTailorTask(source.id, settled);
      setTask(null);
      if (saved) setLast(saved);
      else report(caught);
    },
  );

  useEffect(() => {
    if (!task) return;
    let live = true;
    task.promise.then(
      (saved) => {
        if (live) settle(task, saved, null);
      },
      (caught: unknown) => {
        if (live) settle(task, null, caught);
      },
    );
    return () => {
      live = false;
    };
  }, [task]);

  async function start(job: TailorDraft) {
    if (busy.current || task) return;
    if (last && sameRun(last, source, job)) {
      setError(null);
      return;
    }
    busy.current = true;
    setError(null);
    try {
      if (!(await gate.requireUser(OTTO.signIn.reason("tailor")))) return;
      setTask(startTailorTask(source, job));
    } catch (caught) {
      report(caught);
    } finally {
      busy.current = false;
    }
  }

  const update = useCallback(
    (id: string, patch: ResultPatch) =>
      setLast((current) => (current?.id === id ? { ...current, ...patch } : current)),
    [],
  );

  return {
    last,
    loading: task !== null && task.done === null,
    error,
    start,
    update,
    clear: () => {
      setLast(null);
      setError(null);
    },
    signIn: () => gate.requireUser(OTTO.signIn.reason("tailor")),
    dialogs: gate.dialogs,
  };
}

function linkProblem(link: string): string | null {
  if (!link) return "Paste the link to the job post first.";
  if (/\s/.test(link))
    return "That doesn't look like a link. Copy it from your browser's address bar.";
  if (link.length > MAX_LINK_CHARS)
    return "That link is too long. Copy the address of the job post itself.";
  return null;
}

function readFailure(error: unknown): { message: string; backup: boolean } {
  if (isApiError(error, "network_error")) return { message: OTTO.errors.offline, backup: false };
  if (isApiError(error, "bad_request")) return { message: error.message, backup: false };
  if (isApiError(error, "parse_failed") || isApiError(error, "rate_limited")) {
    return { message: error.message, backup: true };
  }
  return {
    message: "Otto couldn't read that link just now. Paste the job text instead.",
    backup: true,
  };
}

type Notice = { link: string; message: string; on: "field" | "paste" };

export type JobLink = {
  link: string;
  pasting: boolean;
  posting: ReadJob | null;
  reading: boolean;
  linkError: string | null;
  readNote: string | null;
  status: string;
  linkRef: RefObject<HTMLInputElement | null>;
  postRef: RefObject<HTMLTextAreaElement | null>;
  edit: (link: string) => void;
  read: () => Promise<void>;
  pasteAndRead: (text: string) => void;
  pasteInstead: () => void;
};

type JobLinkOptions = {
  draft: TailorDraft;
  onChange: (draft: TailorDraft) => void;
  onSubmit: () => void;
  busy: boolean;
  queued?: QueuedJob | null;
};

export function useJobLink({ draft, onChange, onSubmit, busy, queued = null }: JobLinkOptions): JobLink {
  const linkRef = useRef<HTMLInputElement>(null);
  const postRef = useRef<HTMLTextAreaElement>(null);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // Matched by identity, so an edit made before the read draft renders cancels the send.
  const sendAfterRender = useRef<TailorDraft | null>(null);
  const focusPostAfterRender = useRef(false);

  const link = draft.link ?? "";
  const pasting = draft.paste ?? (draft.text.trim() !== "" && !draft.posting);
  const posting = pasting ? null : (draft.posting ?? null);
  const shown = notice?.link === link ? notice : null;

  useEffect(() => {
    if (focusPostAfterRender.current) {
      focusPostAfterRender.current = false;
      postRef.current?.focus();
    }
    if (sendAfterRender.current !== null && sendAfterRender.current === draft) {
      sendAfterRender.current = null;
      onSubmit();
    }
  });

  function openPasteFields(next: TailorDraft, reason: Notice | null = null) {
    setNotice(reason);
    focusPostAfterRender.current = true;
    onChange(next);
  }

  async function read(typed?: string, backup?: QueuedJob) {
    if (reading || busy) return;
    const raw = typed ?? link;
    const value = raw.trim();
    if (/\s/.test(value) && value.length >= MIN_POST_CHARS) {
      openPasteFields({ ...draft, link: "", posting: null, paste: true, text: value });
      return;
    }
    const invalid = linkProblem(value);
    if (invalid) {
      setNotice({ link: raw, message: invalid, on: "field" });
      linkRef.current?.focus();
      return;
    }

    setNotice(null);
    setReading(true);
    try {
      const { text, ...job } = (await api.readJob({ url: value })).posting;
      const next: TailorDraft = {
        link: value,
        posting: job,
        paste: false,
        title: job.title,
        company: job.company,
        text,
      };
      sendAfterRender.current = next;
      onChange(next);
    } catch (caught) {
      const failure = readFailure(caught);
      if (!failure.backup) {
        setNotice({ link: raw, message: failure.message, on: "field" });
        linkRef.current?.focus();
        return;
      }
      let next: TailorDraft = pasting
        ? { ...draft, link: value, posting: null }
        : { link: value, posting: null, paste: true, title: "", company: "", text: "" };
      if (backup) {
        next = { link: value, posting: null, paste: true, title: backup.title, company: backup.company, text: backup.text };
      }
      openPasteFields(next, { link: value, message: failure.message, on: "paste" });
    } finally {
      setReading(false);
    }
  }

  // Taken out of storage after the first render, so Strict Mode doesn't read it twice.
  const queuedJob = useRef(queued);
  useEffect(() => {
    const job = queuedJob.current;
    if (!job) return;
    const timer = window.setTimeout(() => {
      queuedJob.current = null;
      clearQueuedJob();
      if (job.posting && job.text.trim()) {
        const next: TailorDraft = {
          link: job.link,
          posting: job.posting,
          paste: false,
          title: job.posting.title,
          company: job.posting.company,
          text: job.text,
        };
        sendAfterRender.current = next;
        onChange(next);
        return;
      }
      if (job.readLink) {
        onChange({ ...draft, link: job.link, posting: null, paste: false });
        void read(job.link, job);
        return;
      }
      const next: TailorDraft = {
        link: job.link,
        posting: {
          url: job.link,
          source: "page",
          title: job.title,
          company: job.company,
          location: job.location,
          firstPostedAt: job.postedAt,
          updatedAt: null,
          closesAt: null,
        },
        paste: false,
        title: job.title,
        company: job.company,
        text: job.text,
      };
      sendAfterRender.current = next;
      onChange(next);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let status = reading ? "" : (shown?.message ?? "");
  if (!reading && !shown && posting) {
    status = `Read the job: ${[posting.title, posting.company].filter(Boolean).join(" at ") || "untitled"}.`;
  }

  return {
    link,
    pasting,
    posting,
    reading,
    linkError: shown?.on === "field" ? shown.message : null,
    readNote: shown?.on === "paste" ? shown.message : null,
    status,
    linkRef,
    postRef,
    edit: (value) =>
      onChange(pasting ? { ...draft, link: value } : { ...draft, link: value, posting: null }),
    read: () => read(),
    pasteAndRead: (text) => {
      const value = text.trim();
      onChange(pasting ? { ...draft, link: value } : { ...draft, link: value, posting: null });
      void read(value);
    },
    pasteInstead: () => openPasteFields({ ...draft, posting: null, paste: true }),
  };
}
