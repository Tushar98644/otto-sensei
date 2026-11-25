"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { nearestLimit } from "@/components/account/near-limit";
import type { Me } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { useOtto } from "@/components/mascot/use-otto";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FEATURES,
  nextPlan,
  PLANS,
  type Feature,
  type PlanId,
  type Usage,
  type UsagePeriod,
} from "@/config/plans";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { shortDay } from "./plan-copy";

type UsageWords = Messages["account"]["usage"];

const MAIN: readonly Feature[] = ["tailor", "letter", "fix"];
const REST: readonly Feature[] = FEATURES.filter((feature) => !MAIN.includes(feature));

// As lib/usage-copy's resetDay, in the reader's language.
function resetDay(format: Format, period: UsagePeriod | null): string | null {
  return period ? shortDay(format, period.resetsAt) : null;
}

export function usageWindow(words: UsageWords, format: Format, period: UsagePeriod | null): string {
  const day = resetDay(format, period);
  if (period?.kind === "trial") return day ? fmt(words.trialEnds, { day }) : words.trial;
  return day ? fmt(words.monthResets, { day }) : words.month;
}

function allUsed(words: UsageWords, format: Format, period: UsagePeriod | null): string {
  const day = resetDay(format, period);
  if (!day) return words.allUsed;
  return fmt(period?.kind === "trial" ? words.allUsedTrial : words.allUsedOn, { day });
}

const usedText = (words: UsageWords, format: Format, usage: Usage) =>
  fmt(words.used, { used: format.number(usage.used), limit: format.number(usage.limit) });

function Meter({
  feature,
  usage,
  period,
}: {
  feature: Feature;
  usage: Usage;
  period: UsagePeriod | null;
}) {
  const words = useMessages("account").usage;
  const format = useFormat();
  const label = words.meters[feature];
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-sm font-medium text-ink">{label}</p>
      <p aria-hidden className="flex items-baseline gap-1.5">
        <span className="font-display text-3xl/9 text-ink lining-nums tabular-nums">
          {format.number(usage.used)}
        </span>
        <span className="text-sm text-muted tabular-nums">
          {fmt(words.of, { limit: format.number(usage.limit) })}
        </span>
      </p>
      <Progress
        hideLabel
        size="sm"
        label={label}
        value={usage.used}
        max={usage.limit}
        valueText={usedText(words, format, usage)}
      />
      {usage.used >= usage.limit ? (
        <p className="text-xs/5 text-muted">{allUsed(words, format, period)}</p>
      ) : null}
    </div>
  );
}

export function UsageMeters({
  me,
  plan,
  onUpgrade,
}: {
  me: Me;
  plan: PlanId;
  onUpgrade?: () => void;
}) {
  const account = useMessages("account");
  const words = account.usage;
  const format = useFormat();
  const otto = useOtto();
  const [all, setAll] = useState(false);
  const { usage, period, aiBudget } = me;
  const free = plan === "free";
  const main: readonly Feature[] = free ? ["fix"] : MAIN;
  const near = nearestLimit(usage, free ? main : FEATURES);
  const next = nextPlan(plan);
  const budgetUsed =
    !free && aiBudget != null && aiBudget.limit > 0 && aiBudget.used >= aiBudget.limit;

  return (
    <Card id="usage" role="region" aria-labelledby="usage-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <CardTitle as="h2" id="usage-title">
          {words.title}
        </CardTitle>
        <p className="text-sm text-subtle">{usageWindow(words, format, period)}</p>
      </div>
      {usage ? (
        <div className={cn("grid gap-6", free ? "sm:max-w-xs" : "sm:grid-cols-3")}>
          {main.map((feature) => (
            <Meter key={feature} feature={feature} usage={usage[feature]} period={period} />
          ))}
        </div>
      ) : (
        <div aria-hidden className={cn("grid gap-6", free ? "sm:max-w-xs" : "sm:grid-cols-3")}>
          {main.map((feature) => (
            <Skeleton key={feature} className="h-24 w-full" />
          ))}
        </div>
      )}
      {near ? (
        <OttoNote
          size="sm"
          live={false}
          message={otto.limit.near(near.feature, near.used, near.limit, period)}
        >
          {next && onUpgrade ? (
            <Button variant="link" onClick={onUpgrade} className="text-sm">
              {fmt(account.plan.upgradeTo, { plan: PLANS[next].name })}
            </Button>
          ) : null}
        </OttoNote>
      ) : null}
      {budgetUsed ? <p className="text-sm/6 text-muted">{otto.budget(period)}</p> : null}
      {free ? (
        <p className="text-sm/6 text-muted">{fmt(words.proOnly, { pro: PLANS.pro.name })}</p>
      ) : usage ? (
        <div className="flex flex-col gap-4">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={all}
            aria-controls="usage-rest"
            onClick={() => setAll((open) => !open)}
            className="-ml-3 self-start"
          >
            {all ? words.hideRest : words.showRest}
            <ChevronDown className={cn("transition-transform", all && "rotate-180")} />
          </Button>
          {all ? (
            <div id="usage-rest" className="flex flex-col gap-4">
              {REST.map((feature) => (
                <Progress
                  key={feature}
                  size="sm"
                  label={words.meters[feature]}
                  value={usage[feature].used}
                  max={usage[feature].limit}
                  valueText={usedText(words, format, usage[feature])}
                />
              ))}
              <p className="text-sm/6 text-muted">{words.basicReader}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
