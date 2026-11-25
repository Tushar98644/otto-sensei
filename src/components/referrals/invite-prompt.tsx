"use client";

import { Check, Copy, X } from "lucide-react";
import { meSnapshot } from "@/components/account/use-me";
import { Button, buttonClasses } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { readItem, writeItem } from "@/lib/browser-storage";
import { REFERRAL_BONUS } from "@/lib/referrals/referrals";
import { useCopyLink } from "./use-copy-link";

const OFFERED_KEY = "otto-invite-offered";
// Stands in for the session flag when storage is blocked, so the offer still comes once a page load.
let offered = false;

export const INVITE_PROMPT_TEXT = `Share your link: when they sign up and check a resume, you both get ${REFERRAL_BONUS.fix} more line fixes, plus ${REFERRAL_BONUS.tailor} tailored versions on Pro or Max.`;

export const INVITE_ANNOUNCEMENT =
  "Invite a friend and you both get extras. The invite is just below the download button.";

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
  return (
    <>
      <p className="sr-only" aria-live="polite">
        {url ? INVITE_ANNOUNCEMENT : ""}
      </p>
      {url ? <InvitePrompt url={url} onDismiss={onDismiss} /> : null}
    </>
  );
}

function InvitePrompt({ url, onDismiss }: { url: string; onDismiss: () => void }) {
  const { copied, copy } = useCopyLink(url, {
    title: "Couldn't copy the link",
    description: "Your invite link is on your account page too.",
  });
  return (
    <section
      aria-label="Invite a friend"
      className="flex items-start gap-3 rounded-2xl bg-surface-muted p-4 text-sm"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-medium text-ink">Know someone job hunting?</p>
        <p className="leading-relaxed text-muted">{INVITE_PROMPT_TEXT}</p>
        <div className="mt-2">
          <Button variant="secondary" size="sm" onClick={() => void copy()}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy invite link"}
          </Button>
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? "Invite link copied." : ""}
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss the invite"
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
