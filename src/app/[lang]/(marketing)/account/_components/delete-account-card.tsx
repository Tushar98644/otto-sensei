"use client";

import { Trash } from "lucide-react";
import { useState } from "react";
import { SECTION_SCROLL } from "@/components/settings/sections";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function DeleteAccountCard({ isPro }: { isPro: boolean }) {
  const words = useMessages("account").deleteAccount;
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
          {words.title}
        </h2>
        <p className="max-w-prose text-sm/6 text-muted">
          {words.intro} {isPro ? `${words.alsoCancels} ` : null}
          {words.downloadFirst}
        </p>
      </div>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        className="w-full text-fail-ink hover:bg-fail-soft sm:w-auto"
      >
        <Trash />
        {words.title}
      </Button>
      <DeleteAccountDialog open={open} onOpenChange={setOpen} isPro={isPro} />
    </section>
  );
}
