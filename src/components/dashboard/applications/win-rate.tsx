"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import type { Application } from "@/lib/applications/schema";
import {
  compareVersions,
  comparisonLine,
  countsLine,
  formatCount,
  interviewRate,
  MIN_FOR_RATE,
  rateHeadline,
  statsByVersion,
  swingNote,
  tally,
  type Tally,
  type VersionInfo,
  type VersionStats,
} from "@/lib/applications/stats";

const number = new Intl.NumberFormat("en-US");
const FIRST_VERSIONS = 6;

export function WinRate({
  items,
  versions,
}: {
  items: readonly Application[];
  versions: ReadonlyMap<string, VersionInfo>;
}) {
  const counts = useMemo(() => tally(items), [items]);
  const rate = interviewRate(counts);
  const byVersion = useMemo(() => statsByVersion(items, versions), [items, versions]);

  return (
    <section aria-labelledby="win-rate-heading" className="flex flex-col gap-8">
      <h2 id="win-rate-heading" className="sr-only">
        Win rate
      </h2>
      <FolderCard tab="Win rate" bodyClassName="overflow-hidden p-0">
        <dl className="grid grid-cols-3 gap-px bg-border">
          <Stat
            label="Applications"
            value={counts.applications}
            note={
              counts.waiting > 0 ? `${number.format(counts.waiting)} still waiting` : "None waiting"
            }
          />
          <Stat
            label="Interviews"
            value={counts.interviews}
            note={
              rate.shown
                ? `${rate.percent}% interview rate`
                : `Rate from ${MIN_FOR_RATE} applications`
            }
          />
          <Stat label="Offers" value={counts.offers} note={ofAll(counts)} />
        </dl>
        <div className="flex flex-col gap-1 border-t border-border p-5 sm:p-6">
          <p className="text-base/7 text-pretty text-ink">{rateHeadline(counts)}</p>
          <p className="text-sm/6 text-pretty text-muted">{swingNote(counts)}</p>
        </div>
      </FolderCard>

      {byVersion.length > 0 ? <ByVersion stats={byVersion} /> : null}
    </section>
  );
}

function ofAll(counts: Tally): string {
  return `of ${formatCount(counts.applications, "application")}`;
}

function ByVersion({ stats }: { stats: readonly VersionStats[] }) {
  const [showAll, setShowAll] = useState(false);
  const comparison = compareVersions(stats);
  const shown = showAll ? stats : stats.slice(0, FIRST_VERSIONS);

  return (
    <FolderCard tab="By resume version" bodyClassName="p-0">
      <ul className="divide-y divide-border">
        {shown.map((version) => (
          <VersionRow key={version.key} version={version} />
        ))}
      </ul>
      {stats.length > FIRST_VERSIONS ? (
        <div className="border-t border-border px-3 py-2 sm:px-4">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={showAll}
            onClick={() => setShowAll((open) => !open)}
          >
            {showAll ? "Show fewer versions" : `Show all ${number.format(stats.length)} versions`}
          </Button>
        </div>
      ) : null}
      <div className="border-t border-border px-5 py-4 sm:px-6">
        {comparison ? (
          <>
            <p className="text-sm/6 text-pretty text-ink">{comparisonLine(comparison)}</p>
            <p className="mt-1 text-sm/6 text-pretty text-muted">
              Small numbers swing a lot, so read the gap as a hint, not proof.
            </p>
          </>
        ) : (
          <p className="text-sm/6 text-pretty text-muted">
            Versions are compared once two of them have {MIN_FOR_RATE} or more applications each.
          </p>
        )}
      </div>
    </FolderCard>
  );
}

function VersionRow({ version }: { version: VersionStats }) {
  const { tally: counts, rate } = version;
  return (
    <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate text-base/6 font-medium text-ink">{version.title}</span>
          {version.tailored ? <Badge>Tailored</Badge> : null}
          {version.state === "deleted" ? <Badge>Deleted</Badge> : null}
        </p>
        <p className="mt-0.5 text-sm/5 text-muted">
          {countsLine(counts)} · {formatCount(counts.offers, "offer")}
        </p>
      </div>
      <p className="flex shrink-0 items-baseline gap-2 text-sm/5 text-muted sm:justify-end">
        {rate.shown ? (
          <>
            <span className="font-display text-3xl/9 font-normal text-ink lining-nums tabular-nums">
              {rate.percent}%
            </span>
            <span>interview rate</span>
          </>
        ) : (
          <span>{formatCount(rate.needed, "more application")} to show a rate</span>
        )}
      </p>
    </li>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="flex min-w-0 flex-col bg-surface p-4 sm:p-6">
      <dt className="truncate text-sm/5 text-muted">{label}</dt>
      <dd className="mt-2 font-display text-4xl/10 font-normal text-ink lining-nums tabular-nums">
        {number.format(value)}
      </dd>
      <dd className="mt-1 min-h-5 text-xs/5 text-subtle">{note}</dd>
    </div>
  );
}
