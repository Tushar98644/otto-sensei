"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useMessages } from "@/i18n/client";
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
  const t = useMessages("workProfile").dialog;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t.title}
      description={t.description}
    >
      <WorkProfileForm
        key={userId}
        userId={userId}
        initial={profile}
        saved={saved}
        footer={<Button onClick={() => onOpenChange(false)}>{t.done}</Button>}
      />
    </Dialog>
  );
}
