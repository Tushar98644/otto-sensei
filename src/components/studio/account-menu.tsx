"use client";

import {
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  LogOut,
  MessageSquare,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSignedOutNote } from "@/components/account/use-sign-in-words";
import { refreshMe, useMe } from "@/components/account/use-me";
import {
  openCommandPalette,
  useCommandPaletteAvailable,
} from "@/components/dashboard/command-palette-store";
import { LazyFeedbackDialog } from "@/components/feedback/lazy-feedback-dialog";
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
import { useMessagesOr } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import englishAccountMenu from "@/i18n/messages/en/account-menu";
import type { SessionUser } from "@/lib/auth/types";
import { signOutAndRelease } from "@/lib/sync/use-cloud-sync";
import { Popover, usePopover } from "./popover";

const ITEM =
  "flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium text-ink transition-colors -outline-offset-2 hover:bg-ink/5 disabled:opacity-60 pointer-coarse:h-11";

export type AccountMenuProps = {
  onSignIn: () => void;
};

// The dashboard's phone bar renders this menu too, and reads English until it passes accountMenu.
function useAccountMenuCopy() {
  return useMessagesOr("accountMenu", englishAccountMenu);
}

export function AccountMenu({ onSignIn }: AccountMenuProps) {
  const { user, loading } = useMe();
  // Lives outside the popover, which unmounts its content when it closes.
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const t = useAccountMenuCopy();

  if (!user) {
    if (loading) return <Skeleton className="h-11 w-24 shrink-0 rounded-lg" />;
    return (
      <Button variant="secondary" onClick={onSignIn} className="shrink-0">
        <LogIn />
        {t.signIn}
      </Button>
    );
  }

  return (
    <>
      <Popover
        label={t.label}
        align="end"
        triggerLabel={fmt(t.trigger, { email: user.email })}
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
      <LazyFeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}

function AccountPanel({ user, onFeedback }: { user: SessionUser; onFeedback: () => void }) {
  const { close } = usePopover();
  const [signingOut, setSigningOut] = useState(false);
  const searchable = useCommandPaletteAvailable();
  const plan = PLANS[user.plan];
  const t = useAccountMenuCopy();
  const signedOutNote = useSignedOutNote();

  async function signOut() {
    setSigningOut(true);
    try {
      const { kept } = await signOutAndRelease(user.id);
      await refreshMe();
      close();
      toast({ title: t.signedOut, description: signedOutNote(kept), variant: "success" });
    } catch {
      toast({ title: t.signOutFailed, description: t.signOutFailedNote, variant: "error" });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col gap-2 px-3 pt-2 pb-3">
        <p className="text-xs text-muted">{t.signedInAs}</p>
        <p className="truncate text-sm font-medium text-ink">{user.email}</p>
        <Badge variant={user.plan === "free" ? "neutral" : "ink"}>
          {fmt(t.plan, { plan: plan.name })}
        </Badge>
      </div>
      <Separator />
      {searchable ? (
        <button
          type="button"
          className={ITEM}
          onClick={() => {
            close();
            openCommandPalette();
          }}
        >
          <Search className="size-4 text-muted" aria-hidden />
          {t.search}
        </button>
      ) : null}
      <Link href={ROUTES.dashboard} className={ITEM} onClick={close}>
        <LayoutDashboard className="size-4 text-muted" aria-hidden />
        {t.dashboard}
      </Link>
      <Link href={ROUTES.dashboardAccount} className={ITEM} onClick={close}>
        <UserRound className="size-4 text-muted" aria-hidden />
        {t.account}
      </Link>
      <Link href={accountSectionHref("work")} className={ITEM} onClick={close}>
        <SlidersHorizontal className="size-4 text-muted" aria-hidden />
        {t.work}
      </Link>
      <a href={`mailto:${BRAND.supportEmail}`} className={ITEM} onClick={close}>
        <LifeBuoy className="size-4 text-muted" aria-hidden />
        {fmt(t.help, { email: BRAND.supportEmail })}
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
        {t.feedback}
      </button>
      <button type="button" className={ITEM} onClick={signOut} disabled={signingOut}>
        {signingOut ? (
          <Spinner className="text-muted" />
        ) : (
          <LogOut className="size-4 text-muted" aria-hidden />
        )}
        {signingOut ? t.signingOut : t.signOut}
      </button>
    </div>
  );
}
