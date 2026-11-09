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
import { toast } from "@/components/ui/toast";
import { BRAND } from "@/config/brand";
import { PLANS, type PlanId } from "@/config/plans";
import { api } from "@/lib/api/client";
import { REFERRAL_BONUS, type ReferralSummary } from "@/lib/referrals/referrals";

const SHARE_TEXT = `I use ${BRAND.name} to see what hiring software reads in my resume. Sign up with my link and we both get extra help.`;
const COPIED_MS = 2_000;

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: ReferralSummary };

const noSubscription = () => () => undefined;
// A browser fact, so the server render (and the first client one) say no.
const canShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// The Account page's invite link: copy or share it, and see what it has earned so far.
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
    <Card>
      <CardHeader>
        <CardTitle as="h2">Invite friends</CardTitle>
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
              variant="outline"
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
  const [copied, setCopied] = useState(false);
  const { url, joined, checked, rewarded, maxRewarded, thisPeriod: extras, period } = summary;
  const full = rewarded >= maxRewarded;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      toast({
        title: "Couldn't copy the link",
        description: "Select it and copy it yourself.",
        variant: "error",
      });
    }
  }

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
          {period === "week" ? "This week" : period === "trial" ? "During your trial" : "This month"}{" "}
          you have {extras.fix} more line fixes and {extras.tailor} more tailored versions from
          invites.
        </p>
      ) : null}
      <p className="text-sm/6 text-muted">
        {plan === "free"
          ? "Extras add to Pro and Max limits, so they count once you're on one."
          : `Extras add to your ${PLANS[plan].name} limits too.`}
      </p>
    </div>
  );
}
