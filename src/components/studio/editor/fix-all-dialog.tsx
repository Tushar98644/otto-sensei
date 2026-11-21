"use client";

import type { ReactNode } from "react";
import { useMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PLANS, type PlanId, type UsagePeriod } from "@/config/plans";
import { thisPeriod } from "@/lib/usage-copy";
import { pluralize } from "@/lib/utils";
import { countItems, type FixAllCounts } from "./fix-all";
import { FixAllRow } from "./fix-all-row";
import { problemMessage } from "./fix-text";
import type { FixAll, FixAllStop } from "./use-fix-all";

export type FixAllDialogProps = { all: FixAll };

type Account = {
  limit: number;
  signedIn: boolean;
  period: UsagePeriod | null;
  plan: PlanId | null;
};

function ottoLine(stop: FixAllStop | null, counts: FixAllCounts, account: Account): string {
  if (stop && stop.kind !== "user") {
    return problemMessage(stop, account.limit, account.signedIn, account.period, account.plan);
  }
  if (counts.running > 0) return OTTO.fix.allWorking;
  if (stop) return OTTO.fix.allStopped;
  if (counts.questions > 0) return OTTO.fix.allAsking;
  return counts.acceptable > 0 ? OTTO.fix.allReview : OTTO.fix.allDone;
}

function ottoMeta(counts: FixAllCounts): string {
  const parts = [pluralize(counts.total, "line")];
  if (counts.running > 0) parts.push(`${counts.finished} done`);
  if (counts.questions > 0) parts.push(pluralize(counts.questions, "question"));
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

  let footer: ReactNode;
  if (counts.acceptable > 0) {
    footer = (
      <>
        <Button variant="ghost" onClick={working ? all.stop : all.close}>
          {working ? "Stop" : "Close"}
        </Button>
        <Button onClick={all.acceptAll}>
          {counts.acceptable > 1 ? `Accept all ${counts.acceptable}` : "Accept the new line"}
        </Button>
      </>
    );
  } else if (working) {
    footer = (
      <Button variant="ghost" onClick={all.stop}>
        Stop
      </Button>
    );
  } else {
    footer = <Button onClick={all.close}>Done</Button>;
  }

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) all.close();
      }}
      title={`Fix ${pluralize(counts.total, "line")} with Otto`}
      size="lg"
      illustration={
        <OttoNote size="sm" meta={ottoMeta(counts)} message={ottoLine(state.stop, counts, account)}>
          {canResume ? (
            <Button variant="secondary" size="sm" onClick={all.fixRest}>
              {`Fix the other ${pluralize(counts.stopped, "line")}`}
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
              label="Lines Otto has rewritten"
              hideLabel
              size="sm"
            />
          ) : null}
          {state.capped > 0 ? (
            <Alert variant="info">
              {`You have ${pluralize(counts.taken, "fix", "fixes")} left ${thisPeriod(period)}, so Otto took the first ${pluralize(counts.taken, "line")}. The other ${pluralize(state.capped, "line")} can wait.`}
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
