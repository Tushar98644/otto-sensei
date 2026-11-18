"use client";

import { Trash } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function DeleteAccountCard({ isPro }: { isPro: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm/6 text-muted">
        {isPro ? "This also cancels your plan. " : null}
        Download any resume you want to keep first.
      </p>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        className="w-full text-fail-ink hover:bg-fail-soft sm:w-auto"
      >
        <Trash />
        Delete account
      </Button>
      <DeleteAccountDialog open={open} onOpenChange={setOpen} isPro={isPro} />
    </Card>
  );
}
