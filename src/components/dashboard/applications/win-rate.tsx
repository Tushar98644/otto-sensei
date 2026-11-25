"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Application } from "@/lib/applications/schema";
import {
  compareVersions,
  interviewRate,
  MIN_FOR_RATE,
  statsByVersion,
  tally,
  type VersionInfo,
  type VersionStats,
} from "@/lib/applications/stats";
import { comparisonLine, countsLine, rateHeadline, swingNote, versionTitle } from "./copy";

const FIRST_VERSIONS = 6;

export function WinRate({
  items,
  versions,
}: {
  items: readonly Application[];
  versions: ReadonlyMap<string, VersionInfo>;
}) {
  const t = useMessages("applications");
  const { winRate } = t;
  const format = useFormat();
  const counts = useMemo(() => tally(items), [items]);
  const rate = interviewRate(counts);
  const byVersion = useMemo(() => statsByVersion(items, versions), [items, versions]);

  return (
    <section aria-labelledby="win-rate-heading" className="flex flex-col gap-8">
      <h2 id="win-rate-heading" className="sr-only">
        {winRate.title}
      </h2>
      <FolderCard tab={winRate.title} bodyClassName="overflow-hidden p-0">
        <dl className="grid grid-cols-3 gap-px bg-border">
          <Stat
            label={winRate.applications}
            value={counts.applications}
            note={
              counts.waiting > 0
                ? fmt(winRate.stillWaiting, { count: format.number(counts.waiting) })
                : winRate.noneWaiting
            }
          />
          <Stat
            label={winRate.interviews}
            value={counts.interviews}
            note={
              rate.shown
                ? fmt(winRate.rate, { percent: rate.percent })
                : fmt(winRate.rateFrom, { min: format.number(MIN_FOR_RATE) })
            }
          />
          <Stat
            label={winRate.offers}
            value={counts.offers}
            note={format.plural(winRate.ofAll, counts.applications)}
          />
        </dl>
        <div className="flex flex-col gap-1 border-t border-border p-5 sm:p-6">
          <p className="text-base/7 text-pretty text-ink">{rateHeadline(counts, t, format)}</p>
          <p className="text-sm/6 text-pretty text-muted">{swingNote(counts, t, format)}</p>
        </div>
      </FolderCard>

      {byVersion.length > 0 ? <ByVersion stats={byVersion} /> : null}
    </section>
  );
}

function ByVersion({ stats }: { stats: readonly VersionStats[] }) {
  const t = useMessages("applications");
  const { winRate } = t;
  const format = useFormat();
  const [showAll, setShowAll] = useState(false);
  const comparison = compareVersions(stats);
  const shown = showAll ? stats : stats.slice(0, FIRST_VERSIONS);

  return (
    <FolderCard tab={winRate.byVersion} bodyClassName="p-0">
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
            {showAll ? winRate.fewer : fmt(winRate.all, { count: format.number(stats.length) })}
          </Button>
        </div>
      ) : null}
      <div className="border-t border-border px-5 py-4 sm:px-6">
        {comparison ? (
          <>
            <p className="text-sm/6 text-pretty text-ink">
              {comparisonLine(comparison, t, format)}
            </p>
            <p className="mt-1 text-sm/6 text-pretty text-muted">{winRate.hint}</p>
          </>
        ) : (
          <p className="text-sm/6 text-pretty text-muted">
            {fmt(winRate.compareFrom, { min: format.number(MIN_FOR_RATE) })}
          </p>
        )}
      </div>
    </FolderCard>
  );
}

function VersionRow({ version }: { version: VersionStats }) {
  const t = useMessages("applications");
  const { winRate } = t;
  const format = useFormat();
  const { tally: counts, rate } = version;
  return (
    <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate text-base/6 font-medium text-ink">
            {versionTitle(version, t)}
          </span>
          {version.tailored ? <Badge>{winRate.tailored}</Badge> : null}
          {version.state === "deleted" ? <Badge>{winRate.deleted}</Badge> : null}
        </p>
        <p className="mt-0.5 text-sm/5 text-muted">
          {countsLine(counts, t, format)} · {format.plural(t.count.offers, counts.offers)}
        </p>
      </div>
      <p className="flex shrink-0 items-baseline gap-2 text-sm/5 text-muted sm:justify-end">
        {rate.shown ? (
          <>
            <span className="font-display text-3xl/9 font-normal text-ink lining-nums tabular-nums">
              {rate.percent}%
            </span>
            <span>{winRate.interviewRate}</span>
          </>
        ) : (
          <span>{format.plural(winRate.needed, rate.needed)}</span>
        )}
      </p>
    </li>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  const format = useFormat();
  return (
    <div className="flex min-w-0 flex-col bg-surface p-4 sm:p-6">
      <dt className="truncate text-sm/5 text-muted">{label}</dt>
      <dd className="mt-2 font-display text-4xl/10 font-normal text-ink lining-nums tabular-nums">
        {format.number(value)}
      </dd>
      <dd className="mt-1 min-h-5 text-xs/5 text-subtle">{note}</dd>
    </div>
  );
}
