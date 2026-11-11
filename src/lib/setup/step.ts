import type { LookingFor, LookingForChoice } from "@/lib/job-feed/types";

// Client-safe and pure. The one first-login step, "Where can you work?" (DESIGN.md, "First login
// and setup"): when it opens, and what its Save keeps.

// Where the first-login step may open: the first screens after signing in. Never on the account,
// trash or a tool page, where it would get between the person and what they came to do.
export const SETUP_STEP_PATHS: readonly string[] = ["/dashboard", "/dashboard/jobs"];

type Load = "loading" | "ready" | "error";

export type StepFacts = {
  pathname: string;
  signedIn: boolean;
  // The plan and this account's resumes are known, so the prefills are the real ones.
  ready: boolean;
  work: { status: Load; updatedAt: number | null };
  setup: { status: Load; stepAt: number | null };
  // This browser's own note that the step was closed, for when the server couldn't keep it.
  localStepAt: number | null;
};

export type StepDecision = "wait" | "show" | "skip";

/**
 * Once per account: never for someone who has saved a work profile or a "Looking for" choice, and
 * never again after Save, Skip or closing it. Until everything it depends on is known it waits, so
 * it can't flash open and shut.
 */
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

/**
 * What Save keeps of the "Looking for" line as shown: what the person picked, plus the guesses they
 * confirmed by saving. The place stays tied to the work profile's country (`placeFollowsCountry`)
 * unless they picked another; without a saved country (Free) the shown place is kept, unless it is
 * just "anywhere".
 */
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
