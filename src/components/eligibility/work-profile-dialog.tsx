"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { WorkProfile } from "@/lib/eligibility/profile";
import { WorkProfileForm } from "./work-profile-form";

export type WorkProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  profile: WorkProfile;
  saved: boolean;
};

// The Account page's form, opened from a job post so the check updates without leaving the studio.
// Answers save as they change; Done only closes it.
export function WorkProfileDialog({
  open,
  onOpenChange,
  userId,
  profile,
  saved,
}: WorkProfileDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Work profile"
      description="Where you live, your hours and your visa needs. Only you can see it."
    >
      <WorkProfileForm
        key={userId}
        userId={userId}
        initial={profile}
        saved={saved}
        footer={<Button onClick={() => onOpenChange(false)}>Done</Button>}
      />
    </Dialog>
  );
}
