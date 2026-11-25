"use client";

import type { ReactNode } from "react";
import { useMe } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PLANS, type PlanId, type UsagePeriod } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { countText } from "../count";
import { thisPeriodIn } from "../usage";
import { countItems, type FixAllCounts } from "./fix-all";
import { FixAllRow } from "./fix-all-row";
import { problemMessage, type FixWords } from "./fix-text";
import { useFixWords } from "./fix-words";
import type { FixAll, FixAllStop } from "./use-fix-all";

export type FixAllDialogProps = { all: FixAll };

type Account = {
  limit: number;
  signedIn: boolean;
  period: UsagePeriod | null;
  plan: PlanId | null;
};

function ottoLine(
  words: FixWords,
  stop: FixAllStop | null,
  counts: FixAllCounts,
  account: Account,
): string {
  const { otto } = words.t;
  if (stop && stop.kind !== "user") {
    return problemMessage(words, stop, account.limit, account.signedIn, account.period, account.plan);
  }
  if (counts.running > 0) return otto.allWorking;
  if (stop) return otto.allStopped;
  if (counts.questions > 0) return otto.allAsking;
  return counts.acceptable > 0 ? otto.allReview : otto.allDone;
}

function ottoMeta({ t, format }: FixWords, counts: FixAllCounts): string {
  const parts = [countText(format, t.counts.lines, counts.total)];
  if (counts.running > 0) parts.push(fmt(t.all.done, { count: counts.finished }));
  if (counts.questions > 0) parts.push(countText(format, t.counts.questions, counts.questions));
  return parts.join(" · ");
}

export function FixAllDialog({ all }: FixAllDialogProps) {
  const { state } = all;
  const { me, user } = useMe();
  const counts = countItems(state.items);
  const working = counts.running > 0;
  const period = me?.period ?? null;
  const account: Account = {
    limit: me?.usage?.fix.limit ?? PLANS.free.limits.fix,
    signedIn: user !== null,
    period,
    plan: user?.plan ?? null,
  };
  const canResume = !working && counts.stopped > 0 && state.stop?.kind !== "limit";
  const words = useFixWords();
  const { format } = words;
  const t = words.t.all;

  let footer: ReactNode;
  if (counts.acceptable > 0) {
    footer = (
      <>
        <Button variant="ghost" onClick={working ? all.stop : all.close}>
          {working ? t.stop : t.close}
        </Button>
        <Button onClick={all.acceptAll}>
          {counts.acceptable > 1 ? fmt(t.acceptAll, { count: counts.acceptable }) : t.acceptOne}
        </Button>
      </>
    );
  } else if (working) {
    footer = (
      <Button variant="ghost" onClick={all.stop}>
        {t.stop}
      </Button>
    );
  } else {
    footer = <Button onClick={all.close}>{t.finish}</Button>;
  }

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) all.close();
      }}
      title={countText(format, t.title, counts.total)}
      size="lg"
      illustration={
        <OttoNote
          size="sm"
          meta={ottoMeta(words, counts)}
          message={ottoLine(words, state.stop, counts, account)}
        >
          {canResume ? (
            <Button variant="secondary" size="sm" onClick={all.fixRest}>
              {countText(format, t.fixRest, counts.stopped)}
            </Button>
          ) : null}
        </OttoNote>
      }
      footer={footer}
    >
      {state.open ? (
        <div aria-busy={working || undefined} className="flex flex-col gap-4">
          {working ? (
            <Progress
              value={counts.finished}
              max={counts.total}
              label={t.progress}
              hideLabel
              size="sm"
            />
          ) : null}
          {state.capped > 0 ? (
            <Alert variant="info">
              {fmt(t.capped, {
                fixes: countText(format, t.fixesLeft, counts.taken),
                period: thisPeriodIn(words.usage, period),
                lines: countText(format, t.firstLines, counts.taken),
                rest: countText(format, t.restLines, state.capped),
              })}
            </Alert>
          ) : null}
          <ol role="list" className="flex flex-col divide-y divide-border">
            {state.items.map((item) => (
              <FixAllRow key={item.bulletId} item={item} actions={all} />
            ))}
          </ol>
        </div>
      ) : null}
    </Dialog>
  );
}
