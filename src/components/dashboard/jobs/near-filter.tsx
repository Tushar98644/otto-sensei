"use client";

import { LocateFixed, MapPin, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useFormat, useLocale, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api } from "@/lib/api/client";
import { regionNamesFor } from "@/lib/job-feed/looking-for";
import { NEAR_KM, type CityOption, type NearKm } from "@/lib/job-feed/types";
import type { FilterMemory, Point } from "./filter-memory";
import { locate } from "./geolocate";
import { cityLabel } from "./view";

const TYPING_PAUSE_MS = 200;

type Results = { query: string; cities: CityOption[] } | { query: string; error: true };

export type NearFilterProps = {
  city: CityOption | null;
  km: NearKm;
  point: Point | null;
  onChange: (patch: Partial<Pick<FilterMemory, "nearCity" | "nearKm">>) => void;
  onPoint: (point: Point | null) => void;
};

export function useRegionName() {
  const locale = useLocale();
  return useMemo(() => regionNamesFor(locale), [locale]);
}

export function NearFilter({ city, km, point, onChange, onPoint }: NearFilterProps) {
  const { filters: t } = useMessages("jobs");
  const format = useFormat();
  const regionName = useRegionName();
  const ids = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const typed = query.trim();

  useEffect(() => {
    if (typed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api
        .searchCities(typed, controller.signal)
        .then((res) => setResults({ query: typed, cities: res.cities }))
        .catch(() => {
          if (!controller.signal.aborted) setResults({ query: typed, error: true });
        });
    }, TYPING_PAUSE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [typed]);

  function findMe() {
    setLocating(true);
    setDenied(false);
    locate()
      .then((found) => {
        onPoint(found);
        onChange({ nearCity: null });
      })
      .catch(() => setDenied(true))
      .finally(() => setLocating(false));
  }

  const current = typed.length >= 2 && results?.query === typed ? results : null;
  const searching = typed.length >= 2 && current === null;
  const chosen = point ? t.yourLocation : city ? cityLabel(city, regionName) : null;

  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <Label htmlFor={`${ids}-city`}>{t.near}</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {chosen ? (
          <span className="inline-flex h-10 min-w-0 items-center gap-1.5 rounded-xl bg-surface-muted pr-1 pl-3 text-sm text-ink">
            <MapPin aria-hidden className="size-4 shrink-0 text-muted" />
            <span className="truncate">{chosen}</span>
            <button
              type="button"
              aria-label={fmt(t.remove, { place: chosen })}
              onClick={() => {
                onPoint(null);
                onChange({ nearCity: null });
              }}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/6 hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </button>
          </span>
        ) : (
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
            />
            <Input
              id={`${ids}-city`}
              type="search"
              value={query}
              maxLength={60}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.cityPlaceholder}
              aria-label={t.cityLabel}
              aria-controls={`${ids}-cities`}
              autoComplete="off"
              spellCheck={false}
              className="pl-10"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Label htmlFor={`${ids}-km`} className="shrink-0 font-normal text-muted">
            {t.within}
          </Label>
          <Select
            id={`${ids}-km`}
            value={String(km)}
            onChange={(event) => onChange({ nearKm: Number(event.target.value) as NearKm })}
            className="w-28"
          >
            {NEAR_KM.map((value) => (
              <option key={value} value={value}>
                {fmt(t.km, { count: format.number(value) })}
              </option>
            ))}
          </Select>
          {point ? null : (
            <Button variant="secondary" loading={locating} onClick={findMe}>
              <LocateFixed aria-hidden />
              {t.useLocation}
            </Button>
          )}
        </div>
      </div>
      {chosen ? null : (
        <div id={`${ids}-cities`} aria-live="polite" className="empty:hidden">
          {searching ? (
            <p className="flex items-center gap-2 py-2 text-sm text-muted">
              <Spinner className="size-4" /> {t.citySearching}
            </p>
          ) : current && "error" in current ? (
            <p className="py-2 text-sm text-muted">{t.cityFailed}</p>
          ) : current && current.cities.length === 0 ? (
            <p className="py-2 text-sm text-muted">{t.cityNone}</p>
          ) : current ? (
            <ul className="flex flex-col gap-0.5">
              {current.cities.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPoint(null);
                      onChange({ nearCity: option });
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-hidden"
                  >
                    <MapPin aria-hidden className="size-4 shrink-0 text-subtle" />
                    {cityLabel(option, regionName)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      {locating ? (
        <p role="status" className="text-xs/5 text-muted">
          {t.locating}
        </p>
      ) : null}
      {denied ? (
        <p role="alert" className="text-xs/5 text-fail-ink">
          {t.locationOff}
        </p>
      ) : null}
      <p className="text-xs/5 text-subtle">{t.nearHint}</p>
    </div>
  );
}
