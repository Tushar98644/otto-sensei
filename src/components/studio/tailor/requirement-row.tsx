"use client";

import {
  ArrowUpRight,
  Check,
  Circle,
  CircleCheck,
  CircleMinus,
  TriangleExclamationPoint,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RowReason } from "@/lib/tailor/reasons";
import type { RequirementRow, RequirementStatus } from "@/lib/tailor/requirements";
import { cn } from "@/lib/utils";
import { AddLineForm } from "./add-line-form";
import type { AddedLine, LineTarget, RequirementChoice } from "./apply";
import type { Writing } from "./use-writing";

const STATUS: Record<RequirementStatus, { label: string; chip: ReactNode }> = {
  proven: {
    label: "Proven",
    chip: (
      <Badge variant="pass">
        <CircleCheck className="text-pass" aria-hidden />
        Proven
      </Badge>
    ),
  },
  listed: {
    label: "Listed but not shown",
    chip: (
      <Badge variant="warn">
        <TriangleExclamationPoint className="text-warn" aria-hidden />
        Listed, not shown
      </Badge>
    ),
  },
  missing: {
    label: "Not shown",
    chip: (
      <Badge variant="neutral">
        <Circle aria-hidden />
        Not shown
      </Badge>
    ),
  },
  declined: {
    label: "You said no",
    chip: (
      <Badge variant="neutral">
        <CircleMinus aria-hidden />
        You said no
      </Badge>
    ),
  },
};

// The row's element id, so "Fix these first" can bring it into view.
export const requirementDomId = (rowId: string) => `tailor-requirement-${rowId}`;

export type RequirementRowProps = {
  row: RequirementRow;
  reason: RowReason | undefined;
  choice: RequirementChoice | undefined;
  // Ids of every line the person added: they exist only in the coming copy, so there's no line in
  // the editor to jump to.
  addedIds: ReadonlySet<string>;
  // The add-line form is open on this row.
  open: boolean;
  targets: LineTarget[];
  writing: Writing;
  onOpen: (open: boolean) => void;
  onChoice: (choice: RequirementChoice | null) => void;
  onJump: (bulletId: string) => void;
};

type ProofProps = {
  row: RequirementRow;
  addedIds: ReadonlySet<string>;
  // Set when this row's own added line is the proof, so it can be taken back here.
  onRemove: (() => void) | null;
  onJump: (bulletId: string) => void;
};

function Proof({ row, addedIds, onRemove, onJump }: ProofProps) {
  const { line, via } = row.proof;
  if (!line) return null;
  const added = via === "added" || (line.bulletId !== null && addedIds.has(line.bulletId));
  return (
    <div className="flex flex-col gap-1.5">
      <q className="text-sm/6 text-ink">{line.text}</q>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-xs/5 text-subtle">
          {added ? "Your new line, for the tailored copy" : line.place}
          {via === "quote" ? " · matched by Otto" : null}
        </p>
        {added && onRemove ? (
          <Button size="sm" variant="ghost" onClick={onRemove} className="-ml-2 text-muted">
            <X />
            Remove line
          </Button>
        ) : !added && line.bulletId ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onJump(line.bulletId ?? "")}
            className="-ml-2 text-muted"
          >
            Show line
            <ArrowUpRight />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// One requirement, the way an AI screener grades it: proven by a real line, only listed, not
// shown, or something the person said they don't have. Nothing is ever added without a "yes".
// A line the person added that still doesn't prove the requirement: it names no search term.
type UnprovenLineProps = { text: string; name: string; onRemove: () => void };

function UnprovenLine({ text, name, onRemove }: UnprovenLineProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <q className="text-sm/6 text-ink">{text}</q>
      <p className="text-sm text-muted">
        This line goes into the tailored copy, but it doesn&apos;t name {name}, so a screener
        won&apos;t count it.
      </p>
      <Button size="sm" variant="ghost" onClick={onRemove} className="-ml-2 self-start text-muted">
        <X />
        Remove line
      </Button>
    </div>
  );
}

// Why the row has its status, in this resume's terms. A warning gets the icon, never color alone.
function ReasonLine({ reason }: { reason: RowReason | undefined }) {
  if (!reason?.text) return null;
  const warn = reason.tone === "warn";
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-sm/6 text-pretty",
        warn ? "text-ink" : "text-muted",
      )}
    >
      {warn ? (
        <TriangleExclamationPoint aria-hidden className="mt-1 size-4 shrink-0 text-warn" />
      ) : null}
      <span>{reason.text}</span>
    </p>
  );
}

export function RequirementRowItem({
  row,
  reason,
  choice,
  addedIds,
  open,
  targets,
  writing,
  onOpen,
  onChoice,
  onJump,
}: RequirementRowProps) {
  const status = STATUS[row.status];
  const pending = choice?.kind === "line" && row.status !== "proven" ? choice.line : null;
  const add = (line: AddedLine) => {
    onChoice({ kind: "line", line });
    onOpen(false);
  };
  const form = open ? (
    <AddLineForm
      requirement={row}
      targets={targets}
      writing={writing}
      onAdd={add}
      onCancel={() => onOpen(false)}
    />
  ) : null;

  return (
    <li
      id={requirementDomId(row.id)}
      tabIndex={-1}
      className="flex scroll-mt-24 flex-col gap-3 py-4 outline-offset-4"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm/6 font-medium text-ink">
          {row.text}
          <span className="sr-only">: {status.label}</span>
        </p>
        <span aria-hidden className="mt-px shrink-0">
          {status.chip}
        </span>
      </div>

      {row.status === "proven" ? (
        <>
          <Proof
            row={row}
            addedIds={addedIds}
            onRemove={choice?.kind === "line" ? () => onChoice(null) : null}
            onJump={onJump}
          />
          <ReasonLine reason={reason} />
        </>
      ) : null}

      {pending ? (
        <UnprovenLine
          text={pending.text}
          name={row.terms[0] ?? row.text}
          onRemove={() => onChoice(null)}
        />
      ) : null}

      {row.status === "listed" && !pending ? (
        <div className="flex flex-col gap-2">
          <ReasonLine reason={reason} />
          {open ? (
            form
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpen(true)}
              className="self-start"
            >
              Show where you used it
            </Button>
          )}
        </div>
      ) : null}

      {row.status === "missing" && !pending ? (
        <div className="flex flex-col gap-3">
          <ReasonLine reason={reason} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-ink">{row.ask}</p>
            {open ? null : (
              <div role="group" aria-label={row.ask} className="flex shrink-0 gap-2">
                <Button size="sm" variant="secondary" onClick={() => onOpen(true)}>
                  <Check />
                  Yes
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onChoice({ kind: "no" })}>
                  <X />
                  No
                </Button>
              </div>
            )}
          </div>
          {form}
        </div>
      ) : null}

      {row.status === "declined" ? (
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          It stays off your resume.
          <Button size="sm" variant="link" onClick={() => onChoice(null)} className="h-auto px-0">
            Change answer
          </Button>
        </p>
      ) : null}
    </li>
  );
}
