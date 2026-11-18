"use client";

import { useMemo } from "react";
import { useTryProLabel } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { MatchResult } from "@/components/match-check/match-result";
import { Button } from "@/components/ui/button";
import { matchCheck } from "@/lib/match-check/check";
import type { Resume } from "@/lib/resume/schema";

// `onSignIn`: for a signed-out visitor, who may already have Pro.
export type FreeMatchProps = { source: Resume; jobText: string; onSignIn?: () => void };

export function FreeMatch({ source, jobText, onSignIn }: FreeMatchProps) {
  const check = useMemo(() => matchCheck(source, jobText), [source, jobText]);
  const tryPro = useTryProLabel();
  return (
    <MatchResult
      check={check}
      footer={
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-muted p-4 sm:p-6">
          <p className="text-base/6 font-semibold text-ink">Tailoring on Pro goes further</p>
          <p className="max-w-prose text-sm/6 text-muted">
            Otto reads the post for meaning, not only words. He puts your best lines for this job
            first, writes a summary for it and helps you add lines for what&apos;s missing, from
            facts you give him. It all goes in a tailored copy, so your original stays the same.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button onClick={() => openFeaturePrompt("tailor")}>{tryPro}</Button>
            {onSignIn ? (
              <p className="text-sm text-muted">
                Already on Pro?{" "}
                <Button variant="link" onClick={onSignIn}>
                  Sign in
                </Button>
              </p>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
