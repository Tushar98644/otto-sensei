"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "@/components/account/errors";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { deviceTimeZone } from "@/lib/eligibility/options";
import type { WorkProfile } from "@/lib/eligibility/profile";
import { storeWorkProfile } from "./use-work-profile";
import { WorkProfileFields } from "./work-profile-fields";

export type WorkProfileFormProps = {
  userId: string;
  initial: WorkProfile;
  saved: boolean;
  // Shown under the fields, e.g. a "Done" key in the dialog.
  footer?: ReactNode;
};

// Long enough to take a few quick clicks as one save.
const SAVE_DELAY_MS = 600;

type SaveState = "idle" | "waiting" | "saving" | "saved" | "failed";

// Every answer saves by itself a moment after it changes; there is no Save key.
export function WorkProfileForm({ userId, initial, saved, footer }: WorkProfileFormProps) {
  // A first visit starts on this device's zone: it's a fact about the person. Stored with their
  // first answer, never before.
  const [draft, setDraft] = useState<WorkProfile>(() => ({
    ...initial,
    timeZone: initial.timeZone || deviceTimeZone(),
  }));
  const [saveState, setSaveState] = useState<SaveState>(saved ? "saved" : "idle");
  const [failure, setFailure] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<WorkProfile | null>(null);

  async function save(profile: WorkProfile) {
    pending.current = null;
    setSaveState("saving");
    try {
      const res = await api.saveWorkProfile(profile);
      storeWorkProfile(userId, res.profile, res.updatedAt);
      setFailure(null);
      setSaveState("saved");
    } catch (error) {
      setFailure(errorMessage(error));
      setSaveState("failed");
    }
  }

  function flush() {
    window.clearTimeout(timer.current);
    if (pending.current) void save(pending.current);
  }

  // Leaving (closing the dialog, another page) sends what is still waiting.
  const flushOnLeave = useEffectEvent(flush);
  useEffect(() => () => flushOnLeave(), []);

  function patch(next: Partial<WorkProfile>) {
    const profile = { ...draft, ...next };
    setDraft(profile);
    window.clearTimeout(timer.current);
    if (!profile.fullTime && !profile.contract) {
      setTypeError("Pick full-time, contract or both.");
      pending.current = null;
      return;
    }
    setTypeError(null);
    pending.current = profile;
    setSaveState("waiting");
    timer.current = window.setTimeout(flush, SAVE_DELAY_MS);
  }

  const status =
    saveState === "saving" || saveState === "waiting"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved. Only you can see it."
        : saveState === "failed"
          ? `Not saved: ${failure ?? "something went wrong."}`
          : "Saves as you go.";

  return (
    <form onSubmit={(event) => event.preventDefault()} noValidate className="flex flex-col gap-6">
      <WorkProfileFields value={draft} onChange={patch} typeError={typeError} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className={saveState === "failed" ? "text-sm font-medium text-fail-ink" : "text-sm text-subtle"}
        >
          {status}
        </p>
        <div className="flex flex-wrap gap-2">
          {saveState === "failed" ? (
            <Button variant="secondary" onClick={() => void save(draft)}>
              Try again
            </Button>
          ) : null}
          {footer}
        </div>
      </div>
    </form>
  );
}
