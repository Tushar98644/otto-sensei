"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { refreshMe, useMe } from "@/components/account/use-me";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import {
  REF_COOKIE,
  REF_COOKIE_MAX_AGE_S,
  REF_PARAM,
  REFERRAL_BONUS,
  formatRefCookie,
  isReferralCode,
  parseRefCookie,
  type ReferralClaimOutcome,
} from "@/lib/referrals/referrals";

// Mounted once in the root layout. Costs nothing for anyone without an invite.

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function cookieChanged() {
  for (const listener of listeners) listener();
}

function readCookie(): string | null {
  const prefix = `${REF_COOKIE}=`;
  const part = document.cookie.split("; ").find((entry) => entry.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : null;
}

// The first invite link someone opens is the one that counts.
function captureInvite(): boolean {
  const url = new URL(window.location.href);
  const code = url.searchParams.get(REF_PARAM);
  if (code === null) return false;
  url.searchParams.delete(REF_PARAM);
  // A bookmark or a shared address shouldn't carry the code on. Next's own history state is kept.
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  if (!isReferralCode(code) || parseRefCookie(readCookie())) return false;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${REF_COOKIE}=${formatRefCookie({ code, stage: "landed" })}; Max-Age=${REF_COOKIE_MAX_AGE_S}; Path=/; SameSite=Lax${secure}`;
  return true;
}

// "Current" rather than "this month": an inviter on a weekly plan gets theirs for this week.
const EXTRAS = `${REFERRAL_BONUS.fix} more line fixes and ${REFERRAL_BONUS.tailor} more tailored versions on top of your current limits`;

function announce(outcome: ReferralClaimOutcome) {
  if (outcome === "rewarded") {
    toast({
      title: "You and your friend got extras",
      description: `${EXTRAS}, for each of you.`,
      variant: "success",
    });
  } else if (outcome === "pending") {
    toast({
      title: "You joined through an invite",
      description: `Check a resume, and you both get ${EXTRAS}.`,
    });
  }
}

export function ReferralTracker() {
  const raw = useSyncExternalStore(subscribe, readCookie, () => null);
  useEffect(() => {
    if (captureInvite()) cookieChanged();
  }, []);
  const cookie = parseRefCookie(raw);
  // "joined" waits for a resume check, which the server settles on its own.
  if (!cookie || cookie.stage === "joined") return null;
  return <ClaimWhenSignedIn />;
}

function ClaimWhenSignedIn() {
  const { user } = useMe();
  const sent = useRef(false);
  useEffect(() => {
    if (!user || sent.current) return;
    // Once per page load: a failure is tried again on the next one, never in a loop.
    sent.current = true;
    api
      .claimReferral()
      .then(({ outcome }) => {
        announce(outcome);
        if (outcome === "rewarded") void refreshMe();
      })
      .catch(() => undefined)
      .finally(cookieChanged);
  }, [user]);
  return null;
}
