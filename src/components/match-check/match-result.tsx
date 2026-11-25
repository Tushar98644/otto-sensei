import { Circle, CircleCheck, TriangleExclamationPoint } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatFor, type Format } from "@/i18n/intl";
import matchCheckEn from "@/i18n/messages/en/match-check";
import type { MatchCheck, MatchRow, MatchStatus } from "@/lib/match-check/check";
import {
  countLine,
  listedNote,
  matchHeadline,
  type MatchCheckMessages,
} from "@/lib/match-check/copy";
import type { Importance } from "@/lib/match-check/post";

function Chip({ status, label }: { status: MatchStatus; label: string }) {
  if (status === "shown") {
    return (
      <Badge variant="pass">
        <CircleCheck className="text-pass" aria-hidden />
        {label}
      </Badge>
    );
  }
  if (status === "listed") {
    return (
      <Badge variant="warn">
        <TriangleExclamationPoint className="text-warn" aria-hidden />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="neutral">
      <Circle aria-hidden />
      {label}
    </Badge>
  );
}

const ORDER: Record<MatchStatus, number> = { missing: 0, listed: 1, shown: 2 };

type GroupKey = keyof MatchCheckMessages["result"]["groups"];
type Group = { importance: Importance; key: GroupKey };

const SORTED_GROUPS: readonly Group[] = [
  { importance: "must", key: "must" },
  { importance: "nice", key: "nice" },
  { importance: null, key: "alsoNamed" },
];
const ONE_GROUP: readonly Group[] = [{ importance: null, key: "all" }];

function RowItem({ row, t }: { row: MatchRow; t: MatchCheckMessages }) {
  return (
    <li className="flex flex-col gap-1.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm/6 font-medium break-words text-ink">{row.term}</p>
        <Chip status={row.status} label={t.result.status[row.status]} />
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
  t?: MatchCheckMessages;
  format?: Format;
};

export function MatchResult({
  check,
  titleAs = "h2",
  footer,
  className,
  t = matchCheckEn,
  format = formatFor("en"),
}: MatchResultProps) {
  const Sub = titleAs === "h2" ? "h3" : "h4";
  const words = t.result;
  if (check.total === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <Eyebrow>{words.eyebrow}</Eyebrow>
          <CardTitle as={titleAs}>{matchHeadline(check, t, format)}</CardTitle>
          <CardDescription className="max-w-prose">{words.noneBody}</CardDescription>
        </CardHeader>
        {footer}
      </Card>
    );
  }

  const groups = (check.sorted ? SORTED_GROUPS : ONE_GROUP)
    .map((group) => ({
      ...group,
      title: words.groups[group.key],
      rows: check.rows
        .filter((row) => row.importance === group.importance)
        .sort((a, b) => ORDER[a.status] - ORDER[b.status]),
    }))
    .filter((group) => group.rows.length > 0);
  // The hint goes under the first group with a gap, once.
  const hintAt = groups.find((group) => group.rows.some((row) => row.status === "missing"))?.key;
  const counts = [
    countLine(words.groups.must, check.must, t, format),
    countLine(words.groups.nice, check.nice, t, format),
  ];
  const listed = listedNote(check.listed, t, format);
  return (
    <Card className={className}>
      <CardHeader>
        <Eyebrow>{words.eyebrow}</Eyebrow>
        <CardTitle as={titleAs} className="tabular-nums">
          {matchHeadline(check, t, format)}
        </CardTitle>
        <CardDescription className="max-w-prose">{words.body}</CardDescription>
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
      {groups.map(({ key, title, rows }) => (
        <section key={key} aria-label={title} className="flex flex-col gap-1">
          <Sub className="text-sm font-medium text-ink">{title}</Sub>
          <ul className="divide-y divide-border border-y border-border">
            {rows.map((row) => (
              <RowItem key={row.id} row={row} t={t} />
            ))}
          </ul>
          {hintAt === key ? (
            <p className="mt-2 max-w-prose text-sm text-muted">{words.missingHint}</p>
          ) : null}
        </section>
      ))}
      {check.asks.length > 0 ? (
        <section aria-label={words.asks.label} className="flex flex-col gap-2">
          <Sub className="text-sm font-medium text-ink">{words.asks.title}</Sub>
          <ul className="flex flex-col gap-1.5">
            {check.asks.map((ask) => (
              <li key={ask} className="text-sm/6 text-ink">
                <q>{ask}</q>
              </li>
            ))}
          </ul>
          <p className="max-w-prose text-sm text-muted">{words.asks.note}</p>
        </section>
      ) : null}
      {footer}
    </Card>
  );
}
