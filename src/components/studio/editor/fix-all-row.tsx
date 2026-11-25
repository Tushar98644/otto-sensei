"use client";

import { TriangleExclamationPoint } from "lucide-react";
import { useId, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StatusPill } from "@/components/ui/status";
import { BRAND } from "@/config/brand";
import { TEXT_LIMITS } from "@/config/plans";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { asksForFacts, canAccept, lineGood, proposedText, type FixAllItem } from "./fix-all";
import { DraftField, QuestionsForm } from "./fix-dialog-parts";
import { hasPlaceholders, splitPlaceholders } from "./fix-text";
import type { FixAll } from "./use-fix-all";

type Actions = Pick<FixAll, "retry" | "refine" | "setAnswer" | "setDraft" | "reject" | "accept">;
type RowCopy = Messages["studioEditor"]["all"]["row"];

// The pressed row's keys go away, so hand focus to the next line still waiting on a decision.
function focusNextRow(event: MouseEvent<HTMLElement>) {
  const row = event.currentTarget.closest("li");
  const rows = Array.from(row?.parentElement?.children ?? []);
  const at = row ? rows.indexOf(row) : -1;
  for (const next of [...rows.slice(at + 1), ...rows.slice(0, Math.max(at, 0))]) {
    const key = next.querySelector<HTMLElement>("[data-fix-accept]:not(:disabled)");
    if (key) {
      key.focus();
      return;
    }
  }
}

export function FixAllRow({ item, actions }: { item: FixAllItem; actions: Actions }) {
  const baseId = useId();
  const yoursId = `${baseId}-yours`;
  const draftId = `${baseId}-draft`;
  const { bulletId, result, draft, decision } = item;
  const open = item.status === "ready" && decision === "open" && !lineGood(item);
  const asking = asksForFacts(item);
  const t = useMessages("studioEditor").all.row;

  return (
    <li className="flex flex-col gap-3 py-4">
      {item.place ? <p className="text-xs/5 text-subtle">{item.place}</p> : null}
      <dl className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm/6">
        <dt className="text-subtle">{t.yours}</dt>
        <dd id={yoursId} className="text-pretty text-muted">
          {item.text}
        </dd>
        <dt className="text-subtle">{BRAND.mascotName}</dt>
        <dd className="text-pretty text-ink">
          <Proposal item={item} t={t} />
        </dd>
      </dl>
      {open && draft !== null ? (
        <DraftField
          id={draftId}
          value={draft}
          onChange={(value) => actions.setDraft(bulletId, value)}
          onSubmit={() => actions.accept(bulletId)}
        />
      ) : null}
      {asking && result ? (
        <QuestionsForm
          idPrefix={baseId}
          questions={result.questions}
          answers={item.answers}
          refining={item.refining}
          onAnswer={(index, value) => actions.setAnswer(bulletId, index, value)}
          onSubmit={() => void actions.refine(bulletId)}
        />
      ) : null}
      <RowActions
        item={item}
        open={open}
        describedBy={yoursId}
        draftId={draftId}
        actions={actions}
        t={t}
      />
    </li>
  );
}

function Proposal({ item, t }: { item: FixAllItem; t: RowCopy }) {
  switch (item.status) {
    case "waiting":
      return <span className="text-subtle">{t.waiting}</span>;
    case "working":
      return (
        <span className="inline-flex items-center gap-2 text-muted">
          <Spinner />
          {t.working}
        </span>
      );
    case "stopped":
      return <span className="text-subtle">{t.stopped}</span>;
    case "too-long":
    case "failed":
      return (
        <span className="inline-flex items-start gap-1.5 text-muted">
          <TriangleExclamationPoint aria-hidden className="mt-1 size-4 shrink-0 text-warn" />
          {item.status === "too-long" ? fmt(t.tooLong, { count: TEXT_LIMITS.bulletChars }) : (item.message ?? t.failed)}
        </span>
      );
    case "ready": {
      if (lineGood(item)) return <span className="text-muted">{t.good}</span>;
      const text = item.draft ?? item.result?.suggestion ?? "";
      return splitPlaceholders(text).map((part, index) =>
        part.placeholder ? (
          <mark key={index} className="rounded-sm bg-warn-soft px-1 font-medium text-warn-ink">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      );
    }
  }
}

function RowActions({
  item,
  open,
  describedBy,
  draftId,
  actions,
  t,
}: {
  item: FixAllItem;
  open: boolean;
  describedBy: string;
  draftId: string;
  actions: Actions;
  t: RowCopy;
}) {
  const { bulletId, decision } = item;
  if (item.status === "failed") {
    return (
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          aria-describedby={describedBy}
          onClick={() => void actions.retry(bulletId)}
        >
          {t.tryAgain}
        </Button>
      </div>
    );
  }
  if (item.status !== "ready") return null;
  if (lineGood(item) || decision === "accepted") {
    return (
      <div className="flex justify-end">
        <StatusPill status="pass">
          {decision === "accepted" ? t.accepted : t.works}
        </StatusPill>
      </div>
    );
  }
  if (decision === "rejected") {
    return (
      <div className="flex items-center justify-end gap-2">
        <p className="text-sm text-muted">{t.kept}</p>
        <Button
          variant="ghost"
          size="sm"
          aria-describedby={describedBy}
          onClick={() => actions.reject(bulletId, false)}
        >
          {t.undo}
        </Button>
      </div>
    );
  }
  if (!open) return null;
  const blanks = hasPlaceholders(proposedText(item));
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {blanks ? (
        <p className="mr-auto text-sm text-muted">{t.blanks}</p>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        aria-describedby={describedBy}
        onClick={(event) => {
          focusNextRow(event);
          actions.reject(bulletId, true);
        }}
      >
        {t.reject}
      </Button>
      {item.draft === null ? (
        <Button
          variant="ghost"
          size="sm"
          aria-describedby={describedBy}
          onClick={() => {
            flushSync(() => actions.setDraft(bulletId, item.result?.suggestion ?? ""));
            document.getElementById(draftId)?.focus();
          }}
        >
          {t.edit}
        </Button>
      ) : null}
      <Button
        variant="secondary"
        size="sm"
        aria-describedby={describedBy}
        onClick={(event) => {
          focusNextRow(event);
          actions.accept(bulletId);
        }}
        disabled={!canAccept(item)}
        data-fix-accept=""
      >
        {t.accept}
      </Button>
    </div>
  );
}
