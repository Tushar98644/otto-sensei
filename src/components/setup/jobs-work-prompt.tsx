"use client";

import { Globe } from "lucide-react";
import { useState } from "react";
import { LazyWorkProfileDialog } from "@/components/eligibility/lazy-work-profile-dialog";
import { Button } from "@/components/ui/button";
import { REGION_NAMES, type WorkProfile } from "@/lib/eligibility/profile";
import { guessedRegion } from "@/lib/setup/hints";
import { confirmSetupGuess, useSetupGuess } from "./use-account-setup";

export type JobsWorkPromptProps = {
  due: boolean;
  userId: string;
  profile: WorkProfile;
  saved: boolean;
};

export function JobsWorkPrompt({ due, userId, profile, saved }: JobsWorkPromptProps) {
  const [open, setOpen] = useState(false);
  const guess = useSetupGuess();
  const guessed = guessedRegion(guess, profile);
  return (
    <>
      {due ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-surface px-4 py-2 sm:px-6">
          <p className="flex min-w-0 grow basis-72 items-center gap-2 py-1 text-sm/6 text-muted">
            <Globe aria-hidden className="size-4 shrink-0 text-subtle" />
            <span>
              {guessed
                ? `Otto set Yes for ${REGION_NAMES[guessed]} because you seem to live there. Check it, and add any visa needs.`
                : "Add where you can work, and Jobs flags posts that say they can't hire you."}
            </span>
          </p>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            {guessed ? "Check where you can work" : "Add where you can work"}
          </Button>
        </div>
      ) : null}
      <LazyWorkProfileDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) void confirmSetupGuess(userId);
        }}
        userId={userId}
        profile={profile}
        saved={saved}
      />
    </>
  );
}
