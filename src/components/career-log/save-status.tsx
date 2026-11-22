"use client";

import { Check, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { SaveState } from "./use-entry-draft";

export function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  return (
    <p role="status" className="flex min-h-9 items-center gap-2 text-sm text-muted">
      {state === "saving" ? (
        <>
          <Spinner className="size-3.5" />
          Saving
        </>
      ) : state === "saved" ? (
        <>
          <Check aria-hidden className="size-4 text-pass" />
          Saved
        </>
      ) : state === "error" ? (
        <>
          <CloudOff aria-hidden className="size-4 text-fail" />
          Not saved yet.
          <Button variant="link" size="sm" onClick={onRetry} className="px-0">
            Try again
          </Button>
        </>
      ) : (
        "Saves as you type. Nothing is required."
      )}
    </p>
  );
}
