import type { LookingFor, LookingForChoice } from "@/lib/job-feed/types";

export const SETUP_STEP_PATHS: readonly string[] = ["/dashboard", "/dashboard/jobs"];

type Load = "loading" | "ready" | "error";

export type StepFacts = {
  pathname: string;
  signedIn: boolean;
  ready: boolean;
  work: { status: Load; updatedAt: number | null };
  setup: { status: Load; stepAt: number | null };
  localStepAt: number | null;
};

export type StepDecision = "wait" | "show" | "skip";

export function setupStepDecision(facts: StepFacts): StepDecision {
  if (!facts.signedIn || !SETUP_STEP_PATHS.includes(facts.pathname)) return "skip";
  if (!facts.ready || facts.work.status === "loading") return "wait";
  if (facts.work.status === "error" || facts.work.updatedAt !== null) return "skip";
  if (facts.localStepAt !== null) return "skip";
  if (facts.setup.status === "loading") return "wait";
  if (facts.setup.status === "ready" && facts.setup.stepAt !== null) return "skip";
  return "show";
}

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
