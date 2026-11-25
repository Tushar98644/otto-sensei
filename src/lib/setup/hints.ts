import {
  REGION_NAMES,
  WORK_REGIONS,
  type WorkProfile,
  type WorkRegion,
} from "@/lib/eligibility/profile";
import type { SetupGuess } from "./types";

type HintWords = { resume: string; device: string; home: string };

const ENGLISH_HINTS: HintWords = {
  resume: "Guessed from your resume.",
  device: "Guessed from this device's time zone.",
  home: "Set to Yes for {region} because you live there. Change it if your visa says otherwise.",
};

export function countryHint(
  guess: SetupGuess | null,
  country: string,
  words: Omit<HintWords, "home"> = ENGLISH_HINTS,
): string | undefined {
  if (!guess || guess.country !== country) return undefined;
  return guess.from === "resume" ? words.resume : words.device;
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

export function homeRegionNote(
  region: WorkRegion,
  words: { hints: Pick<HintWords, "home">; regionNames: Record<WorkRegion, string> } = {
    hints: ENGLISH_HINTS,
    regionNames: REGION_NAMES,
  },
): string {
  return words.hints.home.replace("{region}", words.regionNames[region]);
}
