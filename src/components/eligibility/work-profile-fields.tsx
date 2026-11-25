"use client";

import { CircleExclamationPoint } from "lucide-react";
import { useId, useMemo, type ReactNode } from "react";
import { useNow } from "@/components/studio/use-now";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useLocale, useMessages } from "@/i18n/client";
import { countryOptions, timeZoneOptions } from "@/lib/eligibility/options";
import {
  WORK_REGIONS,
  type WorkProfile,
  type WorkRegion,
  type WorkRight,
} from "@/lib/eligibility/profile";
import { DAY_MS } from "@/lib/time";
import { RightChoice } from "./right-choice";

export type WorkProfileFieldsProps = {
  value: WorkProfile;
  onChange: (next: Partial<WorkProfile>) => void;
  fields?: "all" | "essentials";
  onRight?: (region: WorkRegion, value: WorkRight | null) => void;
  countryHint?: ReactNode;
  rightsNote?: ReactNode;
  typeError?: string | null;
  autoFocusCountry?: boolean;
};

const CHECKBOX = "flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink";

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
  const day = Math.floor(useNow() / DAY_MS) * DAY_MS;
  const t = useMessages("workProfile").fields;
  const locale = useLocale();
  const countries = useMemo(() => countryOptions(locale), [locale]);
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
        <Field label={t.country} hint={countryHint}>
          <Select
            value={value.country}
            onChange={(event) => onChange({ country: event.target.value })}
            data-autofocus={autoFocusCountry || undefined}
          >
            <option value="">{t.chooseCountry}</option>
            {countries.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        {all ? (
          <Field label={t.timeZone}>
            <Select
              value={value.timeZone}
              onChange={(event) => onChange({ timeZone: event.target.value })}
            >
              <option value="">{t.chooseZone}</option>
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
          {t.rightsTitle}
        </p>
        <p id={`${rightsId}-hint`} className="mt-1 text-sm text-muted">
          {t.rightsHint}
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
        {rightsNote ? <div className="mt-3 text-sm text-muted">{rightsNote}</div> : null}
      </div>

      <div
        role="group"
        aria-labelledby={`${typesId}-title`}
        aria-describedby={typeError ? `${typesId}-error` : undefined}
      >
        <p id={`${typesId}-title`} className={all ? "text-sm font-medium text-ink" : "sr-only"}>
          {t.openTo}
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
                {t.fullTime}
              </label>
              <label className={CHECKBOX}>
                <input
                  type="checkbox"
                  checked={value.contract}
                  onChange={(event) => onChange({ contract: event.target.checked })}
                  className="size-4 accent-ink"
                />
                {t.contract}
              </label>
            </>
          ) : null}
          <label className={CHECKBOX}>
            <input
              type="checkbox"
              checked={value.remoteOnly ?? false}
              onChange={(event) => onChange({ remoteOnly: event.target.checked })}
              className="size-4 accent-ink"
            />
            {t.remoteOnly}
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
