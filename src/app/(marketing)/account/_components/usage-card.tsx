import Link from "next/link";
import { nearestLimit } from "@/components/account/near-limit";
import { upgradeLink } from "@/components/account/upgrade-interval";
import type { Me } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FEATURE_LABELS,
  FEATURES,
  isTrialing,
  nextPlan,
  PLANS,
  type Feature,
  type PlanId,
  type Usage,
  type UsagePeriod,
} from "@/config/plans";
import { aiBudgetLine } from "@/lib/ai-budget-copy";
import { trialHeadline } from "@/lib/billing/prices";
import { resetDay, resetWhen, thisPeriod, trialEndDay } from "@/lib/usage-copy";

const count = new Intl.NumberFormat("en-US");

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function UsageCard({ me, plan }: { me: Me; plan: PlanId }) {
  const { usage, period, aiBudget } = me;
  if (plan === "free") return <FreeUsageCard me={me} />;
  const near = nearestLimit(usage, FEATURES);
  const next = nextPlan(plan);
  const trialEndsAt = me.user && isTrialing(me.user) ? (me.user.trialEndsAt ?? null) : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">
          {trialEndsAt ? "Your trial" : sentenceCase(thisPeriod(period))}
        </CardTitle>
        <CardDescription>
          {trialEndsAt
            ? me.billing.cancelScheduled
              ? `Your ${PLANS[plan].name} trial ends on ${trialEndDay(trialEndsAt)}, and your account moves to Free then.`
              : `Your ${PLANS[plan].name} trial ends on ${trialEndDay(trialEndsAt)}. Then the full ${PLANS[plan].name} allowance starts, and resets each time your plan renews.`
            : `Your ${PLANS[plan].name} allowance resets ${resetWhen(period)}.`}{" "}
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
              href={upgradeLink(me, next)}
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
            const entry: Usage | undefined = usage[feature];
            return entry ? (
              <UsageRow key={feature} feature={feature} usage={entry} period={period} />
            ) : null;
          })}
          {aiBudget ? <p className="text-sm text-muted">{aiBudgetLine(aiBudget, period)}</p> : null}
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

function FreeUsageCard({ me }: { me: Me }) {
  const fixes = me.usage?.fix;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">Otto&apos;s AI help</CardTitle>
        <CardDescription>
          Free has {PLANS.free.limits.fix} line fixes a month with Otto, plus the basic reader, the
          recruiter view, editing, PDFs, a few job matches and one tracked application. More line
          fixes, tailoring, letters, AI reads and portfolios come with Pro
          {me.billing.trial === true ? `. ${trialHeadline()} below.` : "."}
        </CardDescription>
      </CardHeader>
      {fixes ? (
        <UsageRow feature="fix" usage={fixes} period={me.period} />
      ) : (
        <Skeleton className="h-8 w-full" />
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
  const when = resetWhen(period);
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
          {period?.kind === "trial"
            ? `All used for the trial. More once it ends on ${resetDay(period)}.`
            : feature === "import"
              ? `All used. Uploads still work, read by the basic reader. They reset ${when}.`
              : `All used. They reset ${when}.`}
        </p>
      ) : null}
    </div>
  );
}
