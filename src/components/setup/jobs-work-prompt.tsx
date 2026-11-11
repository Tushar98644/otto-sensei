"use client";

import { Globe } from "lucide-react";
import { useState } from "react";
import { WorkProfileDialog } from "@/components/eligibility/work-profile-dialog";
import { Button } from "@/components/ui/button";
import type { WorkProfile } from "@/lib/eligibility/profile";

export type JobsWorkPromptProps = {
  // The line shows while this is true; the dialog stays up once opened, even after the answers
  // it saves make the line go away.
  due: boolean;
  userId: string;
  profile: WorkProfile;
  saved: boolean;
};

// The Account questions open right here, so the list updates in place. Never a pop-up.
export function JobsWorkPrompt({ due, userId, profile, saved }: JobsWorkPromptProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {due ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-surface px-4 py-2 sm:px-6">
          <p className="flex min-w-0 grow basis-72 items-center gap-2 py-1 text-sm/6 text-muted">
            <Globe aria-hidden className="size-4 shrink-0 text-subtle" />
            <span>
              Add where you can work, and Jobs flags posts that say they can&apos;t hire you.
            </span>
          </p>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            Add where you can work
          </Button>
        </div>
      ) : null}
      <WorkProfileDialog
        open={open}
        onOpenChange={setOpen}
        userId={userId}
        profile={profile}
        saved={saved}
      />
    </>
  );
}
