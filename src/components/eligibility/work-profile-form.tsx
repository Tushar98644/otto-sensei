"use client";

import { CircleExclamationPoint } from "lucide-react";
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "@/components/account/errors";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { countryOptions, deviceTimeZone, timeZoneOptions } from "@/lib/eligibility/options";
import { WORK_REGIONS, type WorkProfile } from "@/lib/eligibility/profile";
import { RightChoice } from "./right-choice";
import { storeWorkProfile } from "./use-work-profile";

export type WorkProfileFormProps = {
  userId: string;
  initial: WorkProfile;
  saved: boolean;
  // Shown under the fields, e.g. a "Done" key in the dialog.
  footer?: ReactNode;
};

const CHECKBOX = "flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink";
const DAY_MS = 24 * 60 * 60 * 1000;
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
  // Offsets for the labels only change with daylight saving, so a day's precision is plenty.
  const day = Math.floor(useNow() / DAY_MS) * DAY_MS;
  const countries = useMemo(() => countryOptions(), []);
  const zones = useMemo(() => timeZoneOptions(day, initial.timeZone), [day, initial.timeZone]);
  const rightsId = useId();
  const typesId = useId();

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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country you live in">
          <Select
            value={draft.country}
            onChange={(event) => patch({ country: event.target.value })}
          >
            <option value="">Choose a country</option>
            {countries.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Time zone">
          <Select
            value={draft.timeZone}
            onChange={(event) => patch({ timeZone: event.target.value })}
          >
            <option value="">Choose a time zone</option>
            {zones.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div role="group" aria-labelledby={`${rightsId}-title`} aria-describedby={`${rightsId}-hint`}>
        <p id={`${rightsId}-title`} className="text-sm font-medium text-ink">
          Can you work there without visa sponsorship?
        </p>
        <p id={`${rightsId}-hint`} className="mt-1 text-sm text-muted">
          Yes if you&apos;re a citizen or resident there, or your visa already lets you work.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {WORK_REGIONS.map((region) => (
            <RightChoice
              key={region}
              region={region}
              value={draft.rights[region]}
              onChange={(value) => patch({ rights: { ...draft.rights, [region]: value } })}
            />
          ))}
        </div>
      </div>

      <div
        role="group"
        aria-labelledby={`${typesId}-title`}
        aria-describedby={typeError ? `${typesId}-error` : undefined}
      >
        <p id={`${typesId}-title`} className="text-sm font-medium text-ink">
          Open to
        </p>
        <div className="mt-1 flex flex-wrap gap-x-6">
          <label className={CHECKBOX}>
            <input
              type="checkbox"
              checked={draft.fullTime}
              onChange={(event) => patch({ fullTime: event.target.checked })}
              className="size-4 accent-ink"
            />
            Full-time jobs
          </label>
          <label className={CHECKBOX}>
            <input
              type="checkbox"
              checked={draft.contract}
              onChange={(event) => patch({ contract: event.target.checked })}
              className="size-4 accent-ink"
            />
            Contract work
          </label>
        </div>
        {typeError ? (
          <p
            id={`${typesId}-error`}
            className="mt-1 flex items-start gap-1.5 text-sm font-medium text-fail-ink"
          >
            <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" />
            <span>{typeError}</span>
          </p>
        ) : null}
      </div>

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
