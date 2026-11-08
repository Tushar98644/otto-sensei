import Link from "next/link";
import { nearestLimit } from "@/components/account/near-limit";
import { upgradeInterval } from "@/components/account/upgrade-interval";
import type { Me } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { upgradeHref } from "@/components/site/routes";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FEATURE_LABELS,
  FEATURES,
  nextPlan,
  PLANS,
  type Feature,
  type PlanId,
  type Usage,
  type UsagePeriod,
} from "@/config/plans";
import { resetDay, thisPeriod } from "@/lib/usage-copy";

const count = new Intl.NumberFormat("en-US");

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Every metered feature as used / limit, on every plan: the limits are real, so they're shown.
export function UsageCard({ me, plan }: { me: Me; plan: PlanId }) {
  const { usage, period } = me;
  const near = nearestLimit(usage, FEATURES);
  const next = nextPlan(plan);
  const weekly = period?.kind === "week";
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{sentenceCase(thisPeriod(period))}</CardTitle>
        <CardDescription>
          {weekly
            ? `Your ${PLANS[plan].name} weekly allowance resets on ${resetDay(period)}.`
            : `Your ${PLANS[plan].name} allowance resets on the 1st of each month.`}{" "}
          Uploads past the AI reads still work, read by the basic reader.
        </CardDescription>
      </CardHeader>
      {near ? (
        <OttoNote
          size="sm"
          live={false}
          message={OTTO.limit.near(near.feature, near.used, near.limit, period)}
        >
          {next ? (
            <Link
              href={upgradeHref(next, upgradeInterval(me, next))}
              className="text-sm font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
            >
              Upgrade to {PLANS[next].name}
            </Link>
          ) : null}
        </OttoNote>
      ) : null}
      {usage ? (
        <div className="flex flex-col gap-5">
          {FEATURES.map((feature) => {
            // A server from before a feature existed sends no count for it.
            const entry: Usage | undefined = usage[feature];
            return entry ? (
              <UsageRow key={feature} feature={feature} usage={entry} period={period} />
            ) : null;
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {FEATURES.map((feature) => (
            <Skeleton key={feature} className="h-8 w-full" />
          ))}
        </div>
      )}
    </Card>
  );
}

function UsageRow({
  feature,
  usage,
  period,
}: {
  feature: Feature;
  usage: Usage;
  period: UsagePeriod | null;
}) {
  const label = sentenceCase(FEATURE_LABELS[feature]);
  const day = resetDay(period);
  return (
    <div className="flex flex-col gap-1.5">
      <Progress
        label={label}
        value={usage.used}
        max={usage.limit}
        valueText={`${count.format(usage.used)} of ${count.format(usage.limit)} used`}
      />
      {usage.used >= usage.limit ? (
        <p className="text-sm text-muted">
          {feature === "import"
            ? `All used. Uploads still work, read by the basic reader until ${day}.`
            : `All used. They reset on ${day}.`}
        </p>
      ) : null}
    </div>
  );
}
