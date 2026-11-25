"use client";

import { Building2 } from "lucide-react";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { CompanySnapshot } from "@/lib/job-feed/types";
import { cn } from "@/lib/utils";
import { useRegionName } from "./near-filter";
import { cityLabel } from "./view";

const PART =
  "relative min-w-0 pl-3 before:absolute before:top-1/2 before:left-1 before:size-0.75 before:-translate-y-1/2 before:rounded-full before:bg-border-strong first:pl-0 first:before:hidden";

// The card's line about the employer: its open jobs here, whether it's hiring now, where most jobs are.
export function EmployerLine({
  employer,
  onOpen,
}: {
  employer: CompanySnapshot;
  onOpen?: () => void;
}) {
  const { company: t } = useMessages("jobs");
  const format = useFormat();
  const regionName = useRegionName();
  const parts = [
    format.plural(t.openJobs, employer.roles),
    employer.city ? fmt(t.mostIn, { place: cityLabel(employer.city, regionName) }) : null,
  ].filter((part): part is string => part !== null);
  const line = (
    <>
      <Building2 aria-hidden className="size-3.5 shrink-0 text-subtle" />
      <span className="flex min-w-0 flex-wrap">
        {employer.hiring ? (
          <span className={cn(PART, "font-medium text-pass-ink")}>{t.hiringNow}</span>
        ) : null}
        {parts.map((part) => (
          <span key={part} className={PART}>
            {part}
          </span>
        ))}
      </span>
    </>
  );
  if (!onOpen) return <p className="mt-1 flex items-center gap-1.5 text-xs/5 text-muted">{line}</p>;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-1 -ml-1 flex items-center gap-1.5 rounded-md px-1 text-left text-xs/5 text-muted transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span className="sr-only">{fmt(t.about, { company: employer.name })}</span>
      {line}
    </button>
  );
}
