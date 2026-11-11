"use client";

import { CircleExclamationPoint } from "lucide-react";
import { useId, useMemo, type ReactNode } from "react";
import { useNow } from "@/components/studio/use-now";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { countryOptions, timeZoneOptions } from "@/lib/eligibility/options";
import {
  WORK_REGIONS,
  type WorkProfile,
  type WorkRegion,
  type WorkRight,
} from "@/lib/eligibility/profile";
import { RightChoice } from "./right-choice";

export type WorkProfileFieldsProps = {
  value: WorkProfile;
  onChange: (next: Partial<WorkProfile>) => void;
  // "essentials" is the first-login step: where you live, your work rights and remote only. The
  // time zone stays the device's and both job types stay on; the Account page has the rest.
  fields?: "all" | "essentials";
  // A region's answer, when the caller needs to tell it from other changes.
  onRight?: (region: WorkRegion, value: WorkRight | null) => void;
  countryHint?: ReactNode;
  // Under the regions, e.g. why one of them is already answered.
  rightsNote?: ReactNode;
  typeError?: string | null;
  // A dialog's first stop: without it the browser can land on the scroll box instead.
  autoFocusCountry?: boolean;
};

const CHECKBOX = "flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink";
const DAY_MS = 24 * 60 * 60 * 1000;

// The work profile's questions, without saving: the Account form saves them as they change, the
// first-login step on its Save key.
export function WorkProfileFields({
  value,
  onChange,
  fields = "all",
  onRight,
  countryHint,
  rightsNote,
  typeError,
  autoFocusCountry = false,
}: WorkProfileFieldsProps) {
  const all = fields === "all";
  // Offsets for the labels only change with daylight saving, so a day's precision is plenty.
  const day = Math.floor(useNow() / DAY_MS) * DAY_MS;
  const countries = useMemo(() => countryOptions(), []);
  const zones = useMemo(
    () => (all ? timeZoneOptions(day, value.timeZone) : []),
    [all, day, value.timeZone],
  );
  const rightsId = useId();
  const typesId = useId();
  const answer =
    onRight ?? ((region, right) => onChange({ rights: { ...value.rights, [region]: right } }));

  return (
    <>
      <div className={all ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        <Field label="Country you live in" hint={countryHint}>
          <Select
            value={value.country}
            onChange={(event) => onChange({ country: event.target.value })}
            data-autofocus={autoFocusCountry || undefined}
          >
            <option value="">Choose a country</option>
            {countries.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        {all ? (
          <Field label="Time zone">
            <Select
              value={value.timeZone}
              onChange={(event) => onChange({ timeZone: event.target.value })}
            >
              <option value="">Choose a time zone</option>
              {zones.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
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
              value={value.rights[region]}
              onChange={(right) => answer(region, right)}
            />
          ))}
        </div>
        {rightsNote ? <p className="mt-3 text-sm text-muted">{rightsNote}</p> : null}
      </div>

      <div
        role="group"
        aria-labelledby={`${typesId}-title`}
        aria-describedby={typeError ? `${typesId}-error` : undefined}
      >
        <p id={`${typesId}-title`} className={all ? "text-sm font-medium text-ink" : "sr-only"}>
          Open to
        </p>
        <div className={all ? "mt-1 flex flex-wrap gap-x-6" : "-mt-2 flex flex-wrap gap-x-6"}>
          {all ? (
            <>
              <label className={CHECKBOX}>
                <input
                  type="checkbox"
                  checked={value.fullTime}
                  onChange={(event) => onChange({ fullTime: event.target.checked })}
                  className="size-4 accent-ink"
                />
                Full-time jobs
              </label>
              <label className={CHECKBOX}>
                <input
                  type="checkbox"
                  checked={value.contract}
                  onChange={(event) => onChange({ contract: event.target.checked })}
                  className="size-4 accent-ink"
                />
                Contract work
              </label>
            </>
          ) : null}
          {/* Not a work right: it only sets the Jobs tab's "Remote only" filter to start with. */}
          <label className={CHECKBOX}>
            <input
              type="checkbox"
              checked={value.remoteOnly ?? false}
              onChange={(event) => onChange({ remoteOnly: event.target.checked })}
              className="size-4 accent-ink"
            />
            Remote jobs only
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
    </>
  );
}
