"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { signedOutNote } from "@/components/account/copy";
import { errorMessage } from "@/components/account/errors";
import { patchMe, refreshMe } from "@/components/account/use-me";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import type { AuthMode, SessionUser } from "@/lib/auth/types";
import { signOutAndRelease } from "@/lib/sync/use-cloud-sync";

export function signInMethod(mode: AuthMode): string {
  return mode === "supabase"
    ? "You sign in with Google or a 6-digit code sent to this email. No password."
    : "You sign in with a 6-digit code sent to this email. No password.";
}

export function ProfileCard({ user, authMode }: { user: SessionUser; authMode: AuthMode }) {
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
    <Card id="profile" role="region" aria-labelledby="profile-title">
      <CardTitle as="h2" id="profile-title">
        Email and sign-in
      </CardTitle>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium break-all text-ink">{user.email}</p>
          <p className="text-sm/6 text-muted">{signInMethod(authMode)}</p>
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
