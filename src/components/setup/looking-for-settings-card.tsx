"use client";

import { useId, useMemo, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { LookingForCard } from "@/components/dashboard/jobs/looking-for-card";
import { defaultResumeId } from "@/components/dashboard/jobs/view";
import { saveLookingForChoice, useWorkProfile } from "@/components/eligibility/use-work-profile";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { lookingForOf, roleOptions } from "@/lib/job-feed/looking-for";
import { matchProfileOf } from "@/lib/job-feed/profile";
import type { LookingForChoice, MatchProfile } from "@/lib/job-feed/types";
import { ownResumes } from "@/lib/setup/checklist";
import { useResumeList } from "@/lib/store/resume-store";
import { DAY_MS } from "@/lib/time";
import { ACCOUNT_SECTIONS } from "./links";

const NO_MATCH: MatchProfile = { skills: [], titles: [], years: null };

// Same store and API as the Jobs card, so a change here shows there at once. Free and Pro.
export function LookingForSettingsCard() {
  const work = useWorkProfile();
  const titleId = useId();
  const resumes = useResumeList();
  const own = useMemo(() => ownResumes(resumes), [resumes]);
  const base = useMemo(() => own.find((resume) => resume.id === defaultResumeId(own)) ?? null, [own]);
  const now = useNow();
  const day = now === 0 ? 0 : Math.floor(now / DAY_MS);
  const match = useMemo(
    () => (base && day > 0 ? matchProfileOf(base, day * DAY_MS) : NO_MATCH),
    [base, day],
  );
  const roles = useMemo(
    () => roleOptions(match).map((role) => ({ ...role, occupation: null })),
    [match],
  );
  const [saving, setSaving] = useState(false);
  if (work.status === "unknown" || work.status === "signed_out") return null;

  async function change(userId: string, next: LookingForChoice) {
    setSaving(true);
    try {
      await saveLookingForChoice(userId, next);
    } catch (error) {
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      id={ACCOUNT_SECTIONS.lookingFor}
      aria-labelledby={titleId}
      role="region"
      className="scroll-mt-24"
    >
      <CardHeader>
        <CardTitle as="h2" id={titleId}>
          Looking for
        </CardTitle>
        <CardDescription>
          The role, level and place Jobs puts first. Guessed from your resume until you pick.
        </CardDescription>
      </CardHeader>
      {work.status === "loading" ? (
        <Skeleton className="h-11 w-full" />
      ) : work.status === "error" ? (
        <Alert
          variant="error"
          title="Couldn't load what you're looking for"
          action={
            <Button variant="secondary" onClick={work.retry}>
              Try again
            </Button>
          }
        >
          Check your connection, then try again.
        </Alert>
      ) : (
        <LookingForCard
          tone="plain"
          value={lookingForOf(match, work.profile, work.lookingFor)}
          occupation={null}
          choice={work.lookingFor}
          roles={roles}
          country={work.profile.country}
          saving={saving}
          onChange={(next) => void change(work.userId, next)}
          note={
            base
              ? "Tap a part to change it. Saves as you go."
              : "Tap a part to pick a role and level. Saves as you go."
          }
        />
      )}
    </Card>
  );
}
