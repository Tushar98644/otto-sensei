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

function captureInvite(): boolean {
  const url = new URL(window.location.href);
  const code = url.searchParams.get(REF_PARAM);
  if (code === null) return false;
  url.searchParams.delete(REF_PARAM);
  // Keeps Next's own history state; drops the code so a bookmark doesn't carry it on.
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  if (!isReferralCode(code) || parseRefCookie(readCookie())) return false;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${REF_COOKIE}=${formatRefCookie({ code, stage: "landed" })}; Max-Age=${REF_COOKIE_MAX_AGE_S}; Path=/; SameSite=Lax${secure}`;
  return true;
}

const EXTRAS = `${REFERRAL_BONUS.fix} more line fixes, plus ${REFERRAL_BONUS.tailor} tailored versions on Pro or Max`;

function announce(outcome: ReferralClaimOutcome) {
  if (outcome === "rewarded") {
    toast({
      title: "You and your friend got extras",
      description: `You each get ${EXTRAS}.`,
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
  if (!cookie || cookie.stage === "joined") return null;
  return <ClaimWhenSignedIn />;
}

function ClaimWhenSignedIn() {
  const { user } = useMe();
  const sent = useRef(false);
  useEffect(() => {
    if (!user || sent.current) return;
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
