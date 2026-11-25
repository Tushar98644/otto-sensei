"use client";

import { Check, Copy, X } from "lucide-react";
import { meSnapshot } from "@/components/account/use-me";
import { Button, buttonClasses } from "@/components/ui/button";
import { useMessagesOr } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import EN_SHARE_LINKS from "@/i18n/messages/en/share-links";
import { api } from "@/lib/api/client";
import { readItem, writeItem } from "@/lib/browser-storage";
import { REFERRAL_BONUS } from "@/lib/referrals/referrals";
import { useCopyLink } from "./use-copy-link";

const OFFERED_KEY = "otto-invite-offered";
// Stands in for the session flag when storage is blocked, so the offer still comes once a page load.
let offered = false;

type InviteWords = (typeof EN_SHARE_LINKS)["invite"];

const inviteText = (t: InviteWords) =>
  fmt(t.text, { fix: REFERRAL_BONUS.fix, tailor: REFERRAL_BONUS.tailor });

export const INVITE_PROMPT_TEXT = inviteText(EN_SHARE_LINKS.invite);

export const INVITE_ANNOUNCEMENT = EN_SHARE_LINKS.invite.announcement;

function useInviteWords(): InviteWords {
  return useMessagesOr("shareLinks", EN_SHARE_LINKS).invite;
}

// Once a session, signed in only, and only while the inviter still earns extras; never throws.
export async function inviteToOffer(): Promise<string | null> {
  if (!meSnapshot().me?.user || offered || readItem(OFFERED_KEY, "session")) return null;
  offered = true;
  writeItem(OFFERED_KEY, "1", "session");
  try {
    const { referrals } = await api.referrals();
    return referrals.rewarded < referrals.maxRewarded ? referrals.url : null;
  } catch {
    return null;
  }
}

// The live region is always there, so its one line is read out; the prompt itself sits outside it.
export function InviteOffer({ url, onDismiss }: { url: string | null; onDismiss: () => void }) {
  const t = useInviteWords();
  return (
    <>
      <p className="sr-only" aria-live="polite">
        {url ? t.announcement : ""}
      </p>
      {url ? <InvitePrompt url={url} onDismiss={onDismiss} /> : null}
    </>
  );
}

function InvitePrompt({ url, onDismiss }: { url: string; onDismiss: () => void }) {
  const t = useInviteWords();
  const { copied, copy } = useCopyLink(url, {
    title: t.copyFailed,
    description: t.copyFailedNote,
  });
  return (
    <section
      aria-label={t.label}
      className="flex items-start gap-3 rounded-2xl bg-surface-muted p-4 text-sm"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-medium text-ink">{t.heading}</p>
        <p className="leading-relaxed text-muted">{inviteText(t)}</p>
        <div className="mt-2">
          <Button variant="secondary" size="sm" onClick={() => void copy()}>
            {copied ? <Check /> : <Copy />}
            {copied ? t.copied : t.copy}
          </Button>
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? t.announced : ""}
        </p>
      </div>
      <button
        type="button"
        aria-label={t.dismiss}
        onClick={onDismiss}
        className={buttonClasses({
          variant: "ghost",
          size: "icon-sm",
          className: "-mt-1.5 -mr-1.5 text-subtle hover:text-ink",
        })}
      >
        <X />
      </button>
    </section>
  );
}
