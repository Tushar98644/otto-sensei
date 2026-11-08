"use client";

import { useId } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkProfile } from "./use-work-profile";
import { WorkProfileForm } from "./work-profile-form";

// The Account page's work profile. Signed-out visitors see nothing here: the account view above
// already asks them to sign in.
export function WorkProfileCard() {
  const work = useWorkProfile();
  const titleId = useId();
  if (work.status === "unknown" || work.status === "signed_out") return null;

  return (
    <Card id="work-profile" aria-labelledby={titleId} role="region" className="scroll-mt-24">
      <CardHeader>
        <CardTitle as="h2" id={titleId}>
          Work profile
        </CardTitle>
        <CardDescription>
          Otto checks job posts against this: where you live, your hours and your visa needs. Only
          you can see it.
        </CardDescription>
      </CardHeader>
      {work.status === "loading" ? (
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
            <Button variant="outline" onClick={work.retry}>
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
