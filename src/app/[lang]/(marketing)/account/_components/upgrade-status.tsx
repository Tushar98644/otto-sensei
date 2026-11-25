import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SUPPORT_MAILTO } from "@/components/account/copy";
import { OTTO } from "@/components/mascot/lines";
import { ROUTES } from "@/components/site/routes";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { PLANS, type PlanId } from "@/config/plans";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { rich } from "@/i18n/rich";
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
  const words = useMessages("account").status;
  if (planArrived(plan, target)) {
    const onward = (
      <Link href={next ?? ROUTES.dashboard} className={buttonClasses()}>
        {next ? words.pickUp : words.dashboard}
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
        title={fmt(words.stillShowing, { plan: PLANS[plan].name })}
        action={
          <Button variant="secondary" onClick={watch.retry}>
            {words.checkAgain}
          </Button>
        }
      >
        {rich(
          plan === "free" ? words.slowFree : words.slowPaid,
          {
            link: (chunk) => (
              <a
                href={SUPPORT_MAILTO}
                className="font-medium break-all underline underline-offset-4"
              >
                {chunk}
              </a>
            ),
          },
          { plan: PLANS[plan].name, email: BRAND.supportEmail },
        )}
      </Alert>
    );
  }

  return <Alert title={words.finishing}>{words.finishingDetail}</Alert>;
}
