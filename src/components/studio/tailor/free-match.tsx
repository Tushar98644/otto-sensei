"use client";

import { useMemo } from "react";
import { useTryProLabel } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { MatchResult } from "@/components/match-check/match-result";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { matchCheck } from "@/lib/match-check/check";
import type { Resume } from "@/lib/resume/schema";

// `onSignIn`: for a signed-out visitor, who may already have Pro.
export type FreeMatchProps = { source: Resume; jobText: string; onSignIn?: () => void };

export function FreeMatch({ source, jobText, onSignIn }: FreeMatchProps) {
  const check = useMemo(() => matchCheck(source, jobText), [source, jobText]);
  const tryPro = useTryProLabel();
  const t = useMessages("studioTailor").free;
  return (
    <MatchResult
      check={check}
      footer={
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-muted p-4 sm:p-6">
          <p className="text-base/6 font-semibold text-ink">{t.title}</p>
          <p className="max-w-prose text-sm/6 text-muted">{t.note}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button onClick={() => openFeaturePrompt("tailor")}>{tryPro}</Button>
            {onSignIn ? (
              <p className="text-sm text-muted">
                {t.already}{" "}
                <Button variant="link" onClick={onSignIn}>
                  {t.signIn}
                </Button>
              </p>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
