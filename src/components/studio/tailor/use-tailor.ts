"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { patchMe, useMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import type { UsagePeriod } from "@/config/plans";
import { budgetReachedText } from "@/lib/ai-budget-copy";
import { api, isApiError, isBudgetReached } from "@/lib/api/client";
import { newId, type Resume } from "@/lib/resume/schema";
import {
  clearQueuedJob,
  loadResult,
  sameRun,
  type QueuedJob,
  type ReadJob,
  type SavedResult,
  type TailorDraft,
} from "./session";

// Same bound POST /api/tailor enforces, checked here first so the user hears about it before sending.
export const MIN_POST_CHARS = 80;
const MAX_LINK_CHARS = 2048;

export type ResultPatch = Partial<Pick<SavedResult, "choices" | "letter" | "answers" | "copyId">>;

export type TailorRun = {
  last: SavedResult | null;
  loading: boolean;
  error: string | null;
  start: (job: TailorDraft) => Promise<void>;
  // Changes the current result's extras, if it is still the one with this id.
  update: (id: string, patch: ResultPatch) => void;
  clear: () => void;
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

// A new result replaces the last only when it arrives, so a failed retry never wipes results.
export function useTailorRun(source: Resume): TailorRun {
  const gate = useAccountGate();
  const { me } = useMe();
  const [last, setLast] = useState<SavedResult | null>(() => loadResult(source.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Each call spends one of the user's tailors, so a double click must never send two.
  const busy = useRef(false);

  async function start(job: TailorDraft) {
    if (busy.current) return;
    // Same resume and post: the results shown already answer it, and a call would spend a tailor.
    if (last && sameRun(last, source, job)) {
      setError(null);
      return;
    }
    busy.current = true;
    setError(null);
    try {
      if (!(await gate.requireUser(OTTO.signIn.reason("tailor")))) return;
      setLoading(true);
      const response = await api.tailor({
        resume: source,
        job: { text: job.text.trim(), title: job.title.trim(), company: job.company.trim() },
      });
      patchMe({ usage: response.usage });
      setLast({
        id: newId(),
        sourceId: source.id,
        sourceUpdatedAt: source.updatedAt,
        job,
        result: response.result,
        demo: response.demo === true,
      });
    } catch (caught) {
      if (!gate.handleApiError(caught, "tailor"))
        setError(errorMessage(caught, me?.usage?.tailor.limit, me?.period));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return {
    last,
    loading,
    error,
    start,
    update: (id, patch) =>
      setLast((current) => (current?.id === id ? { ...current, ...patch } : current)),
    clear: () => {
      setLast(null);
      setError(null);
    },
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

// A problem with the link itself shows on the field; a link that couldn't be read gets a note over
// the paste fields. Either one shows only while the link is still the one it was about.
type Notice = { link: string; message: string; on: "field" | "paste" };

export type JobLink = {
  link: string;
  pasting: boolean;
  posting: ReadJob | null;
  reading: boolean;
  linkError: string | null;
  readNote: string | null;
  // For a polite live region: reading, read, or why not.
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
  // Sends the draft the step last rendered, which is why a read job waits for its render.
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
  // Drafts saved before job links existed hold only pasted text.
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

  // `typed`: the field's value when it hasn't reached the draft yet (a paste being handled).
  // `backup`: the post as the Jobs tab stored it, for the paste fields if the link can't be read.
  async function read(typed?: string, backup?: QueuedJob) {
    if (reading || busy) return;
    const raw = typed ?? link;
    const value = raw.trim();
    // People often paste the post itself here; it belongs in the text box.
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
      // Fields typed by hand stay. Text read from an earlier link is another job's, so it goes.
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

  // Read after the first render, like a paste, so the step's state is in place. Taken out of
  // storage then, so a reload or Strict Mode re-run doesn't read it twice.
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
      // The feeds' own pages are theirs to show, so the stored post is used as read.
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
    // Once, on mount: later renders must not start another read.
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
    // What was read belongs to the old link, so the card goes until the new one is read.
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
