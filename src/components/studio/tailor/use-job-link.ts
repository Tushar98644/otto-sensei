"use client";

import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import { OTTO } from "@/components/mascot/lines";
import { fmt } from "@/i18n/format";
import { api, isApiError } from "@/lib/api/client";
import { useJobFormCopy, type JobFormCopy } from "./job-form-copy";
import { closedSite, looksLikeLink } from "./job-links";
import { clearQueuedJob, type QueuedJob, type ReadJob, type TailorDraft } from "./session";
import { MIN_POST_CHARS } from "./use-tailor";

const MAX_LINK_CHARS = 2048;
// A paste meant for a field, a dialog or a menu stays there.
const OWN_PASTE =
  "input, textarea, select, [contenteditable]:not([contenteditable='false']), dialog, [popover]";

function linkProblem(t: JobFormCopy, link: string): string | null {
  if (!link) return t.linkFirst;
  if (/\s/.test(link)) return t.notALink;
  if (link.length > MAX_LINK_CHARS) return t.linkTooLong;
  return null;
}

function readFailure(t: JobFormCopy, error: unknown): { message: string; backup: boolean } {
  if (isApiError(error, "network_error")) return { message: OTTO.errors.offline, backup: false };
  if (isApiError(error, "bad_request")) return { message: error.message, backup: false };
  if (isApiError(error, "parse_failed") || isApiError(error, "rate_limited")) {
    return { message: error.message, backup: true };
  }
  return { message: t.readFailed, backup: true };
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
  open: (job: QueuedJob) => void;
};

export type JobLinkOptions = {
  draft: TailorDraft;
  onChange: (draft: TailorDraft) => void;
  onSubmit: () => void;
  busy: boolean;
  queued?: QueuedJob | null;
  // Set while the form shows on the Tailor step: a link pasted anywhere on it lands here.
  onPageLink?: () => void;
};

function postingFrom(job: QueuedJob): ReadJob {
  return {
    url: job.link,
    source: "page",
    title: job.title,
    company: job.company,
    location: job.location,
    firstPostedAt: job.postedAt,
    updatedAt: null,
    closesAt: null,
  };
}

export function useJobLink({
  draft,
  onChange,
  onSubmit,
  busy,
  queued = null,
  onPageLink,
}: JobLinkOptions): JobLink {
  const linkRef = useRef<HTMLInputElement>(null);
  const postRef = useRef<HTMLTextAreaElement>(null);
  const t = useJobFormCopy();
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // Matched by identity, so an edit made before the read draft renders cancels the send.
  const sendAfterRender = useRef<TailorDraft | null>(null);
  const focusPostAfterRender = useRef(false);
  const showLinkAfterRender = useRef(false);

  const link = draft.link ?? "";
  const pasting = draft.paste ?? (draft.text.trim() !== "" && !draft.posting);
  const posting = pasting ? null : (draft.posting ?? null);
  const shown = notice?.link === link ? notice : null;

  useEffect(() => {
    if (focusPostAfterRender.current) {
      focusPostAfterRender.current = false;
      postRef.current?.focus();
    }
    if (showLinkAfterRender.current) {
      showLinkAfterRender.current = false;
      linkRef.current?.scrollIntoView({ block: "center" });
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

  function send(next: TailorDraft, compare = true) {
    setNotice(null);
    sendAfterRender.current = compare ? next : null;
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
    const invalid = linkProblem(t, value);
    if (invalid) {
      setNotice({ link: raw, message: invalid, on: "field" });
      linkRef.current?.focus();
      return;
    }

    // These sites refuse every app, so the box opens at once and the link stays for the tracker.
    const site = closedSite(value);
    if (site) {
      const known = backup ?? (pasting ? draft : null);
      openPasteFields(
        {
          link: value,
          posting: null,
          paste: true,
          title: known?.title ?? "",
          company: known?.company ?? "",
          text: known?.text ?? "",
        },
        { link: value, message: fmt(t.closedSite, { site }), on: "paste" },
      );
      return;
    }

    setNotice(null);
    setReading(true);
    try {
      const { text, ...job } = (await api.readJob({ url: value })).posting;
      send(
        { link: value, posting: job, paste: false, title: job.title, company: job.company, text },
        backup?.compare !== false,
      );
    } catch (caught) {
      const failure = readFailure(t, caught);
      if (!failure.backup) {
        setNotice({ link: raw, message: failure.message, on: "field" });
        linkRef.current?.focus();
        return;
      }
      let next: TailorDraft = pasting
        ? { ...draft, link: value, posting: null }
        : { link: value, posting: null, paste: true, title: "", company: "", text: "" };
      if (backup) {
        next = {
          link: value,
          posting: null,
          paste: true,
          title: backup.title,
          company: backup.company,
          text: backup.text,
        };
      }
      openPasteFields(next, { link: value, message: failure.message, on: "paste" });
    } finally {
      setReading(false);
    }
  }

  // Jobs, a recent job and a /studio?job= link all hand a job over this way.
  function open(job: QueuedJob) {
    if (reading || busy) return;
    const text = job.text.trim();
    const compare = job.compare !== false;
    if (job.posting && text) {
      const { title, company } = job.posting;
      const next = { link: job.link, posting: job.posting, paste: false, title, company };
      send({ ...next, text: job.text }, compare);
      return;
    }
    if (job.link && (job.readLink || !text)) {
      onChange({ ...draft, link: job.link, posting: null, paste: false });
      void read(job.link, job);
      return;
    }
    if (!text) return;
    const { link, title, company } = job;
    const posting = link && !closedSite(link) ? postingFrom(job) : null;
    send({ link, posting, paste: posting === null, title, company, text: job.text }, compare);
  }

  function pasteAndRead(text: string) {
    const value = text.trim();
    onChange(pasting ? { ...draft, link: value } : { ...draft, link: value, posting: null });
    void read(value);
  }

  // Taken out of storage after the first render, so Strict Mode doesn't read it twice.
  const queuedJob = useRef(queued);
  const openQueued = useEffectEvent((job: QueuedJob) => open(job));
  useEffect(() => {
    const job = queuedJob.current;
    if (!job) return;
    const timer = window.setTimeout(() => {
      queuedJob.current = null;
      clearQueuedJob();
      openQueued(job);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const pageLink = useEffectEvent((event: ClipboardEvent) => {
    if (!onPageLink || event.defaultPrevented || reading || busy) return;
    if (event.target instanceof Element && event.target.closest(OWN_PASTE)) return;
    const pasted = event.clipboardData?.getData("text").trim() ?? "";
    if (!looksLikeLink(pasted)) return;
    event.preventDefault();
    onPageLink();
    showLinkAfterRender.current = true;
    pasteAndRead(pasted);
  });
  const listens = onPageLink !== undefined;
  useEffect(() => {
    if (!listens) return;
    const listener = (event: ClipboardEvent) => pageLink(event);
    document.addEventListener("paste", listener);
    return () => document.removeEventListener("paste", listener);
  }, [listens]);

  let status = reading ? "" : (shown?.message ?? "");
  if (!reading && !shown && posting) {
    const { title, company } = posting;
    const name =
      title && company ? fmt(t.titleAt, { title, company }) : title || company || t.untitledShort;
    status = fmt(t.readJob, { name });
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
    pasteAndRead,
    pasteInstead: () => openPasteFields({ ...draft, posting: null, paste: true }),
    open,
  };
}
