"use client";

import { Check, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useMessages } from "@/i18n/client";
import type { SaveState } from "./use-entry-draft";

export function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const words = useMessages("careerLog");
  const t = words.save;
  return (
    <p role="status" className="flex min-h-9 items-center gap-2 text-sm text-muted">
      {state === "saving" ? (
        <>
          <Spinner className="size-3.5" />
          {t.saving}
        </>
      ) : state === "saved" ? (
        <>
          <Check aria-hidden className="size-4 text-pass" />
          {t.saved}
        </>
      ) : state === "error" ? (
        <>
          <CloudOff aria-hidden className="size-4 text-fail" />
          {t.notSaved}
          <Button variant="link" size="sm" onClick={onRetry} className="px-0">
            {words.tryAgain}
          </Button>
        </>
      ) : (
        t.idle
      )}
    </p>
  );
}
