"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { signedOutNote } from "@/components/account/copy";
import { errorMessage } from "@/components/account/errors";
import { patchMe, refreshMe } from "@/components/account/use-me";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import type { AuthMode, SessionUser } from "@/lib/auth/types";
import { signOutAndRelease } from "@/lib/sync/use-cloud-sync";

export function signInMethod(words: Messages["account"]["profile"], mode: AuthMode): string {
  return mode === "supabase" ? words.google : words.code;
}

export function ProfileCard({ user, authMode }: { user: SessionUser; authMode: AuthMode }) {
  const words = useMessages("account").profile;
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const signedOut = await signOutAndRelease(user.id).catch((error: unknown) => {
      setSigningOut(false);
      toast({ title: words.signOutFailed, description: errorMessage(error), variant: "error" });
      return null;
    });
    if (!signedOut) return;
    patchMe({ user: null, usage: null, period: null });
    toast({ title: words.signedOut, description: signedOutNote(signedOut.kept) });
    void refreshMe();
  }

  return (
    <Card id="profile" role="region" aria-labelledby="profile-title">
      <CardTitle as="h2" id="profile-title">
        {words.title}
      </CardTitle>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium break-all text-ink">{user.email}</p>
          <p className="text-sm/6 text-muted">{signInMethod(words, authMode)}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void signOut()}
          loading={signingOut}
          className="w-full sm:w-auto"
        >
          <LogOut />
          {words.signOut}
        </Button>
      </div>
    </Card>
  );
}
