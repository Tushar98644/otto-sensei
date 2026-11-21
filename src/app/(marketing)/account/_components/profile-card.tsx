"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { signedOutNote } from "@/components/account/copy";
import { errorMessage } from "@/components/account/errors";
import { PlanBadge } from "@/components/account/plan-badge";
import { patchMe, refreshMe } from "@/components/account/use-me";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { PLANS } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { planPriceLabel } from "@/lib/billing/prices";
import { trialEndDay } from "@/lib/usage-copy";
import { signOutAndRelease } from "@/lib/sync/use-cloud-sync";

export function ProfileCard({
  user,
  cancelScheduled = false,
}: {
  user: SessionUser;
  cancelScheduled?: boolean;
}) {
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const signedOut = await signOutAndRelease(user.id).catch((error: unknown) => {
      setSigningOut(false);
      toast({ title: "Couldn't sign you out", description: errorMessage(error), variant: "error" });
      return null;
    });
    if (!signedOut) return;
    patchMe({ user: null, usage: null, period: null });
    toast({ title: "You're signed out.", description: signedOutNote(signedOut.kept) });
    void refreshMe();
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <p className="text-sm text-muted">Signed in as</p>
          <p className="font-medium break-all text-ink">{user.email}</p>
          <PlanBadge plan={user.plan} />
          {user.plan !== "free" && user.trialEndsAt ? (
            <p className="text-sm text-muted">
              {PLANS[user.plan].name} trial until {trialEndDay(user.trialEndsAt)}.{" "}
              {cancelScheduled
                ? "It's set to end then, and you won't be charged again."
                : `Then ${planPriceLabel(user.plan, user.planInterval ?? "month")}, unless you cancel before.`}
            </p>
          ) : null}
        </div>
        <Button
          variant="secondary"
          onClick={() => void signOut()}
          loading={signingOut}
          className="w-full sm:w-auto"
        >
          <LogOut />
          Sign out
        </Button>
      </div>
    </Card>
  );
}
