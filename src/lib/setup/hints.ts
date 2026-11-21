import {
  REGION_NAMES,
  WORK_REGIONS,
  type WorkProfile,
  type WorkRegion,
} from "@/lib/eligibility/profile";
import type { SetupGuess } from "./types";

export function countryHint(guess: SetupGuess | null, country: string): string | undefined {
  if (!guess || guess.country !== country) return undefined;
  return guess.from === "resume"
    ? "Guessed from your resume."
    : "Guessed from this device's time zone.";
}

export function guessedRegion(
  guess: SetupGuess | null,
  profile: Pick<WorkProfile, "country" | "rights">,
): WorkRegion | null {
  if (!guess?.region || guess.country !== profile.country) return null;
  return profile.rights[guess.region] === "authorized" ? guess.region : null;
}

export function onlyGuessedRights(guess: SetupGuess | null, profile: WorkProfile): boolean {
  const region = guessedRegion(guess, profile);
  return (
    region !== null &&
    WORK_REGIONS.every((other) => other === region || profile.rights[other] === null)
  );
}

export function homeRegionNote(region: WorkRegion): string {
  return `Set to Yes for ${REGION_NAMES[region]} because you live there. Change it if your visa says otherwise.`;
}
