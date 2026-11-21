import type { z } from "zod";
import type { WorkProfile, WorkRegion } from "@/lib/eligibility/profile";
import { lookingForOf } from "@/lib/job-feed/looking-for";
import { matchProfileOf } from "@/lib/job-feed/profile";
import type { LookingForChoice } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";
import { DAY_MS } from "@/lib/time";
import { lookingForSet, newestUpload, type DefaultsDue } from "./checklist";
import { guessCountry, homeRegion } from "./guess";
import type { SetupDefaults, SetupGuess } from "./types";
import type { SetupDefaultsSchema } from "./validation";

// The same guess Jobs shows for this resume; the place is left to follow the country.
export function lookingForGuess(resume: Resume, now: number): SetupDefaults["lookingFor"] {
  const shown = lookingForOf(matchProfileOf(resume, Math.floor(now / DAY_MS) * DAY_MS), null);
  const role = shown.title
    ? { title: shown.title, family: shown.family, occupation: shown.occupation }
    : null;
  return role || shown.level ? { role, level: shown.level } : undefined;
}

// `own` is newest first, as ownResumes sorts it; an upload with no titles waits for a better one.
export function plannedDefaults({
  due,
  own,
  timeZone,
  now,
}: {
  due: DefaultsDue;
  own: readonly Resume[];
  timeZone: string;
  now: number;
}): SetupDefaults | null {
  const body: SetupDefaults = {};
  if (due.defaultsAt === null) {
    const guess = guessCountry({
      locations: own.map((resume) => resume.basics.location),
      timeZone,
    });
    body.place = { country: guess?.code ?? "", from: guess?.from ?? null, timeZone };
  }
  const upload = due.lookingForAt === null ? newestUpload(own) : null;
  const lookingFor = upload ? lookingForGuess(upload, now) : undefined;
  if (lookingFor) body.lookingFor = lookingFor;
  return body.place || body.lookingFor ? body : null;
}

export type StoredDefaults = DefaultsDue & {
  profile: WorkProfile;
  lookingFor: LookingForChoice;
};

export type DefaultsFill = {
  country: string | null;
  timeZone: string | null;
  region: WorkRegion | null;
  lookingFor: Pick<LookingForChoice, "role" | "level"> | null;
  guess: SetupGuess | null;
  placeRan: boolean;
  lookingForRan: boolean;
};

// Each part runs once per account and only ever fills a blank, so it can't undo a choice.
export function fillDefaults(
  stored: StoredDefaults,
  body: z.output<typeof SetupDefaultsSchema>,
): DefaultsFill {
  const place = stored.defaultsAt === null ? (body.place ?? null) : null;
  const country = place?.country && stored.profile.country === "" ? place.country : null;
  const timeZone = place?.timeZone && stored.profile.timeZone === "" ? place.timeZone : null;
  const home = country ? homeRegion(country) : null;
  const region = home && stored.profile.rights[home] === null ? home : null;
  const choice = stored.lookingForAt === null ? (body.lookingFor ?? null) : null;
  return {
    country,
    timeZone,
    region,
    lookingFor: choice && !lookingForSet(stored.lookingFor) ? choice : null,
    guess: country && place?.from ? { country, from: place.from, region } : null,
    placeRan: place !== null,
    lookingForRan: choice !== null,
  };
}
