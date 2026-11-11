"use client";

import { useId, useMemo, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { OTTO } from "@/components/mascot/lines";
import { LookingForCard } from "@/components/dashboard/jobs/looking-for-card";
import { defaultResumeId } from "@/components/dashboard/jobs/view";
import {
  saveLookingForChoice,
  storeWorkProfile,
} from "@/components/eligibility/use-work-profile";
import { WorkProfileFields } from "@/components/eligibility/work-profile-fields";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import { deviceTimeZone } from "@/lib/eligibility/options";
import { REGION_NAMES, type WorkProfile, type WorkRegion } from "@/lib/eligibility/profile";
import { lookingForOf, roleOptions } from "@/lib/job-feed/looking-for";
import { matchProfileOf } from "@/lib/job-feed/profile";
import { NO_CHOICE, type LookingForChoice, type MatchProfile } from "@/lib/job-feed/types";
import { lookingForSet, ownResumes } from "@/lib/setup/checklist";
import { answerRegion, guessCountry, moveHomeRegion, type CountryGuess } from "@/lib/setup/guess";
import { confirmedChoice } from "@/lib/setup/step";
import type { SetupStepOutcome } from "@/lib/setup/types";
import { useResumeList } from "@/lib/store/resume-store";
import { DAY_MS } from "@/lib/time";

export type WorkSetupDialogProps = {
  open: boolean;
  userId: string;
  pro: boolean;
  profile: WorkProfile;
  onClose: (outcome: SetupStepOutcome) => void;
};

type Draft = {
  profile: WorkProfile;
  auto: WorkRegion | null;
  countryFrom: CountryGuess["from"] | null;
};

const NO_MATCH: MatchProfile = { skills: [], titles: [], years: null };
const CHECKBOX = "flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink";

export function WorkSetupDialog({ open, userId, pro, profile, onClose }: WorkSetupDialogProps) {
  const resumes = useResumeList();
  const own = useMemo(() => ownResumes(resumes), [resumes]);
  const now = useNow();
  const day = now === 0 ? 0 : Math.floor(now / DAY_MS);
  const remoteId = useId();

  const [draft, setDraft] = useState<Draft>(() => {
    const timeZone = profile.timeZone || deviceTimeZone();
    const guess = profile.country
      ? null
      : guessCountry({ locations: own.map((resume) => resume.basics.location), timeZone });
    const country = profile.country || guess?.code || "";
    const rights = moveHomeRegion({ rights: profile.rights, auto: null }, country);
    return {
      profile: { ...profile, country, timeZone, rights: rights.rights },
      auto: rights.auto,
      countryFrom: guess?.from ?? null,
    };
  });
  const [picked, setPicked] = useState<LookingForChoice>(NO_CHOICE);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const base = useMemo(() => own.find((resume) => resume.id === defaultResumeId(own)) ?? null, [own]);
  const match = useMemo(
    () => (base && day > 0 ? matchProfileOf(base, day * DAY_MS) : NO_MATCH),
    [base, day],
  );
  const remote = draft.profile.remoteOnly ?? false;
  const shown = lookingForOf(match, draft.profile, { ...picked, remote });
  const roles = useMemo(
    () => roleOptions(match).map((role) => ({ ...role, occupation: null })),
    [match],
  );

  function change(next: Partial<WorkProfile>) {
    setDraft((current) => {
      if (next.country === undefined || next.country === current.profile.country) {
        return { ...current, profile: { ...current.profile, ...next } };
      }
      const moved = moveHomeRegion(
        { rights: current.profile.rights, auto: current.auto },
        next.country,
      );
      return {
        profile: { ...current.profile, ...next, rights: moved.rights },
        auto: moved.auto,
        countryFrom: null,
      };
    });
  }

  function setRemote(on: boolean) {
    change({ remoteOnly: on });
  }

  async function save() {
    setSaving(true);
    setFailure(null);
    try {
      if (pro) {
        const res = await api.saveWorkProfile(draft.profile);
        storeWorkProfile(userId, res.profile, res.updatedAt, res.lookingFor ?? NO_CHOICE);
      }
      const keep = confirmedChoice({ shown, picked, placeFollowsCountry: pro });
      if (lookingForSet(keep) || (!pro && keep.remote)) await saveLookingForChoice(userId, keep);
      onClose("saved");
      toast({
        title: "Saved",
        description: "Change it any time in Account.",
        variant: "success",
      });
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const countryHint =
    draft.countryFrom === "resume"
      ? "Guessed from your resume."
      : draft.countryFrom === "device"
        ? "Guessed from this device's time zone."
        : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onClose("skipped");
      }}
      size="lg"
      title={pro ? "Where can you work?" : "What are you looking for?"}
      description={
        pro
          ? "Jobs then flags posts that say they can't hire you, and can hide them. Change it any time in Account."
          : "Jobs puts the closest matches first. Change it any time in Account."
      }
      footer={
        <>
          <Button variant="ghost" size="lg" disabled={saving} onClick={() => onClose("skipped")}>
            Skip for now
          </Button>
          <Button
            size="lg"
            loading={saving}
            onClick={() => void save()}
            data-autofocus={pro ? undefined : true}
          >
            Save
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-6">
        {pro ? (
          <WorkProfileFields
            fields="essentials"
            autoFocusCountry
            value={draft.profile}
            onChange={change}
            onRight={(region, value) =>
              setDraft((current) => {
                const answered = answerRegion(
                  { rights: current.profile.rights, auto: current.auto },
                  region,
                  value,
                );
                return {
                  ...current,
                  profile: { ...current.profile, rights: answered.rights },
                  auto: answered.auto,
                };
              })
            }
            countryHint={countryHint}
            rightsNote={
              draft.auto
                ? `Set to Yes for ${REGION_NAMES[draft.auto]} because you live there. Change it if your visa says otherwise.`
                : undefined
            }
          />
        ) : null}

        <div className={pro ? "flex flex-col gap-2 border-t border-border pt-5" : "flex flex-col gap-2"}>
          <LookingForCard
            tone="plain"
            value={shown}
            occupation={null}
            choice={{ ...picked, remote }}
            roles={roles}
            country={draft.profile.country}
            saving={false}
            onChange={(next) => {
              setPicked(next);
              if (next.remote !== remote) setRemote(next.remote);
            }}
            note={
              base
                ? "Guessed from your resume. Tap a part to change it."
                : "Tap a part to pick a role and level. A resume makes this a good guess."
            }
          />
          {pro ? null : (
            <label htmlFor={remoteId} className={CHECKBOX}>
              <input
                id={remoteId}
                type="checkbox"
                checked={remote}
                onChange={(event) => setRemote(event.target.checked)}
                className="size-4 accent-ink"
              />
              Remote jobs only
            </label>
          )}
        </div>

        {pro ? null : (
          <p className="text-sm text-muted">{OTTO.limit.tool("eligibility", false)}</p>
        )}

        {failure ? (
          <Alert variant="error" title="Not saved">
            {failure}
          </Alert>
        ) : null}
      </form>
    </Dialog>
  );
}
