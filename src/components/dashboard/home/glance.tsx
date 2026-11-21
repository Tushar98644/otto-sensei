"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useMe } from "@/components/account/use-me";
import { ROUTES } from "@/components/site/routes";
import { FolderCard } from "@/components/ui/folder-card";
import { Skeleton } from "@/components/ui/skeleton";
import { countsLine, interviewRate, MIN_FOR_RATE, tally } from "@/lib/applications/stats";
import { thisPeriod } from "@/lib/usage-copy";
import { cn } from "@/lib/utils";
import { useApplications } from "../applications/use-applications";

const count = new Intl.NumberFormat("en-US");

type Cell = {
  key: string;
  label: string;
  value: string | null;
  note: string | null;
  href?: string;
  tour?: string;
};

const COLUMNS = ["", "", "sm:grid-cols-2", "sm:grid-cols-3"] as const;

// Only numbers Home shows nowhere else: how applications go, and what's left to use.
export function AtAGlance() {
  const { me } = useMe();
  const applications = useApplications();
  const counts = useMemo(() => tally(applications.items), [applications.items]);
  const period = thisPeriod(me?.period);
  const tailors = me?.usage?.tailor;
  const fixes = me?.usage?.fix;

  const cells: Cell[] = [];
  if (applications.status === "ready" && counts.applications > 0) {
    const rate = interviewRate(counts);
    cells.push(
      rate.shown
        ? {
            key: "rate",
            label: "Interview rate",
            value: `${rate.percent}%`,
            note: countsLine(counts),
            href: ROUTES.dashboardApplications,
            tour: "dashboard-win-rate",
          }
        : {
            key: "rate",
            label: "Applications",
            value: count.format(counts.applications),
            note: `Interview rate shows from ${MIN_FOR_RATE}`,
            href: ROUTES.dashboardApplications,
            tour: "dashboard-win-rate",
          },
    );
  }
  if (tailors && tailors.limit > 0) {
    cells.push({
      key: "tailors",
      label: "Tailored versions left",
      value: count.format(Math.max(0, tailors.limit - tailors.used)),
      note: `of ${count.format(tailors.limit)} ${period}`,
    });
  }
  cells.push({
    key: "fixes",
    label: "Line fixes left",
    value: fixes ? count.format(Math.max(0, fixes.limit - fixes.used)) : null,
    note: fixes ? `of ${count.format(fixes.limit)} ${period}` : null,
  });

  // One number alone isn't worth a section; Account's Usage keeps every allowance.
  if (cells.length < 2) return null;

  return (
    <FolderCard tab="At a glance" bodyClassName="overflow-hidden p-0">
      <dl className={cn("grid grid-cols-1 gap-px bg-border", COLUMNS[cells.length])}>
        {cells.map((cell) => (
          <Stat key={cell.key} cell={cell} />
        ))}
      </dl>
    </FolderCard>
  );
}

// The label links and stretches over the cell, since a dl allows only dt and dd inside each div.
function Stat({ cell }: { cell: Cell }) {
  return (
    <div
      data-tour={cell.tour}
      className={cn(
        "grid grid-cols-[1fr_auto] items-center gap-x-4 bg-surface p-5 sm:flex sm:flex-col sm:items-stretch sm:p-6",
        cell.href &&
          "group/stat relative transition-colors duration-150 ease-out hover:bg-surface-hover has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink",
      )}
    >
      <dt className="text-sm/5 text-muted">
        {cell.href ? (
          <Link
            href={cell.href}
            className="inline-flex items-center gap-1.5 outline-none after:absolute after:inset-0"
          >
            {cell.label}
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-150 ease-out group-hover/stat:translate-x-0.5 group-hover/stat:text-ink"
            />
          </Link>
        ) : (
          cell.label
        )}
      </dt>
      <dd className="col-start-2 row-span-2 row-start-1 font-display text-3xl/9 font-normal text-ink lining-nums tabular-nums sm:mt-2 sm:text-4xl/10">
        {cell.value === null ? <Skeleton className="h-9 w-16 sm:h-10" /> : cell.value}
      </dd>
      <dd className="mt-1 min-h-5 text-sm/5 text-subtle tabular-nums">{cell.note}</dd>
    </div>
  );
}
