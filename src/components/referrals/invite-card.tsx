"use client";

import { Check, Copy, Share } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { errorMessage } from "@/components/account/errors";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BRAND } from "@/config/brand";
import { PLANS, type PlanId } from "@/config/plans";
import { api } from "@/lib/api/client";
import { REFERRAL_BONUS, type ReferralSummary } from "@/lib/referrals/referrals";
import { useCopyLink } from "./use-copy-link";

const SHARE_TEXT = `I use ${BRAND.name} to see what hiring software reads in my resume. Sign up with my link and check yours, and we both get ${REFERRAL_BONUS.fix} more line fixes.`;

export function extrasNote(plan: PlanId, period: ReferralSummary["period"]): string {
  if (plan === "free") {
    return `On Free, each friend adds ${REFERRAL_BONUS.fix} line fixes to that month's ${PLANS.free.limits.fix}. Tailoring comes with Pro, so the ${REFERRAL_BONUS.tailor} tailored versions wait: start a trial or upgrade that month and every extra you haven't used moves with you.`;
  }
  if (period === "trial") {
    return "Extras add to your trial's limits, and the ones you haven't used carry into your first paid month.";
  }
  return `Extras add to your ${PLANS[plan].name} limits.`;
}

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: ReferralSummary };

const noSubscription = () => () => undefined;
const canShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function InviteCard({ plan }: { plan: PlanId }) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const fetchSummary = useCallback(() => {
    api
      .referrals()
      .then(({ referrals }) => setLoad({ status: "ready", summary: referrals }))
      .catch((error: unknown) => setLoad({ status: "error", message: errorMessage(error) }));
  }, []);
  useEffect(fetchSummary, [fetchSummary]);

  return (
    <Card id="invite" role="region" aria-labelledby="invite-title">
      <CardHeader>
        <CardTitle as="h2" id="invite-title">
          Invite friends
        </CardTitle>
        <CardDescription>
          When a friend signs up with your link and checks a resume, you each get{" "}
          {REFERRAL_BONUS.fix} more line fixes and {REFERRAL_BONUS.tailor} more tailored versions
          that month.
        </CardDescription>
      </CardHeader>
      {load.status === "loading" ? (
        <div aria-hidden className="flex flex-col gap-3">
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-5 w-2/3 rounded-md" />
        </div>
      ) : load.status === "error" ? (
        <Alert
          variant="error"
          title="Couldn't load your invite link"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setLoad({ status: "loading" });
                fetchSummary();
              }}
            >
              Try again
            </Button>
          }
        >
          {load.message}
        </Alert>
      ) : (
        <InviteDetails summary={load.summary} plan={plan} />
      )}
    </Card>
  );
}

function InviteDetails({ summary, plan }: { summary: ReferralSummary; plan: PlanId }) {
  const shareable = useSyncExternalStore(noSubscription, canShare, () => false);
  const { url, joined, checked, rewarded, maxRewarded, thisPeriod: extras, period } = summary;
  const { copied, copy } = useCopyLink(url, "Select it and copy it yourself.");
  const full = rewarded >= maxRewarded;

  async function share() {
    try {
      await navigator.share({ title: BRAND.name, text: SHARE_TEXT, url });
    } catch {
      // Closing the share sheet rejects too, and that's not a failure worth a message.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          readOnly
          value={url}
          aria-label="Your invite link"
          onFocus={(event) => event.currentTarget.select()}
          className="bg-surface-muted sm:flex-1"
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void copy()} className="flex-1 sm:flex-none">
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          {shareable ? (
            <Button onClick={() => void share()} className="flex-1 sm:flex-none">
              <Share />
              Share
            </Button>
          ) : null}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? "Invite link copied." : ""}
      </p>

      <Progress
        size="sm"
        label="Friends who earned you extras"
        value={rewarded}
        max={maxRewarded}
        valueText={`${rewarded} of ${maxRewarded}`}
      />
      <p className="text-sm/6 text-muted">
        {joined === 0
          ? "Nobody has joined with your link yet."
          : `${plural(joined, "friend", "friends")} joined, ${checked} checked a resume.`}{" "}
        {full
          ? `That's the ${maxRewarded} friends that earn you extras. New friends still get theirs.`
          : `Extras for up to ${maxRewarded} friends.`}
      </p>
      {extras.fix > 0 || extras.tailor > 0 ? (
        <p className="text-sm/6 text-ink">
          {period === "trial" ? "During your trial" : "This month"}{" "}
          you have {extras.fix} more line fixes and {extras.tailor} more tailored versions from
          invites.
        </p>
      ) : null}
      <p className="text-sm/6 text-muted">{extrasNote(plan, period)}</p>
    </div>
  );
}
