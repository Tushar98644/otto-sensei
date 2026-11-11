"use client";

import { useId } from "react";
import { useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { OTTO } from "@/components/mascot/lines";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkProfile } from "./use-work-profile";
import { WorkProfileForm } from "./work-profile-form";

export function WorkProfileCard() {
  const work = useWorkProfile();
  const titleId = useId();
  const locked = useProTools() === false;
  const tryPro = useTryProLabel();
  if (work.status === "unknown" || work.status === "signed_out") return null;

  return (
    <Card id="work-profile" aria-labelledby={titleId} role="region" className="scroll-mt-24">
      <CardHeader>
        <CardTitle as="h2" id={titleId}>
          Where you can work
        </CardTitle>
        <CardDescription>
          Where you live, your time zone and your visa needs. Jobs flags posts that say they
          can&apos;t hire you, and can hide them. Only you can see this.
        </CardDescription>
      </CardHeader>
      {locked ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm/6 text-muted">{OTTO.limit.tool("eligibility", false)}</p>
          <Button variant="secondary" onClick={() => openUpgradePrompt("eligibility")}>
            {tryPro}
          </Button>
        </div>
      ) : work.status === "loading" ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : work.status === "error" ? (
        <Alert
          variant="error"
          title="Couldn't load your work profile"
          action={
            <Button variant="secondary" onClick={work.retry}>
              Try again
            </Button>
          }
        >
          Check your connection, then try again.
        </Alert>
      ) : (
        <WorkProfileForm
          key={work.userId}
          userId={work.userId}
          initial={work.profile}
          saved={work.updatedAt !== null}
        />
      )}
    </Card>
  );
}
