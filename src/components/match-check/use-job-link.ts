"use client";

import { useRef, useState } from "react";
import { isPostText } from "./inputs";
import type { LinkRead } from "./job-link";

const loadReader = () => import("./job-link");

const LOAD_FAILED = "Otto couldn't read that link just now. Paste the job text instead.";

export type ReadOk = Extract<LinkRead, { ok: true }>;

// The post to check, read from the link or pasted into the link box; null when there is none yet.
export type ReadOutcome = { text: string; read: ReadOk | null } | null;

type Options = {
  onRead: (text: string) => void;
  onPost: (text: string) => void;
};

export type JobLinkReader = {
  link: string;
  reading: boolean;
  error: string | null;
  read: LinkRead | null;
  latest: ReadOk | null;
  edit: (link: string) => void;
  readLink: (raw?: string) => Promise<ReadOutcome>;
  prepare: () => void;
};

export function useJobLink({ onRead, onPost }: Options): JobLinkReader {
  const [link, setLink] = useState("");
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [last, setLast] = useState<LinkRead | null>(null);
  const readId = useRef(0);
  const pending = useRef<{ link: string; outcome: Promise<ReadOutcome> } | null>(null);

  const read = last?.link === link.trim() ? last : null;

  function edit(value: string) {
    readId.current += 1;
    pending.current = null;
    setReading(false);
    setProblem(null);
    setLink(value);
  }

  async function fetchRead(value: string, id: number): Promise<ReadOutcome> {
    setProblem(null);
    try {
      const { linkProblem, readJobLink } = await loadReader();
      const invalid = linkProblem(value);
      if (invalid) {
        if (id === readId.current) setProblem(invalid);
        return null;
      }
      if (id === readId.current) setReading(true);
      const result = await readJobLink(value);
      if (id !== readId.current) return null;
      setLast(result);
      if (!result.ok) return null;
      onRead(result.text);
      return { text: result.text, read: result };
    } catch {
      if (id === readId.current) setProblem(LOAD_FAILED);
      return null;
    } finally {
      if (id === readId.current) {
        pending.current = null;
        setReading(false);
      }
    }
  }

  function readLink(raw = link): Promise<ReadOutcome> {
    const value = raw.trim();
    if (isPostText(value)) {
      edit("");
      onPost(value);
      return Promise.resolve({ text: value, read: null });
    }
    if (last?.ok && last.link === value) return Promise.resolve({ text: last.text, read: last });
    // A paste starts the read, so pressing Check right after waits for it instead of asking twice.
    if (pending.current?.link === value) return pending.current.outcome;
    const id = ++readId.current;
    const outcome = fetchRead(value, id);
    pending.current = { link: value, outcome };
    return outcome;
  }

  return {
    link,
    reading,
    error: problem ?? (read && !read.ok ? read.message : null),
    read,
    latest: last?.ok ? last : null,
    edit,
    readLink,
    prepare: () => void loadReader().catch(() => undefined),
  };
}
