"use client";

import {
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  LogOut,
  MessageSquare,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { signedOutNote } from "@/components/account/copy";
import { refreshMe, useMe } from "@/components/account/use-me";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { accountSectionHref } from "@/components/setup/links";
import { ROUTES } from "@/components/site/routes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { BRAND } from "@/config/brand";
import { PLANS } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { signOutAndRelease } from "@/lib/sync/use-cloud-sync";
import { Popover, usePopover } from "./popover";

const ITEM =
  "flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium text-ink transition-colors -outline-offset-2 hover:bg-ink/5 disabled:opacity-60 pointer-coarse:h-11";

export type AccountMenuProps = {
  onSignIn: () => void;
};

export function AccountMenu({ onSignIn }: AccountMenuProps) {
  const { user, loading } = useMe();
  // Lives outside the popover, which unmounts its content when it closes.
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (!user) {
    // Holds the space while /api/me loads, so a signed-in user never sees "Sign in" flash.
    if (loading) return <Skeleton className="h-11 w-24 shrink-0 rounded-lg" />;
    return (
      <Button variant="outline" onClick={onSignIn} className="shrink-0">
        <LogIn />
        Sign in
      </Button>
    );
  }

  return (
    <>
      <Popover
        label="Account"
        align="end"
        triggerLabel={`Account menu for ${user.email}`}
        triggerClassName="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-ink/6 aria-expanded:bg-ink/6"
        trigger={
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-white uppercase"
          >
            {user.email.trim().charAt(0) || <UserRound className="size-4" />}
          </span>
        }
        className="w-72"
      >
        <AccountPanel user={user} onFeedback={() => setFeedbackOpen(true)} />
      </Popover>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}

function AccountPanel({ user, onFeedback }: { user: SessionUser; onFeedback: () => void }) {
  const { close } = usePopover();
  const [signingOut, setSigningOut] = useState(false);
  const plan = PLANS[user.plan];

  async function signOut() {
    setSigningOut(true);
    try {
      // Backs up recent edits first, and leaves nothing of the account behind for the next person
      // on a shared computer.
      const { kept } = await signOutAndRelease(user.id);
      await refreshMe();
      close();
      toast({ title: "You're signed out", description: signedOutNote(kept), variant: "success" });
    } catch {
      toast({
        title: "Couldn't sign you out",
        description: "Check your connection and try again.",
        variant: "error",
      });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col gap-2 px-3 pt-2 pb-3">
        <p className="text-xs text-muted">Signed in as</p>
        <p className="truncate text-sm font-medium text-ink">{user.email}</p>
        <Badge variant={user.plan === "free" ? "neutral" : "ink"}>{plan.name} plan</Badge>
      </div>
      <Separator />
      <Link href={ROUTES.dashboard} className={ITEM} onClick={close}>
        <LayoutDashboard className="size-4 text-muted" aria-hidden />
        Dashboard
      </Link>
      <Link href={ROUTES.dashboardAccount} className={ITEM} onClick={close}>
        <UserRound className="size-4 text-muted" aria-hidden />
        Account and plan
      </Link>
      <Link href={accountSectionHref("work")} className={ITEM} onClick={close}>
        <SlidersHorizontal className="size-4 text-muted" aria-hidden />
        Work rights & preferences
      </Link>
      <a href={`mailto:${BRAND.supportEmail}`} className={ITEM} onClick={close}>
        <LifeBuoy className="size-4 text-muted" aria-hidden />
        Help: {BRAND.supportEmail}
      </a>
      <button
        type="button"
        className={ITEM}
        onClick={() => {
          close();
          onFeedback();
        }}
      >
        <MessageSquare className="size-4 text-muted" aria-hidden />
        Send feedback
      </button>
      <button type="button" className={ITEM} onClick={signOut} disabled={signingOut}>
        {signingOut ? (
          <Spinner className="text-muted" />
        ) : (
          <LogOut className="size-4 text-muted" aria-hidden />
        )}
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
