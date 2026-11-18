"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import type { OutreachDraft } from "@/components/studio/tailor/use-writing";
import { api } from "@/lib/api/client";
import type { Writing } from "@/lib/writings/schema";
import { forgetWritings } from "../letters/use-writings";
import {
  draftOf,
  fieldsOf,
  fitOutreach,
  outreachBody,
  outreachChange,
  type OutreachField,
  type OutreachFields,
  type OutreachJob,
} from "./outreach-saved";

export type SaveState = "idle" | "saving" | "saved" | "failed";

export type Kept = {
  // Tells a message from the one that replaced it while a save was out.
  local: number;
  draft: OutreachDraft;
  // The post it was written from, for the addresses in it; empty until read for a message kept earlier.
  post: string;
  resumeTitle: string;
  writingId: string | null;
  save: SaveState;
  error: string | null;
};

export type OutreachOrigin = { job: OutreachJob; resume: { id: string; title: string } };

export type OutreachActions = {
  written: (key: string, origin: OutreachOrigin, draft: OutreachDraft, post: string) => void;
  found: (key: string, writing: Writing) => void;
  readPost: (key: string, post: string) => void;
  edit: (key: string, field: OutreachField, value: string) => void;
  flush: (key: string) => void;
  retry: (key: string) => void;
  listen: (onSaved: ((writing: Writing) => void) | undefined) => void;
  dispose: () => void;
};

const EDIT_DELAY_MS = 1_200;

export function createOutreachKeeper(
  publish: (kept: ReadonlyMap<string, Kept>) => void,
): OutreachActions {
  let kept: ReadonlyMap<string, Kept> = new Map();
  let onSaved: ((writing: Writing) => void) | undefined;
  let nextLocal = 0;
  const origins = new Map<string, OutreachOrigin>();
  const synced = new Map<string, OutreachFields>();
  const sending = new Set<string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function put(key: string, change: (current: Kept | undefined) => Kept | undefined) {
    const next = new Map(kept);
    const value = change(next.get(key));
    if (value) next.set(key, value);
    else next.delete(key);
    kept = next;
    publish(next);
  }

  const patch = (key: string, local: number, change: Partial<Kept>) =>
    put(key, (current) => (current?.local === local ? { ...current, ...change } : current));

  async function create(key: string) {
    const origin = origins.get(key);
    const current = kept.get(key);
    const token = `new:${current?.local}`;
    if (!origin || !current || current.writingId || sending.has(token)) return;
    const sent = fieldsOf(current.draft);
    sending.add(token);
    patch(key, current.local, { save: "saving", error: null });
    try {
      const { writing } = await api.saveWriting(
        outreachBody(origin.job, origin.resume, current.draft),
      );
      sending.delete(token);
      synced.set(writing.id, sent);
      patch(key, current.local, { writingId: writing.id, save: "saved" });
      forgetWritings();
      onSaved?.(writing);
      // Edits made while it was saving go up next.
      await push(key);
    } catch (error) {
      sending.delete(token);
      patch(key, current.local, { save: "failed", error: errorMessage(error) });
    }
  }

  async function push(key: string): Promise<void> {
    const current = kept.get(key);
    const id = current?.writingId;
    if (!current || !id || sending.has(id)) return;
    const sent = fieldsOf(current.draft);
    const change = outreachChange(sent, synced.get(id) ?? sent);
    if (!change) return;
    sending.add(id);
    patch(key, current.local, { save: "saving", error: null });
    let writing: Writing;
    try {
      ({ writing } = await api.editWriting(id, change));
    } catch (error) {
      patch(key, current.local, { save: "failed", error: errorMessage(error) });
      return;
    } finally {
      sending.delete(id);
    }
    synced.set(id, sent);
    patch(key, current.local, { save: "saved" });
    forgetWritings();
    // A page listing the message, like an application's, shows the edit too.
    onSaved?.(writing);
    await push(key);
  }

  function schedule(key: string, delay: number) {
    clearTimeout(timers.get(key));
    timers.delete(key);
    if (delay === 0) {
      void push(key);
      return;
    }
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        void push(key);
      }, delay),
    );
  }

  return {
    written(key, origin, written, post) {
      const draft = fitOutreach(written);
      origins.set(key, origin);
      nextLocal += 1;
      const local = nextLocal;
      put(key, () => ({
        local,
        draft,
        post,
        resumeTitle: origin.resume.title,
        writingId: null,
        save: "saving",
        error: null,
      }));
      void create(key);
    },
    found(key, writing) {
      if (kept.has(key)) return;
      const draft = draftOf(writing);
      synced.set(writing.id, fieldsOf(draft));
      nextLocal += 1;
      const local = nextLocal;
      put(key, () => ({
        local,
        draft,
        post: "",
        resumeTitle: writing.resumeTitle,
        writingId: writing.id,
        save: "idle",
        error: null,
      }));
    },
    readPost(key, post) {
      put(key, (current) => (current && !current.post ? { ...current, post } : current));
    },
    edit(key, field, value) {
      put(key, (current) =>
        current ? { ...current, draft: { ...current.draft, [field]: value } } : current,
      );
      schedule(key, EDIT_DELAY_MS);
    },
    flush(key) {
      schedule(key, 0);
    },
    retry(key) {
      if (kept.get(key)?.writingId) schedule(key, 0);
      else void create(key);
    },
    listen(next) {
      onSaved = next;
    },
    // Leaving the page sends an edit still waiting for its pause.
    dispose() {
      for (const [key, timer] of timers) {
        clearTimeout(timer);
        void push(key);
      }
      timers.clear();
    },
  };
}

// Messages live above the dialog, so one still being written or saved survives the dialog closing.
export function useOutreachKeeper(onSaved?: (writing: Writing) => void): {
  kept: ReadonlyMap<string, Kept>;
  actions: OutreachActions;
} {
  const [kept, setKept] = useState<ReadonlyMap<string, Kept>>(() => new Map());
  const [actions] = useState(() => createOutreachKeeper(setKept));
  useEffect(() => {
    actions.listen(onSaved);
  }, [actions, onSaved]);
  useEffect(() => () => actions.dispose(), [actions]);
  return { kept, actions };
}
