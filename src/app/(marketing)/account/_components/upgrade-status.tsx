import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SUPPORT_MAILTO } from "@/components/account/copy";
import { OTTO } from "@/components/mascot/lines";
import { ROUTES } from "@/components/site/routes";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { PLANS, type PlanId } from "@/config/plans";
import { trialEndDay } from "@/lib/usage-copy";
import { planArrived, type UpgradeWatch } from "./use-upgrade-watch";

export function UpgradeStatus({
  plan,
  trialEndsAt,
  target,
  watch,
  next = null,
}: {
  plan: PlanId;
  trialEndsAt?: number | null;
  target: PlanId | null;
  watch: UpgradeWatch;
  next?: string | null;
}) {
  if (planArrived(plan, target)) {
    const onward = (
      <Link href={next ?? ROUTES.dashboard} className={buttonClasses()}>
        {next ? "Pick up where you left off" : "Go to your dashboard"}
        <ArrowRight />
      </Link>
    );
    return (
      <Alert variant="success" action={onward}>
        {plan !== "free" && trialEndsAt
          ? OTTO.upgrade.trialStarted(trialEndDay(trialEndsAt))
          : OTTO.upgrade.done(PLANS[plan].name)}
      </Alert>
    );
  }

  if (watch.state === "gave-up") {
    return (
      <Alert
        variant="warn"
        title={`Still showing ${PLANS[plan].name}?`}
        action={
          <Button variant="secondary" onClick={watch.retry}>
            Check again
          </Button>
        }
      >
        {plan === "free"
          ? "Payments can take a few minutes to reach us. Check again soon, or email "
          : `Payments can take a few minutes to reach us, so check again soon. If your card was declined, you stay on ${PLANS[plan].name}: update your card below and try again, or email `}
        <a href={SUPPORT_MAILTO} className="font-medium break-all underline underline-offset-4">
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
