"use client";

import { ArrowUpRight, Building2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import { CompanyMark } from "@/components/ui/company-mark";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api } from "@/lib/api/client";
import type { CompanyJobsResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useRegionName } from "./near-filter";
import { linkedInCompanyUrl } from "./outreach-links";
import { cityLabel, placeLine, postedLabel } from "./view";

export type CompanyPanelProps = {
  name: string | null;
  onClose: () => void;
};

type Loaded = { name: string; data: CompanyJobsResponse } | { name: string; error: unknown };

const LINK =
  "inline-flex items-center gap-1 rounded-md text-sm font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink";

// Like NextDoor's company popup: what Otto knows of an employer and every job it has open here.
export function CompanyPanel({ name, onClose }: CompanyPanelProps) {
  const t = useMessages("jobs");
  const format = useFormat();
  const regionName = useRegionName();
  const now = useNow();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!name) return;
    const controller = new AbortController();
    api
      .companyJobs(name, controller.signal)
      .then((data) => setLoaded({ name, data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoaded({ name, error });
      });
    return () => controller.abort();
  }, [name, attempt]);

  const current = loaded?.name === name ? loaded : null;
  const data = current && "data" in current ? current.data : null;
  const company = data?.company ?? null;
  const shown = name ?? "";
  const onsite = company ? company.roles - company.remote - company.hybrid : 0;
  const modes = company
    ? [
        company.remote > 0 ? format.plural(t.company.remote, company.remote) : null,
        company.hybrid > 0 ? format.plural(t.company.hybrid, company.hybrid) : null,
        onsite > 0 ? format.plural(t.company.onsite, onsite) : null,
      ].filter(Boolean)
    : [];

  return (
    <Dialog
      open={name !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      title={
        <span className="flex items-center gap-3">
          <CompanyMark name={shown} size="md" />
          {company?.name ?? shown}
        </span>
      }
      description={
        company ? (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {company.hiring ? (
              <span className="font-medium text-pass-ink">{t.company.hiringNow}</span>
            ) : null}
            <span>{format.plural(t.company.openJobs, company.roles)}</span>
            {company.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden className="size-3.5 text-subtle" />
                {fmt(t.company.mostIn, { place: cityLabel(company.city, regionName) })}
              </span>
            ) : null}
            {modes.length > 0 ? <span>{modes.join(" · ")}</span> : null}
          </span>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {company?.careers ? (
            <a href={company.careers} target="_blank" rel="noopener" className={LINK}>
              <Building2 aria-hidden className="size-4 text-muted" />
              {t.company.careers}
              <span className="sr-only">{t.company.newTab}</span>
            </a>
          ) : null}
          {shown ? (
            <a
              href={linkedInCompanyUrl(company?.name ?? shown)}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              {fmt(t.company.linkedin, { company: company?.name ?? shown })}
              <ArrowUpRight aria-hidden className="size-4 text-muted" />
              <span className="sr-only">{t.company.newTab}</span>
            </a>
          ) : null}
        </div>

        {current === null ? (
          <p className="flex items-center gap-2 py-4 text-sm text-muted">
            <Spinner className="size-4" /> {t.company.loading}
          </p>
        ) : "error" in current ? (
          <div className="flex flex-col items-start gap-2 py-2">
            <p className="text-sm text-ink">{t.company.failed}</p>
            <p className="text-sm text-muted">{errorMessage(current.error)}</p>
            <Button variant="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>
              {t.company.tryAgain}
            </Button>
          </div>
        ) : data ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink">
              {t.company.jobs}
              {data.company.roles > data.jobs.length ? (
                <span className="ml-2 font-normal text-muted">
                  {fmt(t.company.newest, {
                    shown: format.number(data.jobs.length),
                    count: format.number(data.company.roles),
                  })}
                </span>
              ) : null}
            </h3>
            <ul className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto rounded-xl ring-1 ring-ink/5">
              {data.jobs.map((job) => (
                <li key={job.id}>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener"
                    className={cn(
                      "flex items-start justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-ink/4",
                    )}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-pretty text-ink">{job.title}</span>
                      <span className="text-xs/5 text-muted">
                        {[placeLine(job, t), postedLabel(job.postedAt, now, t, format)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <ArrowUpRight aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
                    <span className="sr-only">{t.company.newTab}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Dialog>
  );
}
