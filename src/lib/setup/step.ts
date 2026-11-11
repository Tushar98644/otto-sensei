import type { LookingFor, LookingForChoice } from "@/lib/job-feed/types";

// Never on the account, trash or a tool page, where it would get in the way.
export const SETUP_STEP_PATHS: readonly string[] = ["/dashboard", "/dashboard/jobs"];

type Load = "loading" | "ready" | "error";

export type StepFacts = {
  pathname: string;
  signedIn: boolean;
  ready: boolean;
  work: { status: Load; updatedAt: number | null };
  setup: { status: Load; stepAt: number | null };
  // For when the server couldn't keep that the step was closed.
  localStepAt: number | null;
};

export type StepDecision = "wait" | "show" | "skip";

// Once per account, never after a saved profile or choice, Save, Skip or close. Waits until
// everything it depends on is known, so it can't flash open and shut.
export function setupStepDecision(facts: StepFacts): StepDecision {
  if (!facts.signedIn || !SETUP_STEP_PATHS.includes(facts.pathname)) return "skip";
  if (!facts.ready || facts.work.status === "loading") return "wait";
  // Without the profile there's no telling whether it was already set: better not to ask.
  if (facts.work.status === "error" || facts.work.updatedAt !== null) return "skip";
  if (facts.localStepAt !== null) return "skip";
  if (facts.setup.status === "loading") return "wait";
  if (facts.setup.status === "ready" && facts.setup.stepAt !== null) return "skip";
  return "show";
}

// The person's picks plus the guesses confirmed by saving. The place follows the profile's country
// unless they picked another; without a saved country (Free) the shown place is kept unless
// "anywhere".
export function confirmedChoice({
  shown,
  picked,
  placeFollowsCountry,
}: {
  shown: LookingFor;
  picked: LookingForChoice;
  placeFollowsCountry: boolean;
}): LookingForChoice {
  const guessedRole =
    shown.title !== "" || shown.family !== null
      ? { title: shown.title, family: shown.family, occupation: shown.occupation }
      : null;
  const guessedPlace = !placeFollowsCountry && shown.place !== "anywhere" ? shown.place : null;
  return {
    role: picked.role ?? guessedRole,
    level: picked.level ?? shown.level,
    place: picked.place ?? guessedPlace,
    remote: shown.remote,
  };
}
