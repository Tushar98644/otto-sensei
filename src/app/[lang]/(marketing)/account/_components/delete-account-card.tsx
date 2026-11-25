"use client";

import { Trash } from "lucide-react";
import { useState } from "react";
import { SECTION_SCROLL } from "@/components/settings/sections";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function DeleteAccountCard({ isPro }: { isPro: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <section
      id="delete-account"
      aria-labelledby="delete-account-title"
      tabIndex={-1}
      className={cn(
        "flex flex-col gap-3 px-1 pt-2 outline-none sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        SECTION_SCROLL,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="delete-account-title" className="font-sans text-sm/6 font-medium text-fail-ink">
          Delete account
        </h2>
        <p className="max-w-prose text-sm/6 text-muted">
          Deletes your account and everything saved with it. You can&apos;t undo it.{" "}
          {isPro ? "This also cancels your plan. " : null}
          Download your data first if you want to keep it.
        </p>
      </div>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        className="w-full text-fail-ink hover:bg-fail-soft sm:w-auto"
      >
        <Trash />
        Delete account
      </Button>
      <DeleteAccountDialog open={open} onOpenChange={setOpen} isPro={isPro} />
    </section>
  );
}
