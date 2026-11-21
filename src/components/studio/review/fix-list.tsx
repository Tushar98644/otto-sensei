"use client";

import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  CircleX,
  Info,
  TriangleExclamationPoint,
  type LucideIcon,
} from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status";
import type { RecruiterCheck, RecruiterReport } from "@/lib/checks/types";
import { MAX_TOP, type ResumeReview, type ReviewItem, type ReviewLine } from "@/lib/lint/review";
import { cn, pluralize } from "@/lib/utils";
import { openTarget, targetLabel } from "./open-target";

type Row =
  | { kind: "check"; key: string; check: RecruiterCheck }
  | { kind: "words"; key: string; item: ReviewItem };

export type FixListProps = {
  report: RecruiterReport;
  review: ResumeReview | null;
  resumeId: string;
};

export function FixList({ report, review, resumeId }: FixListProps) {
  const headingId = useId();
  const { top, rest } = fixRows(report, review);
  const passed = report.checks.filter((check) => check.status === "pass");

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col overflow-hidden rounded-2xl bg-surface"
    >
      <div className="border-b border-border px-5 py-3 sm:px-6">
        <h2 id={headingId} className="font-sans text-base/6 font-semibold text-ink">
          What to fix
        </h2>
      </div>
      <div className="flex flex-1 flex-col gap-6 px-5 pt-4 pb-3 sm:px-6">
        {top.length === 0 ? (
          <p className="py-2">
            <StatusPill status="pass">Nothing urgent. Your file and your lines read well.</StatusPill>
          </p>
        ) : (
          <Group label="Fix these first" ordered>
            {top.map((row, index) => (
              <FixRow key={row.key} row={row} resumeId={resumeId} number={index + 1} />
            ))}
          </Group>
        )}
        {rest.length > 0 ? (
          <Group label="Also worth a look">
            {rest.map((row) => (
              <FixRow key={row.key} row={row} resumeId={resumeId} />
            ))}
          </Group>
        ) : null}
      </div>
      {passed.length > 0 ? (
        <ul className="border-t border-border px-5 sm:px-6">
          <Disclosure
            marker={<CircleCheck aria-hidden className="size-4 text-pass" />}
            title={`${pluralize(passed.length, "file check")} passed`}
          >
            <ul className="flex flex-col gap-3">
              {passed.map((check) => (
                <li key={check.id} className="flex flex-col gap-0.5">
                  <p className="text-sm/6 font-medium text-ink">{check.title}</p>
                  <p className="text-sm/6 text-pretty text-muted">{check.detail}</p>
                </li>
              ))}
            </ul>
          </Disclosure>
        </ul>
      ) : null}
    </section>
  );
}

// File problems lead, then the words; the first MAX_TOP keep reviewResume()'s own pick of the top.
function fixRows(report: RecruiterReport, review: ResumeReview | null) {
  const checks = (status: "fail" | "warn"): Row[] =>
    report.checks
      .filter((check) => check.status === status)
      .map((check) => ({ kind: "check", key: `check:${check.id}`, check }));
  const words = (items: readonly ReviewItem[], high: boolean): Row[] =>
    items
      .filter((item) => (item.severity === "high") === high)
      .map((item) => ({ kind: "words", key: `words:${item.id}`, item }));
  const order = (items: readonly ReviewItem[]) => [
    ...checks("fail"),
    ...words(items, true),
    ...checks("warn"),
    ...words(items, false),
  ];
  const top = order(review?.top ?? []).slice(0, MAX_TOP);
  const picked = new Set(top.map((row) => row.key));
  const rest = order(review?.items ?? []).filter((row) => !picked.has(row.key));
  return { top, rest };
}

function Group({
  label,
  ordered = false,
  children,
}: {
  label: string;
  ordered?: boolean;
  children: ReactNode;
}) {
  const labelId = useId();
  const List = ordered ? "ol" : "ul";
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
      <h3 id={labelId} className="text-xs/4 font-medium tracking-widest text-subtle uppercase">
        {label}
      </h3>
      <List className="divide-y divide-border">{children}</List>
    </div>
  );
}

const SEVERITY: Record<"fail" | "warn" | "tip", { icon: LucideIcon; tone: string; say: string }> =
  {
    fail: { icon: CircleX, tone: "text-fail", say: "Problem: " },
    warn: { icon: TriangleExclamationPoint, tone: "text-warn", say: "Needs work: " },
    tip: { icon: Info, tone: "text-subtle", say: "Tip: " },
  };

function FixRow({ row, resumeId, number }: { row: Row; resumeId: string; number?: number }) {
  const level =
    row.kind === "check"
      ? row.check.status === "fail"
        ? "fail"
        : "warn"
      : row.item.severity === "high"
        ? "warn"
        : "tip";
  const { icon: Icon, tone, say } = SEVERITY[level];
  const marker =
    number !== undefined ? (
      <span className="flex size-6 items-center justify-center rounded-full bg-surface-muted text-xs font-medium text-ink tabular-nums">
        {number}
      </span>
    ) : (
      <Icon aria-hidden className={cn("size-4", tone)} />
    );
  const lead = number !== undefined;

  if (row.kind === "check") {
    const { check } = row;
    return (
      <Disclosure
        marker={marker}
        say={say}
        title={check.title}
        reason={lead ? check.detail : undefined}
      >
        {lead && !check.fix ? null : (
          <>
            {lead ? null : <p className="text-sm/6 text-pretty text-muted">{check.detail}</p>}
            {check.fix ? (
              <p className="text-sm/6 text-pretty text-ink">
                <span className="font-medium">How to fix: </span>
                {check.fix}
              </p>
            ) : null}
          </>
        )}
      </Disclosure>
    );
  }

  const { item } = row;
  const opens = !lead || item.lines.length > 0 || item.target !== null || item.more > 0;
  // One message repeated under every line says what the reason already said.
  const sameMessage =
    item.lines.length > 1 && item.lines.every((line) => line.message === item.lines[0]?.message);
  const body = (
    <>
      {lead ? null : <p className="text-sm/6 text-pretty text-muted">{item.reason}</p>}
      {item.lines.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {item.lines.map((line, index) => (
            <LineCard
              key={index}
              line={line}
              resumeId={resumeId}
              showMessage={!sameMessage}
            />
          ))}
        </ul>
      ) : item.target ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => openTarget(resumeId, item.target)}
          className="-ml-3 self-start"
        >
          {targetLabel(item.target)}
          <ArrowRight />
        </Button>
      ) : null}
      {item.more > 0 ? (
        <p className="text-sm/6 text-subtle">
          And {item.more} more. Fix lines shows each one with a tip.
        </p>
      ) : null}
    </>
  );
  return (
    <Disclosure marker={marker} say={say} title={item.title} reason={lead ? item.reason : undefined}>
      {opens ? body : null}
    </Disclosure>
  );
}

function LineCard({
  line,
  resumeId,
  showMessage,
}: {
  line: ReviewLine;
  resumeId: string;
  showMessage: boolean;
}) {
  const place = line.place.trim();
  return (
    <li className="flex flex-col gap-1 rounded-xl bg-surface-muted pt-3 pr-2 pb-2 pl-4">
      {line.target.kind === "entry" ? (
        <p className="pr-2 text-sm/6 font-medium text-pretty text-ink">{line.text}</p>
      ) : (
        <q title={line.text} className="line-clamp-3 pr-2 text-sm/6 text-pretty text-ink">
          {line.text}
        </q>
      )}
      {showMessage ? <p className="pr-2 text-sm/6 text-pretty text-muted">{line.message}</p> : null}
      <div className="flex items-center gap-3">
        {place && place !== line.text ? (
          <p className="min-w-0 flex-1 text-xs/5 text-subtle">{place}</p>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => openTarget(resumeId, line.target)}
          className="ml-auto"
        >
          {targetLabel(line.target)}
          <ArrowRight />
        </Button>
      </div>
    </li>
  );
}

type DisclosureProps = {
  marker: ReactNode;
  title: string;
  say?: string;
  reason?: string;
  children: ReactNode;
};

function Disclosure({ marker, title, say, reason, children }: DisclosureProps) {
  const head = (
    <>
      <span className="flex size-6 shrink-0 items-center justify-center">{marker}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm/6 font-medium text-pretty text-ink">
          {say ? <span className="sr-only">{say}</span> : null}
          {title}
        </span>
        {reason ? <span className="text-sm/6 text-pretty text-muted">{reason}</span> : null}
      </span>
    </>
  );
  if (children === null) {
    return <li className="flex items-start gap-3 py-3">{head}</li>;
  }
  return (
    <li>
      <details className="group/row">
        <summary className="-mx-2 flex min-h-12 cursor-pointer list-none items-start gap-3 rounded-xl px-2 py-3 transition-colors duration-150 ease-out hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
          {head}
          <ChevronDown
            aria-hidden
            className="mt-1 size-4 shrink-0 text-muted transition-transform duration-150 ease-out group-open/row:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div className="flex flex-col gap-3 pb-4 sm:pl-9">{children}</div>
      </details>
    </li>
  );
}
