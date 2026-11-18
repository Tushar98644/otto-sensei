import { Circle, CircleCheck, TriangleExclamationPoint } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { MatchCheck, MatchRow, MatchStatus } from "@/lib/match-check/check";
import {
  countLine,
  listedNote,
  matchHeadline,
  MISSING_HINT,
  STATUS_LABELS,
} from "@/lib/match-check/copy";
import type { Importance } from "@/lib/match-check/post";

const CHIPS: Record<MatchStatus, ReactNode> = {
  shown: (
    <Badge variant="pass">
      <CircleCheck className="text-pass" aria-hidden />
      {STATUS_LABELS.shown}
    </Badge>
  ),
  listed: (
    <Badge variant="warn">
      <TriangleExclamationPoint className="text-warn" aria-hidden />
      {STATUS_LABELS.listed}
    </Badge>
  ),
  missing: (
    <Badge variant="neutral">
      <Circle aria-hidden />
      {STATUS_LABELS.missing}
    </Badge>
  ),
};

const ORDER: Record<MatchStatus, number> = { missing: 0, listed: 1, shown: 2 };

type Group = { importance: Importance; title: string };

const SORTED_GROUPS: readonly Group[] = [
  { importance: "must", title: "Must-haves" },
  { importance: "nice", title: "Nice-to-haves" },
  { importance: null, title: "Also named in the post" },
];
const ONE_GROUP: readonly Group[] = [{ importance: null, title: "Skills the post names" }];

function RowItem({ row }: { row: MatchRow }) {
  return (
    <li className="flex flex-col gap-1.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm/6 font-medium break-words text-ink">{row.term}</p>
        {CHIPS[row.status]}
      </div>
      {row.where ? (
        <div className="flex flex-col gap-0.5">
          <q className="text-sm/6 text-pretty text-ink">{row.where.text}</q>
          <p className="text-xs/5 text-subtle">{row.where.place}</p>
        </div>
      ) : null}
    </li>
  );
}

export type MatchResultProps = {
  check: MatchCheck;
  titleAs?: "h2" | "h3";
  footer?: ReactNode;
  className?: string;
};

export function MatchResult({ check, titleAs = "h2", footer, className }: MatchResultProps) {
  const Sub = titleAs === "h2" ? "h3" : "h4";
  if (check.total === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <Eyebrow>Free word check</Eyebrow>
          <CardTitle as={titleAs}>{matchHeadline(check)}</CardTitle>
          <CardDescription className="max-w-prose">
            Otto looks for the skills, tools, licences and languages he knows, and this post names
            none of them. Paste the whole post, with its requirements, and check again.
          </CardDescription>
        </CardHeader>
        {footer}
      </Card>
    );
  }

  const groups = (check.sorted ? SORTED_GROUPS : ONE_GROUP)
    .map((group) => ({
      ...group,
      rows: check.rows
        .filter((row) => row.importance === group.importance)
        .sort((a, b) => ORDER[a.status] - ORDER[b.status]),
    }))
    .filter((group) => group.rows.length > 0);
  // The hint goes under the first group with a gap, once.
  const hintAt = groups.find((group) => group.rows.some((row) => row.status === "missing"))?.title;
  const counts = [countLine("Must-haves", check.must), countLine("Nice-to-haves", check.nice)];
  const listed = listedNote(check.listed);
  return (
    <Card className={className}>
      <CardHeader>
        <Eyebrow>Free word check</Eyebrow>
        <CardTitle as={titleAs} className="tabular-nums">
          {matchHeadline(check)}
        </CardTitle>
        <CardDescription className="max-w-prose">
          Otto looked for each skill, tool and licence the post names, word for word, the way
          keyword filters do. It&apos;s a count, not a grade.
        </CardDescription>
      </CardHeader>
      {counts.some(Boolean) || listed ? (
        <div className="flex flex-col gap-2">
          {counts.some(Boolean) ? (
            <div className="flex flex-wrap gap-2">
              {counts.map((line) =>
                line ? (
                  <Badge key={line} className="tabular-nums">
                    {line}
                  </Badge>
                ) : null,
              )}
            </div>
          ) : null}
          {listed ? <p className="max-w-prose text-sm text-muted">{listed}</p> : null}
        </div>
      ) : null}
      {groups.map(({ title, rows }) => (
        <section key={title} aria-label={title} className="flex flex-col gap-1">
          <Sub className="text-sm font-medium text-ink">{title}</Sub>
          <ul className="divide-y divide-border border-y border-border">
            {rows.map((row) => (
              <RowItem key={row.id} row={row} />
            ))}
          </ul>
          {hintAt === title ? (
            <p className="mt-2 max-w-prose text-sm text-muted">{MISSING_HINT}</p>
          ) : null}
        </section>
      ))}
      {check.asks.length > 0 ? (
        <section aria-label="Also in the post" className="flex flex-col gap-2">
          <Sub className="text-sm font-medium text-ink">The post also asks for</Sub>
          <ul className="flex flex-col gap-1.5">
            {check.asks.map((ask) => (
              <li key={ask} className="text-sm/6 text-ink">
                <q>{ask}</q>
              </li>
            ))}
          </ul>
          <p className="max-w-prose text-sm text-muted">
            A word check can&apos;t judge years or degrees. Compare these with your dates and
            education yourself.
          </p>
        </section>
      ) : null}
      {footer}
    </Card>
  );
}
