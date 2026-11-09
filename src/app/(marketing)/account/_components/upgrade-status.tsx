import { SUPPORT_MAILTO } from "@/components/account/copy";
import { OTTO } from "@/components/mascot/lines";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { PLAN_ORDER, PLANS, type PlanId } from "@/config/plans";
import { trialEndDay } from "@/lib/usage-copy";
import type { UpgradeWatch } from "./use-upgrade-watch";

// After checkout: wait for the new plan to show up, and say what to do if it doesn't. `target` is
// the plan bought; without one, any paid plan counts.
export function UpgradeStatus({
  plan,
  trialEndsAt,
  target,
  watch,
}: {
  plan: PlanId;
  // Set while the new plan is on its free trial.
  trialEndsAt?: number | null;
  target: PlanId | null;
  watch: UpgradeWatch;
}) {
  const arrived = target ? PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(target) : plan !== "free";
  if (arrived && plan !== "free" && trialEndsAt) {
    return <Alert variant="success">{OTTO.upgrade.trialStarted(trialEndDay(trialEndsAt))}</Alert>;
  }
  if (arrived) return <Alert variant="success">{OTTO.upgrade.done(PLANS[plan].name)}</Alert>;

  if (watch.state === "gave-up") {
    return (
      <Alert
        variant="warn"
        title={`Still showing ${PLANS[plan].name}?`}
        action={
          <Button variant="outline" onClick={watch.retry}>
            Check again
          </Button>
        }
      >
        Payments can take a few minutes to reach us. Check again soon, or email{" "}
        <a
          href={SUPPORT_MAILTO}
          className="font-medium break-all underline underline-offset-4"
        >
          {BRAND.supportEmail}
        </a>
        .
      </Alert>
    );
  }

  return (
    <Alert title="Finishing your upgrade">
      Your upgrade can take a minute to appear. This page checks again on its own.
    </Alert>
  );
}
