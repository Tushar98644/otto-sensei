import { Check } from "lucide-react";
import {
  allowancePeriodFor,
  FEATURE_LABELS,
  FEATURES,
  FREE_APPLICATIONS,
  FREE_JOB_MATCHES,
  PLANS,
  planLimits,
  PRO_TRIAL,
  RESUME_LIMITS,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { perPeriod, PLAN_PROMISES, resetRule } from "@/lib/usage-copy";
import { cn, pluralize } from "@/lib/utils";

const count = new Intl.NumberFormat("en-US");

export type PlanPerksProps = {
  plan: PaidPlanId;
  // The billing option being offered: a weekly one gives weekly limits.
  interval?: BillingInterval;
  // Offered as the free trial: its own allowance first, then the plan's.
  trial?: boolean;
  className?: string;
};

function Perk({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      <Check className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-ink">{title}</p>
        <p className="text-muted">{detail}</p>
      </div>
    </li>
  );
}

// What a paid plan gives each period next to the plan below it, read from PLANS so the copy can't
// drift from the real limits. Free has no AI help, so next to it each line says what Pro adds.
export function PlanPerks({ plan, interval = "month", trial = false, className }: PlanPerksProps) {
  const period = allowancePeriodFor(plan, interval);
  const limits = planLimits(plan, period);
  const belowId = plan === "max" ? "pro" : "free";
  const below = planLimits(belowId, allowancePeriodFor(belowId, interval));
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ul className="flex flex-col gap-3">
        {FEATURES.map((feature) => (
          <Perk
            key={feature}
            title={
              trial
                ? `${count.format(PRO_TRIAL.limits[feature])} ${FEATURE_LABELS[feature]} ${perPeriod("trial")}`
                : `${count.format(limits[feature])} ${FEATURE_LABELS[feature]} ${perPeriod(period)}`
            }
            detail={
              trial
                ? `Then ${count.format(limits[feature])} ${perPeriod(period)} on ${PLANS[plan].name}.`
                : belowId === "free"
                  ? "Not on Free."
                  : `${PLANS[belowId].name} has ${count.format(below[feature])}.`
            }
          />
        ))}
        {/* Max has these too; the lines only say what's new next to the plan below. */}
        {belowId === "free" ? (
          <>
            <Perk
              title={`All ${TEMPLATE_IDS.length} formats, up to ${RESUME_LIMITS.paid} resumes and Word downloads`}
              detail={`Free has ${pluralize(RESUME_LIMITS.free, "resume")}, Classic and Compact, and PDFs.`}
            />
            <Perk
              title="Every job match, every application tracked, share links and the work-rights check"
              detail={`Free has your ${FREE_JOB_MATCHES} closest matches and ${pluralize(FREE_APPLICATIONS, "tracked application")}.`}
            />
            <Perk
              title="A portfolio page from your resume"
              detail={
                trial ? "Build and preview it now. It goes public once Pro starts." : "Not on Free."
              }
            />
          </>
        ) : null}
      </ul>
      <p className="text-xs text-muted">
        {trial
          ? `Nothing is charged for ${PRO_TRIAL.days} days. Cancel before the trial ends and you pay nothing.`
          : resetRule(interval)}{" "}
        {PLAN_PROMISES}
      </p>
    </div>
  );
}
