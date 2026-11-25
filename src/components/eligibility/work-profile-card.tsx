"use client";

import { useId } from "react";
import { useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { useOtto } from "@/components/mascot/use-otto";
import { SECTION_SCROLL } from "@/components/settings/sections";
import { ACCOUNT_SECTIONS } from "@/components/setup/links";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessages } from "@/i18n/client";
import { useWorkProfile } from "./use-work-profile";
import { WorkProfileForm } from "./work-profile-form";

export function WorkProfileCard() {
  const account = useMessages("account");
  const words = account.work;
  const work = useWorkProfile();
  const titleId = useId();
  const locked = useProTools() === false;
  const tryPro = useTryProLabel();
  const otto = useOtto();
  if (work.status === "unknown" || work.status === "signed_out") return null;

  return (
    <Card
      id={ACCOUNT_SECTIONS.work}
      aria-labelledby={titleId}
      role="region"
      className={SECTION_SCROLL}
    >
      <CardHeader>
        <CardTitle as="h3" id={titleId}>
          {words.title}
        </CardTitle>
        <CardDescription>{words.intro}</CardDescription>
      </CardHeader>
      {locked ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm/6 text-muted">{otto.limit.tool("eligibility", false)}</p>
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
          title={words.loadFailed}
          action={
            <Button variant="secondary" onClick={work.retry}>
              {account.tryAgain}
            </Button>
          }
        >
          {account.checkConnection}
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
