"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FeedbackDialog } from "./feedback-dialog";

// Styled like a sidebar nav row, for the dashboard sidebar's footer.
export function FeedbackButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:bg-ink/5 hover:text-ink",
          className,
        )}
      >
        <MessageSquare className="size-4" aria-hidden />
        Send feedback
      </button>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
