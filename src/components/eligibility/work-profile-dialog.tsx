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
      title="Where you can work"
      description="Where you live, your time zone and your visa needs. Only you can see this."
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
