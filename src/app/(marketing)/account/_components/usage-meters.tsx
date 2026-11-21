"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { nearestLimit } from "@/components/account/near-limit";
import type { Me } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
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
import { budgetReachedText } from "@/lib/ai-budget-copy";
import { resetDay } from "@/lib/usage-copy";
import { cn } from "@/lib/utils";

const count = new Intl.NumberFormat("en-US");

const MAIN: readonly Feature[] = ["tailor", "letter", "fix"];
const REST: readonly Feature[] = FEATURES.filter((feature) => !MAIN.includes(feature));

export const METER_LABELS: Record<Feature, string> = {
  tailor: "Tailored versions",
  letter: "Letters, answers and prep",
  fix: "Line fixes",
  import: "AI resume reads",
  draft: "Build with Otto drafts",
  github: "GitHub project drafts",
};

export function usageWindow(period: UsagePeriod | null): string {
  const day = resetDay(period);
  if (period?.kind === "trial") return day ? `This trial · ends ${day}` : "This trial";
  return day ? `This month · resets ${day}` : "This month";
}

function allUsed(period: UsagePeriod | null): string {
  const day = resetDay(period);
  if (!day) return "All used for now.";
  return period?.kind === "trial" ? `All used. More once the trial ends on ${day}.` : `All used. More on ${day}.`;
}

const usedText = (usage: Usage) =>
  `${count.format(usage.used)} of ${count.format(usage.limit)} used`;

function Meter({ feature, usage, period }: { feature: Feature; usage: Usage; period: UsagePeriod | null }) {
  const label = METER_LABELS[feature];
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-sm font-medium text-ink">{label}</p>
      <p aria-hidden className="flex items-baseline gap-1.5">
        <span className="font-display text-3xl/9 text-ink lining-nums tabular-nums">
          {count.format(usage.used)}
        </span>
        <span className="text-sm text-muted tabular-nums">of {count.format(usage.limit)}</span>
      </p>
      <Progress
        hideLabel
        size="sm"
        label={label}
        value={usage.used}
        max={usage.limit}
        valueText={usedText(usage)}
      />
      {usage.used >= usage.limit ? <p className="text-xs/5 text-muted">{allUsed(period)}</p> : null}
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
  const [all, setAll] = useState(false);
  const { usage, period, aiBudget } = me;
  const free = plan === "free";
  const main: readonly Feature[] = free ? ["fix"] : MAIN;
  const near = nearestLimit(usage, free ? main : FEATURES);
  const next = nextPlan(plan);
  const budgetUsed = !free && aiBudget != null && aiBudget.limit > 0 && aiBudget.used >= aiBudget.limit;

  return (
    <Card id="usage" role="region" aria-labelledby="usage-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <CardTitle as="h2" id="usage-title">
          Usage
        </CardTitle>
        <p className="text-sm text-subtle">{usageWindow(period)}</p>
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
          message={OTTO.limit.near(near.feature, near.used, near.limit, period)}
        >
          {next && onUpgrade ? (
            <Button variant="link" onClick={onUpgrade} className="text-sm">
              Upgrade to {PLANS[next].name}
            </Button>
          ) : null}
        </OttoNote>
      ) : null}
      {budgetUsed ? <p className="text-sm/6 text-muted">{budgetReachedText(period)}</p> : null}
      {free ? (
        <p className="text-sm/6 text-muted">
          Tailoring, letters, AI resume reads and portfolios come with {PLANS.pro.name}.
        </p>
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
            {all ? "Hide other limits" : "Show all limits"}
            <ChevronDown className={cn("transition-transform", all && "rotate-180")} />
          </Button>
          {all ? (
            <div id="usage-rest" className="flex flex-col gap-4">
              {REST.map((feature) => (
                <Progress
                  key={feature}
                  size="sm"
                  label={METER_LABELS[feature]}
                  value={usage[feature].used}
                  max={usage[feature].limit}
                  valueText={usedText(usage[feature])}
                />
              ))}
              <p className="text-sm/6 text-muted">
                Uploads past the AI reads still work, read by the basic reader.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
