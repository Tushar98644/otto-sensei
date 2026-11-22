"use client";

import type { Me } from "@/components/account/use-me";
import { ExtensionCard } from "@/components/extension/extension-card";
import { InviteCard } from "@/components/referrals/invite-card";
import type { SessionUser } from "@/lib/auth/types";
import { DeleteAccountCard } from "./delete-account-card";
import { ProfileCard } from "./profile-card";
import { YourDataCard } from "./your-data-card";

export function ProfileTab({ me, user }: { me: Me; user: SessionUser }) {
  // A held subscription can still charge once the card is fixed, so deleting cancels it too.
  const billed = user.plan !== "free" || me.billing.paymentIssue === true;
  return (
    <div className="flex flex-col gap-4">
      <ProfileCard user={user} authMode={me.auth.mode} />
      <ExtensionCard />
      <InviteCard plan={user.plan} />
      <YourDataCard />
      <DeleteAccountCard isPro={billed} />
    </div>
  );
}
