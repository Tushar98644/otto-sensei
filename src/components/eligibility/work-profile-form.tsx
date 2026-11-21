"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "@/components/account/errors";
import { confirmSetupGuess, useSetupGuess } from "@/components/setup/use-account-setup";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { deviceTimeZone } from "@/lib/eligibility/options";
import type { WorkProfile, WorkRegion } from "@/lib/eligibility/profile";
import { moveHomeRegion } from "@/lib/setup/guess";
import { countryHint, guessedRegion, homeRegionNote } from "@/lib/setup/hints";
import { storeWorkProfile } from "./use-work-profile";
import { WorkProfileFields } from "./work-profile-fields";

export type WorkProfileFormProps = {
  userId: string;
  initial: WorkProfile;
  saved: boolean;
  footer?: ReactNode;
};

const SAVE_DELAY_MS = 600;

type SaveState = "idle" | "waiting" | "saving" | "saved" | "failed";

export function WorkProfileForm({ userId, initial, saved, footer }: WorkProfileFormProps) {
  const [draft, setDraft] = useState<WorkProfile>(() => ({
    ...initial,
    timeZone: initial.timeZone || deviceTimeZone(),
  }));
  const [saveState, setSaveState] = useState<SaveState>(saved ? "saved" : "idle");
  const [failure, setFailure] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<WorkProfile | null>(null);
  const guess = useSetupGuess();
  // Undefined until the country changes here; till then the home region is the one Otto guessed.
  const [moved, setMoved] = useState<WorkRegion | null | undefined>(undefined);
  const home = moved === undefined ? guessedRegion(guess, draft) : moved;

  async function save(profile: WorkProfile) {
    pending.current = null;
    setSaveState("saving");
    try {
      const res = await api.saveWorkProfile(profile);
      storeWorkProfile(userId, res.profile, res.updatedAt);
      void confirmSetupGuess(userId);
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

  const flushOnLeave = useEffectEvent(flush);
  useEffect(() => () => flushOnLeave(), []);

  function patch(next: Partial<WorkProfile>) {
    let profile = { ...draft, ...next };
    if (next.country !== undefined && next.country !== draft.country) {
      const result = moveHomeRegion({ rights: draft.rights, auto: home }, next.country);
      profile = { ...profile, rights: result.rights };
      setMoved(result.auto);
    } else if (home && next.rights && next.rights[home] !== draft.rights[home]) {
      setMoved(null);
    }
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
      <WorkProfileFields
        value={draft}
        onChange={patch}
        typeError={typeError}
        countryHint={countryHint(guess, draft.country)}
        rightsNote={
          home && draft.rights[home] === "authorized" ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p>{homeRegionNote(home)}</p>
              {guess && moved === undefined ? (
                <Button variant="ghost" size="sm" onClick={() => void confirmSetupGuess(userId)}>
                  Looks right
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      />

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
