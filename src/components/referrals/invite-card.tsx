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
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { api } from "@/lib/api/client";
import { REFERRAL_BONUS, type ReferralSummary } from "@/lib/referrals/referrals";
import { useCopyLink } from "./use-copy-link";

type InviteWords = Messages["account"]["invite"];

export function extrasNote(
  words: InviteWords,
  plan: PlanId,
  period: ReferralSummary["period"],
): string {
  if (plan === "free") {
    return fmt(words.free, {
      fix: REFERRAL_BONUS.fix,
      limit: PLANS.free.limits.fix,
      tailor: REFERRAL_BONUS.tailor,
    });
  }
  if (period === "trial") return words.trial;
  return fmt(words.paid, { plan: PLANS[plan].name });
}

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: ReferralSummary };

const noSubscription = () => () => undefined;
const canShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

export function InviteCard({ plan }: { plan: PlanId }) {
  const account = useMessages("account");
  const words = account.invite;
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
          {words.title}
        </CardTitle>
        <CardDescription>
          {fmt(words.intro, { fix: REFERRAL_BONUS.fix, tailor: REFERRAL_BONUS.tailor })}
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
          title={words.loadFailed}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setLoad({ status: "loading" });
                fetchSummary();
              }}
            >
              {account.tryAgain}
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
  const account = useMessages("account");
  const words = account.invite;
  const format = useFormat();
  const shareable = useSyncExternalStore(noSubscription, canShare, () => false);
  const { url, joined, checked, rewarded, maxRewarded, thisPeriod: extras, period } = summary;
  const { copied, copy } = useCopyLink(url, {
    title: words.copyFailed,
    description: words.copyYourself,
  });
  const full = rewarded >= maxRewarded;

  async function share() {
    try {
      const text = fmt(words.shareText, { brand: BRAND.name, fix: REFERRAL_BONUS.fix });
      await navigator.share({ title: BRAND.name, text, url });
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
          aria-label={words.yourLink}
          onFocus={(event) => event.currentTarget.select()}
          className="bg-surface-muted sm:flex-1"
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void copy()} className="flex-1 sm:flex-none">
            {copied ? <Check /> : <Copy />}
            {copied ? account.copied : account.copyLink}
          </Button>
          {shareable ? (
            <Button onClick={() => void share()} className="flex-1 sm:flex-none">
              <Share />
              {words.share}
            </Button>
          ) : null}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? words.linkCopied : ""}
      </p>

      <Progress
        size="sm"
        label={words.progress}
        value={rewarded}
        max={maxRewarded}
        valueText={fmt(words.progressValue, { done: rewarded, total: maxRewarded })}
      />
      <p className="text-sm/6 text-muted">
        {joined === 0 ? words.nobody : format.plural(words.joined, joined, { checked })}{" "}
        {full ? fmt(words.full, { max: maxRewarded }) : fmt(words.upTo, { max: maxRewarded })}
      </p>
      {extras.fix > 0 || extras.tailor > 0 ? (
        <p className="text-sm/6 text-ink">
          {fmt(period === "trial" ? words.extrasTrial : words.extrasMonth, {
            fix: extras.fix,
            tailor: extras.tailor,
          })}
        </p>
      ) : null}
      <p className="text-sm/6 text-muted">{extrasNote(words, plan, period)}</p>
    </div>
  );
}
