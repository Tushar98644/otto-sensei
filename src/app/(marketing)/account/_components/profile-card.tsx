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
import type { SessionUser } from "@/lib/auth/types";
import { planPriceLabel } from "@/lib/billing/prices";
import { trialEndDay } from "@/lib/usage-copy";
import { signOutAndRelease } from "@/lib/sync/use-cloud-sync";

export function ProfileCard({ user }: { user: SessionUser }) {
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    // Also takes the account's backed-up resumes out of this browser, for shared computers.
    const signedOut = await signOutAndRelease(user.id).catch((error: unknown) => {
      setSigningOut(false);
      toast({ title: "Couldn't sign you out", description: errorMessage(error), variant: "error" });
      return null;
    });
    if (!signedOut) return;
    // The cookie is gone, so show that now; the page swaps to the sign-in form and this card unmounts.
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
              Free trial until {trialEndDay(user.trialEndsAt)}. Then{" "}
              {planPriceLabel(user.plan, user.planInterval ?? "month")}, unless you cancel before.
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
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
